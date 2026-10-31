import { ShieldCheck, Database, UserCircle, CreditCard, Newspaper, Info, BookOpen, Activity, FileText, Bookmark, Bell, CalendarDays } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** One list for everything that used to live on the More page. The More page and (layout C) the header avatar menu both read it,
 *  so a page reachable through More is reachable through the menu, and a link added here shows in both. */
export interface MoreLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MORE_LINKS: MoreLink[] = [
  { href: "/signals/7-day-review", label: "7-Day Review", icon: CalendarDays },
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

/** The avatar menu (layout C), in the order shown. Watchlist and Alerts are added to the former More items; two labels are the short
 *  forms the menu uses ("Methodology", "Checkout"). */
export const MENU_GROUPS: { title: string; links: MoreLink[] }[] = [
  {
    title: "Your account",
    links: [
      { href: "/watchlist", label: "Watchlist", icon: Bookmark },
      { href: "/account/alerts", label: "Alerts", icon: Bell },
      { href: "/account", label: "Account", icon: UserCircle },
      { href: "/pricing", label: "Checkout", icon: CreditCard },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/signals/7-day-review", label: "7-Day Review", icon: CalendarDays },
      { href: "/volatility", label: "Volatility ranking", icon: Activity },
      { href: "/news", label: "News", icon: Newspaper },
      { href: "/sample-report", label: "Sample report", icon: FileText },
    ],
  },
  {
    title: "About RedixFi",
    links: [
      { href: "/how-it-works", label: "Methodology: how Stock Condition works", icon: BookOpen },
      { href: "/more/data-sources", label: "Data sources & update times", icon: Database },
      { href: "/more/disclaimer", label: "Full disclaimer", icon: ShieldCheck },
      { href: "/more/about-us", label: "About & Contact", icon: Info },
    ],
  },
];
