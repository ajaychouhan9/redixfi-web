"use client";

import { useEffect, useState } from "react";

const KEY = "rewind_nav_seen";

/** True until the first visit to Market Rewind on this device (then the small "New" badge in the menu goes away for good).
 *  Browser storage may be unavailable: then the badge simply does not show. */
export function useRewindNewBadge(pathname: string): boolean {
  const [isNew, setIsNew] = useState(false);
  useEffect(() => {
    try {
      if (pathname.startsWith("/rewind")) {
        window.localStorage.setItem(KEY, "1");
        setIsNew(false);
      } else {
        setIsNew(window.localStorage.getItem(KEY) !== "1");
      }
    } catch {
      setIsNew(false);
    }
  }, [pathname]);
  return isNew;
}
