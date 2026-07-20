import type { Metadata } from "next";
import { IntradayScreen } from "@/components/app/intraday/IntradayScreen";

export const metadata: Metadata = {
  title: "Intraday Live",
  description: "Pre-market movers, a live user-filtered scanner, AI-classified event feed and post-market recap — factual, not trade calls.",
};

export default function IntradayPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Intraday Live</h1>
      <IntradayScreen />
    </div>
  );
}
