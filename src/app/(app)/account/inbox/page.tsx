"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInboxPage, markInboxRead } from "@/lib/api/mutations";
import { ALERT_FOOTER_TEXT } from "@/lib/alertFooter";
import { formatDateTimeIst } from "@/lib/format";
import type { InboxAlert } from "@/lib/api/types";


const KIND_NOUN: Record<string, string> = {
  signal_delta: "composite signal moves",
  behavior_state: "behavior updates",
  unusual_activity: "unusual activity alerts",
  news_watchlist: "news alerts",
  news_market: "market-wide news alerts",
  event_date: "event date alerts",
  threshold_alert: "threshold alerts",
};

type Row = { type: "single"; item: InboxAlert } | { type: "digest"; id: string; items: InboxAlert[] };

function isRead(i: InboxAlert): boolean {
  return Boolean(i.read ?? i.read_at);
}

function sitePath(href: string): string | null {
  try {
    const u = new URL(href);
    if (u.hostname === "www.redixfi.com" || u.hostname === "redixfi.com") return u.pathname + u.search;
  } catch {
    /* not an absolute URL */
  }
  return null;
}

// Links are stored absolute (shared with Telegram and email); same-site ones
// become client-side navigations inside the app.
function Anchor({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const local = sitePath(href);
  if (local) {
    return (
      <Link href={local} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

function groupRows(items: InboxAlert[]): Row[] {
  const rows: Row[] = [];
  const seen = new Map<string, { type: "digest"; id: string; items: InboxAlert[] }>();
  for (const i of items) {
    if (i.digest_id) {
      const existing = seen.get(i.digest_id);
      if (existing) {
        existing.items.push(i);
      } else {
        const row = { type: "digest" as const, id: i.digest_id, items: [i] };
        seen.set(i.digest_id, row);
        rows.push(row);
      }
    } else {
      rows.push({ type: "single", item: i });
    }
  }
  return rows;
}

function AlertBody({ i }: { i: InboxAlert }) {
  return (
    <div>
      <p className="font-medium">{i.title}</p>
      {i.change && <p className="font-medium text-foreground">{i.change}</p>}
      {i.measured && <p className="text-xs text-foreground-faint">{i.measured}</p>}
      <p className="mt-1 text-foreground-muted">{i.body}</p>
      {i.link && (
        <Anchor href={i.link} className="mt-1 inline-block text-xs font-medium text-accent">
          {i.link_label ?? "Open on RedixFi"}
        </Anchor>
      )}
      <p className="mt-0.5 text-xs text-foreground-faint">{formatDateTimeIst(i.created_at)}</p>
    </div>
  );
}

function InboxList() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<InboxAlert[] | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      const page = await getInboxPage(token);
      setItems(page.data);
    })();
  }, [getToken]);

  async function read(id: string) {
    const token = await getToken();
    if (!token) return;
    await markInboxRead(token, id);
    setItems((prev) => prev?.map((i) => (i.alert_id === id ? { ...i, read: true } : i)) ?? null);
  }

  if (!items) return <p className="text-sm text-foreground-muted">Loading…</p>;

  const rows = groupRows(items);

  return (
    <Card title="Inbox">
      {rows.length === 0 ? (
        <p className="text-sm text-foreground-muted">No alerts yet — they&apos;ll show up here once your watchlist has activity.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) =>
            row.type === "single" ? (
              <li key={row.item.alert_id} className={`py-3 text-sm ${isRead(row.item) ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <AlertBody i={row.item} />
                  {!isRead(row.item) && (
                    <button onClick={() => read(row.item.alert_id)} className="shrink-0 text-xs font-medium text-accent">
                      Mark read
                    </button>
                  )}
                </div>
              </li>
            ) : (
              <li key={row.id} className="py-3 text-sm">
                <button
                  type="button"
                  aria-expanded={Boolean(open[row.id])}
                  onClick={() => setOpen((o) => ({ ...o, [row.id]: !o[row.id] }))}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <span className="font-medium">
                    {row.items.length} {KIND_NOUN[row.items[0].kind ?? row.items[0].type] ?? "alerts"}
                  </span>
                  <span className="shrink-0 text-xs text-accent">{open[row.id] ? "Hide" : "Show"}</span>
                </button>
                <p className="text-xs text-foreground-faint">{formatDateTimeIst(row.items[0].created_at)}</p>
                {open[row.id] && (
                  <ul className="mt-2 space-y-3 border-l border-border pl-3">
                    {row.items.map((i) => (
                      <li key={i.alert_id} className={isRead(i) ? "opacity-60" : ""}>
                        <div className="flex items-start justify-between gap-3">
                          <AlertBody i={i} />
                          {!isRead(i) && (
                            <button onClick={() => read(i.alert_id)} className="shrink-0 text-xs font-medium text-accent">
                              Mark read
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ),
          )}
        </ul>
      )}
      <p className="mt-4 text-xs text-foreground-faint">{ALERT_FOOTER_TEXT}</p>
    </Card>
  );
}

export default function InboxPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-semibold">Account</h1>
      <AccountTabs />
      <RequireAuth>
        <InboxList />
      </RequireAuth>
    </div>
  );
}
