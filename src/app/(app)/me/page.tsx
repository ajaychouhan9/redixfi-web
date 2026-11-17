import type { Metadata } from "next";

import { MeMenu } from "@/components/app/me/MeMenu";

// The page makes no request of its own; a refresh window keeps the cached copy from outliving a deploy (a fully static page is sent with a one-year cache lifetime).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Me",
  description: "Your watchlist, alerts, inbox, account and checkout in one place.",
  alternates: { canonical: "/me" },
  robots: { index: false, follow: true },
};

/** Static shell: who is looking is only known in the browser, so the list is built there. */
export default function MePage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold">Me</h1>
      <MeMenu />
    </div>
  );
}
