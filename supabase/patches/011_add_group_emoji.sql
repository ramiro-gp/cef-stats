-- Emoji de identidad para grupos. Compatible con grupos existentes.

alter table public.groups
  add column if not exists group_emoji text not null default '⚽';

update public.groups set group_emoji = '⚽'
where group_emoji is null or trim(group_emoji) = '';
