"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Eye, EyeOff, Flame } from "lucide-react";
import { displayTitle, type Story } from "@/lib/types";
import { STAR_FIELDS, interviewQuestion } from "@/lib/star";

export default function PracticePanel({
  story,
  practisedToday,
  streak,
  onPractised,
}: {
  story: Story | undefined;
  practisedToday: boolean;
  streak: number;
  onPractised: (s: Story) => Promise<string | null>;
}) {
  // Short celebration after "I practised it" (kept here because the next story replaces the body)
  const [celebrate, setCelebrate] = useState<string | null>(null);
  useEffect(() => {
    if (!celebrate) return;
    const t = setTimeout(() => setCelebrate(null), 4000);
    return () => clearTimeout(t);
  }, [celebrate]);

  async function practised(s: Story) {
    const err = await onPractised(s);
    if (!err) setCelebrate(displayTitle(s));
    return err;
  }

  return (
    <section className="card practice-card" aria-labelledby="practice-panel-title">
      {(practisedToday || streak > 0) && (
        <div className="practice-status">
          {practisedToday && (
            <p className="done-today">
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              Done for today
            </p>
          )}
          {streak > 0 && (
            <p className="streak">
              <Flame size={16} strokeWidth={2} aria-hidden="true" />
              {streak}-day streak
            </p>
          )}
        </div>
      )}
      {celebrate && (
        <p className="practised-pop" role="status">
          <span className="pop-check" aria-hidden="true">
            <Check size={18} strokeWidth={3} />
          </span>
          Practised “{celebrate}” — well done!
        </p>
      )}
      {story ? (
        <PracticeBody key={story.id} story={story} onPractised={practised} />
      ) : (
        <p className="muted">Your first structured story will appear here.</p>
      )}
    </section>
  );
}

function PracticeBody({ story, onPractised }: { story: Story; onPractised: (s: Story) => Promise<string | null> }) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filled = STAR_FIELDS.filter((f) => story[f.key].trim() !== "");
  const times = story.practice_count;

  return (
    <div className="practice-body">
      <p className="label">The interviewer asks</p>
      <p className="practice-question">“{interviewQuestion(story)}”</p>
      <p className="muted">
        Answer out loud with your story: <strong className="practice-story">{displayTitle(story)}</strong>
      </p>

      {revealed && (
        <div className="practice-notes">
          {filled.length > 0 ? (
            filled.map((f) => (
              <div key={f.key} className="star-cell">
                <span className="label">{f.label}</span>
                <p>{story[f.key]}</p>
              </div>
            ))
          ) : (
            <p className="muted">No STAR notes yet — add them to make this story stronger.</p>
          )}
        </div>
      )}

      <div className="practice-actions">
        <button type="button" className="btn btn-secondary" aria-pressed={revealed} onClick={() => setRevealed((v) => !v)}>
          {revealed ? (
            <EyeOff size={16} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Eye size={16} strokeWidth={1.75} aria-hidden="true" />
          )}
          {revealed ? "Hide my notes" : "Show my notes"}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(await onPractised(story));
            setBusy(false);
          }}
        >
          <Check size={16} strokeWidth={2} aria-hidden="true" />I practised it
        </button>
      </div>
      <p className="small muted num">
        Practised {times} {times === 1 ? "time" : "times"}
      </p>
      {error && (
        <p className="field-error" role="alert">
          <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
