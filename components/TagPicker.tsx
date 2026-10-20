"use client";

import { useState } from "react";
import { Check, CircleAlert, Plus } from "lucide-react";
import { hasTag } from "@/lib/types";
import { tagColorClass, useTagColor } from "@/lib/tagColors";

// Selectable tag chips. With `limit`, shows one short row plus a "More tags" toggle.
export default function TagPicker({
  options,
  selected,
  onToggle,
  label = "Tags",
  limit,
  onCreate,
}: {
  options: string[];
  selected: string[];
  onToggle: (tag: string) => void;
  label?: string;
  limit?: number;
  // When given, shows a "+ New tag" chip that creates a tag on the spot
  onCreate?: (name: string) => Promise<string | null>;
}) {
  const colorOf = useTagColor();
  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!onCreate || !newName.trim()) return;
    setBusy(true);
    const err = await onCreate(newName);
    setBusy(false);
    setError(err);
    if (!err) {
      setNewName("");
      setCreating(false);
    }
  }
  if (options.length === 0 && !onCreate) return null;

  const collapsed = limit !== undefined && !expanded && options.length > limit;
  const shown = collapsed ? options.filter((t, i) => i < limit || hasTag(selected, t)) : options;
  const hiddenCount = options.length - shown.length;

  return (
    <fieldset className="tag-picker">
      <legend>
        {label} <span className="muted">(optional)</span>
      </legend>
      <div className="chips">
        {shown.map((t) => {
          const on = hasTag(selected, t);
          return (
            <button
              key={t}
              type="button"
              className={`chip chip-tag ${tagColorClass(colorOf(t))}`}
              aria-pressed={on}
              onClick={() => onToggle(t)}
            >
              {on && <Check size={14} strokeWidth={2} aria-hidden="true" />}
              <span className="chip-text">{t}</span>
            </button>
          );
        })}
        {limit !== undefined && options.length > limit && (
          <button type="button" className="text-btn" onClick={() => setExpanded((v) => !v)}>
            {collapsed ? `More tags (+${hiddenCount})` : "Fewer tags"}
          </button>
        )}
        {onCreate && !creating && (
          <button type="button" className="chip chip-new" onClick={() => setCreating(true)}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            New tag
          </button>
        )}
      </div>
      {onCreate && creating && (
        <div className="new-tag-inline">
          <label className="visually-hidden" htmlFor="picker-new-tag">
            New tag name
          </label>
          <input
            id="picker-new-tag"
            className="input"
            type="text"
            maxLength={40}
            autoFocus
            placeholder="e.g. Negotiation"
            value={newName}
            aria-invalid={!!error}
            onChange={(e) => {
              setNewName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              // Enter creates the tag instead of submitting the story form
              if (e.key === "Enter") {
                e.preventDefault();
                void create();
              }
              if (e.key === "Escape") setCreating(false);
            }}
          />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !newName.trim()} onClick={create}>
            Add tag
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </div>
      )}
      {error && (
        <p className="field-error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  );
}
