"use client";

import { createContext, useContext } from "react";
import type { Tag } from "./types";

// Tag palette tokens (amber is reserved for AI). Colours come from CSS tokens --tag-<name>-bg/-fg.
export const TAG_PALETTE = ["indigo", "teal", "rose", "violet", "sky", "emerald", "fuchsia", "cyan"] as const;
export type TagColor = (typeof TAG_PALETTE)[number];

// One colour for all standard (predefined) tags, one colour for all tags the user created
export const STANDARD_TAG_COLOR: TagColor = "teal";
export const CUSTOM_TAG_COLOR: TagColor = "violet";

export function buildTagColors(tags: Tag[]): Map<string, TagColor> {
  return new Map(
    tags.map((t) => [t.name.trim().toLowerCase(), t.is_default ? STANDARD_TAG_COLOR : CUSTOM_TAG_COLOR])
  );
}

const TagColorContext = createContext<Map<string, TagColor>>(new Map());
export const TagColorProvider = TagColorContext.Provider;

export function useTagColor() {
  const map = useContext(TagColorContext);
  return (name: string): TagColor | undefined => map.get(name.trim().toLowerCase());
}

// Class that sets --tag-bg / --tag-fg for a tag (empty for unknown tags = neutral)
export function tagColorClass(color: TagColor | undefined) {
  return color ? `tc-${color}` : "";
}
