/**
 * The fresh-vs-resume decision for reopening the Ask-RedixFi panel — pulled
 * out of AskRedixFi.tsx (regression-fix session, 2026-08-21) into its own
 * dependency-free module SPECIFICALLY so it can be exercised by a real,
 * automated regression test (`scripts/test-ask-fresh-start.ts`) without a
 * React/DOM harness — this exact rule has now regressed and needed
 * re-fixing more than once (UI polish batch, Item 4, 2026-08-20; this
 * session again), and a rule that only ever existed inline inside a
 * component's `useEffect` had no way to be asserted directly.
 *
 * Locked spec (unchanged since the 2026-08-20 UI polish batch): closing the
 * panel (X) and reopening it on a DIFFERENT route starts a fresh
 * conversation; reopening on the SAME route (or an app's very first-ever
 * open, nothing closed yet to compare against) resumes whatever was
 * already there.
 */
export function shouldStartFreshOnReopen(params: {
  open: boolean;
  hasClosedBefore: boolean;
  closedAtPath: string | null;
  currentPath: string;
}): boolean {
  return params.open && params.hasClosedBefore && params.closedAtPath !== null && params.closedAtPath !== params.currentPath;
}
