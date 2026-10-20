"use client";

import { useEffect, useState, type RefObject } from "react";
import { Check, ChevronDown, CircleAlert, Plus } from "lucide-react";
import TagPicker from "../TagPicker";
import { EMPTY_DRAFT, STAR_FIELDS, isTooShort, toggleTag, type StarDraft } from "@/lib/star";
import type { Story } from "@/lib/types";

// "Type it myself" option. Always fully visible (no layout jump on focus).
// Order: label → textarea → helper → tags → STAR toggle → Save story (last).
export default function Composer({
  tagNames,
  inputRef,
  onAdd,
  onCreateTag,
}: {
  tagNames: string[];
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onAdd: (draft: StarDraft, tags: string[], title: string) => Promise<string | null>;
  onCreateTag: (name: string) => Promise<string | null>;
}) {
  const [draft, setDraft] = useState<StarDraft>(EMPTY_DRAFT);
  const [tags, setTags] = useState<string[]>([]);
  const [showStar, setShowStar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<null | "structuring" | "too_short">(null);
  const [showName, setShowName] = useState(false);
  const [title, setTitle] = useState("");

  // Hide the confirmation after a few seconds
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(null), 8000);
    return () => clearTimeout(t);
  }, [saved]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.description.trim()) return;
    setSaving(true);
    setError(null);
    setSaved(null);
    const tooShort = isTooShort({ ...draft, tags } as unknown as Story);
    const err = await onAdd(draft, tags, title.trim());
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setDraft(EMPTY_DRAFT);
    setTags([]);
    setTitle("");
    setShowName(false);
    setShowStar(false);
    setSaved(tooShort ? "too_short" : "structuring");
    // Keep the cursor in the box for the next story without jumping the page
    inputRef.current?.focus({ preventScroll: true });
  }

  async function createTag(name: string) {
    const err = await onCreateTag(name);
    if (!err) setTags((prev) => toggleTag(prev, name.trim().replace(/\s+/g, " ")));
    return err;
  }

  return (
    <form onSubmit={submit} className="composer-form">
      <div className="field">
        <label htmlFor="story-input" className="field-label">
          What happened?
        </label>
        <textarea
          id="story-input"
          ref={inputRef}
          className="textarea composer-input"
          rows={2}
          required
          maxLength={500}
          placeholder="e.g. I organised a charity run with 200 students and we raised €3,000."
          value={draft.description}
          onChange={(e) => {
            setDraft({ ...draft, description: e.target.value });
            if (saved) setSaved(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
          aria-describedby="story-hint"
          data-testid="core-input"
        />
        <p id="story-hint" className="field-hint">
          Describe one experience in 1–2 sentences. AI structures it for you after you save.
        </p>
        {showName ? (
          <div className="field name-field">
            <label htmlFor="story-title" className="field-label">
              Name <span className="muted">(optional)</span>
            </label>
            <input
              id="story-title"
              className="input"
              type="text"
              maxLength={80}
              placeholder="e.g. Saved a late Deloitte audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        ) : (
          <button type="button" className="text-btn name-toggle" onClick={() => setShowName(true)}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            Add a name (optional)
          </button>
        )}
      </div>

      <TagPicker
        options={tagNames}
        selected={tags}
        limit={6}
        onToggle={(t) => setTags((prev) => toggleTag(prev, t))}
        onCreate={createTag}
      />

      <div className="composer-star">
        <button
          type="button"
          className="text-btn toggle"
          aria-expanded={showStar}
          aria-controls="composer-star"
          onClick={() => setShowStar((v) => !v)}
        >
          {showStar ? "Hide STAR fields" : "Write STAR myself"}
          <ChevronDown className="chevron" size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {showStar && (
          <div id="composer-star" className="star-inputs">
            {STAR_FIELDS.map((f) => (
              <div className="field" key={f.key}>
                <label className="field-label" htmlFor={`composer-${f.key}`}>
                  {f.label}
                </label>
                <textarea
                  id={`composer-${f.key}`}
                  className="textarea"
                  rows={2}
                  placeholder={f.hint}
                  value={draft[f.key]}
                  onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="composer-actions">
        <button type="submit" className="btn btn-primary" disabled={saving} data-testid="core-submit">
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          {saving ? "Saving…" : "Save story"}
        </button>
        <p className="save-status" role="status" aria-live="polite">
          {saved && (
            <>
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              {saved === "too_short"
                ? "Story saved. Add 1–2 sentences so AI can structure it."
                : "Story saved — AI is structuring it."}
            </>
          )}
        </p>
      </div>

      {error && (
        <p className="field-error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  );
}
