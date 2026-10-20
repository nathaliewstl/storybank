import { BookOpen, CircleCheck, Mic, Tag, type LucideIcon } from "lucide-react";

// Neutral progress overview: tiles on larger screens, one line on phones. Hidden for 0 stories.
export default function StatsBar({
  stories,
  ready,
  emptyTags,
  practised,
}: {
  stories: number;
  ready: number;
  emptyTags: number;
  practised: number;
}) {
  const stats: { icon: LucideIcon; value: string | number; label: string }[] = [
    { icon: BookOpen, value: stories, label: stories === 1 ? "story" : "stories" },
    { icon: CircleCheck, value: `${ready}/${stories}`, label: "ready to use" },
    { icon: Tag, value: emptyTags, label: emptyTags === 1 ? "tag with no story" : "tags with no story" },
    { icon: Mic, value: practised, label: practised === 1 ? "time practised" : "times practised" },
  ];

  return (
    <>
      <p className="stats-line">
        {stats.map((s, i) => (
          <span key={s.label}>
            {i > 0 && <span aria-hidden="true"> · </span>}
            <strong className="num">{s.value}</strong> {s.label}
          </span>
        ))}
      </p>
      <ul className="stats" aria-label="Your progress">
        {stats.map(({ icon: Icon, value, label }) => (
          <li key={label} className="stat">
            <Icon className="stat-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="stat-text">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
