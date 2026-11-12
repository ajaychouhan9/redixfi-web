import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data RedixFi collects, why, who else handles it, how long it is kept, and your rights to access, correct and delete it.",
  alternates: { canonical: "/more/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={<p>This policy says what personal data RedixFi collects, why, who else handles it and what you can ask us to do with it. RedixFi is operated by {LEGAL.operator}, {LEGAL.address}.</p>}
      sections={[
        {
          heading: "What we collect",
          body: (
            <>
              <p><strong className="text-foreground">When you sign up:</strong> your name and email address (Google or email sign-in) or your phone number (OTP sign-in). Passwords and one-time codes are handled by our sign-in provider; we do not hold your password.</p>
              <p><strong className="text-foreground">What you do on the service:</strong> the stocks on your watchlist and portfolio, alert rules you create, the questions you ask in Ask AI and the answers (kept for the history period of your plan), counts of how much of a daily or monthly allowance you used, your plan and subscription records, and a record that you accepted these terms and the date and version.</p>
              <p><strong className="text-foreground">If you choose to connect them:</strong> a Telegram chat ID for alerts, and a browser or phone push-notification token.</p>
              <p><strong className="text-foreground">Automatically:</strong> your IP address and basic request details, which we use to limit abuse and to count the free daily lookups of visitors who are not signed in; and the date you were last active on your account.</p>
              <p><strong className="text-foreground">Feedback:</strong> if you answer the "What were you looking for?" box, we store your answer, the page, your plan, and the email address only if you give one.</p>
              <p><strong className="text-foreground">Payments:</strong> card and bank details go to Razorpay and are not stored by us. We keep the order and payment reference numbers, the plan and the amount.</p>
            </>
          ),
        },
        {
          heading: "Why we use it",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>to create your account, sign you in and keep you signed in;</li>
              <li>to run the service you ask for: watchlists, alerts, Ask AI, reports and billing;</li>
              <li>to send the alerts, digests and account emails you ask for, and replies to your messages;</li>
              <li>to keep the service safe and within its limits, and to find and fix faults;</li>
              <li>to understand which pages and features are used, so we can improve them, using the counts described below;</li>
              <li>to meet legal and tax duties, such as keeping payment records.</li>
            </ul>
          ),
        },
        {
          heading: "Who else handles your data",
          body: (
            <>
              <p>We use these outside services to run RedixFi. Each receives only what it needs:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Google Firebase</strong>: sign-in (Google, email and password, phone OTP) and its identity records.</li>
                <li><strong className="text-foreground">Razorpay</strong>: payments and refunds.</li>
                <li><strong className="text-foreground">Zoho Mail</strong>: sending alert and digest emails and receiving messages sent to support.</li>
                <li><strong className="text-foreground">OpenAI</strong>: the AI model that receives the text of a question you ask in Ask AI, and the data needed to answer it, in order to write the answer. Please do not put personal details in a question.</li>
                <li><strong className="text-foreground">Telegram</strong>: delivering alerts, only if you link your Telegram account.</li>
                <li><strong className="text-foreground">Vercel</strong>: hosting and delivering the website, and its privacy-friendly page-count analytics, which do not use cookies and do not follow you across sites.</li>
                <li><strong className="text-foreground">Our servers and database</strong>, where the service runs and your records are stored in India or in the cloud region we choose.</li>
              </ul>
              <p>We do not sell your personal data and we do not use it for advertising.</p>
            </>
          ),
        },
        {
          heading: "Cookies and analytics",
          body: <p>RedixFi stores your sign-in on your device so you stay signed in, and a few settings (for example a theme choice). We count page views and a few actions, such as clicking the trial button, with Vercel Web Analytics, which does not set cookies and does not identify you personally. We do not use advertising cookies.</p>,
        },
        {
          heading: "How long we keep it",
          body: (
            <ul className="list-disc space-y-1 pl-5">
              <li>Account details: while your account is open, and for a short period after you ask us to delete it so that we can finish refunds or disputes.</li>
              <li>Ask AI history: for the period your plan keeps chat history (6 hours on Free, 7 days on Basic, 30 days on Pro).</li>
              <li>Payment and receipt records: for as long as tax and accounting law requires.</li>
              <li>Feedback answers: up to 2 years.</li>
              <li>Server logs: a few weeks.</li>
            </ul>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <>
              <p>You can ask us to show you the data we hold about you, correct it, delete it, or stop using it for a purpose you agreed to (withdraw your consent). Write to <a href={`mailto:${LEGAL.email}`} className="text-accent underline">{LEGAL.email}</a> from the email address on your account. We acknowledge within {LEGAL.acknowledgeWithin} and resolve within {LEGAL.resolveWithin}.</p>
              <p>If you withdraw consent or delete your account, the paid features that need the data stop working. Records we must keep by law are kept.</p>
            </>
          ),
        },
        {
          heading: "Children",
          body: <p>RedixFi is for people aged 18 and over. We do not knowingly collect data from anyone under 18, and we delete an account when we find that it belongs to someone under 18.</p>,
        },
        {
          heading: "Changes",
          body: <p>If this policy changes in a way that matters, the version date at the top changes and you will be asked to accept the new version the next time you sign in.</p>,
        },
        {
          heading: "Grievance officer and contact",
          body: (
            <p>
              Grievance officer: {LEGAL.grievanceOfficer}, {LEGAL.address}, <a href={`mailto:${LEGAL.email}`} className="text-accent underline">{LEGAL.email}</a>. We acknowledge a complaint within {LEGAL.acknowledgeWithin} and resolve it within {LEGAL.resolveWithin}. See also the <Link href="/more/terms" className="text-accent underline">Terms of Service</Link> and the <Link href="/more/refund-policy" className="text-accent underline">refund policy</Link>.
            </p>
          ),
        },
      ]}
    />
  );
}
