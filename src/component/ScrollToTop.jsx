import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Resets scroll position on forward navigation.
 *
 * Without this, clicking a recommendation at the bottom of a details page
 * loaded the next page already scrolled halfway down, which read as a
 * rendering bug. POP navigations (browser back/forward) are left alone so
 * the browser can restore the previous position itself.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
