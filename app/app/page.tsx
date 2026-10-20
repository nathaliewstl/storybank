import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryBoard from "@/components/StoryBoard";
import type { CvDocument, Story, Suggestion, Tag } from "@/lib/types";

export const metadata: Metadata = { title: "My stories — StoryBank" };

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const loadTags = () =>
    supabase.from("tags").select("id, name, is_default").order("is_default", { ascending: false }).order("created_at");

  const [storiesRes, tagsRes, cvRes, suggestionsRes, logRes] = await Promise.all([
    supabase.from("stories").select("*").order("created_at", { ascending: false }),
    loadTags(),
    supabase.from("cv_documents").select("file_name, uploaded_at, analyzed_at").maybeSingle(),
    supabase.from("story_suggestions").select("id, title, source_experience, tags").order("created_at"),
    // Practice history for the streak (table added in 004; missing table = empty history)
    supabase.from("practice_log").select("practiced_at").order("practiced_at", { ascending: false }).limit(400),
  ]);

  // First visit: give the user the default tag list
  let tags = (tagsRes.data as Tag[] | null) ?? [];
  if (!tagsRes.error && tags.length === 0) {
    await supabase.rpc("seed_my_default_tags");
    // Next.js memoizes identical GET requests within one render, so a plain
    // second loadTags() would return the first (empty) result. A fresh
    // AbortSignal opts this request out of memoization.
    const reloaded = await loadTags().abortSignal(new AbortController().signal);
    tags = (reloaded.data as Tag[] | null) ?? [];
  }

  return (
    <StoryBoard
      userId={user.id}
      initialStories={(storiesRes.data as Story[] | null) ?? []}
      initialTags={tags}
      initialCv={(cvRes.data as CvDocument | null) ?? null}
      initialSuggestions={(suggestionsRes.data as Suggestion[] | null) ?? []}
      initialPracticeLog={((logRes.data as { practiced_at: string }[] | null) ?? []).map((r) => r.practiced_at)}
      loadError={storiesRes.error ? "We couldn't load your stories. Please refresh the page." : null}
    />
  );
}
