import Link from "next/link";
import { STANDARD_LINE } from "@/lib/compliance/standard-line";
import { LEGAL } from "@/lib/legal";

/** The footer of every layout (app and public pages). Four lines (14 Nov 2026; News, Volatility and Sample report added to the links on 18 Nov 2026):
 *  copyright, the one sentence, data source and delay, links. No name, no address, no paragraph. */
export const FOOTER_COPYRIGHT = "© 2026 RedixFi";
export const FOOTER_DATA_LINE = "Data: NSE and company filings. NSE prices are delayed by 15 minutes.";

export function FooterDisclaimer() {
  return (
    <footer className="border-t border-border bg-surface px-4 py-3 text-center text-[12px] leading-relaxed text-foreground-faint" data-testid="site-footer">
      <p>{FOOTER_COPYRIGHT}</p>
      <p data-testid="footer-sentence">{STANDARD_LINE}</p>
      <p>{FOOTER_DATA_LINE}</p>
      <p data-testid="footer-links">
        <Link href="/shortlist-lab" className="underline" data-testid="footer-stock-check">
          Shortlist Lab
        </Link>{" "}
        ·{" "}
        <Link href="/news" className="underline">
          News
        </Link>{" "}
        ·{" "}
        <Link href="/volatility" className="underline">
          Volatility
        </Link>{" "}
        ·{" "}
        <Link href="/sample-report" className="underline">
          Sample report
        </Link>{" "}
        ·{" "}
        <Link href="/more/about-us" className="underline">
          About
        </Link>{" "}
        · Support:{" "}
        <a href={`mailto:${LEGAL.email}`} className="underline">
          {LEGAL.email}
        </a>{" "}
        ·{" "}
        <Link href="/more/terms" className="underline">
          Terms
        </Link>{" "}
        ·{" "}
        <Link href="/more/privacy" className="underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/more/refund-policy" className="underline">
          Refund policy
        </Link>{" "}
        ·{" "}
        <Link href="/more/disclaimer" className="underline">
          Disclaimer
        </Link>
      </p>
    </footer>
  );
}
