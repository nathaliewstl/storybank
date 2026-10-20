"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, CircleAlert, LoaderCircle, Mic, Pencil, Plus, RefreshCw, Sparkles, Trash, X } from "lucide-react";
import TagPicker from "../TagPicker";
import TagChip from "../TagChip";
import { AI_ERROR_MESSAGES, displayTitle, hasTag, sameTag, type AiErrorCode, type Story } from "@/lib/types";
import { tagColorClass, useTagColor } from "@/lib/tagColors";
import { STAR_FIELDS, storyStatus, toggleTag, type StarDraft, type StarKey, type StoryStatus } from "@/lib/star";

type Props = {
  story: Story;
  tagNames: string[];
  // Only one item per story carries data-testid="core-item"
  isTestItem: boolean;
  isNew: boolean;
  showTags: boolean;
  structuring: boolean;
  aiError: AiErrorCode | undefined;
  onRetry: () => void;
  onSave: (id: string, patch: Partial<Story>) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onPracticeNow: (id: string) => void;
};

const TOO_SHORT_HELP = "Add 1–2 sentences about what happened";

function StatusPill({ status }: { status: StoryStatus }) {
  switch (status) {
    case "structuring":
      return (
        <span className="badge badge-ai">
          <LoaderCircle className="spin" size={14} strokeWidth={2} aria-hidden="true" />
          Structuring…
        </span>
      );
    case "ready":
      return (
        <span className="badge badge-success">
          <Check size={14} strokeWidth={2.5} aria-hidden="true" />
          Ready
        </span>
      );
    case "too_short":
      return (
        <span className="badge badge-warn" title={TOO_SHORT_HELP}>
          Too short for AI
        </span>
      );
    default:
      return <span className="badge">Not structured yet</span>;
  }
}

// A story row: full text is in the DOM (visually clamped to 2 lines); clicking opens the details window
export default function StoryItem(props: Props) {
  const { story, isTestItem, isNew, structuring } = props;
  const colorOf = useTagColor();
  const firstColor = story.tags[0] ? colorOf(story.tags[0]) : undefined;
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const status = storyStatus(story, structuring);

  return (
    <li
      className={`story-item ${isNew ? "is-new" : ""} ${firstColor ? `has-tag ${tagColorClass(firstColor)}` : ""}`}
      data-story-id={story.id}
      {...(isTestItem ? { "data-testid": "core-item" } : {})}
    >
      <button ref={openerRef} type="button" className="story-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="story-title">{displayTitle(story)}</span>
        {/* With a name, the typed text stays visible underneath (core-item must show what was typed) */}
        {story.title?.trim() && <span className="story-original">{story.description}</span>}
        <span className="story-meta">
          {story.tags.map((t) => (
            <TagChip key={t} name={t} />
          ))}
          <StatusPill status={status} />
        </span>
      </button>
      {open && (
        <StoryDialog
          {...props}
          status={status}
          onClose={() => {
            setOpen(false);
            // Return focus to the story row
            requestAnimationFrame(() => openerRef.current?.focus({ preventScroll: true }));
          }}
        />
      )}
    </li>
  );
}

function StoryDialog({
  story,
  tagNames,
  status,
  aiError,
  onRetry,
  onSave,
  onDelete,
  onPracticeNow,
  onClose,
}: Props & { status: StoryStatus; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [editing, setEditing] = useState(false);
  const [focusField, setFocusField] = useState<StarKey | "description">("description");
  const [busy, setBusy] = useState(false);
  const [itemError, setItemError] = useState<string | null>(null);
  const [form, setForm] = useState<StarDraft>(story);
  const [formTitle, setFormTitle] = useState(story.title ?? "");
  const [formTags, setFormTags] = useState<string[]>(story.tags);

  const tagOptions = [...tagNames, ...story.tags.filter((t) => !hasTag(tagNames, t))];

  // showModal() makes the rest of the page inert, so focus stays inside; Escape closes it
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  function close() {
    ref.current?.close();
  }

  function startEditing(field: StarKey | "description" = "description") {
    setForm(story);
    setFormTitle(story.title ?? "");
    setFormTags(story.tags);
    setFocusField(field);
    setItemError(null);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.description.trim()) return;
    setBusy(true);
    const err = await onSave(story.id, {
      title: formTitle.trim() || null,
      description: form.description.trim(),
      situation: form.situation.trim(),
      task: form.task.trim(),
      action: form.action.trim(),
      result: form.result.trim(),
      tags: formTags,
      suggested_tags: story.suggested_tags.filter((t) => !hasTag(formTags, t)),
    });
    setBusy(false);
    setItemError(err);
    if (!err) setEditing(false);
  }

  async function acceptSuggested(tag: string) {
    setItemError(
      await onSave(story.id, {
        tags: hasTag(story.tags, tag) ? story.tags : [...story.tags, tag],
        suggested_tags: story.suggested_tags.filter((t) => !sameTag(t, tag)),
      })
    );
  }

  async function removeSuggested(tag: string) {
    setItemError(
      await onSave(story.id, { suggested_tags: story.suggested_tags.filter((t) => !sameTag(t, tag)) })
    );
  }

  async function remove() {
    if (!confirm("Delete this story? This cannot be undone.")) return;
    const err = await onDelete(story.id);
    if (err) setItemError(err);
  }

  return (
    <dialog
      ref={ref}
      className="story-dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        // Escape inside the edit form only leaves edit mode
        if (editing) {
          e.preventDefault();
          setEditing(false);
        }
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <div className="dialog-heading">
            <h2 id={titleId} className="dialog-title">
              {displayTitle(story)}
            </h2>
            {story.title?.trim() && story.title.trim() !== story.description && (
              <p className="dialog-original">
                <span className="label">What you wrote</span>
                {story.description}
              </p>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Close" onClick={close}>
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {editing ? (
          <form onSubmit={save} className="edit-form">
            <div className="field">
              <label className="field-label" htmlFor={`${titleId}-title`}>
                Name <span className="muted">(optional)</span>
              </label>
              <input
                id={`${titleId}-title`}
                className="input"
                type="text"
                maxLength={80}
                placeholder="e.g. Saved a late Deloitte audit"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor={`${titleId}-desc`}>
                What happened
              </label>
              <input
                id={`${titleId}-desc`}
                className="input"
                type="text"
                required
                maxLength={500}
                autoFocus={focusField === "description"}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="star-boxes is-form">
              {STAR_FIELDS.map((f) => (
                <div className="field star-box" key={f.key}>
                  <label className="star-ask" htmlFor={`${titleId}-${f.key}`}>
                    <span className="star-letter" aria-hidden="true">
                      {f.letter}
                    </span>
                    {f.label}
                  </label>
                  <textarea
                    id={`${titleId}-${f.key}`}
                    className="textarea"
                    rows={3}
                    autoFocus={focusField === f.key}
                    placeholder={f.hint}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <TagPicker options={tagOptions} selected={formTags} onToggle={(t) => setFormTags((p) => toggleTag(p, t))} />
            <div className="row-actions">
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="ai-status" aria-live="polite">
              <StatusPill status={status} />
              {status === "structuring" && (
                <span className="small muted">Usually 15–45 seconds on the free AI plan. You can keep adding stories.</span>
              )}
              {status === "too_short" && (
                <>
                  <span className="small muted">{TOO_SHORT_HELP}.</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEditing()}>
                    <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                    Edit
                  </button>
                </>
              )}
              {status === "not_structured" && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                  <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                  Let AI try again
                </button>
              )}
              {aiError && status !== "structuring" && status !== "too_short" && (
                <span className="small muted">{AI_ERROR_MESSAGES[aiError]}</span>
              )}
            </div>

            <dl className="star-boxes">
              {STAR_FIELDS.map((f) => (
                <div key={f.key} className={`star-box ${story[f.key] ? "" : "is-empty"}`}>
                  <dt>
                    <span className="star-letter" aria-hidden="true">
                      {f.letter}
                    </span>
                    <strong className="star-ask">{f.label}</strong>
                  </dt>
                  {story[f.key] ? (
                    <dd className="star-answer">{story[f.key]}</dd>
                  ) : (
                    <dd className="star-answer">
                      <button type="button" className="text-btn" onClick={() => startEditing(f.key)}>
                        <Plus size={14} strokeWidth={2} aria-hidden="true" />
                        Add<span className="visually-hidden"> {f.label}</span>
                      </button>
                    </dd>
                  )}
                </div>
              ))}
            </dl>

            {story.tags.length > 0 && (
              <ul className="chips" aria-label="Tags">
                {story.tags.map((t) => (
                  <li key={t}>
                    <TagChip name={t} />
                  </li>
                ))}
              </ul>
            )}

            {story.suggested_tags.length > 0 && (
              <div className="suggested">
                <span className="suggested-label">
                  <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
                  AI suggests these tags
                </span>
                <ul className="chips">
                  {story.suggested_tags.map((t) => (
                    <li key={t} className="chip chip-ai chip-split">
                      <button type="button" onClick={() => acceptSuggested(t)} aria-label={`Add tag ${t}`}>
                        <Plus size={14} strokeWidth={2} aria-hidden="true" />
                        {t}
                      </button>
                      <button type="button" onClick={() => removeSuggested(t)} aria-label={`Dismiss suggestion ${t}`}>
                        <X size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="row-actions">
              <button type="button" className="btn btn-secondary" onClick={() => startEditing()}>
                <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  close();
                  onPracticeNow(story.id);
                }}
              >
                <Mic size={16} strokeWidth={1.75} aria-hidden="true" />
                Practise this one
              </button>
              <button type="button" className="btn btn-danger-ghost push-right" onClick={remove}>
                <Trash size={16} strokeWidth={1.75} aria-hidden="true" />
                Delete
              </button>
            </div>
          </>
        )}

        {itemError && (
          <p className="field-error" role="alert">
            <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            {itemError}
          </p>
        )}
      </div>
    </dialog>
  );
}
