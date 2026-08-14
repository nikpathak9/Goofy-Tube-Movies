import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Tracks the user's reduced-motion preference, and keeps tracking it — the
 * setting can change mid-session (macOS and Windows both allow it), so this
 * subscribes rather than reading once at mount.
 *
 * CSS already neutralises transitions under the media query; this hook is for
 * behaviour CSS can't express — skipping autoplaying previews, cancelling
 * hover-intent timers, and rendering content already-revealed.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = (e) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * True when the device has a real hovering pointer (mouse/trackpad).
 *
 * Hover-driven previews must not run on touch, where `mouseenter` fires on
 * tap and would fight the tap-to-navigate gesture.
 */
export function useHasHover() {
  const [hasHover, setHasHover] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );

  useEffect(() => {
    const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
    const onChange = (e) => setHasHover(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return hasHover;
}
