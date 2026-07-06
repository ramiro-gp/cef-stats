-- Permite que owner/admin de un grupo eche integrantes sin abrir una policy global de delete.
-- El usuario puede seguir saliendo por la policy existente "group_members_delete_self".

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_group_admin(uuid) to authenticated;

create or replace function public.kick_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  target_role text;
  remaining_owners integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select role into actor_role
  from public.group_members
  where group_id = p_group_id and user_id = auth.uid();

  if actor_role not in ('owner', 'admin') then
    raise exception 'Only group admins can kick members';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Use leave group for yourself';
  end if;

  select role into target_role
  from public.group_members
  where group_id = p_group_id and user_id = p_user_id;

  if target_role is null then
    raise exception 'Member not found';
  end if;

  if actor_role = 'admin' and target_role in ('owner', 'admin') then
    raise exception 'Admins can only kick regular members';
  end if;

  if target_role = 'owner' then
    select count(*) into remaining_owners
    from public.group_members
    where group_id = p_group_id and role = 'owner' and user_id <> p_user_id;

    if remaining_owners < 1 then
      raise exception 'Cannot remove the last owner';
    end if;
  end if;

  delete from public.group_members
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

grant execute on function public.kick_group_member(uuid, uuid) to authenticated;
