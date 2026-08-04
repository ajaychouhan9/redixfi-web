import type { Metadata } from "next";
import { SmartScreenerBox } from "@/components/app/signals/SmartScreenerBox";
import { SignalsExplorer } from "@/components/app/signals/SignalsExplorer";
import { SectorSummaryCard } from "@/components/app/education/SummaryCard";
import { getSectorSummary } from "@/lib/api/endpoints";

export const metadata: Metadata = {
  title: "Signal Dashboard",
  description: "Measured composite signal scores across 750 NSE/BSE stocks — trend, delivery, sector standing and options positioning, factually reported.",
};

export default async function SignalsPage() {
  const sectorSummary = await getSectorSummary().then((r) => r.data).catch(() => null);

  return (
    <div>
      <h1 className="mb-5 text-lg font-semibold">Signal Dashboard</h1>
      <div className="mb-5">{sectorSummary && <SectorSummaryCard data={sectorSummary} />}</div>
      <SmartScreenerBox />
      <SignalsExplorer />
    </div>
  );
}
