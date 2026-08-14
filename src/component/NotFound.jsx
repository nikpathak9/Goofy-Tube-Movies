import React from "react";
import { Link } from "react-router-dom";

/**
 * Catch-all route. Previously an unknown URL rendered the navbar and footer
 * with nothing in between, which looked like a crash.
 */
const NotFound = () => (
  <main className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
    <p className="text-[5rem] font-semibold leading-none text-surface-3">404</p>
    <h1 className="mt-4 text-h1 text-ink">Page not found</h1>
    <p className="mt-2 max-w-sm text-body text-muted">
      We couldn&rsquo;t find that page. It may have moved, or the link may be
      wrong.
    </p>
    <Link
      to="/"
      className="mt-7 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert transition hover:bg-white"
    >
      Go home
    </Link>
  </main>
);

export default NotFound;
