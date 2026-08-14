import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";

const CHANGED = "watchlist:changed";

function storageKey(email) {
  return email ? `watchlist:${encodeURIComponent(email.trim().toLowerCase())}` : null;
}

function read(key) {
  if (!key) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? [...new Set(parsed.filter((item) => typeof item === "string"))] : [];
  } catch {
    return [];
  }
}

/** Authenticated, per-user watchlist synchronized within and across tabs. */
export function useWatchlist() {
  const { user, isAuthenticated } = useAuth();
  const key = useMemo(() => storageKey(user?.email), [user?.email]);
  const [watchlist, setWatchlist] = useState(() => read(key));

  useEffect(() => {
    const sync = (event) => {
      if (!event.detail?.key || event.detail.key === key) setWatchlist(read(key));
    };
    setWatchlist(read(key));
    window.addEventListener(CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, [key]);

  const toggle = useCallback((itemKey) => {
    if (!key) return false;
    const current = read(key);
    const next = current.includes(itemKey)
      ? current.filter((entry) => entry !== itemKey)
      : [...current, itemKey];
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      return false;
    }
    setWatchlist(next);
    window.dispatchEvent(new CustomEvent(CHANGED, { detail: { key } }));
    return true;
  }, [key]);

  return { watchlist, toggle, user, isAuthenticated };
}
