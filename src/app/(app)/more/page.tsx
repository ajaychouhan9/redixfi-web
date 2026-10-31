import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Database, UserCircle, CreditCard, Newspaper, ChevronRight, Info, BookOpen, Activity, FileText, Search, Zap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { InstallRow } from "@/components/app/pwa/InstallRow";
import { HistoryMoreRow } from "@/components/app/history/HistoryLinks";
import { MOVED_TO_MORE } from "@/lib/nav-config";

export const metadata: Metadata = { title: "More", alternates: { canonical: "/more" } };

const LINKS = [
  // First item: the one the phone bottom bar leaves out (NAV_MOBILE_LAYOUT A: Research, B: Intraday).
  { href: MOVED_TO_MORE.href, label: MOVED_TO_MORE.label, icon: MOVED_TO_MORE.href === "/research" ? Search : Zap },
  { href: "/how-it-works", label: "How Stock Condition works", icon: BookOpen },
  { href: "/volatility", label: "Volatility ranking", icon: Activity },
  { href: "/sample-report", label: "Sample report", icon: FileText },
  { href: "/more/disclaimer", label: "Full disclaimer", icon: ShieldCheck },
  { href: "/more/data-sources", label: "Data sources & update times", icon: Database },
  { href: "/more/about-us", label: "About & Contact", icon: Info },
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
          <HistoryMoreRow />
          <InstallRow />
        </ul>
      </Card>
    </div>
  );
}
