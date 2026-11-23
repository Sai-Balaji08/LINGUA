"use client";

import { useEffect } from "react";

/** Remembers the browser's time zone in a cookie so the server can group activity by the learner's own days. */
export function TimezoneCookie() {
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz && !document.cookie.split("; ").some((c) => c === `tz=${encodeURIComponent(tz)}`)) {
        document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
      }
    } catch {
      /* UTC is used when the time zone is unknown */
    }
  }, []);
  return null;
}
