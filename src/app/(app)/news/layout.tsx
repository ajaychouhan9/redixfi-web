import type { Metadata } from "next";

// The news page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  title: "Market News",
  description: "AI-classified NSE market and company news, tagged by stock and event type. Measured facts, not advice.",
  alternates: { canonical: "/news" },
};

export default function NewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
