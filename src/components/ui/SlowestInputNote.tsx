import { formatDataAsOf } from "@/lib/format";
import type { SlowestInput } from "@/lib/api/types";

// Shown on its own line under the score's date. The score's date is the
// session it was computed on; this is the age of its slowest input, kept
// separate so the two are never mixed. Renders nothing when no input is
// notably older.
export function SlowestInputNote({ input }: { input?: SlowestInput | null }) {
  if (!input) return null;
  return (
    <p className="mt-0.5 text-[10px] text-foreground-faint">
      Slowest input: {input.label}, {formatDataAsOf(input).replace(/^Data as of /, "as of ")}
    </p>
  );
}
