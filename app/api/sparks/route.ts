import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiError, generateJson } from "@/lib/gemini";
import { genericQuestions } from "@/lib/sparks";
import type { AiErrorCode } from "@/lib/types";

export const maxDuration = 60;

const REGENERATE_COOLDOWN_MS = 60_000;

type SparksResponse = {
  questions: { question: string; source_experience: string; target_tag: string }[];
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      minItems: 6,
      maxItems: 10,
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          source_experience: { type: "STRING" },
          target_tag: { type: "STRING" },
        },
        required: ["question", "source_experience", "target_tag"],
      },
    },
  },
  required: ["questions"],
};

const PROMPT_FIELDS = "id, question, source_experience, target_tag, status, created_at";

type Row = { question: string; source_experience: string; target_tag: string };

function fail(code: AiErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

// POST { action } -> the user's open Story Sparks questions.
//   "load"        never calls the AI: returns stored questions (built-in ones if there are none yet)
//   "cv_uploaded" called once after a CV upload: CV questions from Gemini
//   "regenerate"  the "New questions" button, at most once per minute
// If a Gemini call fails (429 / 503 / timeout / invalid), we fall back to built-in questions
// for the user's tag gaps right away, so the card is never empty.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const action: "load" | "cv_uploaded" | "regenerate" =
    body.action === "regenerate" || body.action === "cv_uploaded" ? body.action : "load";

  const [{ data: cv }, { data: existing, error: promptsError }, { data: tagRows }, { data: storyRows }] =
    await Promise.all([
      supabase.from("cv_documents").select("extracted_text").eq("user_id", user.id).maybeSingle(),
      supabase.from("story_prompts").select(PROMPT_FIELDS).order("created_at", { ascending: false }),
      supabase.from("tags").select("name"),
      supabase.from("stories").select("tags"),
    ]);
  // PGRST205 = story_prompts table missing (supabase/003_story_prompts.sql not run yet)
  if (promptsError?.code === "PGRST205") {
    console.error("[sparks] table public.story_prompts is missing: run supabase/003_story_prompts.sql");
    return fail("setup_missing", 503);
  }
  const prompts = existing ?? [];
  const cvText: string = cv?.extracted_text ?? "";
  const hasCv = cvText.trim().length >= 50;

  const respond = (list: typeof prompts, aiFallback = false) => {
    const open = list.filter((p) => p.status === "open").sort((a, b) => a.created_at.localeCompare(b.created_at));
    return NextResponse.json({
      prompts: open,
      hasCv,
      // CV questions are the ones with a source experience
      cvQuestions: open.some((p) => p.source_experience),
      aiFallback,
    });
  };

  // Tags without a story come first
  const tagNames = (tagRows ?? []).map((t) => t.name as string);
  const used = new Set((storyRows ?? []).flatMap((s) => (s.tags as string[]).map((t) => t.toLowerCase())));
  const emptyTags = tagNames.filter((t) => !used.has(t.toLowerCase()));
  const tagsByPriority = [...emptyTags, ...tagNames.filter((t) => used.has(t.toLowerCase()))];
  const generic = () => genericQuestions(tagsByPriority.length ? tagsByPriority : ["Leadership", "Teamwork", "Failure"]);

  async function replaceOpen(rows: Row[]) {
    // Unanswered questions are replaced; answered ones stay as history
    await supabase.from("story_prompts").delete().eq("user_id", user!.id).in("status", ["open", "skipped"]);
    const { data, error } = await supabase
      .from("story_prompts")
      .insert(rows.map((r) => ({ ...r, user_id: user!.id })))
      .select(PROMPT_FIELDS);
    if (error) console.error("[sparks] saving questions failed", error);
    return error ? null : data ?? [];
  }

  // ---- load: never an AI call
  if (action === "load") {
    if (prompts.length > 0) return respond(prompts);
    const saved = await replaceOpen(generic());
    return saved ? respond(saved) : fail("ai_failed", 500);
  }

  // ---- regenerate: once per minute
  if (action === "regenerate") {
    const newest = prompts[0]?.created_at ? Date.parse(prompts[0].created_at) : 0;
    if (Date.now() - newest < REGENERATE_COOLDOWN_MS) return fail("too_soon", 429);
  }

  // ---- regenerate / cv_uploaded without a CV: built-in questions, no AI
  if (!hasCv) {
    const saved = await replaceOpen(generic());
    return saved ? respond(saved) : fail("ai_failed", 500);
  }

  // ---- with a CV: one Gemini call; on any failure fall back to built-in questions
  const prompt = `You help a student remember stories for job and internship interviews.
From the CV below, write 6 to 10 short reflective questions in second person ("you").
Rules:
- 2 to 3 questions per CV experience (job, project, club, volunteering, study).
- Each question asks about ONE concrete moment and names the experience, e.g. "At Deloitte, was there a moment when the client didn't cooperate? What did you do?"
- Focus on these tags that have no story yet: ${JSON.stringify(emptyTags)}. Other tags you may use: ${JSON.stringify(tagNames)}.
- Never invent facts, names, numbers or outcomes that are not in the CV. Ask, don't assume.
- Max 25 words per question. Write in the CV's language.
For each question return:
- question
- source_experience: the CV experience it is about (role and organisation, max 12 words)
- target_tag: exactly one tag from ${JSON.stringify(tagNames)}

CV:
"""
${cvText.slice(0, 12_000)}
"""`;

  let rows: Row[] = [];
  try {
    const ai = await generateJson<SparksResponse>(prompt, SCHEMA, "sparks", { thinking: "minimal" });
    rows = (Array.isArray(ai.questions) ? ai.questions : [])
      .filter((q) => typeof q?.question === "string" && q.question.trim())
      .slice(0, 10)
      .map((q) => ({
        question: q.question.trim().slice(0, 300),
        source_experience: String(q.source_experience ?? "").trim().slice(0, 200) || "Your CV",
        target_tag: tagNames.find((n) => n.toLowerCase() === String(q.target_tag ?? "").trim().toLowerCase()) ?? "",
      }));
  } catch (err) {
    if (!(err instanceof AiError)) console.error("[sparks] unexpected error", err);
    // The real Gemini error is already logged by lib/gemini.ts
  }

  if (rows.length === 0) {
    console.error(`[sparks] AI unavailable (${action}): showing built-in questions instead`);
    const saved = await replaceOpen(generic());
    return saved ? respond(saved, true) : fail("ai_failed", 500);
  }

  const saved = await replaceOpen(rows);
  return saved ? respond(saved) : fail("ai_failed", 500);
}
