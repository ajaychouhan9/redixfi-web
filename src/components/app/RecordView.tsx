"use client";

import { useEffect } from "react";
import { pushRecentlyViewed } from "@/lib/recently-viewed";

export function RecordView({ symbol, companyName }: { symbol: string; companyName: string }) {
  useEffect(() => {
    pushRecentlyViewed({ symbol, company_name: companyName });
  }, [symbol, companyName]);
  return null;
}
