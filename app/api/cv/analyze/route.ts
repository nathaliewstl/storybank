import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { createClient } from "@/lib/supabase/server";
import { AiError, generateJson } from "@/lib/gemini";
import { redactPersonalData } from "@/lib/redact";
import type { AiErrorCode } from "@/lib/types";

export const maxDuration = 60;

const MAX_CV_CHARS = 12_000;

type SuggestionsResponse = {
  suggestions: { title: string; source_experience: string; tags: string[] }[];
};

const SCHEMA = {
  type: "OBJECT",
  properties: {
    suggestions: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          source_experience: { type: "STRING" },
          tags: { type: "ARRAY", items: { type: "STRING" }, minItems: 1, maxItems: 3 },
        },
        required: ["title", "source_experience", "tags"],
      },
    },
  },
  required: ["suggestions"],
};

function fail(code: AiErrorCode, status: number) {
  return NextResponse.json({ error: code }, { status });
}

// POST { fileName? } -> reads the user's uploaded CV from Storage, redacts it,
// stores the redacted text and replaces the story suggestions.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const filePath = `${user.id}/cv.pdf`;

  const { data: existing } = await supabase
    .from("cv_documents")
    .select("file_name, extracted_text")
    .eq("user_id", user.id)
    .maybeSingle();
  const fileName =
    typeof body.fileName === "string" && body.fileName.trim()
      ? body.fileName.trim().slice(0, 200)
      : existing?.file_name ?? "cv.pdf";

  // 1. Extract + redact (only when the file is new or text is missing)
  let cvText: string = body.fileName ? "" : existing?.extracted_text ?? "";
  if (!cvText) {
    const { data: file, error: dlError } = await supabase.storage.from("cvs").download(filePath);
    if (dlError || !file) return fail("not_found", 404);

    try {
      const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
      const { text } = await extractText(pdf, { mergePages: true });
      cvText = redactPersonalData(text).slice(0, MAX_CV_CHARS);
    } catch (err) {
      console.error("[cv] PDF parse failed", (err as Error).message);
      cvText = "";
    }

    const { error: upsertError } = await supabase.from("cv_documents").upsert({
      user_id: user.id,
      file_path: filePath,
      file_name: fileName,
      extracted_text: cvText,
      uploaded_at: new Date().toISOString(),
      analyzed_at: null,
    });
    if (upsertError) {
      console.error("[cv] saving CV text failed", upsertError);
      return fail("ai_failed", 500);
    }
  }

  if (cvText.trim().length < 50) return fail("no_text", 422);

  // 2. Ask the AI for story ideas
  let { data: tagRows } = await supabase.from("tags").select("name");
  if (!tagRows?.length) {
    // User never opened /app: create their default tags first
    await supabase.rpc("seed_my_default_tags");
    ({ data: tagRows } = await supabase.from("tags").select("name"));
  }
  const tagNames = (tagRows ?? []).map((t) => t.name as string);

  const prompt = `You help a student prepare for job and internship interviews.
From the CV below, suggest 3 to 6 experiences that would make strong behavioural interview stories (STAR method).
For each suggestion return:
- title: a short story title (max 12 words), e.g. "Led a 5-person team to win a case competition".
- source_experience: the CV experience it comes from (role, organisation, dates if given; max 25 words).
- tags: 1 to 3 tags chosen ONLY from this exact list: ${JSON.stringify(tagNames)}.
Use only facts from the CV. Do not include personal contact details. Write in the CV's language.

CV:
"""
${cvText}
"""`;

  let ai: SuggestionsResponse;
  try {
    ai = await generateJson<SuggestionsResponse>(prompt, SCHEMA, "cv-suggestions");
  } catch (err) {
    const code = err instanceof AiError ? err.code : "ai_failed";
    if (!(err instanceof AiError)) console.error("[cv] unexpected error", err);
    return fail(code, code === "rate_limited" ? 429 : 502);
  }

  const rows = (Array.isArray(ai.suggestions) ? ai.suggestions : [])
    .filter((s) => typeof s?.title === "string" && s.title.trim())
    .slice(0, 6)
    .map((s) => ({
      user_id: user.id,
      title: s.title.trim().slice(0, 200),
      source_experience: String(s.source_experience ?? "").trim().slice(0, 500),
      tags: Array.from(
        new Set(
          (Array.isArray(s.tags) ? s.tags : [])
            .map((t) => tagNames.find((n) => n.toLowerCase() === String(t).trim().toLowerCase()))
            .filter((t): t is string => !!t)
        )
      ).slice(0, 3),
    }));
  if (rows.length === 0) return fail("ai_failed", 502);

  // 3. Replace previous suggestions
  await supabase.from("story_suggestions").delete().eq("user_id", user.id);
  const { data: suggestions, error } = await supabase
    .from("story_suggestions")
    .insert(rows)
    .select("id, title, source_experience, tags");
  if (error) {
    console.error("[cv] saving suggestions failed", error);
    return fail("ai_failed", 500);
  }

  await supabase
    .from("cv_documents")
    .update({ analyzed_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return NextResponse.json({ suggestions });
}
