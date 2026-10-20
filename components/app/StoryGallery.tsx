"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Inbox, PenLine } from "lucide-react";
import StoryItem from "./StoryItem";
import type { AiErrorCode, Story } from "@/lib/types";
import { tagColorClass, useTagColor } from "@/lib/tagColors";

type Group = { key: string; name: string; stories: Story[] };

const UNTAGGED = "__untagged__";

export type StoryView = "tag" | "all";

// One full-width column of collapsible tag groups (all open by default, including "Untagged").
// Every story text is visible without a click.
export default function StoryGallery({
  view,
  stories,
  tagNames,
  newId,
  structuring,
  aiErrors,
  loadError,
  onRetry,
  onSave,
  onDelete,
  onPracticeNow,
  onWriteFirst,
}: {
  view: StoryView;
  stories: Story[];
  tagNames: string[];
  newId: string | null;
  structuring: Record<string, boolean>;
  aiErrors: Record<string, AiErrorCode | undefined>;
  loadError: string | null;
  onRetry: (id: string) => void;
  onSave: (id: string, patch: Partial<Story>) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onPracticeNow: (id: string) => void;
  onWriteFirst: () => void;
}) {
  const colorOf = useTagColor();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  // A newly saved story must be visible: reopen its group(s), "Untagged" included
  useEffect(() => {
    if (!newId) return;
    const s = stories.find((x) => x.id === newId);
    if (!s) return;
    const keys = s.tags.length ? s.tags.map((t) => t.trim().toLowerCase()) : [UNTAGGED];
    setCollapsed((prev) => {
      if (!keys.some((k) => prev.has(k))) return prev;
      const next = new Set(prev);
      keys.forEach((k) => next.delete(k));
      return next;
    });
  }, [newId, stories]);

  // Untagged first (if not empty), then tags by story count
  const groups = useMemo(() => {
    const byTag = new Map<string, Group>();
    for (const s of stories) {
      for (const t of s.tags) {
        const key = t.trim().toLowerCase();
        const name = tagNames.find((n) => n.toLowerCase() === key) ?? t;
        if (!byTag.has(key)) byTag.set(key, { key, name, stories: [] });
        byTag.get(key)!.stories.push(s);
      }
    }
    const tagged = [...byTag.values()].sort(
      (a, b) => b.stories.length - a.stories.length || a.name.localeCompare(b.name)
    );
    const untagged = stories.filter((s) => s.tags.length === 0);
    return untagged.length ? [{ key: UNTAGGED, name: "Untagged", stories: untagged }, ...tagged] : tagged;
  }, [stories, tagNames]);

  // A story with several tags appears in each group; only its first row is the test item
  const firstGroupOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of groups) for (const s of g.stories) if (!map.has(s.id)) map.set(s.id, g.key);
    return map;
  }, [groups]);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function item(s: Story, isTestItem: boolean, showTags: boolean) {
    return (
      <StoryItem
        key={s.id}
        story={s}
        tagNames={tagNames}
        isTestItem={isTestItem}
        isNew={s.id === newId}
        showTags={showTags}
        structuring={!!structuring[s.id]}
        aiError={aiErrors[s.id]}
        onRetry={() => onRetry(s.id)}
        onSave={onSave}
        onDelete={onDelete}
        onPracticeNow={onPracticeNow}
      />
    );
  }

  if (loadError) {
    return (
      <p className="notice" role="alert">
        {loadError}
      </p>
    );
  }

  if (stories.length === 0) {
    return (
      <div className="card empty">
        <Inbox size={24} strokeWidth={1.75} aria-hidden="true" />
        <p>No stories yet. Even one sentence is a great start.</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onWriteFirst}>
          <PenLine size={16} strokeWidth={1.75} aria-hidden="true" />
          Write your first story
        </button>
      </div>
    );
  }

  if (view === "all") {
    return (
      <div className="card story-group">
        <ul className="story-list" aria-label="All stories">
          {stories.map((s) => item(s, true, true))}
        </ul>
      </div>
    );
  }

  return (
    <div className="story-groups">
      {groups.map((g) => {
        const isUntagged = g.key === UNTAGGED;
        const open = !collapsed.has(g.key);
        const color = isUntagged ? undefined : colorOf(g.name);
        const listId = `group-${g.key.replace(/[^a-z0-9]/g, "-")}`;
        return (
          <section
            key={g.key}
            className={`card story-group ${color ? `is-tagged ${tagColorClass(color)}` : ""}`}
            aria-label={g.name}
          >
            <h3 className="panel-heading">
              <button
                type="button"
                className="group-head is-toggle"
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => toggle(g.key)}
              >
                <span className={`group-dot ${color ? "" : "is-neutral"}`} aria-hidden="true" />
                <span className="group-name">{g.name}</span>
                <span className="group-count num">
                  {g.stories.length} {g.stories.length === 1 ? "story" : "stories"}
                </span>
                <ChevronDown className="chevron" size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </h3>
            <ul id={listId} className="story-list" hidden={!open}>
              {g.stories.map((s) => item(s, firstGroupOf.get(s.id) === g.key, false))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
