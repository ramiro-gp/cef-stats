-- Amplía los formatos de carga sin modificar datos existentes ni RLS.
-- Ejecutar después de 009_add_stat_entry_context.sql.

alter table public.stat_entries
  drop constraint if exists stat_entries_football_format_check;

alter table public.stat_entries
  add constraint stat_entries_football_format_check
  check (football_format in ('F5', 'F6', 'F7', 'F8', 'F11'));

alter table public.profiles
  drop constraint if exists profiles_default_football_format_check;

alter table public.profiles
  add constraint profiles_default_football_format_check
  check (default_football_format in ('F5', 'F6', 'F7', 'F8', 'F11', 'ask'));
