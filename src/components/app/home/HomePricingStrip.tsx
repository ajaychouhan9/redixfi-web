import Link from "next/link";

/** One small line above the trial button on Home, for a visitor who is not logged in: what the plans cost, with a link to compare them. */
export function HomePricingStrip() {
  return (
    <p className="text-center text-[13px] text-foreground-muted" data-testid="home-pricing-strip">
      Free · Basic ₹249/mo · Pro ₹399/mo —{" "}
      <Link href="/pricing" className="inline-flex min-h-[44px] items-center font-medium text-accent underline">compare plans</Link>
    </p>
  );
}
