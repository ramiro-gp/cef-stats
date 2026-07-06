-- Patch 018: let group members decide whether they attend or omit visible group matches.

create table if not exists public.match_omissions (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.match_omissions enable row level security;

drop policy if exists "match_omissions_select_own" on public.match_omissions;
create policy "match_omissions_select_own" on public.match_omissions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists "match_omissions_insert_own_visible" on public.match_omissions;
create policy "match_omissions_insert_own_visible" on public.match_omissions
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_match(match_id));

drop policy if exists "match_omissions_delete_own" on public.match_omissions;
create policy "match_omissions_delete_own" on public.match_omissions
for delete to authenticated
using (user_id = auth.uid());

create or replace function public.attend_match(p_match_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.can_view_match(p_match_id) then raise exception 'Match not found'; end if;

  insert into public.match_participants (match_id, user_id, team)
  values (p_match_id, auth.uid(), null)
  on conflict (match_id, user_id) do nothing;

  delete from public.match_omissions where match_id = p_match_id and user_id = auth.uid();
  return p_match_id;
end;
$$;

revoke all on function public.attend_match(uuid) from public;
grant execute on function public.attend_match(uuid) to authenticated;

create or replace function public.omit_match(p_match_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.can_view_match(p_match_id) then raise exception 'Match not found'; end if;

  if exists (select 1 from public.match_participants where match_id = p_match_id and user_id = auth.uid()) then
    raise exception 'Already attending match';
  end if;

  insert into public.match_omissions (match_id, user_id)
  values (p_match_id, auth.uid())
  on conflict (match_id, user_id) do nothing;

  return p_match_id;
end;
$$;

revoke all on function public.omit_match(uuid) from public;
grant execute on function public.omit_match(uuid) to authenticated;

create or replace function public.attend_match_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare target_match_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select m.id into target_match_id from public.matches m
  where public.normalize_invite_code(m.invite_code) = public.normalize_invite_code(p_invite_code);
  if target_match_id is null then raise exception 'Invalid match invite code'; end if;

  insert into public.match_participants (match_id, user_id, team)
  values (target_match_id, auth.uid(), null) on conflict (match_id, user_id) do nothing;

  delete from public.match_omissions where match_id = target_match_id and user_id = auth.uid();
  return target_match_id;
end;
$$;

revoke all on function public.attend_match_by_invite(text) from public;
grant execute on function public.attend_match_by_invite(text) to authenticated;

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

  select m.id, m.format into target_match_id, target_format
  from public.matches m
  where public.normalize_invite_code(m.invite_code) = public.normalize_invite_code(p_invite_code);
  if target_match_id is null then raise exception 'Invalid match invite code'; end if;

  maximum_slots := public.match_team_max_slots(target_format);
  select
    (select count(*) from public.match_participants where match_id = target_match_id and team = p_team and user_id <> auth.uid())
    + (select count(*) from public.match_guests where match_id = target_match_id and team = p_team)
  into occupied_slots;
  if occupied_slots >= maximum_slots then raise exception 'Team is full'; end if;

  insert into public.match_participants (match_id, user_id, team)
  values (target_match_id, auth.uid(), p_team)
  on conflict (match_id, user_id) do update set team = excluded.team;

  delete from public.match_omissions where match_id = target_match_id and user_id = auth.uid();
  return target_match_id;
end;
$$;

revoke all on function public.join_match_by_invite(text, text) from public;
grant execute on function public.join_match_by_invite(text, text) to authenticated;
