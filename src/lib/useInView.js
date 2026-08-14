import { useEffect, useRef, useState } from "react";

/**
 * Reports whether an element is in the viewport, via IntersectionObserver.
 *
 * @param {object}  options
 * @param {boolean} options.once      unobserve after the first intersection
 *                                    (reveal animations should not replay)
 * @param {string}  options.rootMargin
 * @param {number}  options.threshold
 *
 * Returns `[ref, inView]`. The observer is disconnected on unmount, and when
 * `once` is set it disconnects as soon as it has fired — so a long page
 * doesn't keep dozens of live observers around.
 */
export function useInView({
  once = true,
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.12,
} = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (old browsers, some test envs): show content
    // rather than leaving it invisible forever.
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  return [ref, inView];
}
