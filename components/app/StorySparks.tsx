"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleAlert, Lock, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { AI_ERROR_MESSAGES, type AiErrorCode } from "@/lib/types";
import type { SparkPrompt } from "@/lib/sparks";

// "Story Sparks": one reflective question at a time that helps the user remember a story.
// Loaded only when the option is opened, so it never slows down or blocks core-input.
export default function StorySparks({
  active,
  onSaveAnswer,
}: {
  active: boolean;
  onSaveAnswer: (answer: string, tags: string[], question: string) => Promise<string | null>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [prompts, setPrompts] = useState<SparkPrompt[] | null>(null);
  const [hasCv, setHasCv] = useState(false);
  const [cvQuestions, setCvQuestions] = useState(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [useTag, setUseTag] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const answerRef = useRef("");
  answerRef.current = answer;

  // Background retry for CV questions (server allows one per 10 minutes). The built-in questions
  // stay on screen; the CV questions replace them when they arrive, unless an answer is being typed.
  async function retryCvInBackground() {
    try {
      const res = await fetch("/api/sparks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry_cv" }),
        signal: AbortSignal.timeout(60_000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.cvQuestions || answerRef.current.trim()) return;
      setPrompts(json.prompts ?? []);
      setCvQuestions(true);
      setIndex(0);
      setUseTag(true);
    } catch {
      // Silent: the built-in questions stay; "New questions" is still available
    }
  }

  async function load(action: "load" | "regenerate") {
    setLoading(true);
    // Only "New questions" with a CV calls the AI; loading never does
    setLoadingAi(action === "regenerate" && hasCv);
    setError(null);
    try {
      const res = await fetch("/api/sparks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        signal: AbortSignal.timeout(55_000),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(AI_ERROR_MESSAGES[(json.error as AiErrorCode) ?? "ai_failed"] ?? AI_ERROR_MESSAGES.ai_failed);
        return;
      }
      setPrompts(json.prompts ?? []);
      setHasCv(!!json.hasCv);
      setCvQuestions(!!json.cvQuestions);
      if (json.retryCv) void retryCvInBackground();
      setIndex(0);
      setAnswer("");
      setUseTag(true);
    } catch (err) {
      const timedOut = (err as Error).name === "TimeoutError";
      setError(AI_ERROR_MESSAGES[timedOut ? "timeout" : "ai_failed"]);
    } finally {
      setLoading(false);
    }
  }

  // Load (or reuse) questions each time the option is opened
  useEffect(() => {
    if (active) void load("load");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const current = prompts && prompts.length > 0 ? prompts[Math.min(index, prompts.length - 1)] : undefined;

  function resetFor(nextIndex: number) {
    setIndex(nextIndex);
    setAnswer("");
    setUseTag(true);
    setError(null);
  }

  async function setStatus(p: SparkPrompt, status: "answered" | "skipped") {
    const { error } = await supabase.from("story_prompts").update({ status }).eq("id", p.id);
    if (error) return friendlyError(error, "We couldn't update this question. Please try again.");
    setPrompts((prev) => (prev ?? []).filter((x) => x.id !== p.id));
    return null;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !answer.trim()) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    const savedText = answer.trim();
    const err = await onSaveAnswer(answer.trim(), useTag && current.target_tag ? [current.target_tag] : [], current.question);
    if (err) {
      setBusy(false);
      setError(err);
      return;
    }
    const statusErr = await setStatus(current, "answered");
    setBusy(false);
    if (statusErr) setError(statusErr);
    setSaved(savedText.length > 60 ? `${savedText.slice(0, 57)}…` : savedText);
    resetFor(index);
  }

  async function skip() {
    if (!current) return;
    setBusy(true);
    setSaved(null);
    const err = await setStatus(current, "skipped");
    setBusy(false);
    if (err) setError(err);
    else resetFor(index);
  }

  function next() {
    if (!prompts || prompts.length < 2) return;
    setSaved(null);
    resetFor((index + 1) % prompts.length);
  }

  const total = prompts?.length ?? 0;
  const position = Math.min(index, Math.max(total - 1, 0)) + 1;

  return (
    <div className="sparks">
      <div className="sparks-head">
        <p className="sparks-intro">
          Answer a question about your past — it often brings back a story you forgot.
        </p>
        {total > 0 && (
          <span className="badge num" aria-label={`Question ${position} of ${total}`}>
            {position} of {total}
          </span>
        )}
      </div>

      {loading && (
        <p className="status-line status-ai" role="status">
          <LoaderCircle className="spin" size={16} strokeWidth={1.75} aria-hidden="true" />
          {loadingAi ? "Finding questions about your experience… usually 15–45 seconds." : "Loading questions…"}
        </p>
      )}

      {!loading && current && (
        <form onSubmit={save} className="spark-form">
          <div className="spark-question">
            <span className="spark-kicker">
              <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
              {current.source_experience ? "AI question" : "Question"}
            </span>
            <p className="spark-text">{current.question}</p>
            <p className="spark-source">
              {current.source_experience ? `From your CV: ${current.source_experience}` : "General question"}
              {current.target_tag && ` · ${current.target_tag}`}
            </p>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="spark-answer">
              What happened?
            </label>
            <textarea
              id="spark-answer"
              className="textarea"
              rows={3}
              maxLength={500}
              placeholder="Write 1–2 sentences about that moment."
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (saved) setSaved(null);
              }}
            />
          </div>

          {current.target_tag && (
            <div className="spark-tag">
              <span className="small muted">Tag:</span>
              <button type="button" className="chip" aria-pressed={useTag} onClick={() => setUseTag((v) => !v)}>
                {useTag && <Check size={14} strokeWidth={2} aria-hidden="true" />}
                {current.target_tag}
              </button>
            </div>
          )}

          <div className="spark-actions">
            <button type="submit" className="btn btn-primary" disabled={busy || !answer.trim()}>
              {busy ? "Saving…" : "Save as story"}
            </button>
            <button type="button" className="btn btn-secondary" onClick={next} disabled={busy || total < 2}>
              Next question
            </button>
            <button type="button" className="btn btn-ghost" onClick={skip} disabled={busy}>
              Not relevant
            </button>
          </div>
        </form>
      )}

      {!loading && prompts && prompts.length === 0 && !error && (
        <p className="muted">You have gone through all questions. Get new ones below.</p>
      )}

      <p className="save-status" role="status" aria-live="polite">
        {saved && (
          <>
            <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            Saved “{saved}” as a story — AI is structuring it.
          </>
        )}
      </p>

      {error && (
        <p className="field-error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      )}

      {!loading && (
        <button type="button" className="btn btn-ghost btn-sm sparks-new" onClick={() => load("regenerate")}>
          <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
          New questions
        </button>
      )}

      {/* Exactly one note, matching the questions on screen */}
      {!loading && hasCv && !cvQuestions && total > 0 ? (
        <p className="small muted">
          Personal questions from your CV are being prepared — try &lsquo;New questions&rsquo; in a minute.
        </p>
      ) : (
        <p className="privacy privacy-inline">
          <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
          <span>
            {current?.source_experience
              ? "Questions are generated by Google Gemini from your CV (contact details removed)."
              : "These are general questions — no AI is used. Upload your CV under “Use my CV” for questions about your own experience."}
          </span>
        </p>
      )}
    </div>
  );
}
