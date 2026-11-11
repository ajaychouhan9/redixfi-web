import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/app/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description: "How cancelling a RedixFi subscription works and how the refund for the unused part of a period is worked out.",
  alternates: { canonical: "/more/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      intro={<p>This page describes exactly what RedixFi does when you cancel a paid plan. It is the same calculation the service runs.</p>}
      sections={[
        {
          heading: "Cancelling",
          body: <p>You can cancel a Basic or Pro plan at any time from your account (Pricing, then your subscription). Cancelling ends the plan straight away: it does not wait for the end of the paid period, and the account returns to the Free plan.</p>,
        },
        {
          heading: "How the refund is worked out",
          body: (
            <>
              <p>We refund the unused part of the period you paid for, in proportion to the days left (a pro-rata refund):</p>
              <p className="rounded-lg bg-hover px-3 py-2 font-mono text-xs text-foreground">refund = amount paid × days left in the period ÷ days in the period</p>
              <p>The days left are counted from the moment you cancel. For example, if you cancel a monthly plan with half of the period still to run, you get back about half of what you paid. The amount you paid is the amount after any promo code discount.</p>
              <p>The same rule applies to monthly and annual plans. A day that has been used is not refunded.</p>
            </>
          ),
        },
        {
          heading: "When the money arrives",
          body: <p>The refund is sent back to the payment method you used, through Razorpay, as soon as you cancel. Razorpay and your bank or card issuer decide how long it then takes to show in your account; this is usually within 5 to 7 working days.</p>,
        },
        {
          heading: "A scheduled upgrade to annual",
          body: <p>If you have scheduled an upgrade from monthly to annual and cancel before it starts, the annual payment is refunded in full (none of that period has run) and your current monthly period continues until it ends.</p>,
        },
        {
          heading: "The free trial",
          body: <p>The 5-day Pro trial is free and takes no payment details, so there is nothing to refund or cancel.</p>,
        },
        {
          heading: "Ask AI question packs",
          body: <p>Question packs are not refunded automatically when bought. If something went wrong with a purchase, write to us and we will look at it.</p>,
        },
        {
          heading: "Mistakes and double charges",
          body: <p>If you were charged twice or charged by mistake, write to <a href={`mailto:${LEGAL.email}`} className="text-accent underline">{LEGAL.email}</a>. We acknowledge within {LEGAL.acknowledgeWithin} and resolve within {LEGAL.resolveWithin}. See the <Link href="/more/terms" className="text-accent underline">Terms of Service</Link> for the rest of the terms.</p>,
        },
      ]}
    />
  );
}
