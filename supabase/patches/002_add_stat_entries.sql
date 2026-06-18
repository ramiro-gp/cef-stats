-- CEF Stats · stats remotas para usuarios autenticados.
-- Idempotente: puede ejecutarse más de una vez sin borrar datos.

create table if not exists public.stat_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope_type text not null,
  group_id uuid references public.groups(id) on delete cascade,
  result text not null,
  goals integer not null default 0,
  assists integer not null default 0,
  local_match_id text,
  team text,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columnas transitorias sin FK: permiten vincular una stat remota con un
-- partido que todavía vive solamente en localStorage.
alter table public.stat_entries add column if not exists local_match_id text;
alter table public.stat_entries add column if not exists team text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_scope_type_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_scope_type_check check (scope_type in ('personal', 'group'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_scope_group_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_scope_group_check check (
      (scope_type = 'personal' and group_id is null)
      or (scope_type = 'group' and group_id is not null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_result_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_result_check check (result in ('win', 'draw', 'loss'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_goals_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_goals_check check (goals >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_assists_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_assists_check check (assists >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_team_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_team_check check (team is null or team in ('light', 'dark'));
  end if;
end $$;

create index if not exists stat_entries_user_id_idx on public.stat_entries(user_id);
create index if not exists stat_entries_group_id_idx on public.stat_entries(group_id);
create index if not exists stat_entries_played_at_idx on public.stat_entries(played_at desc);
create index if not exists stat_entries_scope_type_idx on public.stat_entries(scope_type);
create index if not exists stat_entries_local_match_id_idx on public.stat_entries(local_match_id) where local_match_id is not null;

drop trigger if exists stat_entries_set_updated_at on public.stat_entries;
create trigger stat_entries_set_updated_at before update on public.stat_entries
for each row execute function public.set_updated_at();

alter table public.stat_entries enable row level security;

drop policy if exists "stat_entries_select_scope" on public.stat_entries;
create policy "stat_entries_select_scope" on public.stat_entries
for select to authenticated
using (
  (scope_type = 'personal' and user_id = auth.uid())
  or (scope_type = 'group' and public.is_group_member(group_id))
);

drop policy if exists "stat_entries_insert_own" on public.stat_entries;
create policy "stat_entries_insert_own" on public.stat_entries
for insert to authenticated
with check (
  user_id = auth.uid()
  and (
    (scope_type = 'personal' and group_id is null)
    or (scope_type = 'group' and group_id is not null and public.is_group_member(group_id))
  )
);

drop policy if exists "stat_entries_update_own" on public.stat_entries;
create policy "stat_entries_update_own" on public.stat_entries
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    (scope_type = 'personal' and group_id is null)
    or (scope_type = 'group' and group_id is not null and public.is_group_member(group_id))
  )
);

drop policy if exists "stat_entries_delete_own" on public.stat_entries;
create policy "stat_entries_delete_own" on public.stat_entries
for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.stat_entries to authenticated;
