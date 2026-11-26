import { staticMeta } from "@/lib/seo/page-meta";
import type { Metadata } from "next";

// The news page is a client component, so its metadata lives here.
export const metadata: Metadata = staticMeta("/news");

// 17 Nov 2026: a client page cannot set its own refresh window, and a fully static page is sent with a one-year cache lifetime, which
// would outlive a deploy. This layout gives the page a short one.
export const revalidate = 300;

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
