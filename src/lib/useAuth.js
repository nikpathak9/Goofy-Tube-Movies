import { useCallback, useEffect, useState } from "react";

export const AUTH_CHANGED = "auth:changed";

export function readUser() {
  try {
    const value = JSON.parse(localStorage.getItem("user") || "null");
    return value?.email ? value : null;
  } catch {
    return null;
  }
}

/** Keeps prototype localStorage authentication synchronized across the app. */
export function useAuth() {
  const [user, setUserState] = useState(readUser);

  useEffect(() => {
    const sync = () => setUserState(readUser());
    window.addEventListener(AUTH_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setUser = useCallback((nextUser) => {
    if (nextUser) localStorage.setItem("user", JSON.stringify(nextUser));
    else localStorage.removeItem("user");
    setUserState(nextUser);
    window.dispatchEvent(new Event(AUTH_CHANGED));
  }, []);

  return { user, setUser, isAuthenticated: Boolean(user) };
}
