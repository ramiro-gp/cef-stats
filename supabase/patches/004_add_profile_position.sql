-- Posición opcional del jugador, editable desde Perfil.

alter table public.profiles
  add column if not exists position text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_position_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_position_check
      check (position is null or position in ('Arquero', 'Defensor', 'Mediocampista', 'Delantero'));
  end if;
end
$$;
