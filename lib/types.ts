export type Story = {
  id: string;
  user_id: string;
  description: string;
  // Short name from the AI or the user (null until set; column added in 004)
  title?: string | null;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  suggested_tags: string[];
  ai_status: "unstructured" | "structured";
  practice_count: number;
  last_practiced_at: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  name: string;
  is_default: boolean;
};

export type CvDocument = {
  file_name: string;
  uploaded_at: string;
  analyzed_at: string | null;
};

export type Suggestion = {
  id: string;
  title: string;
  source_experience: string;
  tags: string[];
};

// Error codes returned by the AI API routes
export type AiErrorCode =
  | "rate_limited"
  | "too_short"
  | "ai_failed"
  | "not_configured"
  | "no_text"
  | "unauthorized"
  | "not_found"
  | "timeout"
  | "too_soon"
  | "setup_missing";

export const AI_ERROR_MESSAGES: Record<AiErrorCode, string> = {
  rate_limited: "The AI is busy right now (free-tier limit). Try again in a minute.",
  too_short: "Add a bit more detail (a sentence or two) so the AI can structure it.",
  ai_failed: "The AI couldn't process this right now. Please try again.",
  not_configured: "AI features aren't set up yet (missing GEMINI_API_KEY).",
  no_text: "We couldn't read any text in this PDF. Is it a scanned image?",
  unauthorized: "Please log in again.",
  not_found: "We couldn't find that item.",
  timeout: "This is taking longer than usual. Please try again in a minute.",
  too_soon: "You can get new questions once a minute. Please wait a moment.",
  setup_missing: "Story Sparks isn't available yet. Please try again later.",
};

export function sameTag(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function hasTag(list: string[], tag: string) {
  return list.some((t) => sameTag(t, tag));
}

// Fills defaults so the UI never crashes on rows missing newer columns
export function normalizeStory(row: Partial<Story>): Story {
  return {
    ...(row as Story),
    title: row.title ?? null,
    situation: row.situation ?? "",
    task: row.task ?? "",
    action: row.action ?? "",
    result: row.result ?? "",
    tags: row.tags ?? [],
    suggested_tags: row.suggested_tags ?? [],
    ai_status: row.ai_status ?? "unstructured",
    practice_count: row.practice_count ?? 0,
    last_practiced_at: row.last_practiced_at ?? null,
  };
}

// Display rule everywhere: the title if set, otherwise the text the user typed
export function displayTitle(s: Pick<Story, "title" | "description">) {
  return s.title?.trim() || s.description;
}
