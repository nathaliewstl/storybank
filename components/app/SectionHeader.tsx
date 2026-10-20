import type { ReactNode } from "react";

// Clear section heading with an icon badge and a divider line
export default function SectionHeader({
  id,
  accent,
  icon,
  title,
  subtitle,
  actions,
}: {
  id: string;
  // Each main section has its own accent colour (icon tile + short underline); the title stays --text
  accent: "indigo" | "teal" | "rose" | "violet" | "amber";
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={`section-header accent-${accent}`} id={id}>
      <div className="section-header-main">
        <span className="section-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="section-header-text">
          <h2 className="section-header-title" id={`${id}-title`}>
            {title}
          </h2>
          {subtitle && <p className="muted">{subtitle}</p>}
        </div>
        {actions && <div className="section-header-actions">{actions}</div>}
      </div>
    </div>
  );
}
