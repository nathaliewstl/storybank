-- StoryBank schema: paste into Supabase Dashboard > SQL Editor > New query > Run.
-- Safe to run more than once.

create table if not exists public.stories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  description       text not null check (char_length(trim(description)) between 1 and 500),
  situation         text not null default '',
  task              text not null default '',
  action            text not null default '',
  result            text not null default '',
  tags              text[] not null default '{}',
  practice_count    integer not null default 0 check (practice_count >= 0),
  last_practiced_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists stories_user_id_created_at_idx
  on public.stories (user_id, created_at desc);

-- Keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stories_set_updated_at on public.stories;
create trigger stories_set_updated_at
  before update on public.stories
  for each row execute function public.set_updated_at();

-- Row Level Security: each user can only see and change their own stories
alter table public.stories enable row level security;

drop policy if exists "Users can read their own stories" on public.stories;
create policy "Users can read their own stories"
  on public.stories for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own stories" on public.stories;
create policy "Users can insert their own stories"
  on public.stories for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own stories" on public.stories;
create policy "Users can update their own stories"
  on public.stories for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own stories" on public.stories;
create policy "Users can delete their own stories"
  on public.stories for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Logged-out visitors (anon role) get no access at all
revoke all on public.stories from anon;
grant select, insert, update, delete on public.stories to authenticated;
