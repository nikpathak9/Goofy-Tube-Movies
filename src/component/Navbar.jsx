import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Search,
  LogIn,
  Home,
  Film,
  Tv,
  ArrowUpRight,
  Command,
} from "lucide-react";
import SearchPalette from "./SearchPalette";
import { useRetractableNav } from "../lib/useRetractableNav";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useAuth } from "../lib/useAuth";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/browse/movie", label: "Movies", end: false, icon: Film },
  { to: "/browse/tv", label: "Series", end: false, icon: Tv },
];

const Navbar = () => {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Peek = temporarily expanded while hovered/focused/tapped in compact mode.
  const [peek, setPeek] = useState(false);
  const peekCloseTimer = useRef(null);
  const burgerRef = useRef(null);
  const { collapsed, atTop } = useRetractableNav();
  const reduced = useReducedMotion();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setPeek(false);
    clearTimeout(peekCloseTimer.current);
  }, [location.pathname]);

  useEffect(() => () => clearTimeout(peekCloseTimer.current), []);

  /* While the sheet is open: Escape closes it, and the page behind it stops
     scrolling so the menu doesn't drift away from its button. */
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    // Captured now: the ref is read in cleanup, by which point React may have
    // reassigned it.
    const opener = burgerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // Send focus back to the control that opened the menu, rather than
      // dropping it at the top of the document.
      opener?.focus();
    };
  }, [mobileOpen]);

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

            {/*
              Bordered pill so it matches the Browse / Sign In / avatar
              controls beside it, instead of floating as a bare glyph. Turns
              accent-tinted while open, which is the same "active" language
              the nav links use.
            */}
            <button
              ref={burgerRef}
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className={`flex h-9 w-9 items-center justify-center rounded-full border
                          transition duration-200 md:hidden ${
                            mobileOpen
                              ? "border-accent/50 bg-accent-soft text-accent-hover"
                              : "border-hairline bg-surface/60 text-muted hover:border-hairline-strong hover:text-ink"
                          }`}
            >
              <span className="gt-burger" data-open={mobileOpen} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
        </header>

      </div>

      {/*
        Full-screen menu overlay.

        Rendered OUTSIDE the sticky wrapper so it isn't confined by that
        element's stacking context, and `fixed inset-0` keeps it entirely out
        of flow — the page underneath cannot be pushed or reflowed.

        The previous dropdown panel read as a generic menu widget. Oversized
        uppercase links mirror the hero's display treatment, which is the most
        distinctive thing about the site.
      */}
      {mobileOpen && (
        <div
          className="gt-menu-overlay fixed inset-0 z-[60] flex flex-col bg-base/97
                     backdrop-blur-2xl md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          {/* Decorative bloom for depth behind the type. */}
          <div className="gt-menu-glow pointer-events-none absolute inset-0" aria-hidden="true" />

          {/* Header row mirrors the nav bar so the close control sits exactly
              where the burger was — no visual jump. */}
          <div className="relative flex h-14 shrink-0 items-center justify-between px-6 pt-3">
            <span className="text-[0.9rem] font-extrabold uppercase tracking-[0.14em] text-ink">
              Goofy<span className="text-accent">Tube</span>
            </span>
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border
                         border-accent/50 bg-accent-soft text-accent-hover transition
                         hover:bg-accent/25"
            >
              <span className="gt-burger" data-open="true" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>

          {/* --- Oversized links --- */}
          <nav className="relative flex-1 overflow-y-auto px-6 pt-8" aria-label="Mobile">
            {NAV_LINKS.map((link, i) => (
              <div key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  style={{ "--item-delay": `${90 + i * 70}ms` }}
                  className={({ isActive }) =>
                    `gt-menu-item group flex items-baseline gap-4 py-4 transition-colors
                     duration-200 ${isActive ? "text-accent" : "text-ink hover:text-accent-hover"}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`w-6 shrink-0 text-[11px] font-semibold tabular-nums tracking-widest
                                    ${isActive ? "text-accent" : "text-faint"}`}
                        aria-hidden="true"
                      >
                        0{i + 1}
                      </span>
                      <span className="display-title flex-1 text-[2.6rem] leading-none">
                        {link.label}
                      </span>
                      <ArrowUpRight
                        size={22}
                        aria-hidden="true"
                        className={`shrink-0 transition-transform duration-200
                                    group-hover:translate-x-1 group-hover:-translate-y-1
                                    ${isActive ? "text-accent" : "text-faint"}`}
                      />
                    </>
                  )}
                </NavLink>
                <div
                  className="gt-menu-rule h-px bg-hairline"
                  style={{ "--item-delay": `${90 + i * 70}ms` }}
                  aria-hidden="true"
                />
              </div>
            ))}

            {/* Search gets a row of its own — it was only reachable from the
                bar, which the overlay covers. */}
            <button
              onClick={() => {
                setMobileOpen(false);
                setPaletteOpen(true);
              }}
              style={{ "--item-delay": `${90 + NAV_LINKS.length * 70}ms` }}
              className="gt-menu-item group mt-6 flex w-full items-center gap-3 rounded-2xl
                         border border-hairline bg-white/[0.04] px-4 py-3.5 text-left
                         transition duration-200 hover:border-hairline-strong hover:bg-white/[0.07]"
            >
              <Search size={17} className="shrink-0 text-muted" aria-hidden="true" />
              <span className="flex-1 text-sm text-muted">Search titles…</span>
              <kbd className="flex items-center gap-0.5 rounded border border-hairline px-1.5 py-0.5 text-[10px] text-faint">
                <Command size={9} aria-hidden="true" />K
              </kbd>
            </button>
          </nav>

          {/* --- Account --- */}
          <div
            className="relative shrink-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4"
            style={{ "--item-delay": `${90 + (NAV_LINKS.length + 1) * 70}ms` }}
          >
            {user ? (
              <Link
                to="/profile"
                className="gt-menu-item flex items-center gap-3 rounded-2xl border
                           border-hairline bg-white/[0.04] p-3 transition hover:bg-white/[0.08]"
                style={{ "--item-delay": `${90 + (NAV_LINKS.length + 1) * 70}ms` }}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-white">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (user.name || "?").charAt(0).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {user.name || "Profile"}
                  </span>
                  <span className="block text-[11px] text-faint">
                    Profile &amp; watch list
                  </span>
                </span>
                <ArrowUpRight size={18} className="shrink-0 text-faint" aria-hidden="true" />
              </Link>
            ) : (
              <Link
                to="/signin"
                className="gt-menu-item flex items-center justify-center gap-2 rounded-full
                           bg-accent py-3.5 text-sm font-semibold text-white transition
                           duration-200 hover:bg-accent-hover"
                style={{ "--item-delay": `${90 + (NAV_LINKS.length + 1) * 70}ms` }}
              >
                <LogIn size={16} aria-hidden="true" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
};

export default Navbar;
