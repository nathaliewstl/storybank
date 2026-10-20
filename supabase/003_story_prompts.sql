-- StoryBank v3: Story Sparks (reflective questions that help users remember stories).
-- Run AFTER schema.sql and 002_ai_features.sql.
-- Paste into Supabase Dashboard > SQL Editor > New query > Run. Safe to run more than once.

create table if not exists public.story_prompts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  question          text not null check (char_length(trim(question)) between 1 and 300),
  source_experience text not null default '',
  target_tag        text not null default '',
  status            text not null default 'open' check (status in ('open', 'answered', 'skipped')),
  created_at        timestamptz not null default now()
);

create index if not exists story_prompts_user_status_idx
  on public.story_prompts (user_id, status, created_at);

alter table public.story_prompts enable row level security;

drop policy if exists "Users can read their own prompts" on public.story_prompts;
create policy "Users can read their own prompts"
  on public.story_prompts for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own prompts" on public.story_prompts;
create policy "Users can insert their own prompts"
  on public.story_prompts for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own prompts" on public.story_prompts;
create policy "Users can update their own prompts"
  on public.story_prompts for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own prompts" on public.story_prompts;
create policy "Users can delete their own prompts"
  on public.story_prompts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Logged-out visitors (anon role) get no access at all
revoke all on public.story_prompts from anon;
grant select, insert, update, delete on public.story_prompts to authenticated;
