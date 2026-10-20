"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleAlert, FileText, Plus, RefreshCw, Sparkles, Trash, Upload } from "lucide-react";
import PrivacyNote from "../PrivacyNote";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { AI_ERROR_MESSAGES, type AiErrorCode, type CvDocument, type Suggestion } from "@/lib/types";

const MAX_BYTES = 5 * 1024 * 1024;

// "From your CV" option of the New story section
export default function CvIdeas({
  userId,
  initialCv,
  initialSuggestions,
  onAddAsStory,
  onIdeasChange,
}: {
  userId: string;
  initialCv: CvDocument | null;
  initialSuggestions: Suggestion[];
  onAddAsStory: (s: Suggestion) => Promise<string | null>;
  onIdeasChange: (count: number) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [cv, setCv] = useState<CvDocument | null>(initialCv);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions);
  const [busy, setBusy] = useState<"upload" | "analyze" | "delete" | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const filePath = `${userId}/cv.pdf`;

  useEffect(() => onIdeasChange(suggestions.length), [suggestions.length, onIdeasChange]);

  async function analyze(fileName?: string) {
    setBusy("analyze");
    setError(null);
    try {
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileName ? { fileName } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(AI_ERROR_MESSAGES[(json.error as AiErrorCode) ?? "ai_failed"] ?? AI_ERROR_MESSAGES.ai_failed);
        return;
      }
      setSuggestions(json.suggestions ?? []);
      setCv((prev) => (prev ? { ...prev, analyzed_at: new Date().toISOString() } : prev));

    } catch {
      setError(AI_ERROR_MESSAGES.ai_failed);
    } finally {
      setBusy(null);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That PDF is larger than 5 MB. Please upload a smaller file.");
      return;
    }

    setBusy("upload");
    setError(null);
    const { error: upError } = await supabase.storage
      .from("cvs")
      .upload(filePath, file, { upsert: true, contentType: "application/pdf" });
    if (upError) {
      setBusy(null);
      setError(friendlyError(upError, "We couldn't upload your CV. Please try again."));
      return;
    }
    setCv({ file_name: file.name, uploaded_at: new Date().toISOString(), analyzed_at: null });
    setSuggestions([]);
    await analyze(file.name);
    // New CV: prepare Story Sparks questions once, after the story ideas (one more AI call, in the background).
    // If the AI is busy, the route stores built-in questions instead.
    void fetch("/api/sparks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cv_uploaded" }),
    }).catch(() => {});
  }

  async function deleteCv() {
    if (!confirm("Delete your CV, its extracted text, all story ideas and Story Sparks questions?")) return;
    setBusy("delete");
    setError(null);
    // Story Sparks questions are made from the CV, so they go too
    const [storageRes, docRes, sugRes, promptRes] = await Promise.all([
      supabase.storage.from("cvs").remove([filePath]),
      supabase.from("cv_documents").delete().eq("user_id", userId),
      supabase.from("story_suggestions").delete().eq("user_id", userId),
      supabase.from("story_prompts").delete().eq("user_id", userId),
    ]);
    setBusy(null);
    // PGRST205 = the story_prompts table does not exist yet (SQL not run): nothing to delete
    const promptError = promptRes.error?.code === "PGRST205" ? null : promptRes.error;
    const failed = storageRes.error || docRes.error || sugRes.error || promptError;
    if (failed) {
      setError(friendlyError(failed, "We couldn't delete everything. Please try again."));
      return;
    }
    setCv(null);
    setSuggestions([]);
  }

  async function dismiss(id: string) {
    setBusyId(id);
    const { error } = await supabase.from("story_suggestions").delete().eq("id", id);
    setBusyId(null);
    if (error) return setError(friendlyError(error, "We couldn't dismiss this idea. Please try again."));
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  async function add(s: Suggestion) {
    setBusyId(s.id);
    setError(null);
    const err = await onAddAsStory(s);
    setBusyId(null);
    if (err) return setError(err);
    setAdded(s.title);
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id));
  }

  return (
      <div className="cv-body">
        <p className="muted">
          Upload your CV as a PDF and AI suggests 3–6 experiences that make good interview stories. Add the ones
          you like — nothing is saved as a story until you choose it.
        </p>

        <input
          type="file"
          accept="application/pdf,.pdf"
          className="visually-hidden"
          id="cv-file"
          onChange={handleFile}
          disabled={busy !== null}
        />

        {cv ? (
          <div className="cv-file">
            <span className="cv-name" title={cv.file_name}>
              <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
              <span>{cv.file_name}</span>
            </span>
            <label htmlFor="cv-file" className={`btn btn-ghost btn-sm ${busy ? "is-disabled" : ""}`}>
              <Upload size={16} strokeWidth={1.75} aria-hidden="true" />
              Replace
            </label>
            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={deleteCv} disabled={busy !== null}>
              <Trash size={16} strokeWidth={1.75} aria-hidden="true" />
              {busy === "delete" ? "Deleting…" : "Delete my CV"}
            </button>
          </div>
        ) : (
          <label htmlFor="cv-file" className={`btn btn-ai btn-lg btn-block ${busy ? "is-disabled" : ""}`}>
            <Upload size={16} strokeWidth={1.75} aria-hidden="true" />
            {busy === "upload" ? "Uploading…" : "Upload your CV (PDF)"}
          </label>
        )}

        <PrivacyNote inline>
          Your CV is stored privately. Contact details are removed, then the text is processed by Google
          Gemini, which may use it to improve its services.
        </PrivacyNote>

        <p className="status-line status-ai" aria-live="polite">
          {busy === "upload" && "Uploading your CV…"}
          {busy === "analyze" && "Reading your CV and finding story ideas…"}
        </p>

        {error && (
          <div className="notice" role="alert">
            <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
            <div className="notice-body">
              <span>{error}</span>
              {cv && busy === null && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => analyze()}>
                  <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {added && (
          <p className="save-status" role="status">
            Added “{added}” to your stories — AI is structuring it.
          </p>
        )}

        {cv && !error && busy === null && suggestions.length === 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => analyze()}>
            <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
            Get story ideas
          </button>
        )}

        {suggestions.length > 0 && (
          <ul className="idea-list" aria-label="Story ideas from your CV">
            {suggestions.map((s) => (
              <li key={s.id} className="idea">
                <p className="idea-title">{s.title}</p>
                {s.source_experience && (
                  <button
                    type="button"
                    className="idea-source"
                    aria-expanded={expandedSource === s.id}
                    onClick={() => setExpandedSource(expandedSource === s.id ? null : s.id)}
                  >
                    From: {s.source_experience}
                  </button>
                )}
                {s.tags.length > 0 && (
                  <ul className="chips" aria-label="Suggested tags">
                    {s.tags.map((t) => (
                      <li key={t} className="chip chip-ai">
                        {t}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="idea-actions">
                  <button type="button" className="btn btn-ai btn-sm" disabled={busyId === s.id} onClick={() => add(s)}>
                    <Plus size={16} strokeWidth={2} aria-hidden="true" />
                    Add as story
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={busyId === s.id} onClick={() => dismiss(s.id)}>
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
  );
}
