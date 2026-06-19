-- Permite participar de un partido sin pertenecer al grupo anfitrión.
-- Mantiene aislados los permisos del grupo y limita la lectura a partidos propios.

create or replace function public.list_my_matches()
returns setof public.matches
language sql
stable
security definer set search_path = public
as $$
  select m.*
  from public.matches m
  where auth.uid() is not null
    and (
      m.created_by = auth.uid()
      or exists (
        select 1
        from public.match_participants participant
        where participant.match_id = m.id
          and participant.user_id = auth.uid()
      )
    )
  order by m.scheduled_at desc;
$$;

create or replace function public.get_match_group_labels(p_match_ids uuid[])
returns table (match_id uuid, group_name text)
language sql
stable
security definer set search_path = public
as $$
  select m.id, g.name
  from public.matches m
  join public.groups g on g.id = m.host_group_id
  where m.id = any(coalesce(p_match_ids, array[]::uuid[]))
    and public.can_view_match(m.id);
$$;

revoke all on function public.list_my_matches() from public;
revoke all on function public.get_match_group_labels(uuid[]) from public;
grant execute on function public.list_my_matches() to authenticated;
grant execute on function public.get_match_group_labels(uuid[]) to authenticated;

-- La invitación crea únicamente match_participants. No toca group_members.
create or replace function public.join_match_by_invite(p_invite_code text, p_team text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_match_id uuid;
  target_format text;
  occupied_slots integer;
  maximum_slots integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_team not in ('light', 'dark') then raise exception 'Invalid team'; end if;

  select id, format into target_match_id, target_format
  from public.matches
  where upper(invite_code) = upper(trim(p_invite_code));

  if target_match_id is null then raise exception 'Invalid match invite code'; end if;

  maximum_slots := case target_format
    when 'F5' then 7 when 'F6' then 8 when 'F7' then 9
    when 'F8' then 10 when 'F11' then 13 else 7 end;
  select
    (select count(*) from public.match_participants where match_id = target_match_id and team = p_team and user_id <> auth.uid())
    + (select count(*) from public.match_guests where match_id = target_match_id and team = p_team)
  into occupied_slots;
  if occupied_slots >= maximum_slots then raise exception 'Team is full'; end if;

  insert into public.match_participants (match_id, user_id, team)
  values (target_match_id, auth.uid(), p_team)
  on conflict (match_id, user_id) do update set team = excluded.team;

  return target_match_id;
end;
$$;

revoke all on function public.join_match_by_invite(text, text) from public;
grant execute on function public.join_match_by_invite(text, text) to authenticated;

-- Un participante externo sólo puede leer stats vinculadas a ese partido.
drop policy if exists "stat_entries_select_scope" on public.stat_entries;
create policy "stat_entries_select_scope" on public.stat_entries
for select to authenticated
using (
  (scope_type = 'personal' and user_id = auth.uid())
  or (
    scope_type = 'group'
    and (
      public.is_group_member(group_id)
      or (match_id is not null and public.is_match_participant(match_id))
    )
  )
);

drop policy if exists "stat_entries_insert_own" on public.stat_entries;
create policy "stat_entries_insert_own" on public.stat_entries
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    (scope_type = 'personal' and group_id is null and match_id is null)
    or (
      scope_type = 'group'
      and group_id is not null
      and (
        public.is_group_member(group_id)
        or (match_id is not null and public.is_match_participant(match_id))
      )
    )
  )
);

drop policy if exists "stat_entries_update_own" on public.stat_entries;
create policy "stat_entries_update_own" on public.stat_entries
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    (scope_type = 'personal' and group_id is null and match_id is null)
    or (
      scope_type = 'group'
      and group_id is not null
      and (
        public.is_group_member(group_id)
        or (match_id is not null and public.is_match_participant(match_id))
      )
    )
  )
);
