import type { Metadata } from "next";
import { ContactForm } from "@/components/app/ContactForm";

export const metadata: Metadata = { title: "About & Contact" };

const CONTACT_EMAIL = "support@redixfi.com";

export default function AboutUsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 text-sm leading-relaxed">
      <section className="space-y-4">
        <h1 className="text-xl font-semibold">About RedixFi</h1>
        <p className="text-foreground-muted">RedixFi — Market. Simplified.</p>
        <p>
          RedixFi is the AI that reads the entire market for you. We report measured, historical and current market
          data — price and volume history, delivery percentages, options positioning, foreign/domestic institutional
          flow, promoter pledge levels, insider filings, and AI-classified news — across 2,000+ NSE stocks, updated
          daily.
        </p>
        <p>
          RedixFi tracks measured signals, delivery and options data, and AI-classified news every day — analytics,
          not advice. Every figure on the platform describes something that has already happened or is currently
          observed; nothing states or implies what a stock will do next. RedixFi is not currently registered with
          SEBI as a Research Analyst, and directional research is planned to launch only after that registration is
          complete.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contact Us</h2>
        <p className="text-foreground-muted">We typically respond within 24–48 hours.</p>
        <p>
          Email:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-accent hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Or send a message here</h2>
        <p className="text-foreground-muted">
          Prefer not to use your email client? Send your issue directly — we typically respond within 24–48 hours.
        </p>
        <ContactForm />
      </section>
    </div>
  );
}
