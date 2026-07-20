import clsx from "clsx";

/** Green/amber from meta.data_fresh — amber means "data delayed", never wrong numbers shown as fresh. */
export function FreshnessDot({ fresh, className }: { fresh: boolean; className?: string }) {
  return (
    <span
      title={fresh ? "Data is fresh" : "Data delayed"}
      className={clsx("inline-flex items-center gap-1.5 text-xs text-foreground-muted", className)}
    >
      <span
        className={clsx("h-2 w-2 rounded-full", fresh ? "bg-up" : "bg-amber")}
        aria-hidden
      />
      {fresh ? "Live" : "Data delayed"}
    </span>
  );
}
