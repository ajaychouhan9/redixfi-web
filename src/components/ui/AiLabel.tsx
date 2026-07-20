/** Every AI output must be visibly labeled — compliance rule 5 / AI rule 1. */
export function AiLabel({ className }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent " +
        (className ?? "")
      }
    >
      AI-generated
    </span>
  );
}
