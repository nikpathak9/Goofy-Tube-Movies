import React from "react";
import { ArrowUpRight, Clapperboard, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/useAuth";

const Footer = () => {
  const { user } = useAuth();
  const links = [
    ["Home", "/"],
    ["Movies", "/browse/movie"],
    ["Series", "/browse/tv"],
    [user ? "My Watch List" : "Sign in", user ? "/profile" : "/signin"],
  ];

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-hairline bg-surface/55">
      <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" aria-hidden="true" />
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/70 to-transparent" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1600px] px-4 py-12 md:px-10 md:py-16">
        <div className="grid gap-10 border-b border-hairline pb-10 md:grid-cols-[1.4fr_.7fr_1fr] md:gap-14">
          <div>
            <Link to="/" aria-label="Goofy Tube home" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent shadow-[0_10px_30px_-10px_rgba(225,29,46,.8)]">
                <Clapperboard size={20} className="text-white" aria-hidden="true" />
              </span>
              <span className="text-base font-extrabold uppercase tracking-[0.14em] text-ink">Goofy<span className="text-accent">Tube</span></span>
            </Link>
            <p className="mt-5 max-w-md text-body leading-relaxed text-muted">
              Discover films, find your next series, and keep every must-watch title in one place.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-hairline bg-white/[.03] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[.12em] text-faint">
              <Sparkles size={13} className="text-accent" aria-hidden="true" />Made for movie nights
            </div>
          </div>

          <nav aria-label="Footer navigation">
            <p className="eyebrow-muted mb-4">Explore</p>
            <ul className="space-y-2.5">
              {links.map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="group inline-flex items-center gap-1.5 text-caption text-muted transition hover:text-ink">
                    {label}<ArrowUpRight size={12} className="opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="self-start rounded-sheet border border-hairline bg-white/[.035] p-5">
            <p className="eyebrow">Start watching</p>
            <h2 className="mt-3 text-h2 text-ink">Find something great tonight.</h2>
            <p className="mt-2 text-caption text-muted">Browse popular and top-rated titles across movies and television.</p>
            <Link to="/browse/movie" className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-caption font-semibold text-white transition duration-200 hover:bg-accent-hover hover:scale-[1.02] active:scale-[.98]">
              <Play size={14} className="fill-current" aria-hidden="true" />Browse movies
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-[11px] text-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Goofy Tube. All rights reserved.</p>
          <p>
            Movie and television data provided by{" "}
            <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer noopener" className="underline decoration-hairline-strong underline-offset-4 transition hover:text-muted">TMDB</a>.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
