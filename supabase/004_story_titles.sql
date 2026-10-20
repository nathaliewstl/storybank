-- StoryBank v4: story titles + practice log (for the practice streak).
-- Run AFTER 003_story_prompts.sql.
-- Paste into Supabase Dashboard > SQL Editor > New query > Run. Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Optional short story title (set by AI or the user). RLS on stories stays as it is.
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists title text
    check (title is null or char_length(trim(title)) between 1 and 120);

-- ---------------------------------------------------------------------------
-- 2. Practice log: one row each time the user presses "I practised it"
-- ---------------------------------------------------------------------------
create table if not exists public.practice_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  story_id     uuid references public.stories (id) on delete set null,
  practiced_at timestamptz not null default now()
);

create index if not exists practice_log_user_time_idx on public.practice_log (user_id, practiced_at desc);
create unique index if not exists practice_log_story_time_uq on public.practice_log (story_id, practiced_at);

alter table public.practice_log enable row level security;

drop policy if exists "Users can read their own practice log" on public.practice_log;
create policy "Users can read their own practice log"
  on public.practice_log for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add to their own practice log" on public.practice_log;
create policy "Users can add to their own practice log"
  on public.practice_log for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own practice log" on public.practice_log;
create policy "Users can delete their own practice log"
  on public.practice_log for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Logged-out visitors (anon role) get no access at all
revoke all on public.practice_log from anon;
grant select, insert, delete on public.practice_log to authenticated;

-- Backfill: the last practice of each story becomes a log entry (no duplicates on re-run)
insert into public.practice_log (user_id, story_id, practiced_at)
select s.user_id, s.id, s.last_practiced_at
from public.stories s
where s.last_practiced_at is not null
on conflict (story_id, practiced_at) do nothing;
