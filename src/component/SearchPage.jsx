import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SearchX } from "lucide-react";
import MediaCard from "./MediaCard";
import Reveal from "./Reveal";
import { detailsPath } from "../lib/media";
import Seo from "./Seo";

const FILTERS = [
  ["all", "All"],
  ["movie", "Movies"],
  ["tv", "TV Shows"],
];

const SORTS = [
  ["relevance", "Relevance"],
  ["rating", "Rating"],
  ["newest", "Newest"],
];

const SearchPage = () => {
  const { query } = useParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("relevance");

  const decodedQuery = decodeURIComponent(query ?? "");

  useEffect(() => {
    const controller = new AbortController();

    const fetchSearchResults = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(
            decodedQuery
          )}&language=en-US&page=1&include_adult=false`,
          {
            method: "GET",
            signal: controller.signal,
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        if (!res.ok) throw new Error(`TMDB responded ${res.status}`);
        const data = await res.json();
        if (controller.signal.aborted) return;
        // Keep only results with a real detail page. "person" results
        // previously rendered as cards that navigated to a broken route.
        setResults(
          (data.results || []).filter((item) => detailsPath(item) !== null)
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Error fetching search results", err);
          setError("Couldn't run that search. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchSearchResults();
    return () => controller.abort();
  }, [decodedQuery]);

  const visible = useMemo(() => {
    const filtered =
      filter === "all"
        ? results
        : results.filter((r) => (r.media_type ?? "movie") === filter);

    const sorted = [...filtered];
    if (sort === "rating") {
      sorted.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    } else if (sort === "newest") {
      const dateOf = (x) =>
        new Date(x.release_date || x.first_air_date || 0).getTime();
      sorted.sort((a, b) => dateOf(b) - dateOf(a));
    }
    return sorted;
  }, [results, filter, sort]);

  const counts = useMemo(
    () => ({
      all: results.length,
      movie: results.filter((r) => r.media_type === "movie").length,
      tv: results.filter((r) => r.media_type === "tv").length,
    }),
    [results]
  );

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-10 md:pt-28">
      <Seo
        title={`Search: ${decodedQuery || "Movies and series"}`}
        description={`Search results for ${decodedQuery || "movies and series"} on Goofy Tube.`}
        path={`/search/${encodeURIComponent(decodedQuery)}`}
        noIndex
      />
      <h1 className="text-h1 text-ink">
        Results for &ldquo;{decodedQuery}&rdquo;
      </h1>

      {!loading && !error && results.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2" role="group" aria-label="Filter results">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-full border px-4 py-1.5 text-caption font-medium transition ${
                  filter === key
                    ? "border-transparent bg-ink text-ink-invert"
                    : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink"
                }`}
              >
                {label}
                <span className="ml-1.5 tabular-nums opacity-60">
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-caption text-faint">
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
      )}

      {loading ? (
        <div data-media-layout className="media-grid mt-8 gap-x-4 gap-y-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="media-grid-item">
              <div className="skeleton aspect-[2/3] rounded-card" />
              <div className="skeleton mt-2.5 h-3.5 w-3/4 rounded" />
              <div className="skeleton mt-1.5 h-3 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-24 text-center">
          <p className="text-body text-muted">{error}</p>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-center">
          <SearchX size={36} className="text-faint" aria-hidden="true" />
          <p className="mt-4 text-body text-muted">
            {results.length === 0
              ? "No results found. Try a different keyword."
              : "Nothing matches that filter."}
          </p>
        </div>
      ) : (
        <div data-media-layout className="media-grid mt-8 gap-x-4 gap-y-6">
          {visible.map((item, i) => (
            // A movie and a TV show can share a numeric ID, so the key has to
            // include the media type.
            <Reveal
              key={`${item.media_type}-${item.id}`}
              delay={(i % 6) * 40}
              data-media-slot
              className="media-grid-item"
            >
              <MediaCard item={item} className="w-full" />
            </Reveal>
          ))}
        </div>
      )}
    </main>
  );
};

export default SearchPage;
