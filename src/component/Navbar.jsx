import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Search, LogIn, Menu, X } from "lucide-react";
// (X is used by the mobile toggle below.)
import SearchPalette from "./SearchPalette";
import { useRetractableNav } from "../lib/useRetractableNav";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useAuth } from "../lib/useAuth";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/browse/movie", label: "Movies" },
  { to: "/browse/tv", label: "Series" },
];

const Navbar = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Peek = temporarily expanded while hovered/focused/tapped in compact mode.
  const [peek, setPeek] = useState(false);
  const peekCloseTimer = useRef(null);
  const { collapsed, atTop } = useRetractableNav();
  const reduced = useReducedMotion();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setPeek(false);
    clearTimeout(peekCloseTimer.current);
  }, [location.pathname]);

  useEffect(() => () => clearTimeout(peekCloseTimer.current), []);

  // Returning to the top ends any peek, so the bar settles into its full
  // form rather than staying stuck in "temporarily expanded".
  useEffect(() => {
    if (atTop) setPeek(false);
  }, [atTop]);

  // ⌘K / Ctrl+K / "/" open search, the convention users already know.
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      const typing =
        tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /* Compact = scrolled-down AND not currently being peeked at. Keeping these
     separate means releasing a hover returns the bar to whatever the scroll
     position implies, instead of latching open. */
  const compact = collapsed && !peek;

  const linkClass = ({ isActive }) =>
    `rounded-full px-4 py-1.5 text-caption font-medium transition duration-150 ${
      isActive ? "bg-white/8 text-ink" : "text-muted hover:text-ink"
    }`;

  return (
    <>
      {/*
        The bar is sticky and its height never changes, so collapsing is a
        pure transform/width transition — the page below never reflows and
        CLS stays at zero.

        `compact` is the visual state; a peek (hover/focus/tap) overrides the
        collapse without touching the scroll state, so letting go returns it
        to whatever scrolling decided.
      */}
      <div className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4">
        <header
          onMouseEnter={() => {
            clearTimeout(peekCloseTimer.current);
            setPeek(true);
          }}
          onMouseLeave={() => {
            clearTimeout(peekCloseTimer.current);
            peekCloseTimer.current = setTimeout(() => setPeek(false), 160);
          }}
          onFocusCapture={() => setPeek(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPeek(false);
          }}
          onClick={() => compact && setPeek(true)}
          data-compact={compact}
          className={`mx-auto flex h-14 items-center gap-3 rounded-full border
                      border-hairline bg-surface/80 px-3 backdrop-blur-xl md:px-5
                      ${compact ? "max-w-[560px] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.7)]" : "max-w-[1600px]"}`}
          style={{
            transition: reduced
              ? "none"
              : `max-width 650ms var(--ease-emphasis),
                 box-shadow 500ms var(--ease-out-soft)`,
          }}
        >
          <Link
            to="/"
            className="shrink-0 text-[0.9rem] font-extrabold uppercase tracking-[0.14em] text-ink"
            aria-label="Goofy Tube home"
          >
            Goofy<span className="text-accent">Tube</span>
          </Link>

          {/* Centre nav — desktop only */}
          {/*
            Links collapse to zero width rather than unmounting, so keyboard
            focus order is preserved and there's no remount cost. They're
            aria-hidden and untabbable while hidden.
          */}
          <nav
            className="mx-auto hidden items-center gap-1 overflow-hidden md:flex"
            aria-hidden={compact}
            style={{
              maxWidth: compact ? 0 : 400,
              opacity: compact ? 0 : 1,
              transition: reduced
                ? "none"
                : `max-width 600ms var(--ease-emphasis),
                   opacity 420ms var(--ease-out-soft)`,
            }}
          >
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                tabIndex={compact ? -1 : 0}
                className={linkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2
                         text-caption font-semibold text-white transition duration-200
                         hover:bg-accent-hover"
            >
              <Search size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Browse</span>
            </button>

            {user ? (
              <Link
                to="/profile"
                aria-label={`Open ${user.name || "your"} profile`}
                className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-accent text-caption font-semibold text-white transition duration-300 hover:border-hairline-strong focus-visible:ring-2 focus-visible:ring-accent"
              >
                {user.profileImage ? (
                  <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span aria-hidden="true">{(user.name || "?").charAt(0).toUpperCase()}</span>
                )}
              </Link>
            ) : (
              <Link
                to="/signin"
                className="hidden items-center gap-1.5 rounded-full border border-hairline
                           px-4 py-2 text-caption font-medium text-muted transition
                           hover:border-hairline-strong hover:text-ink sm:flex"
              >
                <LogIn size={15} aria-hidden="true" />
                Sign In
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full
                         text-muted transition hover:text-ink md:hidden"
            >
              {mobileOpen ? (
                <X size={18} aria-hidden="true" />
              ) : (
                <Menu size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        {/* Mobile nav sheet */}
        {mobileOpen && (
          <div className="animate-fade-up mt-2 overflow-hidden rounded-sheet border border-hairline bg-surface/95 backdrop-blur-xl md:hidden">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className="block border-b border-hairline px-4 py-3 text-caption text-muted last:border-0"
              >
                {link.label}
              </NavLink>
            ))}
            {!user && (
              <Link
                to="/signin"
                className="block px-4 py-3 text-caption font-medium text-ink"
              >
                Sign In
              </Link>
            )}
            {user && (
              <Link to="/profile" className="block px-4 py-3 text-caption font-medium text-ink">
                Profile
              </Link>
            )}
          </div>
        )}
      </div>

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
};

export default Navbar;
