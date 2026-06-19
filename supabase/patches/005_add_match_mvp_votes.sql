-- Un voto MVP por participante registrado y por partido.
-- Idempotente: puede ejecutarse más de una vez sin borrar votos.

create table if not exists public.match_mvp_votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  voter_user_id uuid not null references public.profiles(id) on delete cascade,
  voted_user_id uuid references public.profiles(id) on delete cascade,
  voted_guest_id uuid references public.match_guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, voter_user_id),
  check (num_nonnulls(voted_user_id, voted_guest_id) = 1)
);

create index if not exists match_mvp_votes_match_idx on public.match_mvp_votes(match_id);
create index if not exists match_mvp_votes_voter_idx on public.match_mvp_votes(voter_user_id);

drop trigger if exists match_mvp_votes_set_updated_at on public.match_mvp_votes;
create trigger match_mvp_votes_set_updated_at
before update on public.match_mvp_votes
for each row execute function public.set_updated_at();

create or replace function public.validate_match_mvp_vote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.match_participants
    where match_id = new.match_id and user_id = new.voter_user_id
  ) then
    raise exception 'MVP voter must participate in the match';
  end if;

  if new.voted_user_id is not null and not exists (
    select 1 from public.match_participants
    where match_id = new.match_id and user_id = new.voted_user_id
  ) then
    raise exception 'MVP user must participate in the match';
  end if;

  if new.voted_guest_id is not null and not exists (
    select 1 from public.match_guests
    where match_id = new.match_id and id = new.voted_guest_id
  ) then
    raise exception 'MVP guest must belong to the match';
  end if;

  return new;
end;
$$;

drop trigger if exists match_mvp_votes_validate on public.match_mvp_votes;
create trigger match_mvp_votes_validate
before insert or update on public.match_mvp_votes
for each row execute function public.validate_match_mvp_vote();

create or replace function public.clear_departed_match_mvp_votes()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.match_mvp_votes
  where match_id = old.match_id
    and (voter_user_id = old.user_id or voted_user_id = old.user_id);
  return old;
end;
$$;

drop trigger if exists match_participants_clear_mvp_votes on public.match_participants;
create trigger match_participants_clear_mvp_votes
after delete on public.match_participants
for each row execute function public.clear_departed_match_mvp_votes();

alter table public.match_mvp_votes enable row level security;

drop policy if exists "match_mvp_votes_select_viewer" on public.match_mvp_votes;
create policy "match_mvp_votes_select_viewer" on public.match_mvp_votes
for select to authenticated
using (public.can_view_match(match_id));

drop policy if exists "match_mvp_votes_insert_own" on public.match_mvp_votes;
create policy "match_mvp_votes_insert_own" on public.match_mvp_votes
for insert to authenticated
with check (
  voter_user_id = auth.uid()
  and public.is_match_participant(match_id)
);

drop policy if exists "match_mvp_votes_update_own" on public.match_mvp_votes;
create policy "match_mvp_votes_update_own" on public.match_mvp_votes
for update to authenticated
using (voter_user_id = auth.uid())
with check (
  voter_user_id = auth.uid()
  and public.is_match_participant(match_id)
);

drop policy if exists "match_mvp_votes_delete_own" on public.match_mvp_votes;
create policy "match_mvp_votes_delete_own" on public.match_mvp_votes
for delete to authenticated
using (voter_user_id = auth.uid());

grant select, insert, update, delete on public.match_mvp_votes to authenticated;

-- Conserva la selección legacy como voto del creador cuando el creador participa.
insert into public.match_mvp_votes (match_id, voter_user_id, voted_user_id, voted_guest_id)
select m.id, m.created_by, m.mvp_user_id, m.mvp_guest_id
from public.matches m
where num_nonnulls(m.mvp_user_id, m.mvp_guest_id) = 1
  and exists (
    select 1 from public.match_participants p
    where p.match_id = m.id and p.user_id = m.created_by
  )
on conflict (match_id, voter_user_id) do nothing;
