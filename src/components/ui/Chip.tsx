import clsx from "clsx";

import { signalStateLabel, signalStateTone } from "@/lib/signal-state-labels";

const TONE_CLASSES = {
  neutral: "bg-neutral-bg text-neutral",
  up: "bg-up-bg text-up",
  down: "bg-down-bg text-down",
  amber: "bg-amber-bg text-amber",
  accent: "bg-accent/10 text-accent",
} as const;

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof TONE_CLASSES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export { signalStateLabel };

export function SignalStateChip({ code }: { code: string }) {
  const tone = signalStateTone(code);
  return <Chip tone={tone}>{signalStateLabel(code)}</Chip>;
}
