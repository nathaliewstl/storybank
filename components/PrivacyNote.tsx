import { Lock } from "lucide-react";

export default function PrivacyNote({
  children = "Your stories are private. AI features use Google Gemini.",
  inline = false,
}: {
  children?: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <p className={`privacy ${inline ? "privacy-inline" : ""}`}>
      <Lock size={16} strokeWidth={1.75} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
