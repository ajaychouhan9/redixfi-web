/**
 * "Stock Condition" in a narrow table header. On a phone it shows the short "Condition" (the long name stays available to screen
 * readers); from the `sm` breakpoint up it shows the full name.
 */
export function ConditionLabel() {
  return (
    <>
      <span className="sr-only sm:not-sr-only">Stock Condition</span>
      <span aria-hidden className="sm:hidden">
        Condition
      </span>
    </>
  );
}
