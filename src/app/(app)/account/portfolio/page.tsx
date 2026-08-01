"use client";

import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { PortfolioAnalyticsCard, PortfolioBriefCard } from "@/components/app/account/PortfolioCards";
import { useAuth } from "@/lib/auth/AuthContext";
import { getPortfolioAnalytics, getPortfolioBrief } from "@/lib/api/mutations";
import type { PortfolioAnalytics, PortfolioBrief } from "@/lib/api/types";

function PortfolioView() {
  const { getToken } = useAuth();
  const [brief, setBrief] = useState<PortfolioBrief | null>(null);
  const [analytics, setAnalytics] = useState<PortfolioAnalytics | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      getPortfolioBrief(token).then(setBrief).catch(() => setBrief(null));
      getPortfolioAnalytics(token).then(setAnalytics).catch(() => setAnalytics(null));
    })();
  }, [getToken]);

  if (!analytics) return <p className="text-sm text-foreground-muted">Loading…</p>;

  return (
    <div className="space-y-4">
      <PortfolioBriefCard brief={brief} />
      <PortfolioAnalyticsCard data={analytics} />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Account</h1>
      <AccountTabs />
      <RequireAuth>
        <PortfolioView />
      </RequireAuth>
    </div>
  );
}
