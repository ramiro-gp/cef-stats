-- Separa asistencia al partido de la elección de equipo.
-- Un link/código válido crea match_participants con team null y nunca toca group_members.

alter table public.match_participants
  alter column team drop not null;

alter table public.match_participants
  drop constraint if exists match_participants_team_check;

alter table public.match_participants
  add constraint match_participants_team_check
  check (team is null or team in ('light', 'dark'));

create or replace function public.attend_match_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_match_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select id into target_match_id
  from public.matches
  where upper(invite_code) = upper(trim(p_invite_code));

  if target_match_id is null then raise exception 'Invalid match invite code'; end if;

  insert into public.match_participants (match_id, user_id, team)
  values (target_match_id, auth.uid(), null)
  on conflict (match_id, user_id) do nothing;

  return target_match_id;
end;
$$;

revoke all on function public.attend_match_by_invite(text) from public;
grant execute on function public.attend_match_by_invite(text) to authenticated;
