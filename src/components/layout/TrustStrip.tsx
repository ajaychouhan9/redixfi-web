"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Facts only (14 Nov 2026): who runs the site, where the data comes from, how to reach support. No claim of approval or status. */
export const TRUST_STRIP_TEXT = "Operated by Ajay Chouhan, Faridabad · Data from NSE and company filings · support@redixfi.com";

export function TrustStrip({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[12px] text-foreground-faint ${className}`} data-testid="trust-strip">
      <Link href="/more/about-us" className="underline-offset-2 hover:underline">
        {TRUST_STRIP_TEXT}
      </Link>
    </p>
  );
}

/** The footer copy of the strip. Home and Pricing show it inside the page, so the footer leaves it out there (one strip per page). */
export function FooterTrustStrip() {
  const pathname = usePathname() || "/";
  if (pathname === "/" || pathname.startsWith("/pricing")) return null;
  return <TrustStrip className="mt-1" />;
}
