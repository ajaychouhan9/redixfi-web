import type { CorporateActionNote as Note } from "@/lib/api/types";

// A short factual note shown when a stock's price history is not comparable
// across a split or bonus issue (or an unexplained large price change). The text
// comes from the API so every surface says the same thing.
export function CorporateActionNote({ info, className }: { info?: Note | null; className?: string }) {
  if (!info?.note) return null;
  return (
    <p className={className ?? "mt-1 text-[11px] text-foreground-muted"} role="note">
      {info.note}
    </p>
  );
}
