import { useEffect, useRef, useState } from "react";

/** Above this scroll position the bar is always full width. */
const TOP_ZONE = 80;
/** Ignore jitter below this many pixels of movement. */
const DIRECTION_THRESHOLD = 8;
/** Must scroll this far down past TOP_ZONE before collapsing. */
const COLLAPSE_AFTER = 140;

/**
 * Drives the navbar's full ⇄ compact state from scroll.
 *
 * Two things make this feel stable rather than twitchy:
 *
 *  1. Hysteresis. Expanding happens at TOP_ZONE (80px) but collapsing needs
 *     COLLAPSE_AFTER (140px) — separate thresholds, so hovering around a
 *     single boundary can't oscillate.
 *  2. A movement threshold. Sub-8px deltas (trackpad jitter, scroll
 *     anchoring, mobile rubber-banding) are ignored entirely.
 *
 * Reads are batched into rAF so a fast scroll does at most one measurement
 * per frame.
 */
export function useRetractableNav() {
  const [collapsed, setCollapsed] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastY.current = window.scrollY;

    const evaluate = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (y <= TOP_ZONE) {
        setAtTop(true);
        setCollapsed(false);
        lastY.current = y;
        ticking.current = false;
        return;
      }

      setAtTop(false);

      if (Math.abs(delta) >= DIRECTION_THRESHOLD) {
        if (delta > 0 && y > COLLAPSE_AFTER) {
          setCollapsed(true); // scrolling down, well clear of the top
        } else if (delta < 0) {
          setCollapsed(false); // scrolling up — reveal, like Netflix
        }
        lastY.current = y;
      }

      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(evaluate);
    };

    evaluate();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return { collapsed, atTop };
}
