-- StoryBank v2: tags, AI structuring, CV upload.
-- Run AFTER schema.sql. Paste into Supabase Dashboard > SQL Editor > New query > Run.
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 1. Stories: AI status + suggested tags
-- ---------------------------------------------------------------------------
alter table public.stories
  add column if not exists ai_status text not null default 'unstructured'
    check (ai_status in ('unstructured', 'structured')),
  add column if not exists suggested_tags text[] not null default '{}';

-- ---------------------------------------------------------------------------
-- 2. Tags (default + custom), one list per user
-- ---------------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 40),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists tags_user_name_uq on public.tags (user_id, lower(name));

alter table public.tags enable row level security;

drop policy if exists "Users can read their own tags" on public.tags;
create policy "Users can read their own tags"
  on public.tags for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users can only create custom tags (default tags are created by seed_my_default_tags)
drop policy if exists "Users can create their own custom tags" on public.tags;
create policy "Users can create their own custom tags"
  on public.tags for insert
  to authenticated
  with check ((select auth.uid()) = user_id and is_default = false);

-- Users can only delete their own custom tags, never the default ones
drop policy if exists "Users can delete their own custom tags" on public.tags;
create policy "Users can delete their own custom tags"
  on public.tags for delete
  to authenticated
  using ((select auth.uid()) = user_id and is_default = false);

revoke all on public.tags from anon;
grant select, insert, delete on public.tags to authenticated;

-- Gives the logged-in user the 8 default tags (called by the app on first visit to /app)
create or replace function public.seed_my_default_tags()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.tags (user_id, name, is_default)
  select auth.uid(), t.name, true
  from unnest(array[
    'Leadership', 'Teamwork', 'Conflict', 'Failure',
    'Impact', 'Initiative', 'Adaptability', 'Motivation'
  ]) as t(name)
  on conflict (user_id, lower(name)) do nothing;
end;
$$;

revoke execute on function public.seed_my_default_tags() from public, anon;
grant execute on function public.seed_my_default_tags() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. CV document (one per user). Stores only the REDACTED text.
-- ---------------------------------------------------------------------------
create table if not exists public.cv_documents (
  user_id        uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  file_path      text not null,
  file_name      text not null,
  extracted_text text,
  uploaded_at    timestamptz not null default now(),
  analyzed_at    timestamptz
);

alter table public.cv_documents enable row level security;

drop policy if exists "Users can read their own CV" on public.cv_documents;
create policy "Users can read their own CV"
  on public.cv_documents for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own CV" on public.cv_documents;
create policy "Users can insert their own CV"
  on public.cv_documents for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own CV" on public.cv_documents;
create policy "Users can update their own CV"
  on public.cv_documents for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own CV" on public.cv_documents;
create policy "Users can delete their own CV"
  on public.cv_documents for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.cv_documents from anon;
grant select, insert, update, delete on public.cv_documents to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Story suggestions generated from the CV (drafts until "Add as story")
-- ---------------------------------------------------------------------------
create table if not exists public.story_suggestions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title             text not null check (char_length(trim(title)) between 1 and 200),
  source_experience text not null default '',
  tags              text[] not null default '{}',
  created_at        timestamptz not null default now()
);

create index if not exists story_suggestions_user_id_idx on public.story_suggestions (user_id);

alter table public.story_suggestions enable row level security;

drop policy if exists "Users can read their own suggestions" on public.story_suggestions;
create policy "Users can read their own suggestions"
  on public.story_suggestions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own suggestions" on public.story_suggestions;
create policy "Users can insert their own suggestions"
  on public.story_suggestions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own suggestions" on public.story_suggestions;
create policy "Users can delete their own suggestions"
  on public.story_suggestions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.story_suggestions from anon;
grant select, insert, delete on public.story_suggestions to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Private Storage bucket for CVs: files live at cvs/<user id>/cv.pdf
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cvs', 'cvs', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own CV file" on storage.objects;
create policy "Users can read their own CV file"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own CV file" on storage.objects;
create policy "Users can upload their own CV file"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can replace their own CV file" on storage.objects;
create policy "Users can replace their own CV file"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own CV file" on storage.objects;
create policy "Users can delete their own CV file"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
