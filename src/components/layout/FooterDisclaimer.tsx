import Link from "next/link";
import { STANDARD_LINE } from "@/lib/compliance/standard-line";

export function FooterDisclaimer() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-2 text-center text-[12px] text-foreground-faint">
      {STANDARD_LINE}{" "}
      <Link href="/how-it-works" className="underline">
        How RedixFi measures its readings
      </Link>{" "}
      ·{" "}
      <Link href="/volatility" className="underline">
        Volatility ranking
      </Link>{" "}
      ·{" "}
      <Link href="/more/disclaimer" className="underline">
        Full disclaimer
      </Link>{" "}
      ·{" "}
      <Link href="/more/about-us" className="underline">
        About &amp; Contact
      </Link>
    </footer>
  );
}
