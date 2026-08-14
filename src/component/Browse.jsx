import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import MediaCard from "./MediaCard";
import Reveal from "./Reveal";
import BrowseSkeleton from "./BrowseSkeleton";
import { isPlayableType } from "../lib/media";

const API_BASE_URL = "https://api.themoviedb.org/3";

const SORTS = [
  ["popularity.desc", "Popular"],
  ["vote_average.desc", "Top rated"],
  ["primary_release_date.desc", "Newest"],
];

/**
 * Grid browser behind the "Movies" / "Series" nav links, with genre and sort
 * filters and paged loading. TMDB's `discover` endpoint drives it.
 */
const Browse = () => {
  const { type } = useParams();
  const [items, setItems] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [activeGenre, setActiveGenre] = useState(null);
  const [sort, setSort] = useState("popularity.desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const loadMoreRef = useRef(null);
  const requestLockedRef = useRef(true);

  const headers = useCallback(
    () => ({
      accept: "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
    }),
    []
  );

  // Genre list for the active media type.
  useEffect(() => {
    if (!isPlayableType(type)) return;
    const controller = new AbortController();
    setGenresLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/genre/${type}/list`, {
          signal: controller.signal,
          headers: headers(),
        });
        const data = await res.json();
        if (!controller.signal.aborted) setGenres(data.genres || []);
      } catch (err) {
        if (err.name !== "AbortError") console.error(err);
      } finally {
        if (!controller.signal.aborted) setGenresLoading(false);
      }
    })();
    return () => controller.abort();
  }, [type, headers]);

  // Reset paging whenever the query changes.
  useEffect(() => {
    setItems([]);
    setPage(1);
    setError(null);
    setLoadMoreError(null);
    requestLockedRef.current = true;
  }, [type, activeGenre, sort]);

  useEffect(() => {
    if (!isPlayableType(type)) return;
    const controller = new AbortController();

    (async () => {
      requestLockedRef.current = true;
      page === 1 ? setLoading(true) : setLoadingMore(true);
      page === 1 ? setError(null) : setLoadMoreError(null);
      try {
        const params = new URLSearchParams({
          language: "en-US",
          page: String(page),
          sort_by: sort,
          include_adult: "false",
        });
        // Sorting by rating without a vote floor surfaces obscure titles with
        // a single 10/10 vote.
        if (sort === "vote_average.desc") params.set("vote_count.gte", "200");
        if (activeGenre) params.set("with_genres", String(activeGenre));

        const res = await fetch(
          `${API_BASE_URL}/discover/${type}?${params.toString()}`,
          { signal: controller.signal, headers: headers() }
        );
        if (!res.ok) throw new Error(`TMDB responded ${res.status}`);
        const data = await res.json();
        if (controller.signal.aborted) return;

        setTotalPages(Math.min(data.total_pages || 1, 500));
        setItems((prev) => {
          const combined = page === 1
            ? data.results || []
            : [...prev, ...(data.results || [])];
          const seen = new Set();
          return combined.filter((item) => {
            if (!item?.id || seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          });
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error(err);
          if (page === 1) {
            setError("Couldn't load titles. Please try again.");
          } else {
            setLoadMoreError("Couldn't load more titles.");
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
          requestLockedRef.current = false;
        }
      }
    })();

    return () => controller.abort();
  }, [type, page, sort, activeGenre, headers, retryKey]);

  // Request the next page when the end sentinel reaches the viewport.
  // The synchronous ref lock prevents repeated observer notifications from
  // incrementing more than one page while a request is in flight.
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (
      !sentinel ||
      loading ||
      loadingMore ||
      loadMoreError ||
      page >= totalPages
    ) return;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || requestLockedRef.current) return;
        requestLockedRef.current = true;
        setPage((currentPage) => {
          if (currentPage >= totalPages) {
            requestLockedRef.current = false;
            return currentPage;
          }
          return currentPage + 1;
        });
      },
      { rootMargin: "0px", threshold: 0.01 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, loading, loadingMore, loadMoreError, page, totalPages]);

  if (!isPlayableType(type)) return <Navigate to="/" replace />;

  const heading = type === "tv" ? "Series" : "Movies";

  const pill = (isActive) =>
    `shrink-0 rounded-full border px-4 py-1.5 text-caption font-medium transition duration-150 ${
      isActive
        ? "border-transparent bg-accent text-white"
        : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink"
    }`;

  return (
    <main className="px-4 pb-16 pt-8 md:px-10">
      <p className="eyebrow">Browse</p>
      <h1 className="mt-2 display-title text-h1 text-ink md:text-display">
        {heading}
      </h1>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
        <div
          className="scrollbar-none flex max-w-full gap-2 overflow-x-auto"
          role="group"
          aria-label="Filter by genre"
          aria-busy={genresLoading}
        >
          {genresLoading ? (
            Array.from({ length: 7 }).map((_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="skeleton h-[30px] shrink-0 rounded-full"
                style={{ width: `${index % 3 === 0 ? 72 : 92}px` }}
              />
            ))
          ) : (
            <button
              onClick={() => setActiveGenre(null)}
              aria-pressed={activeGenre === null}
              className={pill(activeGenre === null)}
            >
              All
            </button>
          )}
          {!genresLoading && genres.map((genre) => (
            <button
              key={genre.id}
              onClick={() =>
                setActiveGenre((cur) => (cur === genre.id ? null : genre.id))
              }
              aria-pressed={activeGenre === genre.id}
              className={pill(activeGenre === genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </div>

        <label className="flex shrink-0 items-center gap-2 text-caption text-faint">
          Sort
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-hairline bg-surface px-3 py-1.5
                       text-caption text-ink transition hover:border-hairline-strong
                       focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            {SORTS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <div className="py-24 text-center">
          <p className="text-body text-muted">{error}</p>
        </div>
      ) : (
        <>
          {loading ? (
            <BrowseSkeleton label={heading} />
          ) : (
            <div data-media-layout className="media-grid mt-8 gap-x-3 gap-y-7 sm:gap-x-4">
              {items.map((item, i) => (
                  // Stagger resets each row of 6 so later pages don't inherit
                  // an ever-growing delay.
                  <Reveal data-media-slot className="media-grid-item" key={`${item.id}-${i}`} delay={(i % 6) * 40}>
                    <MediaCard item={item} fallbackType={type} className="w-full" />
                  </Reveal>
                ))}
            </div>
          )}

          {!loading && (
            <div
              ref={loadMoreRef}
              className="mt-8 flex min-h-20 items-center justify-center"
              aria-live="polite"
            >
              {loadingMore && (
                <div className="flex items-center gap-3 text-caption text-muted" role="status">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-hairline-strong border-t-accent" aria-hidden="true" />
                  Loading more {heading.toLowerCase()}…
                </div>
              )}
              {loadMoreError && (
                <div className="text-center">
                  <p className="text-caption text-muted">{loadMoreError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      requestLockedRef.current = true;
                      setLoadMoreError(null);
                      setRetryKey((key) => key + 1);
                    }}
                    className="mt-3 rounded-full border border-hairline px-5 py-2 text-caption font-semibold text-ink transition hover:border-hairline-strong hover:bg-surface-2"
                  >
                    Try again
                  </button>
                </div>
              )}
              {!loadingMore && !loadMoreError && page >= totalPages && items.length > 0 && (
                <p className="text-caption text-faint">You&rsquo;ve reached the end.</p>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default Browse;
