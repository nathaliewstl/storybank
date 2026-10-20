import { Star } from "lucide-react";

export default function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`} aria-hidden="true">
      <Star size={15} strokeWidth={2} fill="currentColor" />
    </span>
  );
}
