"use client";

import { useEffect, useState } from "react";
import { AccountTabs } from "@/components/app/account/AccountTabs";
import { RequireAuth } from "@/components/app/account/RequireAuth";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth/AuthContext";
import { getInboxPage, markInboxRead } from "@/lib/api/mutations";
import { formatDateTimeIst } from "@/lib/format";
import type { InboxAlert } from "@/lib/api/types";

function InboxList() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<InboxAlert[] | null>(null);

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

  return (
    <Card title="Inbox">
      {items.length === 0 ? (
        <p className="text-sm text-foreground-muted">No alerts yet — they'll show up here once your watchlist has activity.</p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((i) => (
            <li key={i.alert_id} className={`py-3 text-sm ${i.read ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{i.title}</p>
                  <p className="text-foreground-muted">{i.body}</p>
                  <p className="mt-0.5 text-xs text-foreground-faint">{formatDateTimeIst(i.created_at)}</p>
                </div>
                {!i.read && (
                  <button onClick={() => read(i.alert_id)} className="shrink-0 text-xs font-medium text-accent">
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
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
