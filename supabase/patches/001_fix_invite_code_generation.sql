-- CEF Stats · patch 001
-- Corrige la creación de invite_code sin borrar datos ni recrear tablas.
-- Es idempotente: CREATE OR REPLACE puede ejecutarse más de una vez.

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
    -- pg_catalog.gen_random_uuid() no depende del schema de la extensión pgcrypto.
    generated_code := 'CEF-' || upper(substring(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1
      from public.groups existing
      where existing.invite_code = generated_code
    );
  end loop;

  insert into public.groups (name, invite_code, created_by)
  values (trim(p_name), generated_code, auth.uid())
  returning * into created_group;

  insert into public.group_members (group_id, user_id, role)
  values (created_group.id, auth.uid(), 'owner');

  return query
  select
    created_group.id,
    created_group.name,
    created_group.invite_code,
    created_group.created_by,
    created_group.created_at,
    created_group.updated_at;
end;
$$;

revoke all on function public.create_group_with_membership(text) from public;
grant execute on function public.create_group_with_membership(text) to authenticated;
