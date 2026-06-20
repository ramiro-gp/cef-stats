-- Permite partidos sin grupo anfitrión sin ampliar el acceso fuera de sus participantes.
-- Requiere que los patches 003 a 011 ya estén aplicados.

alter table public.matches alter column host_group_id drop not null;

create or replace function public.validate_stat_entry_match_scope()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_group_id uuid;
begin
  if new.match_id is null then return new; end if;
  select host_group_id into target_group_id from public.matches where id = new.match_id;
  if not found then raise exception 'Match not found'; end if;

  if target_group_id is null then
    if new.scope_type <> 'personal' or new.group_id is not null then
      raise exception 'Stats for a match without group must use personal scope';
    end if;
  elsif new.scope_type <> 'group' or new.group_id is distinct from target_group_id then
    raise exception 'Stat entry and match must belong to the same group';
  end if;

  new.local_match_id := null;
  return new;
end;
$$;

drop policy if exists "matches_insert_group_member" on public.matches;
create policy "matches_insert_group_member" on public.matches
for insert to authenticated
with check (created_by = auth.uid() and (host_group_id is null or public.is_group_member(host_group_id)));

drop policy if exists "matches_update_creator" on public.matches;
create policy "matches_update_creator" on public.matches
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid() and (host_group_id is null or public.is_group_member(host_group_id)));

create or replace function public.create_match_with_invite(
  p_host_group_id uuid,
  p_title text,
  p_format text,
  p_scheduled_at timestamptz
)
returns setof public.matches
language plpgsql
security definer set search_path = public
as $$
declare
  generated_code text;
  created_match public.matches;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_host_group_id is not null and not public.is_group_member(p_host_group_id) then raise exception 'Group membership required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Match title required'; end if;
  if p_format not in ('F5', 'F6', 'F7', 'F8', 'F11') then raise exception 'Invalid match format'; end if;

  loop
    generated_code := 'CEF-' || upper(substring(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 5));
    exit when not exists (select 1 from public.matches where invite_code = generated_code);
  end loop;

  insert into public.matches (host_group_id, title, format, invite_code, scheduled_at, created_by)
  values (p_host_group_id, trim(p_title), p_format, generated_code, p_scheduled_at, auth.uid())
  returning * into created_match;
  return next created_match;
end;
$$;

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz) to authenticated;

drop policy if exists "stat_entries_select_scope" on public.stat_entries;
create policy "stat_entries_select_scope" on public.stat_entries
for select to authenticated
using (
  (scope_type = 'personal' and (user_id = auth.uid() or (match_id is not null and public.is_match_participant(match_id))))
  or (scope_type = 'group' and (public.is_group_member(group_id) or (match_id is not null and public.is_match_participant(match_id))))
);

drop policy if exists "stat_entries_insert_own" on public.stat_entries;
create policy "stat_entries_insert_own" on public.stat_entries
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    (scope_type = 'personal' and group_id is null and (match_id is null or public.is_match_participant(match_id)))
    or (scope_type = 'group' and group_id is not null and (public.is_group_member(group_id) or (match_id is not null and public.is_match_participant(match_id))))
  )
);

drop policy if exists "stat_entries_update_own" on public.stat_entries;
create policy "stat_entries_update_own" on public.stat_entries
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    (scope_type = 'personal' and group_id is null and (match_id is null or public.is_match_participant(match_id)))
    or (scope_type = 'group' and group_id is not null and (public.is_group_member(group_id) or (match_id is not null and public.is_match_participant(match_id))))
  )
);
