import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clapperboard, Play, Sparkles, Star } from "lucide-react";

/**
 * Split layout shared by Sign In and Sign Up: form on the left, a poster
 * mosaic on the right. The mosaic is decorative and hidden below `lg`.
 */
const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="grid min-h-screen lg:grid-cols-2">
    <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
      <div className="mx-auto w-full max-w-sm">
        <Link
          to="/"
          className="mb-10 inline-flex items-center gap-2 text-caption text-faint transition hover:text-ink"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Back to browsing
        </Link>

        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
            <Clapperboard size={18} className="text-white" aria-hidden="true" />
          </span>
          <span className="text-[1rem] font-semibold tracking-tight text-ink">
            Goofy Tube
          </span>
        </div>

        <h1 className="text-h1 text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-body text-muted">{subtitle}</p>}

        <div className="mt-8">{children}</div>

        {footer && (
          <p className="mt-6 text-caption text-muted">{footer}</p>
        )}
      </div>
    </div>

    {/* Decorative cinematic panel. CSS artwork avoids blocking auth on a
        remote poster request and stays crisp at every desktop size. */}
    <div
      className="auth-visual relative hidden overflow-hidden lg:block"
      aria-hidden="true"
    >
      <div className="auth-visual-grid absolute inset-0" />
      <div className="auth-visual-glow absolute -right-24 top-[12%] h-96 w-96 rounded-full bg-accent/25 blur-3xl" />

      <div className="absolute inset-x-0 top-10 flex items-center gap-4 overflow-hidden whitespace-nowrap px-10 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/30">
        <span>Now showing</span><span className="h-px flex-1 bg-white/10" />
        <span>Goofy Tube Cinema</span>
      </div>

      <div className="auth-poster-stage absolute inset-0 flex items-center justify-center">
        <div className="auth-poster auth-poster-left">
          <span className="auth-poster-number">02</span>
          <span className="auth-poster-line" />
        </div>
        <div className="auth-poster auth-poster-right">
          <Star size={28} className="text-gold/70" />
          <span className="auth-poster-line" />
        </div>
        <div className="auth-poster auth-poster-main">
          <div className="auth-poster-halo" />
          <span className="eyebrow text-white/70">Featured tonight</span>
          <div className="auth-poster-play">
            <Play size={22} className="ml-0.5 fill-current" />
          </div>
          <div className="relative z-10 mt-auto">
            <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-white/60">
              <Sparkles size={12} /> Curated for you
            </div>
            <p className="display-title text-[2rem] leading-[0.9] text-white">
              Stories worth staying up for
            </p>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-base via-base/90 to-transparent px-12 pb-10 pt-24">
        <p className="text-h2 text-ink">Your next favorite is waiting.</p>
        <p className="mt-2 max-w-sm text-body text-muted">
          Save your watch list, discover new releases, and jump back into the stories you love.
        </p>
      </div>
    </div>
  </div>
);

/** Shared field styling for both auth forms. */
export const AuthField = ({ icon: Icon, error, ...props }) => (
  <label className="block">
    <span className="sr-only">{props.placeholder}</span>
    <span className="relative block">
      <Icon
        size={17}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
        aria-hidden="true"
      />
      <input
        {...props}
        aria-invalid={Boolean(error)}
        className={`w-full rounded-lg border bg-surface py-2.5 pl-11 pr-3.5
                    text-sm text-ink placeholder:text-faint transition
                    focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                      error
                        ? "border-accent"
                        : "border-hairline focus:border-hairline-strong"
                    }`}
      />
    </span>
    {error && <span className="mt-1.5 block text-[11px] text-accent">{error}</span>}
  </label>
);

export default AuthLayout;
