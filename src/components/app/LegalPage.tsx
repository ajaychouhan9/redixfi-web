import type { ReactNode } from "react";
import { LEGAL } from "@/lib/legal";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

/** The shared layout of the Terms, Privacy and Refund pages: a title, the date, and numbered plain-language sections. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 text-sm leading-relaxed">
      <header>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-xs text-foreground-faint">Last updated {LEGAL.updated}. Version {LEGAL.termsVersion}.</p>
        <div className="mt-3 text-foreground-muted">{intro}</div>
      </header>
      {sections.map((s, i) => (
        <section key={s.heading} aria-labelledby={`legal-${i}`}>
          <h2 id={`legal-${i}`} className="mb-1 font-semibold">
            {i + 1}. {s.heading}
          </h2>
          <div className="space-y-2 text-foreground-muted">{s.body}</div>
        </section>
      ))}
    </div>
  );
}
