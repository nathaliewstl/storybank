import { hasTag, sameTag, type Story } from "./types";

// `ask` is the plain-language question shown next to each STAR part
export const STAR_FIELDS = [
  { key: "situation", letter: "S", label: "Situation", ask: "Where were you?", hint: "Where were you, and what was going on?" },
  { key: "task", letter: "T", label: "Task", ask: "What did you need to do?", hint: "What was your job or goal?" },
  { key: "action", letter: "A", label: "Action", ask: "What did you do?", hint: "What did you do, step by step?" },
  { key: "result", letter: "R", label: "Result", ask: "What happened?", hint: "How did it end? Use numbers if you can." },
] as const;

export type StarKey = (typeof STAR_FIELDS)[number]["key"];
export type StarDraft = Pick<Story, "description" | StarKey>;

export const EMPTY_DRAFT: StarDraft = { description: "", situation: "", task: "", action: "", result: "" };

export function toggleTag(list: string[], tag: string) {
  return hasTag(list, tag) ? list.filter((t) => !sameTag(t, tag)) : [...list, tag];
}

export function isToday(iso: string | null) {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function starProgress(s: Story) {
  return STAR_FIELDS.filter((f) => s[f.key].trim() !== "").length;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

// Mirrors the server rule in app/api/structure/route.ts (MIN_CHARS / MIN_WORDS)
const MIN_CHARS = 40;
const MIN_WORDS = 6;

export function isTooShort(s: Story) {
  const text = [s.description, ...STAR_FIELDS.map((f) => s[f.key])].filter(Boolean).join(" ").trim();
  return text.length < MIN_CHARS || text.split(/\s+/).length < MIN_WORDS;
}

export type StoryStatus = "structuring" | "ready" | "too_short" | "not_structured";

export function storyStatus(s: Story, structuring: boolean): StoryStatus {
  if (structuring) return "structuring";
  if (starProgress(s) === 4) return "ready";
  if (isTooShort(s)) return "too_short";
  return "not_structured";
}

const TAG_QUESTIONS: Record<string, string> = {
  leadership: "Tell me about a time you led a team.",
  teamwork: "Tell me about a time you worked well in a team.",
  conflict: "Tell me about a time you handled a disagreement.",
  failure: "Tell me about a time you failed.",
  impact: "Tell me about a time you made a real difference.",
  initiative: "Tell me about a time you showed initiative.",
  adaptability: "Tell me about a time you had to adapt to change.",
  motivation: "Tell me about something that really motivated you.",
};

// The interview question a story answers, based on its first tag
export function interviewQuestion(s: Story) {
  const tag = s.tags[0];
  if (!tag) return "Tell me about a time you…";
  return TAG_QUESTIONS[tag.trim().toLowerCase()] ?? `Tell me about a time that shows your ${tag.trim().toLowerCase()}.`;
}
