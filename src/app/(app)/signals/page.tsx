import type { Metadata } from "next";
import { SmartScreenerBox } from "@/components/app/signals/SmartScreenerBox";
import { SignalsExplorer } from "@/components/app/signals/SignalsExplorer";

export const metadata: Metadata = {
  title: "Signal Dashboard",
  description: "Measured composite signal scores across 750 NSE/BSE stocks — trend, delivery, sector standing and options positioning, factually reported.",
};

export default function SignalsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Signal Dashboard</h1>
      <SmartScreenerBox />
      <SignalsExplorer />
    </div>
  );
}
