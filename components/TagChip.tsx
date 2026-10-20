"use client";

import { tagColorClass, useTagColor } from "@/lib/tagColors";

export default function TagChip({ name, className = "" }: { name: string; className?: string }) {
  const colorOf = useTagColor();
  const color = colorOf(name);
  return (
    <span className={`chip ${color ? "chip-tag" : ""} ${tagColorClass(color)} ${className}`}>
      <span className="chip-text">{name}</span>
    </span>
  );
}
