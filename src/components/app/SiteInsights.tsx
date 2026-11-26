"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

import { trackPageView } from "@/lib/analytics";

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID?.trim() ?? "";
// Pages that show a person's own data: Clarity hides all their text, and every input box everywhere is hidden by the observer below.
const PRIVATE_PREFIXES = ["/account", "/login", "/admin", "/watchlist"];

/**
 * Visitor insight on every page (26 Nov 2026): our own page-view event, and Microsoft Clarity (session recordings and heatmaps) when the owner has put the
 * project id in NEXT_PUBLIC_CLARITY_ID. With no id nothing from Clarity loads. Every input, textarea and select is marked "mask" so what a person types is
 * never recorded, and the private pages are masked as a whole. The Privacy page says what is collected.
 */
export function SiteInsights() {
  const pathname = usePathname();

  useEffect(() => {
    trackPageView();
  }, [pathname]);

  useEffect(() => {
    if (!CLARITY_ID) return;
    const mask = (root: ParentNode) => {
      root.querySelectorAll?.("input,textarea,select,[contenteditable]").forEach((el) => {
        if (el.getAttribute("data-clarity-mask") !== "True") el.setAttribute("data-clarity-mask", "True");
      });
    };
    mask(document);
    const obs = new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => n instanceof HTMLElement && (n.matches?.("input,textarea,select,[contenteditable]") ? n.setAttribute("data-clarity-mask", "True") : mask(n)))));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // STRICT masking (26 Nov 2026): all text on every page is masked, not only inputs and private pages. Recordings show where people tap, scroll and stop, never what
  // is written. The sign-in, account, admin and watchlist pages are masked by the same rule; payment fields live in Razorpay's own window, which Clarity cannot see.
  useEffect(() => {
    if (!CLARITY_ID) return;
    document.body.setAttribute("data-clarity-mask", "True");
  }, [pathname]);

  if (!CLARITY_ID) return null;
  return (
    <Script id="clarity" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script",${JSON.stringify(CLARITY_ID)});`}
    </Script>
  );
}
