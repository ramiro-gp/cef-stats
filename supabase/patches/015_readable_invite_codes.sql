-- Genera códigos nuevos XXXX-XXXX y permite buscar códigos nuevos o viejos
-- sin distinguir mayúsculas, minúsculas ni guiones.
-- Requiere los patches 001 a 014 ya aplicados.

create or replace function public.normalize_invite_code(p_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(upper(trim(coalesce(p_code, ''))), '[^A-Z0-9]', '', 'g');
$$;

revoke all on function public.normalize_invite_code(text) from public;

create or replace function public.create_group_with_membership(p_name text)
returns table (id uuid, name text, invite_code text, created_by uuid, created_at timestamptz, updated_at timestamptz)
language plpgsql
security definer set search_path = public
as $$
declare
  created_group public.groups;
  token text;
  generated_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Group name required'; end if;
  loop
    token := public.generate_invite_token(8);
    generated_code := substr(token, 1, 4) || '-' || substr(token, 5, 4);
    exit when not exists (
      select 1 from public.groups existing
      where public.normalize_invite_code(existing.invite_code) = token
    );
  end loop;
  insert into public.groups (name, invite_code, created_by)
  values (trim(p_name), generated_code, auth.uid()) returning * into created_group;
  insert into public.group_members (group_id, user_id, role)
  values (created_group.id, auth.uid(), 'owner');
  return query select created_group.id, created_group.name, created_group.invite_code, created_group.created_by, created_group.created_at, created_group.updated_at;
end;
$$;

revoke all on function public.create_group_with_membership(text) from public;
grant execute on function public.create_group_with_membership(text) to authenticated;

create or replace function public.join_group_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare target_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select g.id into target_group_id from public.groups g
  where public.normalize_invite_code(g.invite_code) = public.normalize_invite_code(p_invite_code);
  if target_group_id is null then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from public.group_members where group_id = target_group_id and user_id = auth.uid()) then raise exception 'Already a member'; end if;
  insert into public.group_members (group_id, user_id, role) values (target_group_id, auth.uid(), 'member');
  return target_group_id;
end;
$$;

revoke all on function public.join_group_by_invite(text) from public;
grant execute on function public.join_group_by_invite(text) to authenticated;

create or replace function public.create_match_with_invite(p_host_group_id uuid, p_title text, p_format text, p_scheduled_at timestamptz)
returns setof public.matches
language plpgsql
security definer set search_path = public
as $$
declare token text; generated_code text; created_match public.matches;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_host_group_id is not null and not public.is_group_member(p_host_group_id) then raise exception 'Group membership required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Match title required'; end if;
  if p_format not in ('F5', 'F6', 'F7', 'F8', 'F11') then raise exception 'Invalid match format'; end if;
  loop
    token := public.generate_invite_token(8);
    generated_code := substr(token, 1, 4) || '-' || substr(token, 5, 4);
    exit when not exists (select 1 from public.matches m where public.normalize_invite_code(m.invite_code) = token);
  end loop;
  insert into public.matches (host_group_id, title, format, invite_code, scheduled_at, created_by)
  values (p_host_group_id, trim(p_title), p_format, generated_code, p_scheduled_at, auth.uid()) returning * into created_match;
  return next created_match;
end;
$$;

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz) to authenticated;

create or replace function public.create_match_with_invite(p_host_group_id uuid, p_title text, p_format text, p_scheduled_at timestamptz, p_light_team_name text, p_dark_team_name text)
returns setof public.matches
language plpgsql
security definer set search_path = public
as $$
declare
  token text; generated_code text; created_match public.matches;
  clean_light_name text := upper(trim(coalesce(p_light_team_name, 'CLARO')));
  clean_dark_name text := upper(trim(coalesce(p_dark_team_name, 'OSCURO')));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_host_group_id is not null and not public.is_group_member(p_host_group_id) then raise exception 'Group membership required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Match title required'; end if;
  if p_format not in ('F5', 'F6', 'F7', 'F8', 'F11') then raise exception 'Invalid match format'; end if;
  if char_length(clean_light_name) not between 1 and 24 or char_length(clean_dark_name) not between 1 and 24 then raise exception 'Invalid team name'; end if;
  if clean_light_name = clean_dark_name then raise exception 'Team names must be different'; end if;
  loop
    token := public.generate_invite_token(8);
    generated_code := substr(token, 1, 4) || '-' || substr(token, 5, 4);
    exit when not exists (select 1 from public.matches m where public.normalize_invite_code(m.invite_code) = token);
  end loop;
  insert into public.matches (host_group_id, title, format, invite_code, scheduled_at, created_by, light_team_name, dark_team_name)
  values (p_host_group_id, trim(p_title), p_format, generated_code, p_scheduled_at, auth.uid(), clean_light_name, clean_dark_name)
  returning * into created_match;
  return next created_match;
end;
$$;

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text) to authenticated;

create or replace function public.get_match_by_invite(p_invite_code text)
returns setof public.matches
language sql
stable
security definer set search_path = public
as $$
  select m.* from public.matches m
  where auth.uid() is not null
    and public.normalize_invite_code(m.invite_code) = public.normalize_invite_code(p_invite_code)
  limit 1;
$$;

revoke all on function public.get_match_by_invite(text) from public;
grant execute on function public.get_match_by_invite(text) to authenticated;

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
declare target_match_id uuid; target_format text; occupied_slots integer; maximum_slots integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_team not in ('light', 'dark') then raise exception 'Invalid team'; end if;
  select m.id, m.format into target_match_id, target_format from public.matches m
  where public.normalize_invite_code(m.invite_code) = public.normalize_invite_code(p_invite_code);
  if target_match_id is null then raise exception 'Invalid match invite code'; end if;
  maximum_slots := case target_format when 'F5' then 7 when 'F6' then 8 when 'F7' then 9 when 'F8' then 10 when 'F11' then 13 else 7 end;
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
