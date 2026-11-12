import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/LegalPage";
import { LEGAL } from "@/lib/legal";
import { STANDARD_LINE } from "@/lib/compliance/standard-line";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using RedixFi: what the service is, accounts, plans and billing, the 5-day trial, acceptable use, limits of liability and how to contact us.",
  alternates: { canonical: "/more/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={<p>These terms are an agreement between you and {LEGAL.operator}, who operates RedixFi (redixfi.com). By creating an account or using the service you accept them. If you do not accept them, please do not use RedixFi.</p>}
      sections={[
        {
          heading: "What RedixFi is",
          body: (
            <>
              <p>RedixFi shows measured market data and analytics about Indian listed companies: prices, delivery, volume, filings, summaries of company documents and similar facts, each with its source where we have one.</p>
              <p>{STANDARD_LINE}</p>
              <p>Nothing on RedixFi is a recommendation to trade any security. Decisions you take are yours. Please talk to a registered adviser if you need advice.</p>
            </>
          ),
        },
        {
          heading: "Who can use it",
          body: <p>You must be 18 or older. We do not knowingly create accounts for anyone under 18; if we learn that an account belongs to someone under 18 we will close it.</p>,
        },
        {
          heading: "Your account",
          body: (
            <>
              <p>You sign in with Google, an email address and password, or a phone number. Keep your sign-in details to yourself and tell us at {LEGAL.email} if you think someone else has used your account. You are responsible for what happens under your account.</p>
              <p>Give us accurate information. One person should hold one account.</p>
            </>
          ),
        },
        {
          heading: "Plans, billing and renewal",
          body: (
            <>
              <p>RedixFi has a Free plan and two paid plans, Basic and Pro, each available monthly or annually. The prices, and what each plan includes, are on the <Link href="/pricing" className="text-accent underline">pricing page</Link>. The price shown is the total you pay. After each payment we email you a payment receipt.</p>
              <p>You pay through Razorpay. Each payment is a one-time payment for the period you choose. A paid plan does not renew automatically: when the period ends your account returns to the Free plan, and you can renew whenever you like. You can cancel at any time from your account; how cancellation and refunds work is in the <Link href="/more/refund-policy" className="text-accent underline">refund policy</Link>.</p>
              <p>A monthly plan can be upgraded to the annual plan. Ask AI question packs (top-ups) are bought separately and stay usable after a subscription ends.</p>
              <p>We may change prices for future periods. Prices shown at checkout are the prices you pay for that period.</p>
            </>
          ),
        },
        {
          heading: "The 5-day free Pro trial",
          body: <p>A new account can start one free trial of the Pro plan for 5 days. It is once per account. No payment details are asked for the trial and nothing is charged when it ends; the account returns to the Free plan unless you choose a paid plan. To start the trial you must have accepted these terms and the privacy policy.</p>,
        },
        {
          heading: "Acceptable use",
          body: (
            <>
              <p>Use RedixFi for yourself. Please do not:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>scrape, copy in bulk, or use bots or scripts to collect our data;</li>
                <li>resell, sublicense or redistribute our data, summaries or reports, or present them as your own;</li>
                <li>share your login or use several accounts to get around limits or the one-time trial;</li>
                <li>try to break, overload or look for weaknesses in the service, or use it for anything unlawful.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Data, summaries and their limits",
          body: (
            <>
              <p>Our data comes from public sources, such as exchange and company filings, and from licensed or third-party data providers. It can be delayed, incomplete or wrong, and a source can change what it published.</p>
              <p>Summaries of company documents are written by an AI model and can contain mistakes. The source filing always prevails over a summary. Please check the filing before you rely on anything.</p>
              <p>Past data is not a forecast of what will happen next.</p>
            </>
          ),
        },
        {
          heading: "Limits of liability",
          body: (
            <>
              <p>RedixFi is provided as it is. To the extent the law allows, we do not promise that the service will be uninterrupted, error-free or fit for a particular purpose.</p>
              <p>To the extent the law allows, we are not liable for losses from trading or investment decisions, or for indirect or consequential loss. Our total liability to you for any claim about the service is limited to the amount you paid us in the 12 months before the claim. Nothing in these terms limits a liability that cannot be limited by law.</p>
            </>
          ),
        },
        {
          heading: "Suspension and ending",
          body: <p>You can stop using RedixFi and ask us to delete your account at any time. We may suspend or end an account that breaks these terms or puts the service or other users at risk. If we end a paid account without a breach on your side, we will refund the unused part of the period in the way described in the refund policy.</p>,
        },
        {
          heading: "Changes to these terms",
          body: <p>We may update these terms. When we change them in a way that matters, the version date at the top changes and you will be asked to accept the new version the next time you sign in. If you do not accept, you can keep reading the public pages but cannot start a trial or pay.</p>,
        },
        {
          heading: "Governing law",
          body: <p>These terms are governed by the laws of India. The courts at {LEGAL.court} have jurisdiction over any dispute.</p>,
        },
        {
          heading: "Contact",
          body: (
            <p>
              {LEGAL.operator}, {LEGAL.address}. Email <a href={`mailto:${LEGAL.email}`} className="text-accent underline">{LEGAL.email}</a>. Complaints go to the grievance officer on the <Link href="/more/about-us" className="text-accent underline">About &amp; Contact</Link> page.
            </p>
          ),
        },
      ]}
    />
  );
}
