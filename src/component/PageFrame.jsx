import React from "react";

/**
 * Full-bleed page shell.
 *
 * This previously floated the site inside a rounded, max-width card on a
 * darker backdrop. That left a visible gutter on every edge and capped the
 * layout at 1600px, so the site never used the full window.
 *
 * It's now edge-to-edge: no max-width, no inset, no rounding. The component
 * is kept as the single place that owns page-level background so the
 * decision lives in one file rather than being scattered across routes.
 */
const PageFrame = ({ children }) => (
  <div className="min-h-screen w-full bg-base">{children}</div>
);

export default PageFrame;
