-- StoryBank v5: remember when Story Sparks last tried to generate CV questions,
-- so a failed attempt is retried in the background at most once every 10 minutes.
-- Run AFTER 004_story_titles.sql.
-- Paste into Supabase Dashboard > SQL Editor > New query > Run. Safe to run more than once.
-- RLS on cv_documents stays as it is (users can only update their own row).

alter table public.cv_documents
  add column if not exists sparks_attempt_at timestamptz;
