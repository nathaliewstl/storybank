"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Story = {
  id: string;
  user_id: string;
  description: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  practice_count: number;
  last_practiced_at: string | null;
  created_at: string;
};

type Draft = Pick<Story, "description" | "situation" | "task" | "action" | "result"> & {
  tagsText: string;
};

const EMPTY_DRAFT: Draft = {
  description: "",
  situation: "",
  task: "",
  action: "",
  result: "",
  tagsText: "",
};

const STAR_FIELDS = [
  { key: "situation", label: "Situation", hint: "Where were you, and what was the context?" },
  { key: "task", label: "Task", hint: "What were you responsible for?" },
  { key: "action", label: "Action", hint: "What did you do, specifically?" },
  { key: "result", label: "Result", hint: "What happened? Use numbers if you can." },
] as const;

function parseTags(text: string): string[] {
  const tags = text
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(tags));
}

function isToday(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

function starProgress(s: Story) {
  return STAR_FIELDS.filter((f) => s[f.key].trim() !== "").length;
}

export default function StoryBoard({
  initialStories,
  loadError,
}: {
  initialStories: Story[];
  loadError: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [stories, setStories] = useState<Story[]>(initialStories);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(loadError);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const allTags = useMemo(
    () => Array.from(new Set(stories.flatMap((s) => s.tags))).sort(),
    [stories]
  );
  const visible = tagFilter ? stories.filter((s) => s.tags.includes(tagFilter)) : stories;

  const practicedToday = stories.some((s) => isToday(s.last_practiced_at));
  const nextToPractice = useMemo(() => {
    return [...stories].sort((a, b) => {
      const at = a.last_practiced_at ? Date.parse(a.last_practiced_at) : 0;
      const bt = b.last_practiced_at ? Date.parse(b.last_practiced_at) : 0;
      return at - bt || Date.parse(a.created_at) - Date.parse(b.created_at);
    })[0];
  }, [stories]);

  async function addStory(e: React.FormEvent) {
    e.preventDefault();
    const description = draft.description.trim();
    if (!description) return;
    setSaving(true);
    setError(null);

    const { data, error } = await supabase
      .from("stories")
      .insert({
        description,
        situation: draft.situation.trim(),
        task: draft.task.trim(),
        action: draft.action.trim(),
        result: draft.result.trim(),
        tags: parseTags(draft.tagsText),
      })
      .select()
      .single();

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStories((prev) => [data as Story, ...prev]);
    setDraft(EMPTY_DRAFT);
    setShowDetails(false);
  }

  async function updateStory(id: string, patch: Partial<Story>) {
    setError(null);
    const { data, error } = await supabase
      .from("stories")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      setError(error.message);
      return false;
    }
    setStories((prev) => prev.map((s) => (s.id === id ? (data as Story) : s)));
    return true;
  }

  async function deleteStory(id: string) {
    if (!confirm("Delete this story? This cannot be undone.")) return;
    setError(null);
    const { error } = await supabase.from("stories").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setStories((prev) => prev.filter((s) => s.id !== id));
  }

  function markPracticed(s: Story) {
    return updateStory(s.id, {
      practice_count: s.practice_count + 1,
      last_practiced_at: new Date().toISOString(),
    });
  }

  return (
    <div className="container app-grid">
      <section className="card" aria-labelledby="add-heading">
        <h1 id="add-heading" className="h2">Add a story</h1>
        <form onSubmit={addStory} className="stack">
          <label className="field">
            <span>Short description</span>
            <input
              type="text"
              required
              maxLength={500}
              placeholder="e.g. Led my team's marketing case competition"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              data-testid="core-input"
            />
          </label>

          <button
            type="button"
            className="text-link toggle"
            aria-expanded={showDetails}
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? "− Hide STAR details" : "+ Add STAR details & tags (optional)"}
          </button>

          {showDetails && (
            <div className="stack">
              {STAR_FIELDS.map((f) => (
                <label className="field" key={f.key}>
                  <span>{f.label}</span>
                  <textarea
                    rows={2}
                    placeholder={f.hint}
                    value={draft[f.key]}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  />
                </label>
              ))}
              <label className="field">
                <span>Tags</span>
                <input
                  type="text"
                  placeholder="leadership, teamwork, conflict"
                  value={draft.tagsText}
                  onChange={(e) => setDraft({ ...draft, tagsText: e.target.value })}
                />
                <small className="muted">Separate tags with commas.</small>
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving} data-testid="core-submit">
            {saving ? "Saving…" : "Save story"}
          </button>
        </form>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>

      {nextToPractice && (
        <section className="card practice" aria-labelledby="practice-heading">
          <div className="practice-head">
            <h2 id="practice-heading" className="h2">Today&apos;s practice</h2>
            {practicedToday && <span className="badge badge-success">✓ Done today</span>}
          </div>
          <PracticeCard key={nextToPractice.id} story={nextToPractice} onPracticed={markPracticed} />
        </section>
      )}

      <section aria-labelledby="list-heading" className="list-section">
        <div className="list-head">
          <h2 id="list-heading" className="h2">
            My stories <span className="muted">({stories.length})</span>
          </h2>
        </div>

        {allTags.length > 0 && (
          <div className="tag-filter" role="group" aria-label="Filter by tag">
            <button
              type="button"
              className={`chip ${tagFilter === null ? "chip-active" : ""}`}
              aria-pressed={tagFilter === null}
              onClick={() => setTagFilter(null)}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${tagFilter === t ? "chip-active" : ""}`}
                aria-pressed={tagFilter === t}
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {stories.length === 0 ? (
          <p className="empty card">
            No stories yet. Add your first one above — even a single line is a great start.
          </p>
        ) : (
          <ul className="story-list">
            {visible.map((s) => (
              <StoryItem key={s.id} story={s} onSave={updateStory} onDelete={deleteStory} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function PracticeCard({
  story,
  onPracticed,
}: {
  story: Story;
  onPracticed: (s: Story) => Promise<boolean>;
}) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const filled = STAR_FIELDS.filter((f) => story[f.key].trim() !== "");

  return (
    <div className="stack">
      <p className="practice-prompt">
        Tell this story out loud in under 2 minutes:
        <strong> {story.description}</strong>
      </p>
      {revealed ? (
        filled.length > 0 ? (
          <dl className="star">
            {filled.map((f) => (
              <div key={f.key}>
                <dt>{f.label}</dt>
                <dd>{story[f.key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">No STAR details yet — add them to make this story stronger.</p>
        )
      ) : null}
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={() => setRevealed((v) => !v)}>
          {revealed ? "Hide notes" : "Show my notes"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onPracticed(story);
            setBusy(false);
          }}
        >
          I practiced it ✓
        </button>
      </div>
      <p className="muted small">
        Practiced {story.practice_count} {story.practice_count === 1 ? "time" : "times"}
      </p>
    </div>
  );
}

function StoryItem({
  story,
  onSave,
  onDelete,
}: {
  story: Story;
  onSave: (id: string, patch: Partial<Story>) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Draft>({
    description: story.description,
    situation: story.situation,
    task: story.task,
    action: story.action,
    result: story.result,
    tagsText: story.tags.join(", "),
  });
  const progress = starProgress(story);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setBusy(true);
    const ok = await onSave(story.id, {
      description: form.description.trim(),
      situation: form.situation.trim(),
      task: form.task.trim(),
      action: form.action.trim(),
      result: form.result.trim(),
      tags: parseTags(form.tagsText),
    });
    setBusy(false);
    if (ok) setEditing(false);
  }

  return (
    <li className="card story" data-testid="core-item">
      <div className="story-head">
        <p className="story-title">{story.description}</p>
        <span className={`badge ${progress === 4 ? "badge-success" : ""}`} title="STAR sections filled">
          STAR {progress}/4
        </span>
      </div>
      {story.tags.length > 0 && (
        <ul className="tags" aria-label="Tags">
          {story.tags.map((t) => (
            <li key={t} className="tag">#{t}</li>
          ))}
        </ul>
      )}

      {editing ? (
        <form onSubmit={save} className="stack edit-form">
          <label className="field">
            <span>Short description</span>
            <input
              type="text"
              required
              maxLength={500}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          {STAR_FIELDS.map((f) => (
            <label className="field" key={f.key}>
              <span>{f.label}</span>
              <textarea
                rows={3}
                placeholder={f.hint}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </label>
          ))}
          <label className="field">
            <span>Tags</span>
            <input
              type="text"
              placeholder="leadership, teamwork"
              value={form.tagsText}
              onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
            />
          </label>
          <div className="row">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <>
          {open && (
            <dl className="star">
              {STAR_FIELDS.map((f) => (
                <div key={f.key}>
                  <dt>{f.label}</dt>
                  <dd className={story[f.key] ? "" : "muted"}>{story[f.key] || "Not written yet"}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="row story-actions">
            <button type="button" className="text-link" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? "Hide details" : "View STAR"}
            </button>
            <button type="button" className="text-link" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="text-link danger" onClick={() => onDelete(story.id)}>
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}
