-- Patch 017: cleanup empty matches, allow F8 up to 15 per team, and let group admins delete groups safely.

create or replace function public.match_team_max_slots(p_format text)
returns integer
language sql
stable
as $$
  select case p_format
    when 'F5' then 7
    when 'F6' then 8
    when 'F7' then 9
    when 'F8' then 15
    when 'F11' then 13
    else 7
  end;
$$;

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
      or public.is_group_member(m.host_group_id)
      or exists (
        select 1
        from public.match_participants participant
        where participant.match_id = m.id
          and participant.user_id = auth.uid()
      )
    )
  order by m.scheduled_at desc;
$$;

revoke all on function public.list_my_matches() from public;
grant execute on function public.list_my_matches() to authenticated;

create or replace function public.create_match_with_invite(
  p_host_group_id uuid,
  p_title text,
  p_format text,
  p_scheduled_at timestamptz,
  p_light_team_name text,
  p_dark_team_name text
)
returns setof public.matches
language plpgsql
security definer set search_path = public
as $$
declare
  generated_code text;
  created_match public.matches;
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
    generated_code := 'FUL-' || public.generate_invite_token(12);
    exit when not exists (select 1 from public.matches where invite_code = generated_code);
  end loop;

  insert into public.matches (host_group_id, title, format, invite_code, scheduled_at, created_by, light_team_name, dark_team_name)
  values (p_host_group_id, trim(p_title), p_format, generated_code, p_scheduled_at, auth.uid(), clean_light_name, clean_dark_name)
  returning * into created_match;

  insert into public.match_participants (match_id, user_id, team)
  values (created_match.id, auth.uid(), null)
  on conflict (match_id, user_id) do nothing;

  return next created_match;
end;
$$;

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text) to authenticated;

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

  return target_match_id;
end;
$$;

revoke all on function public.join_match_by_invite(text, text) from public;
grant execute on function public.join_match_by_invite(text, text) to authenticated;

create or replace function public.set_match_participant_team(p_match_id uuid, p_participant_id uuid, p_team text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_format text;
  target_creator uuid;
  target_user_id uuid;
  registered_participant boolean;
  guest_participant boolean;
  occupied_slots integer;
  maximum_slots integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_team not in ('light', 'dark') then raise exception 'Invalid team'; end if;

  select format, created_by into target_format, target_creator
  from public.matches where id = p_match_id;
  if target_creator is null then raise exception 'Match not found'; end if;
  if target_creator <> auth.uid() then raise exception 'Only match creator can change participant team'; end if;

  select exists(select 1 from public.match_participants where id = p_participant_id and match_id = p_match_id),
         exists(select 1 from public.match_guests where id = p_participant_id and match_id = p_match_id)
  into registered_participant, guest_participant;
  if not registered_participant and not guest_participant then raise exception 'Participant not found'; end if;

  maximum_slots := public.match_team_max_slots(target_format);
  select
    (select count(*) from public.match_participants where match_id = p_match_id and team = p_team and id <> p_participant_id)
    + (select count(*) from public.match_guests where match_id = p_match_id and team = p_team and id <> p_participant_id)
  into occupied_slots;
  if occupied_slots >= maximum_slots then raise exception 'Team is full'; end if;

  if registered_participant then
    update public.match_participants set team = p_team where id = p_participant_id and match_id = p_match_id returning user_id into target_user_id;
    update public.stat_entries set team = p_team where match_id = p_match_id and user_id = target_user_id;
  else
    update public.match_guests set team = p_team where id = p_participant_id and match_id = p_match_id;
  end if;

  update public.matches set updated_at = now() where id = p_match_id;
  return p_match_id;
end;
$$;

revoke all on function public.set_match_participant_team(uuid, uuid, text) from public;
grant execute on function public.set_match_participant_team(uuid, uuid, text) to authenticated;

create or replace function public.delete_match_if_empty(p_match_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.match_participants where match_id = p_match_id)
     and not exists (select 1 from public.match_guests where match_id = p_match_id) then
    delete from public.matches where id = p_match_id;
  end if;
end;
$$;

create or replace function public.cleanup_empty_match_after_member_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.delete_match_if_empty(old.match_id);
  return old;
end;
$$;

drop trigger if exists match_participants_cleanup_empty_match on public.match_participants;
create trigger match_participants_cleanup_empty_match
after delete on public.match_participants
for each row execute function public.cleanup_empty_match_after_member_delete();

drop trigger if exists match_guests_cleanup_empty_match on public.match_guests;
create trigger match_guests_cleanup_empty_match
after delete on public.match_guests
for each row execute function public.cleanup_empty_match_after_member_delete();

create or replace function public.delete_group_as_admin(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  actor_role text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select role into actor_role
  from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  if actor_role not in ('owner', 'admin') then
    raise exception 'Only group admins can delete groups';
  end if;

  delete from public.groups where id = p_group_id;
end;
$$;

revoke all on function public.delete_group_as_admin(uuid) from public;
grant execute on function public.delete_group_as_admin(uuid) to authenticated;
