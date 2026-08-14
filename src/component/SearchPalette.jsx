import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, CornerDownLeft } from "lucide-react";
import { detailsPath, titleOf, yearOf, ratingOf } from "../lib/media";
import { posterImage } from "../lib/images";

/**
 * Command-palette search (⌘K / Ctrl+K / "/").
 *
 * Replaces the inline dropdown, which had no keyboard navigation, no Escape
 * handling, no loading state, and routed "person" results to a broken
 * /details/person page.
 */
const SearchPalette = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      // Defer so the element exists and the browser has painted.
      requestAnimationFrame(() => inputRef.current?.focus());
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Debounced fetch.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
            trimmed
          )}&include_adult=false&language=en-US&page=1`,
          {
            signal: controller.signal,
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        const data = await res.json();
        if (controller.signal.aborted) return;
        // Drop "person" results — the app has no /details/person route.
        setResults(
          (data.results || [])
            .filter((item) => detailsPath(item) !== null)
            .slice(0, 8)
        );
        setActiveIndex(0);
      } catch (err) {
        if (err.name !== "AbortError") console.error("Search failed:", err);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  const go = (item) => {
    const to = detailsPath(item);
    if (!to) return;
    onClose();
    navigate(to);
  };

  const submitFullSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onClose();
    navigate(`/search/${encodeURIComponent(trimmed)}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) go(results[activeIndex]);
      else submitFullSearch();
    }
  };

  // Keep the highlighted row in view during keyboard navigation.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center
                 bg-base/80 px-4 pt-[10vh] backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="animate-fade-up w-full max-w-2xl overflow-hidden rounded-sheet
                   border border-hairline bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <Search size={18} className="shrink-0 text-faint" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search movies and shows..."
            aria-label="Search movies and shows"
            className="w-full bg-transparent py-4 text-[1rem] text-ink
                       placeholder:text-faint focus:outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="shrink-0 rounded p-1 text-faint transition hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto">
          {loading && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <div className="skeleton h-[72px] w-12 shrink-0 rounded" />
                  <div className="flex-1 space-y-2 py-2">
                    <div className="skeleton h-3.5 w-1/2 rounded" />
                    <div className="skeleton h-3 w-1/4 rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="px-4 py-10 text-center text-caption text-faint">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          )}

          {!loading && !query.trim() && (
            <p className="px-4 py-10 text-center text-caption text-faint">
              Start typing to search
            </p>
          )}

          {!loading &&
            results.map((item, index) => {
              const poster = posterImage(item.poster_path);
              const title = titleOf(item);
              const year = yearOf(item);
              const rating = ratingOf(item);
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${item.media_type}-${item.id}`}
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                    isActive ? "bg-surface-2" : ""
                  }`}
                >
                  {poster ? (
                    <img
                      src={poster.src}
                      alt=""
                      loading="lazy"
                      className="h-[72px] w-12 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-[72px] w-12 shrink-0 items-center justify-center rounded bg-surface-3 text-faint">
                      {title.charAt(0)}
                    </div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">
                      {title}
                    </span>
                    <span className="mt-0.5 block text-caption text-faint tabular-nums">
                      {item.media_type === "tv" ? "TV" : "Movie"}
                      {year ? ` · ${year}` : ""}
                      {rating ? ` · ★ ${rating}` : ""}
                    </span>
                  </span>
                  {isActive && (
                    <CornerDownLeft
                      size={15}
                      className="shrink-0 text-faint"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
        </div>

        {query.trim() && (
          <button
            onClick={submitFullSearch}
            className="flex w-full items-center justify-between border-t border-hairline
                       px-4 py-3 text-caption text-muted transition hover:bg-surface-2"
          >
            <span>
              See all results for &ldquo;
              <span className="text-ink">{query.trim()}</span>&rdquo;
            </span>
            <kbd className="rounded border border-hairline px-1.5 py-0.5 text-[11px] text-faint">
              Enter
            </kbd>
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchPalette;
