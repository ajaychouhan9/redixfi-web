"use client";

import { usePathname } from "next/navigation";

import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ROUTE_CRUMBS } from "@/lib/seo/route-crumbs";

export function RouteBreadcrumbs() {
  const path = (usePathname() || "/").replace(/\/$/, "") || "/";
  const crumbs = ROUTE_CRUMBS[path];
  if (!crumbs) return null;
  return <Breadcrumbs crumbs={crumbs} />;
}
