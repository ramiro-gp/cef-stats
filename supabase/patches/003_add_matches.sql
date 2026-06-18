-- CEF Stats · partidos remotos para usuarios autenticados.
-- Idempotente: puede ejecutarse más de una vez sin borrar datos.

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  host_group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  format text not null default 'F5' check (format in ('F5', 'F6', 'F7', 'F8', 'F11')),
  invite_code text not null unique,
  scheduled_at timestamptz not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'played', 'closed')),
  light_score integer not null default 0 check (light_score >= 0),
  dark_score integer not null default 0 check (dark_score >= 0),
  mvp_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team text not null check (team in ('light', 'dark')),
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create table if not exists public.match_guests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  avatar text,
  team text not null check (team in ('light', 'dark')),
  goals integer not null default 0 check (goals >= 0),
  assists integer not null default 0 check (assists >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.matches
  add column if not exists mvp_guest_id uuid references public.match_guests(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_single_mvp_check' and conrelid = 'public.matches'::regclass) then
    alter table public.matches add constraint matches_single_mvp_check check (num_nonnulls(mvp_user_id, mvp_guest_id) <= 1);
  end if;
end $$;

alter table public.stat_entries
  add column if not exists match_id uuid references public.matches(id) on delete set null;

create unique index if not exists stat_entries_user_match_unique
  on public.stat_entries(user_id, match_id)
  where match_id is not null;

create index if not exists matches_host_group_idx on public.matches(host_group_id);
create index if not exists matches_invite_code_idx on public.matches(invite_code);
create index if not exists matches_scheduled_at_idx on public.matches(scheduled_at desc);
create index if not exists match_participants_match_idx on public.match_participants(match_id);
create index if not exists match_participants_user_idx on public.match_participants(user_id);
create index if not exists match_guests_match_idx on public.match_guests(match_id);
create index if not exists stat_entries_match_id_idx on public.stat_entries(match_id);

drop trigger if exists matches_set_updated_at on public.matches;
create trigger matches_set_updated_at before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists match_guests_set_updated_at on public.match_guests;
create trigger match_guests_set_updated_at before update on public.match_guests
for each row execute function public.set_updated_at();

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
  if target_group_id is null then raise exception 'Match not found'; end if;
  if new.scope_type <> 'group' or new.group_id is distinct from target_group_id then
    raise exception 'Stat entry and match must belong to the same group';
  end if;
  new.local_match_id := null;
  return new;
end;
$$;

drop trigger if exists stat_entries_validate_match_scope on public.stat_entries;
create trigger stat_entries_validate_match_scope
before insert or update of match_id, group_id, scope_type on public.stat_entries
for each row execute function public.validate_stat_entry_match_scope();

create or replace function public.validate_match_mvp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.mvp_user_id is not null and not exists (
    select 1 from public.match_participants
    where match_id = new.id and user_id = new.mvp_user_id
  ) then raise exception 'MVP user must participate in the match'; end if;

  if new.mvp_guest_id is not null and not exists (
    select 1 from public.match_guests
    where match_id = new.id and id = new.mvp_guest_id
  ) then raise exception 'MVP guest must belong to the match'; end if;

  return new;
end;
$$;

drop trigger if exists matches_validate_mvp on public.matches;
create trigger matches_validate_mvp
before insert or update of mvp_user_id, mvp_guest_id on public.matches
for each row execute function public.validate_match_mvp();

create or replace function public.clear_departed_match_mvp()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.matches
  set mvp_user_id = null
  where id = old.match_id and mvp_user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists match_participants_clear_mvp on public.match_participants;
create trigger match_participants_clear_mvp
after delete on public.match_participants
for each row execute function public.clear_departed_match_mvp();

create or replace function public.is_match_participant(target_match_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.match_participants
    where match_id = target_match_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_match_creator(target_match_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.matches
    where id = target_match_id and created_by = auth.uid()
  );
$$;

create or replace function public.can_view_match(target_match_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.matches m
    where m.id = target_match_id
      and (
        m.created_by = auth.uid()
        or public.is_group_member(m.host_group_id)
        or public.is_match_participant(m.id)
      )
  );
$$;

revoke all on function public.is_match_participant(uuid) from public;
revoke all on function public.is_match_creator(uuid) from public;
revoke all on function public.can_view_match(uuid) from public;
grant execute on function public.is_match_participant(uuid) to authenticated;
grant execute on function public.is_match_creator(uuid) to authenticated;
grant execute on function public.can_view_match(uuid) to authenticated;

create or replace function public.shares_match_with(target_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.match_participants participant
    where participant.user_id = target_user_id
      and public.can_view_match(participant.match_id)
  );
$$;

revoke all on function public.shares_match_with(uuid) from public;
grant execute on function public.shares_match_with(uuid) to authenticated;

drop policy if exists "profiles_select_related" on public.profiles;
create policy "profiles_select_related" on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.shares_group_with(id)
  or public.shares_match_with(id)
);

alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.match_guests enable row level security;

drop policy if exists "matches_select_viewer" on public.matches;
create policy "matches_select_viewer" on public.matches
for select to authenticated
using (
  created_by = auth.uid()
  or public.is_group_member(host_group_id)
  or public.is_match_participant(id)
);

drop policy if exists "matches_insert_group_member" on public.matches;
create policy "matches_insert_group_member" on public.matches
for insert to authenticated
with check (created_by = auth.uid() and public.is_group_member(host_group_id));

drop policy if exists "matches_update_creator" on public.matches;
create policy "matches_update_creator" on public.matches
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid() and public.is_group_member(host_group_id));

drop policy if exists "matches_delete_creator" on public.matches;
create policy "matches_delete_creator" on public.matches
for delete to authenticated
using (created_by = auth.uid());

drop policy if exists "match_participants_select_viewer" on public.match_participants;
create policy "match_participants_select_viewer" on public.match_participants
for select to authenticated
using (public.can_view_match(match_id));

drop policy if exists "match_participants_insert_self" on public.match_participants;
create policy "match_participants_insert_self" on public.match_participants
for insert to authenticated
with check (user_id = auth.uid() and public.can_view_match(match_id));

drop policy if exists "match_participants_update_self" on public.match_participants;
create policy "match_participants_update_self" on public.match_participants
for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_view_match(match_id));

drop policy if exists "match_participants_delete_self" on public.match_participants;
create policy "match_participants_delete_self" on public.match_participants
for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "match_guests_select_viewer" on public.match_guests;
create policy "match_guests_select_viewer" on public.match_guests
for select to authenticated
using (public.can_view_match(match_id));

drop policy if exists "match_guests_insert_creator" on public.match_guests;
create policy "match_guests_insert_creator" on public.match_guests
for insert to authenticated
with check (public.is_match_creator(match_id));

drop policy if exists "match_guests_update_creator" on public.match_guests;
create policy "match_guests_update_creator" on public.match_guests
for update to authenticated
using (public.is_match_creator(match_id)) with check (public.is_match_creator(match_id));

drop policy if exists "match_guests_delete_creator" on public.match_guests;
create policy "match_guests_delete_creator" on public.match_guests
for delete to authenticated
using (public.is_match_creator(match_id));

grant select, insert, update, delete on public.matches to authenticated;
grant select, insert, update, delete on public.match_participants to authenticated;
grant select, insert, update, delete on public.match_guests to authenticated;

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
  if not public.is_group_member(p_host_group_id) then raise exception 'Group membership required'; end if;
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

create or replace function public.get_match_by_invite(p_invite_code text)
returns setof public.matches
language sql
stable
security definer set search_path = public
as $$
  select m.*
  from public.matches m
  where auth.uid() is not null
    and upper(m.invite_code) = upper(trim(p_invite_code))
  limit 1;
$$;

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

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz) from public;
revoke all on function public.get_match_by_invite(text) from public;
revoke all on function public.join_match_by_invite(text, text) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.get_match_by_invite(text) to authenticated;
grant execute on function public.join_match_by_invite(text, text) to authenticated;
