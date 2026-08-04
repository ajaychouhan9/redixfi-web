import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Database, UserCircle, CreditCard, Newspaper, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "More" };

const LINKS = [
  { href: "/more/disclaimer", label: "Full disclaimer", icon: ShieldCheck },
  { href: "/more/data-sources", label: "Data sources & update times", icon: Database },
  { href: "/account", label: "Account", icon: UserCircle },
  { href: "/pricing", label: "Subscription & pricing", icon: CreditCard },
  { href: "/news", label: "News", icon: Newspaper },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-5 text-lg font-semibold">More</h1>
      <Card>
        <ul className="divide-y divide-border">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="flex items-center justify-between gap-3 py-3 text-sm font-medium hover:text-accent">
                <span className="flex items-center gap-3">
                  <l.icon size={16} className="text-accent" />
                  {l.label}
                </span>
                <ChevronRight size={15} className="text-foreground-faint" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
