import Link from "next/link";
import { LEGAL_LINKS } from "@/lib/legal";

/** Terms · Privacy · Refund policy, shown in every footer and next to every Subscribe button (11 Nov 2026). */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <span className={className} data-testid="legal-links">
      {LEGAL_LINKS.map((l, i) => (
        <span key={l.href}>
          {i > 0 && " · "}
          <Link href={l.href} className="underline">
            {l.label}
          </Link>
        </span>
      ))}
    </span>
  );
}
