import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiError, generateJson } from "@/lib/gemini";
import { hasTag, type AiErrorCode, type Story } from "@/lib/types";

export const maxDuration = 60;

const STAR_KEYS = ["situation", "task", "action", "result"] as const;
const MIN_CHARS = 40;
const MIN_WORDS = 6;

type StarResponse = {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  suggested_tags: string[];
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    situation: { type: "STRING" },
    task: { type: "STRING" },
    action: { type: "STRING" },
    result: { type: "STRING" },
    suggested_tags: { type: "ARRAY", items: { type: "STRING" }, minItems: 1, maxItems: 3 },
  },
  required: ["title", "situation", "task", "action", "result", "suggested_tags"],
};

function fail(code: AiErrorCode, status: number, story?: Story) {
  return NextResponse.json({ error: code, story }, { status });
}

// POST { storyId, context? } -> structures a saved story into STAR + suggests tags.
// The story is already saved; this only fills EMPTY fields.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const storyId = typeof body.storyId === "string" ? body.storyId : "";
  const context = typeof body.context === "string" ? body.context.slice(0, 1000) : "";

  // RLS guarantees we only get the user's own story
  const { data: story } = await supabase.from("stories").select("*").eq("id", storyId).maybeSingle();
  if (!story) return fail("not_found", 404);

  let { data: tagRows } = await supabase.from("tags").select("name");
  if (!tagRows?.length) {
    // User never opened /app: create their default tags first
    await supabase.rpc("seed_my_default_tags");
    ({ data: tagRows } = await supabase.from("tags").select("name"));
  }
  const tagNames = (tagRows ?? []).map((t) => t.name as string);

  const written = STAR_KEYS.filter((k) => story[k].trim() !== "")
    .map((k) => `${k}: ${story[k]}`)
    .join("\n");
  const storyText = [story.description, written, context].filter(Boolean).join("\n").trim();

  if (storyText.length < MIN_CHARS || storyText.split(/\s+/).length < MIN_WORDS) {
    return fail("too_short", 422, story);
  }

  const prompt = `You help a student prepare for job and internship interviews.
Rewrite their experience as a STAR story (Situation, Task, Action, Result), in the same language they wrote in.
Rules:
- Each field: 1-3 short sentences, first person ("I..."), concrete.
- Use only facts from the text. Do not invent numbers, names or outcomes. If something is unknown, write a short prompt in brackets, e.g. "[Add the measurable result]".
- If a field is already written by the student, return it unchanged.
- title: a short name for the story, 3 to 6 words, no quotes, no full stop, e.g. Saved a late Deloitte audit
- suggested_tags: 1 to 3 tags chosen ONLY from this exact list: ${JSON.stringify(tagNames)}.

Student's text:
"""
${storyText.slice(0, 4000)}
"""`;

  let ai: StarResponse;
  try {
    ai = await generateJson<StarResponse>(prompt, SCHEMA, "structure", { thinking: "minimal" });
  } catch (err) {
    const code = err instanceof AiError ? err.code : "ai_failed";
    if (!(err instanceof AiError)) console.error("[structure] unexpected error", err);
    return fail(code, code === "rate_limited" ? 429 : 502, story);
  }

  // Never overwrite what the user wrote
  const patch: Partial<Story> = { ai_status: "structured" };
  // Title: only if the column exists (004 run) and the user hasn't named the story
  const aiTitle = typeof ai.title === "string" ? ai.title.replace(/^["'“”]+|["'“”.]+$/g, "").trim().slice(0, 80) : "";
  if ("title" in story && !story.title?.trim() && aiTitle) patch.title = aiTitle;
  for (const k of STAR_KEYS) {
    const value = typeof ai[k] === "string" ? ai[k].trim().slice(0, 2000) : "";
    if (story[k].trim() === "" && value) patch[k] = value;
  }
  const suggested = (Array.isArray(ai.suggested_tags) ? ai.suggested_tags : [])
    .map((t) => tagNames.find((name) => name.toLowerCase() === String(t).trim().toLowerCase()))
    .filter((t): t is string => !!t && !hasTag(story.tags, t));
  patch.suggested_tags = Array.from(new Set(suggested)).slice(0, 3);

  const { data: updated, error } = await supabase
    .from("stories")
    .update(patch)
    .eq("id", story.id)
    .select()
    .single();
  if (error) {
    console.error("[structure] saving AI result failed", error);
    return fail("ai_failed", 500, story);
  }

  return NextResponse.json({ story: updated });
}
