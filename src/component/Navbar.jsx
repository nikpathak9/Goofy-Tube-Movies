import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Search,
  LogIn,
  Home,
  Film,
  Tv,
  ChevronRight,
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
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

        {/* Mobile nav sheet */}
        {mobileOpen && (
          <>
            {/* Tap-anywhere-to-dismiss scrim. Sits under the sheet but over
                the page, and dims the content so the menu reads as a layer. */}
            <div
              className="fixed inset-0 -z-10 bg-base/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/*
              Absolutely positioned, NOT in flow.

              As a static block inside the sticky wrapper the sheet added its
              own height to that wrapper (68px -> 342px), which shoved the hero
              and the entire page down by ~274px every time the menu opened.
              Taking it out of flow means it overlays the page instead.

              `top-full` anchors it to the bottom edge of the sticky wrapper —
              i.e. directly under the bar — and left/right-3 match the
              wrapper's px-3 so it lines up with the header pill.
            */}
            <div
              id="mobile-menu"
              className="gt-menu-sheet absolute left-3 right-3 top-full mt-2
                         overflow-hidden rounded-sheet border border-hairline
                         bg-surface/95 p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)]
                         backdrop-blur-xl md:hidden"
            >
              <p className="eyebrow px-3 pb-1.5 pt-2">Menu</p>

              {NAV_LINKS.map((link, i) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    style={{ "--item-delay": `${60 + i * 45}ms` }}
                    className={({ isActive }) =>
                      `gt-menu-item group flex items-center gap-3 rounded-xl px-3 py-3
                       text-sm font-medium transition duration-150 ${
                         isActive
                           ? "bg-accent-soft text-accent-hover"
                           : "text-muted hover:bg-white/5 hover:text-ink"
                       }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center
                                      rounded-lg border transition ${
                                        isActive
                                          ? "border-accent/40 bg-accent/15 text-accent-hover"
                                          : "border-hairline bg-white/5 text-muted group-hover:text-ink"
                                      }`}
                        >
                          <Icon size={15} aria-hidden="true" />
                        </span>
                        <span className="flex-1">{link.label}</span>
                        {/* Active row gets a solid dot; the rest get a chevron
                            that nudges on press. */}
                        {isActive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                        ) : (
                          <ChevronRight
                            size={15}
                            className="text-faint transition-transform duration-150 group-hover:translate-x-0.5"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}

              <div className="mx-3 my-1.5 h-px bg-hairline" />

              {user ? (
                <Link
                  to="/profile"
                  style={{ "--item-delay": `${60 + NAV_LINKS.length * 45}ms` }}
                  className="gt-menu-item group flex items-center gap-3 rounded-xl px-3 py-3
                             text-sm font-medium text-ink transition hover:bg-white/5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent text-caption font-semibold text-white">
                    {user.profileImage ? (
                      <img src={user.profileImage} alt="" className="h-full w-full object-cover" />
                    ) : (
                      (user.name || "?").charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="flex-1">
                    {user.name || "Profile"}
                    <span className="block text-[11px] font-normal text-faint">
                      Profile &amp; watch list
                    </span>
                  </span>
                  <ChevronRight
                    size={15}
                    className="text-faint transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <Link
                  to="/signin"
                  style={{ "--item-delay": `${60 + NAV_LINKS.length * 45}ms` }}
                  className="gt-menu-item flex items-center justify-center gap-2 rounded-xl
                             bg-accent px-3 py-3 text-sm font-semibold text-white
                             transition duration-200 hover:bg-accent-hover"
                >
                  <LogIn size={15} aria-hidden="true" />
                  Sign In
                </Link>
              )}
            </div>
          </>
        )}
      </div>

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
};

export default Navbar;
