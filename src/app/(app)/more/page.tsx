import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/more/disclaimer", label: "Full disclaimer" },
  { href: "/more/data-sources", label: "Data sources & update times" },
  { href: "/account", label: "Account" },
  { href: "/pricing", label: "Subscription & pricing" },
  { href: "/news", label: "News" },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-xl font-semibold">More</h1>
      <Card>
        <ul className="divide-y divide-border">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center justify-between py-2.5 text-sm hover:text-accent">
                {l.label}
                <span aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
