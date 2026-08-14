import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clapperboard } from "lucide-react";

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

    {/* Decorative panel */}
    <div
      className="relative hidden overflow-hidden bg-surface lg:block"
      aria-hidden="true"
    >
      <div className="absolute inset-0 grid grid-cols-3 gap-3 p-3 opacity-30">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded-card"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-base/70 to-base" />
      <div className="absolute inset-x-0 bottom-0 p-12">
        <p className="text-h2 text-ink">Every trailer. One place.</p>
        <p className="mt-2 max-w-xs text-body text-muted">
          Browse popular and top-rated movies and shows, powered by TMDB.
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
