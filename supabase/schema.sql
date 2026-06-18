-- CEF Stats · primera etapa Supabase
-- Solo Auth, profiles y estructura mínima de grupos. Stats y partidos siguen locales.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  handle text not null unique check (handle = lower(handle) and handle ~ '^[a-z0-9._]{3,24}$'),
  avatar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists groups_set_updated_at on public.groups;
create trigger groups_set_updated_at before update on public.groups
for each row execute function public.set_updated_at();

-- El trigger crea el profile incluso cuando el proyecto exige confirmar email
-- y signUp todavía no devuelve una sesión autenticada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  normalized_handle text;
begin
  normalized_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data ->> 'handle', ''), '[^a-zA-Z0-9._]', '', 'g'));
  if normalized_handle !~ '^[a-z0-9._]{3,24}$' then
    normalized_handle := 'user_' || substring(new.id::text, 1, 8);
  end if;

  insert into public.profiles (id, name, handle, avatar)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1), 'Jugador'),
    normalized_handle,
    nullif(trim(new.raw_user_meta_data ->> 'avatar'), '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- SECURITY DEFINER evita recursión de policies al consultar group_members.
create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.shares_group_with(target_user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = target_user_id
  );
$$;

revoke all on function public.is_group_member(uuid) from public;
revoke all on function public.shares_group_with(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.shares_group_with(uuid) to authenticated;

drop policy if exists "profiles_select_related" on public.profiles;
create policy "profiles_select_related" on public.profiles
for select to authenticated
using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member" on public.groups
for select to authenticated
using (created_by = auth.uid() or public.is_group_member(id));

drop policy if exists "groups_insert_authenticated" on public.groups;
create policy "groups_insert_authenticated" on public.groups
for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "groups_update_creator" on public.groups;
create policy "groups_update_creator" on public.groups
for update to authenticated
using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "group_members_select_group" on public.group_members;
create policy "group_members_select_group" on public.group_members
for select to authenticated
using (user_id = auth.uid() or public.is_group_member(group_id));

drop policy if exists "group_members_insert_self" on public.group_members;
create policy "group_members_insert_self" on public.group_members
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    public.is_group_member(group_id)
    or exists (select 1 from public.groups where id = group_id and created_by = auth.uid())
  )
);

drop policy if exists "group_members_delete_self" on public.group_members;
create policy "group_members_delete_self" on public.group_members
for delete to authenticated
using (user_id = auth.uid());

-- Crea grupo + membresía owner en una única transacción.
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
    -- gen_random_uuid vive en pg_catalog en el PostgreSQL actual de Supabase.
    -- Evitamos depender del schema donde haya quedado instalada pgcrypto.
    generated_code := 'CEF-' || upper(substring(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 8));
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

-- Camino seguro para una futura unión por código sin abrir inserts arbitrarios.
create or replace function public.join_group_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  target_group_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select id into target_group_id from public.groups where upper(invite_code) = upper(trim(p_invite_code));
  if target_group_id is null then raise exception 'Invalid invite code'; end if;
  if exists (select 1 from public.group_members where group_id = target_group_id and user_id = auth.uid()) then
    raise exception 'Already a member';
  end if;
  insert into public.group_members (group_id, user_id, role)
  values (target_group_id, auth.uid(), 'member');
  return target_group_id;
end;
$$;

revoke all on function public.join_group_by_invite(text) from public;
grant execute on function public.join_group_by_invite(text) to authenticated;

-- Permite validar el handle antes del alta sin exponer la tabla profiles.
create or replace function public.is_handle_available(p_handle text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select not exists (
    select 1 from public.profiles where handle = lower(trim(leading '@' from p_handle))
  );
$$;

revoke all on function public.is_handle_available(text) from public;
grant execute on function public.is_handle_available(text) to anon, authenticated;

-- Estas policies son una base razonable para la etapa inicial. Antes de migrar
-- grupos reales hay que probar creación + membresía en una transacción/RPC y
-- endurecer permisos de owner/admin según las mutaciones definitivas.
