"use client";

import { useCallback, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Check, FileText, PenLine, Sparkles } from "lucide-react";
import Composer from "./Composer";
import CvIdeas from "./CvIdeas";
import StorySparks from "./StorySparks";
import type { CvDocument, Suggestion } from "@/lib/types";
import type { StarDraft } from "@/lib/star";

export type NewStoryOption = "write" | "cv" | "sparks";
const ORDER: NewStoryOption[] = ["write", "cv", "sparks"];
type Option = NewStoryOption;

// The one place to create stories: write one yourself (default), pick ideas from your CV,
// or answer Story Sparks questions
export default function NewStory({
  userId,
  tagNames,
  inputRef,
  initialCv,
  initialSuggestions,
  onAdd,
  onAddFromCv,
  onCreateTag,
  onSaveSpark,
  option,
  onOptionChange: setOption,
  className = "",
}: {
  userId: string;
  tagNames: string[];
  inputRef: RefObject<HTMLTextAreaElement | null>;
  initialCv: CvDocument | null;
  initialSuggestions: Suggestion[];
  onAdd: (draft: StarDraft, tags: string[]) => Promise<string | null>;
  onAddFromCv: (s: Suggestion) => Promise<string | null>;
  onCreateTag: (name: string) => Promise<string | null>;
  onSaveSpark: (answer: string, tags: string[], question: string) => Promise<string | null>;
  option: Option;
  onOptionChange: (o: Option) => void;
  className?: string;
}) {
  const [ideas, setIdeas] = useState(initialSuggestions.length);
  const tabRefs = {
    write: useRef<HTMLButtonElement>(null),
    cv: useRef<HTMLButtonElement>(null),
    sparks: useRef<HTMLButtonElement>(null),
  };
  const onIdeasChange = useCallback((n: number) => setIdeas(n), []);

  // Arrow keys move between the tabs (ARIA tabs pattern)
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const step = e.key === "ArrowRight" ? 1 : -1;
    const next = ORDER[(ORDER.indexOf(option) + step + ORDER.length) % ORDER.length];
    setOption(next);
    tabRefs[next].current?.focus();
  }

  return (
    <section className={`card new-story accent-create ${className}`} aria-labelledby="add-story-title">

      <div className="option-tabs" role="tablist" aria-label="How do you want to add a story?" onKeyDown={onTabKey}>
        <button
          ref={tabRefs.write}
          type="button"
          role="tab"
          id="tab-write"
          aria-selected={option === "write"}
          aria-controls="panel-write"
          tabIndex={option === "write" ? 0 : -1}
          className="option-tab is-create"
          onClick={() => setOption("write")}
        >
          <span className="icon-tile is-lg" aria-hidden="true">
            <PenLine size={20} strokeWidth={1.75} />
          </span>
          <span className="option-text">
            <span className="option-title">Type it myself</span>
            <span className="option-sub">Write what you did</span>
          </span>
          <span className="option-check" aria-hidden="true">
            <Check size={14} strokeWidth={2.5} />
          </span>
        </button>
        <button
          ref={tabRefs.cv}
          type="button"
          role="tab"
          id="tab-cv"
          aria-selected={option === "cv"}
          aria-controls="panel-cv"
          tabIndex={option === "cv" ? 0 : -1}
          className="option-tab is-ai"
          onClick={() => setOption("cv")}
        >
          <span className="icon-tile is-lg is-ai" aria-hidden="true">
            <FileText size={20} strokeWidth={1.75} />
          </span>
          <span className="option-text">
            <span className="option-title">
              Use my CV
              {ideas > 0 && <span className="badge badge-ai num">{ideas}</span>}
            </span>
            <span className="option-sub">We suggest stories for you</span>
          </span>
          <span className="option-check" aria-hidden="true">
            <Check size={14} strokeWidth={2.5} />
          </span>
        </button>
        <button
          ref={tabRefs.sparks}
          type="button"
          role="tab"
          id="tab-sparks"
          aria-selected={option === "sparks"}
          aria-controls="panel-sparks"
          tabIndex={option === "sparks" ? 0 : -1}
          className="option-tab is-ai"
          onClick={() => setOption("sparks")}
        >
          <span className="icon-tile is-lg is-ai" aria-hidden="true">
            <Sparkles size={20} strokeWidth={1.75} />
          </span>
          <span className="option-text">
            <span className="option-title">Story Sparks</span>
            <span className="option-sub">Questions that help you remember</span>
          </span>
          <span className="option-check" aria-hidden="true">
            <Check size={14} strokeWidth={2.5} />
          </span>
        </button>
      </div>

      <div id="panel-write" role="tabpanel" aria-labelledby="tab-write" className="tab-panel" hidden={option !== "write"}>
        <Composer tagNames={tagNames} inputRef={inputRef} onAdd={onAdd} onCreateTag={onCreateTag} />
      </div>
      <div id="panel-cv" role="tabpanel" aria-labelledby="tab-cv" className="tab-panel" hidden={option !== "cv"}>
        <CvIdeas
          userId={userId}
          initialCv={initialCv}
          initialSuggestions={initialSuggestions}
          onAddAsStory={onAddFromCv}
          onIdeasChange={onIdeasChange}
        />
      </div>
      <div id="panel-sparks" role="tabpanel" aria-labelledby="tab-sparks" className="tab-panel" hidden={option !== "sparks"}>
        <StorySparks active={option === "sparks"} onSaveAnswer={onSaveSpark} />
      </div>
    </section>
  );
}
