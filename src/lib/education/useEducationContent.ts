"use client";

import { useEffect, useState } from "react";
import { getEducation } from "@/lib/api/endpoints";
import type { EducationContent } from "@/lib/api/types";

// Module-level cache: GET /education/{metric} is content that changes at
// most on a reviewed content revision, never per-request — one fetch per
// metric per page load is correct, re-fetching on every popup open is not.
const cache = new Map<string, Promise<EducationContent | null>>();

function fetchEducation(metric: string): Promise<EducationContent | null> {
  let p = cache.get(metric);
  if (!p) {
    p = getEducation(metric).catch(() => null);
    cache.set(metric, p);
  }
  return p;
}

/** Lazy — only fetches once `enabled` is true (e.g. the popup was opened),
 * so browsing a page full of metrics doesn't fire 30 requests up front. */
export function useEducationContent(metric: string | null, enabled: boolean) {
  const [content, setContent] = useState<EducationContent | null | undefined>(undefined);

  useEffect(() => {
    if (!metric || !enabled) return;
    let cancelled = false;
    setContent(undefined);
    fetchEducation(metric).then((c) => {
      if (!cancelled) setContent(c);
    });
    return () => {
      cancelled = true;
    };
  }, [metric, enabled]);

  return content; // undefined = loading, null = not found, object = loaded
}

export { fetchEducation };
