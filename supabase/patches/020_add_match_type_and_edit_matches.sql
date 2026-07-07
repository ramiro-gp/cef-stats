-- Patch 020: store match type (Amistoso/Torneo) on matches so linked stats can inherit it.

alter table public.matches
  add column if not exists match_type text not null default 'friendly';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'matches_match_type_check' and conrelid = 'public.matches'::regclass) then
    alter table public.matches add constraint matches_match_type_check check (match_type in ('friendly', 'tournament'));
  end if;
end $$;

update public.matches
set match_type = 'friendly'
where match_type is null;

create or replace function public.create_match_with_invite(
  p_host_group_id uuid,
  p_title text,
  p_format text,
  p_scheduled_at timestamptz,
  p_light_team_name text,
  p_dark_team_name text,
  p_match_type text
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
  clean_match_type text := coalesce(nullif(trim(p_match_type), ''), 'friendly');
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_host_group_id is not null and not public.is_group_member(p_host_group_id) then raise exception 'Group membership required'; end if;
  if nullif(trim(p_title), '') is null then raise exception 'Match title required'; end if;
  if p_format not in ('F5', 'F6', 'F7', 'F8', 'F11') then raise exception 'Invalid match format'; end if;
  if clean_match_type not in ('friendly', 'tournament') then raise exception 'Invalid match type'; end if;
  if char_length(clean_light_name) not between 1 and 24 or char_length(clean_dark_name) not between 1 and 24 then raise exception 'Invalid team name'; end if;
  if clean_light_name = clean_dark_name then raise exception 'Team names must be different'; end if;

  loop
    generated_code := 'FUL-' || public.generate_invite_token(12);
    exit when not exists (select 1 from public.matches where invite_code = generated_code);
  end loop;

  insert into public.matches (host_group_id, title, format, match_type, invite_code, scheduled_at, created_by, light_team_name, dark_team_name)
  values (p_host_group_id, trim(p_title), p_format, clean_match_type, generated_code, p_scheduled_at, auth.uid(), clean_light_name, clean_dark_name)
  returning * into created_match;

  insert into public.match_participants (match_id, user_id, team)
  values (created_match.id, auth.uid(), null)
  on conflict (match_id, user_id) do nothing;

  return next created_match;
end;
$$;

revoke all on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text, text) from public;
grant execute on function public.create_match_with_invite(uuid, text, text, timestamptz, text, text, text) to authenticated;
