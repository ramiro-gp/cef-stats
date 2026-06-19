-- Un comentario corto por participante registrado y por partido.
-- Idempotente: puede ejecutarse más de una vez sin borrar comentarios.

create table if not exists public.match_comments (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create index if not exists match_comments_match_updated_idx
  on public.match_comments(match_id, updated_at desc);

drop trigger if exists match_comments_set_updated_at on public.match_comments;
create trigger match_comments_set_updated_at
before update on public.match_comments
for each row execute function public.set_updated_at();

create or replace function public.validate_match_comment_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.match_participants
    where match_id = new.match_id and user_id = new.user_id
  ) then
    raise exception 'Comment author must participate in the match';
  end if;
  return new;
end;
$$;

drop trigger if exists match_comments_validate_author on public.match_comments;
create trigger match_comments_validate_author
before insert or update on public.match_comments
for each row execute function public.validate_match_comment_author();

create or replace function public.clear_departed_match_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.match_comments
  where match_id = old.match_id and user_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists match_participants_clear_comment on public.match_participants;
create trigger match_participants_clear_comment
after delete on public.match_participants
for each row execute function public.clear_departed_match_comment();

alter table public.match_comments enable row level security;

drop policy if exists "match_comments_select_participant" on public.match_comments;
create policy "match_comments_select_participant" on public.match_comments
for select to authenticated
using (public.is_match_participant(match_id));

drop policy if exists "match_comments_insert_own" on public.match_comments;
create policy "match_comments_insert_own" on public.match_comments
for insert to authenticated
with check (
  user_id = auth.uid()
  and public.is_match_participant(match_id)
);

drop policy if exists "match_comments_update_own" on public.match_comments;
create policy "match_comments_update_own" on public.match_comments
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.is_match_participant(match_id)
);

drop policy if exists "match_comments_delete_own" on public.match_comments;
create policy "match_comments_delete_own" on public.match_comments
for delete to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.match_comments to authenticated;
