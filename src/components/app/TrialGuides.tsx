"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { answerExitSurvey, getExitSurvey } from "@/lib/api/mutations";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAskPanel } from "@/lib/ask-panel/AskPanelContext";
import { useTrialDays } from "@/lib/trial";

const WELCOME_KEY = "redixfi:welcome";

/**
 * The three-step guide shown once, on the first page after sign-up (26 Nov 2026): the Pro trial is already on; search a stock, read Points to watch,
 * ask one question. It sits at the top of the page the person lands on (the stock they were viewing) and goes away with one tap.
 */
export function WelcomeGuide() {
  const { user } = useAuth();
  const days = useTrialDays();
  const { openPanel } = useAskPanel();
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      // one-time read of a browser flag on mount
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(WELCOME_KEY) === "1") setShow(true);
    } catch {
      /* no storage: no guide */
    }
  }, []);
  if (!show || !user || !user.is_pro_trial) return null;
  const done = () => {
    try {
      window.localStorage.removeItem(WELCOME_KEY);
    } catch {
      /* ignore */
    }
    setShow(false);
  };
  return (
    <section className="mx-auto mb-3 w-full max-w-4xl rounded-xl border border-accent/40 bg-accent/10 px-4 py-3" aria-label="Getting started" data-testid="welcome-guide">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-bold">Your {days}-day Pro trial is on. Three steps:</p>
        <button type="button" onClick={done} className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[13px] font-medium text-foreground-muted underline" aria-label="Close the guide">Close</button>
      </div>
      <ol className="mt-1 list-none space-y-1 pl-0 text-[15px] leading-[1.5]">
        <li><span className="font-bold">1.</span> Search a stock in the box at the top.</li>
        <li><span className="font-bold">2.</span> <Link href="#points-to-watch" onClick={done} className="inline-flex min-h-[44px] items-center font-bold text-accent underline">Read Points to watch</Link> on its page.</li>
        <li><span className="font-bold">3.</span> <button type="button" onClick={() => { done(); openPanel(); }} className="inline-flex min-h-[44px] items-center font-bold text-accent underline">Ask AI one question</button>.</li>
      </ol>
    </section>
  );
}

type Choice = { key: string; label: string };

/**
 * "What stopped you?" (26 Nov 2026): one question, shown once to a person whose Pro trial ended without payment. The server decides when it is due; an
 * answer (or "Not now") is stored once. `forceOpen` shows it from the Pricing page when checkout was closed without paying.
 */
export function ExitSurvey({ forceOpen = false, source = "trial_end" }: { forceOpen?: boolean; source?: string }) {
  const { user, getToken } = useAuth();
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [thanks, setThanks] = useState(false);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const out = await getExitSurvey(token);
        if (!cancelled && (out.due || forceOpen)) setChoices(out.choices);
      } catch {
        /* the question is optional: a failure shows nothing */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken, forceOpen]);
  if (!user || !choices || thanks) return thanks ? <p className="mx-auto my-3 max-w-4xl text-[13px] text-foreground-muted" role="status">Thank you. That helps.</p> : null;

  async function send(answer: string) {
    try {
      const token = await getToken();
      if (token) await answerExitSurvey(token, { answer, text: answer === "other" ? text : null, source });
    } catch {
      /* ignore */
    }
    setThanks(true);
  }
  return (
    <section className="mx-auto my-3 w-full max-w-4xl rounded-xl border border-border bg-surface px-4 py-3" aria-label="One question" data-testid="exit-survey">
      <p className="text-[15px] font-bold">What stopped you?</p>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Pick one">
        {choices.map((c) => (
          <button key={c.key} type="button" onClick={() => (c.key === "other" ? setPicked("other") : void send(c.key))} aria-pressed={picked === c.key}
            className="min-h-[44px] rounded-lg border border-border px-3 text-[15px] hover:border-accent" data-testid={`survey-${c.key}`}>{c.label}</button>
        ))}
      </div>
      {picked === "other" && (
        <div className="mt-2 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Tell us in a few words" aria-label="Your answer" className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-[15px]" />
          <button type="button" onClick={() => void send("other")} className="min-h-[44px] rounded-lg bg-accent px-4 text-[15px] font-bold text-accent-foreground">Send</button>
        </div>
      )}
      <button type="button" onClick={() => void send("dismissed")} className="mt-1 flex min-h-[44px] items-center text-[13px] text-foreground-muted underline">Not now</button>
    </section>
  );
}
