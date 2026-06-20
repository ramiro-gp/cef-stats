-- Agrega nombres visibles de equipos y permite que sólo el creador mueva participantes.
-- Requiere los patches 001 a 013 ya aplicados.

alter table public.matches
  add column if not exists light_team_name text not null default 'CLARO',
  add column if not exists dark_team_name text not null default 'OSCURO';

alter table public.matches
  drop constraint if exists matches_light_team_name_check,
  drop constraint if exists matches_dark_team_name_check;

alter table public.matches
  add constraint matches_light_team_name_check check (char_length(trim(light_team_name)) between 1 and 24),
  add constraint matches_dark_team_name_check check (char_length(trim(dark_team_name)) between 1 and 24);

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
    generated_code := 'CEF-' || public.generate_invite_token(12);
    exit when not exists (select 1 from public.matches where invite_code = generated_code);
  end loop;

  insert into public.matches (host_group_id, title, format, invite_code, scheduled_at, created_by, light_team_name, dark_team_name)
  values (p_host_group_id, trim(p_title), p_format, generated_code, p_scheduled_at, auth.uid(), clean_light_name, clean_dark_name)
  returning * into created_match;
  return next created_match;
end;
$$;

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text) to authenticated;

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

  maximum_slots := case target_format
    when 'F5' then 7 when 'F6' then 8 when 'F7' then 9
    when 'F8' then 10 when 'F11' then 13 else 7 end;
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
