-- Patch 019: preserve stats when deleting groups and add per-group defaults for match type/format.

alter table public.groups
  add column if not exists default_match_type text not null default 'friendly',
  add column if not exists default_football_format text not null default 'F5';

alter table public.stat_entries
  add column if not exists deleted_group_name text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'groups_default_match_type_check' and conrelid = 'public.groups'::regclass) then
    alter table public.groups add constraint groups_default_match_type_check
      check (default_match_type in ('friendly', 'tournament'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'groups_default_football_format_check' and conrelid = 'public.groups'::regclass) then
    alter table public.groups add constraint groups_default_football_format_check
      check (default_football_format in ('F5', 'F6', 'F7', 'F8', 'F11'));
  end if;
end $$;

do $$
begin
  alter table public.stat_entries drop constraint if exists stat_entries_group_id_fkey;
  alter table public.stat_entries
    add constraint stat_entries_group_id_fkey
    foreign key (group_id) references public.groups(id) on delete set null;
end $$;

create index if not exists stat_entries_deleted_group_name_idx
  on public.stat_entries(deleted_group_name)
  where deleted_group_name is not null;

delete from public.matches m
where not exists (select 1 from public.match_participants mp where mp.match_id = m.id)
  and not exists (select 1 from public.match_guests mg where mg.match_id = m.id);

create or replace function public.delete_group_as_admin(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  actor_role text;
  target_group_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select gm.role, g.name into actor_role, target_group_name
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  where gm.group_id = p_group_id and gm.user_id = auth.uid();

  if actor_role not in ('owner', 'admin') then
    raise exception 'Only group admins can delete groups';
  end if;

  if target_group_name is null then
    raise exception 'Group not found';
  end if;

  update public.stat_entries
  set scope_type = 'personal',
      group_id = null,
      deleted_group_name = coalesce(deleted_group_name, target_group_name || ' (eliminado)'),
      updated_at = now()
  where group_id = p_group_id;

  delete from public.groups where id = p_group_id;
end;
$$;

revoke all on function public.delete_group_as_admin(uuid) from public;
grant execute on function public.delete_group_as_admin(uuid) to authenticated;
