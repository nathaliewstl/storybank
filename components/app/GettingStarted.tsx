import { ArrowRight, Mic, PenLine, Sparkles } from "lucide-react";

// The one 3-step guide on /app. Only shown while the user has fewer than 3 stories.
const STEPS = [
  { icon: PenLine, title: "1. Add a story", text: "Write what you did" },
  { icon: Sparkles, title: "2. AI structures it", text: "Into a clear STAR answer" },
  { icon: Mic, title: "3. Practise", text: "Say it out loud" },
];

export default function GettingStarted() {
  return (
    <section className="card guide" aria-label="How StoryBank works">
      <ol className="guide-steps-row">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="guide-step-item">
            <span className="icon-tile" aria-hidden="true">
              <Icon size={18} strokeWidth={1.75} />
            </span>
            <span className="guide-step-text">
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="guide-arrow" size={16} strokeWidth={2} aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </section>
  );
}
