import type { Metadata } from "next";

// 31 Oct 2026: a canonical address and a page name of its own (the page is private, so it stays out of search results).
export const metadata: Metadata = {
  title: "Your alerts",
  alternates: { canonical: "/account/alerts" },
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
