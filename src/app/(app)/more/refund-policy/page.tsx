import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description: "Money paid for a plan period is not refunded once the plan is active. Cancelling does not refund. Refunds are made only if you were charged twice or paid and the plan was not activated.",
  alternates: { canonical: "/more/refund-policy" },
};

const mail = (
  <a href={`mailto:${LEGAL.email}`} className="text-accent underline">
    {LEGAL.email}
  </a>
);

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      intro={<p>This page says in plain words what happens to your money and your plan. It is the same rule everywhere on RedixFi.</p>}
      sections={[
        {
          heading: "The short version",
          body: <p>Money paid for a plan period is not refunded once the plan is active. Cancelling does not refund. There are only two cases where we refund, listed below.</p>,
        },
        {
          heading: "Cancelling",
          body: (
            <>
              <p>You can cancel from your account. Your plan stays active until the end of the period you paid for. It does not renew automatically, so there is no next payment to stop.</p>
              <p>Cancelling does not refund the unused days.</p>
            </>
          ),
        },
        {
          heading: "The free trial",
          body: <p>The 5-day free Pro trial is there for you to try the product before you pay. It takes no payment details.</p>,
        },
        {
          heading: "When we do refund",
          body: (
            <>
              <p>We refund only in these two cases:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>The same plan was charged more than once.</li>
                <li>The payment was taken but the plan was not activated.</li>
              </ol>
            </>
          ),
        },
        {
          heading: "How to ask for a refund",
          body: (
            <>
              <p>Write to {mail} and include the payment id (it starts with <span className="font-mono text-xs">pay_</span> and is on your payment receipt email).</p>
              <p>The refund goes to the original payment method, usually within 5 to 7 working days.</p>
            </>
          ),
        },
        {
          heading: "What is not refunded",
          body: (
            <>
              <p>Unused days of a plan, a change of mind, and a plan you cancelled.</p>
              <p>Top-ups and add-ons (for example Ask AI question packs) are not refunded.</p>
              <p>An annual plan you bought in advance, to start when your monthly plan ends, is not refunded either.</p>
            </>
          ),
        },
        {
          heading: "Who to write to",
          body: (
            <p>
              {LEGAL.operator}, {LEGAL.address}. Email {mail}. We acknowledge within {LEGAL.acknowledgeWithin} and resolve within {LEGAL.resolveWithin}. See the{" "}
              <Link href="/more/terms" className="text-accent underline">Terms of Service</Link> for the rest of the terms.
            </p>
          ),
        },
      ]}
    />
  );
}
