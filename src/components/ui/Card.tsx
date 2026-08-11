import { type ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  title,
  // Optional per-use override for the title's text size — default
  // unchanged (`text-sm`, every existing caller sitewide keeps its exact
  // current look). Added (2026-08-11) so ResearchDetail.tsx's "Concalls &
  // investor presentations" / "Signal summary" headings can be bumped to
  // the task's requested 15-16px WITHOUT touching this shared component's
  // default for every other Card on every other page.
  titleClassName,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  titleClassName?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={clsx(
        "rounded-xl border border-border bg-surface-raised shadow-sm",
        className
      )}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title && <h2 className={clsx("font-semibold text-foreground", titleClassName ?? "text-sm")}>{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
