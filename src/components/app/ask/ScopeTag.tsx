import type { AskScope } from "@/lib/api/types";

/** Small label stating what an Ask AI answer is about: one company, a
 *  comparison, or the whole market (market-wide answers ignore the pin). */
export function ScopeTag({ scope }: { scope?: AskScope | null }) {
  if (!scope || scope.type === "pending") return null;
  const text =
    scope.type === "company"
      ? `About ${scope.symbol}`
      : scope.type === "compare"
        ? `Comparing ${scope.symbols.join(", ")}`
        : "Market-wide";
  return (
    <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-foreground-faint">
      {text}
    </div>
  );
}
