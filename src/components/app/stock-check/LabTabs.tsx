"use client";

import { useEffect, useRef, useState } from "react";

import { LearnTab } from "@/components/app/stock-check/LearnTab";
import { ShortlistLadder } from "@/components/app/stock-check/ShortlistLadder";
import { LEARN_TAB, RULES_TAB } from "@/lib/learn";
import { PART2_INTRO, PART2_TITLE } from "@/lib/read-company";

type TabId = "learn" | "rules";
const TABS: { id: TabId; label: string }[] = [
  { id: "learn", label: LEARN_TAB },
  { id: "rules", label: RULES_TAB },
];

/** Shortlist Lab's two tabs: Learn and My rules. The address #my-rules opens the second one. Both stay mounted once opened so a half-built rule is not lost. */
export function LabTabs() {
  const [tab, setTab] = useState<TabId>("learn");
  const [seen, setSeen] = useState<Record<TabId, boolean>>({ learn: true, rules: false });
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function choose(id: TabId) {
    setTab(id);
    setSeen((s) => ({ ...s, [id]: true }));
    try {
      window.history.replaceState(null, "", id === "rules" ? "#my-rules" : window.location.pathname + window.location.search);
    } catch {
      /* the address just stays as it is */
    }
  }

  useEffect(() => {
    if (window.location.hash === "#my-rules") {
      setTab("rules"); // eslint-disable-line react-hooks/set-state-in-effect
      setSeen({ learn: true, rules: true });
    }
  }, []);

  function onKey(e: React.KeyboardEvent, i: number) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const next = (i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    choose(TABS[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div data-testid="lab-tabs">
      <div role="tablist" aria-label="Shortlist Lab" className="flex gap-1 border-b border-border">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            id={`lab-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`lab-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => choose(t.id)}
            onKeyDown={(e) => onKey(e, i)}
            data-testid={`lab-tab-${t.id}`}
            className={`min-h-[44px] flex-1 border-b-2 px-4 text-sm font-semibold sm:flex-none ${tab === t.id ? "border-accent text-foreground" : "border-transparent text-foreground-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="lab-panel-learn" aria-labelledby="lab-tab-learn" hidden={tab !== "learn"} className="pt-5">
        {seen.learn && <LearnTab />}
      </div>
      <div role="tabpanel" id="lab-panel-rules" aria-labelledby="lab-tab-rules" hidden={tab !== "rules"} className="pt-5">
        {seen.rules && (
          <>
            <h2 className="text-xl font-semibold" data-testid="read-part2">{PART2_TITLE}</h2>
            <p className="mt-1 text-sm text-foreground-muted">{PART2_INTRO}</p>
            <div className="mt-4"><ShortlistLadder /></div>
          </>
        )}
      </div>
    </div>
  );
}
