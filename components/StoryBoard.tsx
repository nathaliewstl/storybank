"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Mic, Plus, Tag as TagIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import {
  hasTag,
  normalizeStory,
  type AiErrorCode,
  type CvDocument,
  type Story,
  type Suggestion,
  type Tag,
} from "@/lib/types";
import { isToday, isTooShort, starProgress, type StarDraft } from "@/lib/star";
import PrivacyNote from "./PrivacyNote";
import GettingStarted from "./app/GettingStarted";
import StatsBar from "./app/StatsBar";
import SectionHeader from "./app/SectionHeader";
import NewStory, { type NewStoryOption } from "./app/NewStory";
import StoryGallery, { type StoryView } from "./app/StoryGallery";
import PracticePanel from "./app/PracticePanel";
import TagPanel from "./app/TagPanel";
import { TagColorProvider, buildTagColors } from "@/lib/tagColors";

// The browser stops waiting for the AI after this long and shows a friendly retry message
const AI_TIMEOUT_MS = 45_000;

export default function StoryBoard({
  userId,
  initialStories,
  initialTags,
  initialCv,
  initialSuggestions,
  initialPracticeLog,
  loadError,
}: {
  userId: string;
  initialStories: Story[];
  initialTags: Tag[];
  initialCv: CvDocument | null;
  initialSuggestions: Suggestion[];
  initialPracticeLog: string[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [stories, setStories] = useState<Story[]>(() => initialStories.map(normalizeStory));
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const [structuring, setStructuring] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, AiErrorCode | undefined>>({});
  const [newId, setNewId] = useState<string | null>(null);
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [newOption, setNewOption] = useState<NewStoryOption>("write");
  const [view, setView] = useState<StoryView>("tag");
  const [practiceLog, setPracticeLog] = useState<string[]>(initialPracticeLog);

  const tagNames = tags.map((t) => t.name);
  const tagColors = useMemo(() => buildTagColors(tags), [tags]);
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tags) counts[t.name] = stories.filter((s) => hasTag(s.tags, t.name)).length;
    return counts;
  }, [tags, stories]);
  const emptyTagCount = tags.filter((t) => tagCounts[t.name] === 0).length;
  const readyCount = stories.filter((s) => starProgress(s) === 4).length;
  const practisedTotal = stories.reduce((n, s) => n + s.practice_count, 0);
  const practisedToday = stories.some((s) => isToday(s.last_practiced_at)) || practiceLog.some((t) => isToday(t));

  // Streak = consecutive days (in the user's time zone) with at least one practice, ending today or yesterday
  const streak = useMemo(() => {
    const days = new Set([...practiceLog, ...stories.map((s) => s.last_practiced_at).filter(Boolean) as string[]]
      .map((t) => new Date(t).toDateString()));
    const d = new Date();
    if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
    let n = 0;
    while (days.has(d.toDateString())) {
      n++;
      d.setDate(d.getDate() - 1);
    }
    return n;
  }, [practiceLog, stories]);

  // Practise only Ready stories (STAR 4/4), least practised first
  const practiceStory = useMemo(() => {
    const chosen = practiceId ? stories.find((s) => s.id === practiceId) : undefined;
    if (chosen) return chosen;
    return stories
      .filter((s) => starProgress(s) === 4)
      .sort((a, b) => {
        const at = a.last_practiced_at ? Date.parse(a.last_practiced_at) : 0;
        const bt = b.last_practiced_at ? Date.parse(b.last_practiced_at) : 0;
        return a.practice_count - b.practice_count || at - bt;
      })[0];
  }, [stories, practiceId]);

  // After saving: bring the new story into view and highlight it (focus stays in the composer)
  useEffect(() => {
    if (!newId) return;
    const el = document.querySelector(`[data-story-id="${newId}"]`);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }, [newId]);

  function replaceStory(row: Story) {
    const story = normalizeStory(row);
    setStories((prev) => prev.map((s) => (s.id === story.id ? story : s)));
  }

  // Runs AFTER a story is saved. Never blocks or undoes the save.
  async function structure(id: string, context?: string) {
    setStructuring((m) => ({ ...m, [id]: true }));
    setAiErrors((m) => ({ ...m, [id]: undefined }));
    try {
      const res = await fetch("/api/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: id, context }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
      const json = await res.json().catch(() => ({}));
      if (json.story) replaceStory(json.story as Story);
      if (!res.ok) setAiErrors((m) => ({ ...m, [id]: (json.error as AiErrorCode) ?? "ai_failed" }));
    } catch (err) {
      const timedOut = (err as Error).name === "TimeoutError" || (err as Error).name === "AbortError";
      setAiErrors((m) => ({ ...m, [id]: timedOut ? "timeout" : "ai_failed" }));
    } finally {
      setStructuring((m) => ({ ...m, [id]: false }));
    }
  }

  // All mutations return a friendly error message, or null on success,
  // so each form can show the error next to itself.
  async function insertStory(fields: Partial<Story>): Promise<[Story | null, string | null]> {
    let { data, error } = await supabase.from("stories").insert(fields).select().single();
    // PGRST204 = unknown column: the title column isn't there yet (004 not run) -> save without it
    if (error?.code === "PGRST204" && "title" in fields) {
      const { title: _ignored, ...rest } = fields;
      ({ data, error } = await supabase.from("stories").insert(rest).select().single());
    }
    if (error) return [null, friendlyError(error, "We couldn't save your story. Please try again.")];
    const story = normalizeStory(data as Story);
    setStories((prev) => [story, ...prev]);
    setNewId(story.id);
    return [story, null];
  }

  async function addStory(draft: StarDraft, draftTags: string[], title = "") {
    const [story, err] = await insertStory({
      ...(title ? { title } : {}),
      description: draft.description.trim(),
      situation: draft.situation.trim(),
      task: draft.task.trim(),
      action: draft.action.trim(),
      result: draft.result.trim(),
      tags: draftTags,
    });
    if (!story) return err;
    // Too short for the AI (same rule as the server): show "Too short for AI" right away, skip the call
    if (!isTooShort(story)) void structure(story.id);
    return null;
  }

  async function addFromSuggestion(s: Suggestion) {
    const [story, err] = await insertStory({ description: s.title, tags: s.tags });
    if (!story) return err;
    await supabase.from("story_suggestions").delete().eq("id", s.id);
    void structure(story.id, s.source_experience);
    return null;
  }

  // Story Sparks: the answer becomes a normal story; the question gives the AI context
  async function addFromSpark(answer: string, sparkTags: string[], question: string) {
    const [story, err] = await insertStory({ description: answer, tags: sparkTags });
    if (!story) return err;
    if (!isTooShort(story)) void structure(story.id, `Interview question this answers: ${question}`);
    return null;
  }

  async function updateStory(id: string, patch: Partial<Story>) {
    let { data, error } = await supabase.from("stories").update(patch).eq("id", id).select().single();
    if (error?.code === "PGRST204" && "title" in patch) {
      const { title: _ignored, ...rest } = patch;
      ({ data, error } = await supabase.from("stories").update(rest).eq("id", id).select().single());
    }
    if (error) return friendlyError(error, "We couldn't save your changes. Please try again.");
    replaceStory(data as Story);
    return null;
  }

  async function deleteStory(id: string) {
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) return friendlyError(error, "We couldn't delete this story. Please try again.");
    setStories((prev) => prev.filter((s) => s.id !== id));
    if (practiceId === id) setPracticeId(null);
    return null;
  }

  async function markPractised(s: Story) {
    const now = new Date().toISOString();
    const err = await updateStory(s.id, { practice_count: s.practice_count + 1, last_practiced_at: now });
    if (err) return err;
    // Log it for the streak (ignore a missing table before 004 is run)
    const { error: logError } = await supabase.from("practice_log").insert({ story_id: s.id, practiced_at: now });
    if (logError && logError.code !== "PGRST205") console.error("[StoryBank] practice log", logError);
    setPracticeLog((prev) => [now, ...prev]);
    setPracticeId(null);
    return null;
  }

  function practiseNow(id: string) {
    setPracticeId(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() =>
      document.getElementById("practice-panel")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
    );
  }

  async function addTag(name: string) {
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!clean) return null;
    if (hasTag(tagNames, clean)) return "You already have this tag.";

    const { data, error } = await supabase
      .from("tags")
      .insert({ name: clean })
      .select("id, name, is_default")
      .single();
    if (error) {
      return error.code === "23505"
        ? "You already have this tag."
        : friendlyError(error, "We couldn't add this tag. Please try again.");
    }
    setTags((prev) => [...prev, data as Tag]);
    return null;
  }

  async function deleteTag(tag: Tag) {
    const { error } = await supabase.from("tags").delete().eq("id", tag.id);
    if (error) return friendlyError(error, "We couldn't delete this tag. Please try again.");
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    return null;
  }

  return (
    <TagColorProvider value={tagColors}>
    <div className="page-wash" aria-hidden="true" />
    <div className="container app-page">
      <header className="page-head">
        <h1 className="h1">Your story bank</h1>
        {stories.length === 0 && <p className="muted">Start by adding your first story below.</p>}
      </header>

      {stories.length > 0 && (
        <StatsBar stories={stories.length} ready={readyCount} emptyTags={emptyTagCount} practised={practisedTotal} />
      )}
      {stories.length < 3 && <GettingStarted />}

      <SectionHeader
        id="add-story"
        accent="indigo"
        icon={<Plus size={18} strokeWidth={2} />}
        title="Add a story"
        subtitle="Pick one way to add it."
      />
      <NewStory
        userId={userId}
        tagNames={tagNames}
        inputRef={composerRef}
        initialCv={initialCv}
        initialSuggestions={initialSuggestions}
        onAdd={addStory}
        onAddFromCv={addFromSuggestion}
        onCreateTag={addTag}
        onSaveSpark={addFromSpark}
        option={newOption}
        onOptionChange={setNewOption}
      />

      <SectionHeader
        id="my-stories"
        accent="teal"
        icon={<BookOpen size={18} strokeWidth={1.75} />}
        title={`Your stories (${stories.length})`}
        subtitle="Click a story to see the full STAR answer."
        actions={
          stories.length > 0 && (
            <div className="segmented" role="group" aria-label="Show stories">
              <button type="button" aria-pressed={view === "tag"} onClick={() => setView("tag")}>
                By tag
              </button>
              <button type="button" aria-pressed={view === "all"} onClick={() => setView("all")}>
                All
              </button>
            </div>
          )
        }
      />
      <StoryGallery
        view={view}
        stories={stories}
        tagNames={tagNames}
        newId={newId}
        structuring={structuring}
        aiErrors={aiErrors}
        loadError={loadError}
        onRetry={(id) => structure(id)}
        onSave={updateStory}
        onDelete={deleteStory}
        onPracticeNow={practiseNow}
        onWriteFirst={() => {
          setNewOption("write");
          requestAnimationFrame(() => composerRef.current?.focus());
        }}
      />

      <div className="bottom-grid">
        <div className="bottom-col">
          <SectionHeader
            id="practice-panel"
            accent="rose"
            icon={<Mic size={18} strokeWidth={1.75} />}
            title="Practise today"
            subtitle="Answer one interview question out loud."
          />
          <PracticePanel story={practiceStory} practisedToday={practisedToday} streak={streak} onPractised={markPractised} />
        </div>
        <div className="bottom-col">
          <SectionHeader
            id="your-tags"
            accent="violet"
            icon={<TagIcon size={18} strokeWidth={1.75} />}
            title="Your tags"
            subtitle="Tags group your stories by topic."
          />
          <TagPanel tags={tags} counts={tagCounts} onAdd={addTag} onDelete={deleteTag} />
        </div>
      </div>

      <PrivacyNote />
    </div>
    </TagColorProvider>
  );
}
