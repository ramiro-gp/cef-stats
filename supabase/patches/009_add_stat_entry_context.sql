-- Contexto opcional de cada carga y preferencias de carga del perfil.
-- Idempotente y compatible con cargas existentes.

alter table public.stat_entries
  add column if not exists match_type text not null default 'friendly',
  add column if not exists football_format text not null default 'F5',
  add column if not exists played_position text;

alter table public.profiles
  add column if not exists default_match_type text not null default 'friendly',
  add column if not exists default_football_format text not null default 'F5';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_match_type_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_match_type_check check (match_type in ('friendly', 'tournament'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_football_format_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_football_format_check check (football_format in ('F5', 'F8'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'stat_entries_played_position_check' and conrelid = 'public.stat_entries'::regclass) then
    alter table public.stat_entries add constraint stat_entries_played_position_check check (played_position is null or played_position in ('Arquero', 'Defensor', 'Mediocampista', 'Delantero'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_default_match_type_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_default_match_type_check check (default_match_type in ('friendly', 'tournament', 'ask'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_default_football_format_check' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_default_football_format_check check (default_football_format in ('F5', 'F8', 'ask'));
  end if;
end $$;
