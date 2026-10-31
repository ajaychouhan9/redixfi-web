import type { Metadata } from "next";

// The login page is a client component, so its metadata lives here. It is not
// a content page, so it is kept out of search results; links on it are still followed.
export const metadata: Metadata = {
  title: "Log in",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
