"use client";

import { useState } from "react";
import { CircleAlert, Plus, X } from "lucide-react";
import type { Tag } from "@/lib/types";
import { tagColorClass, useTagColor } from "@/lib/tagColors";

export default function TagPanel({
  tags,
  counts,
  onAdd,
  onDelete,
  className = "",
}: {
  tags: Tag[];
  counts: Record<string, number>;
  onAdd: (name: string) => Promise<string | null>;
  onDelete: (t: Tag) => Promise<string | null>;
  className?: string;
}) {
  const colorOf = useTagColor();
  const [newTag, setNewTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emptyCount = tags.filter((t) => (counts[t.name] ?? 0) === 0).length;

  let summary = "";
  if (tags.length === 0) summary = "You have no tags yet.";
  else if (emptyCount > 0) summary = "Dashed tags have no story yet. Tags with × are ones you added.";
  else summary = "Every tag has at least one story. Nice coverage!";

  return (
    <section className={`card ${className}`} aria-labelledby="your-tags-title">
      <div className="tag-panel">
        <form
          className="add-tag"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const err = await onAdd(newTag);
            setBusy(false);
            setError(err);
            if (!err) setNewTag("");
          }}
        >
          <label className="visually-hidden" htmlFor="new-tag">
            New tag
          </label>
          <input
            id="new-tag"
            className="input"
            type="text"
            maxLength={40}
            placeholder="Add your own tag"
            value={newTag}
            aria-invalid={!!error}
            aria-describedby={error ? "new-tag-error" : undefined}
            onChange={(e) => {
              setNewTag(e.target.value);
              if (error) setError(null);
            }}
          />
          <button type="submit" className="btn btn-secondary" disabled={busy || !newTag.trim()}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Add
          </button>
        </form>
        {error && (
          <p id="new-tag-error" className="field-error" role="alert">
            <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            {error}
          </p>
        )}

        {tags.length > 0 && (
          <ul className="tag-grid" aria-label="Your tags with story counts">
            {tags.map((t) => {
              const count = counts[t.name] ?? 0;
              const label = `${t.name}: ${count} ${count === 1 ? "story" : "stories"}`;
              return t.is_default ? (
                <li key={t.id} className={`chip chip-tag ${tagColorClass(colorOf(t.name))} ${count === 0 ? "is-empty" : ""}`} aria-label={label} title={label}>
                  <span className="chip-text">{t.name}</span>
                  <span className="count" aria-hidden="true">
                    {count}
                  </span>
                </li>
              ) : (
                <li key={t.id} className={`chip chip-tag chip-split is-own ${tagColorClass(colorOf(t.name))} ${count === 0 ? "is-empty" : ""}`} title={label}>
                  <span className="chip-label" aria-label={label}>
                    <span className="chip-text">{t.name}</span>
                    <span className="count" aria-hidden="true">
                      {count}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete tag ${t.name}`}
                    onClick={async () => {
                      if (!confirm(`Delete the tag "${t.name}"? Stories keep their existing tags.`)) return;
                      setError(await onDelete(t));
                    }}
                  >
                    <X size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="small muted">{summary}</p>
      </div>
    </section>
  );
}
