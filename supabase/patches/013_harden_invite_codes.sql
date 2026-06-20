-- Fortalece los códigos nuevos de grupos y partidos sin modificar códigos existentes.
-- Requiere los patches 001 a 012 ya aplicados.

create or replace function public.generate_invite_token(p_length integer default 12)
returns text
language plpgsql
volatile
security definer set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  entropy bytea := uuid_send(pg_catalog.gen_random_uuid());
  token text := '';
  position integer;
begin
  if p_length < 8 or p_length > 16 then
    raise exception 'Invite token length must be between 8 and 16';
  end if;

  for position in 0..p_length - 1 loop
    token := token || substr(alphabet, (get_byte(entropy, position) % length(alphabet)) + 1, 1);
  end loop;
  return token;
end;
$$;

revoke all on function public.generate_invite_token(integer) from public;

create or replace function public.create_group_with_membership(p_name text)
returns table (
  id uuid,
  name text,
  invite_code text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer set search_path = public
as $$
declare
  created_group public.groups;
  generated_code text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_name), '') is null then raise exception 'Group name required'; end if;

  loop
    generated_code := 'CEF-' || public.generate_invite_token(12);
    exit when not exists (select 1 from public.groups existing where existing.invite_code = generated_code);
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (trim(p_name), generated_code, auth.uid())
  returning * into created_group;

  insert into public.group_members (group_id, user_id, role)
  values (created_group.id, auth.uid(), 'owner');

  return query select created_group.id, created_group.name, created_group.invite_code, created_group.created_by, created_group.created_at, created_group.updated_at;
end;
$$;

revoke all on function public.create_group_with_membership(text) from public;
grant execute on function public.create_group_with_membership(text) to authenticated;

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
    generated_code := 'CEF-' || public.generate_invite_token(12);
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
