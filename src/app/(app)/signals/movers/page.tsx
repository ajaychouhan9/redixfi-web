import type { Metadata } from "next";
import { getSignalMovers } from "@/lib/api/endpoints";
import { MoversLists } from "@/components/app/signals/MoversLists";
import { formatObservationDate } from "@/lib/format";
import { retryTransientPublicGet } from "@/lib/api/retry-public-upstream";

export const metadata: Metadata = {
  title: "Stock Condition changes",
  alternates: { canonical: "/signals/movers" },
  description: "Today's largest Stock Condition increases and decreases, reported symmetrically.",
};

// 31 Oct 2026: served from a one-minute cache; the fetch below carries `revalidate` so a burst of requests or a short API outage does not 500.
export const revalidate = 60;

export default async function SignalMoversPage() {
  // @auth-ok: SSR + one-minute cache, anonymous (Stock Condition locked outside the free sample); MoversLists asks again with the token of a signed-in visitor.
  const env = await retryTransientPublicGet(
    () => getSignalMovers(undefined, 20, { revalidate: 60 }),
    () => getSignalMovers(undefined, 20, { revalidate: 60, timeoutMs: 10_000 }),
  );
  const movers = env.data;
  // Sep 2026 fix: same real observation date TopSignalChangesCard now
  // shows on the Home card — this detail page must match it, not imply a
  // different (or no) date.
  const observedOn = formatObservationDate(movers.date);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">Signal Movers</h1>
      {observedOn && <p className="mb-4 text-sm text-foreground-muted">As of {observedOn}</p>}
      <MoversLists initial={movers} />
    </div>
  );
}
