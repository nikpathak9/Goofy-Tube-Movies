import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedGenre } from "../redux/slices/movieSlice";

/**
 * Genre filter.
 *
 * The original flattened movie and TV genres into a single <select>, so
 * "Action", "Comedy", "Drama" and friends each appeared twice with nothing to
 * tell them apart, and picking one silently filtered only half the page.
 *
 * Now: a segmented media-type control, then a scrollable pill row scoped to
 * that type. Every option is unambiguous and the current filter is visible at
 * a glance rather than hidden inside a collapsed dropdown.
 */
const GenreFilter = () => {
  const dispatch = useDispatch();
  const { selectedGenreId, selectedGenreType } = useSelector(
    (state) => state.movies
  );
  const [genresByType, setGenresByType] = useState({ movie: [], tv: [] });
  const [activeType, setActiveType] = useState(selectedGenreType || "movie");

  useEffect(() => {
    const controller = new AbortController();

    const fetchGenres = async () => {
      const options = {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
          accept: "application/json",
        },
      };

      try {
        const [movieRes, tvRes] = await Promise.all([
          fetch("https://api.themoviedb.org/3/genre/movie/list", options),
          fetch("https://api.themoviedb.org/3/genre/tv/list", options),
        ]);
        const [movieData, tvData] = await Promise.all([
          movieRes.json(),
          tvRes.json(),
        ]);
        if (controller.signal.aborted) return;
        setGenresByType({
          movie: movieData.genres || [],
          tv: tvData.genres || [],
        });
      } catch (err) {
        // Non-fatal: the page still works unfiltered.
        if (err.name !== "AbortError") {
          console.error("Failed to fetch genres:", err);
        }
      }
    };

    fetchGenres();
    return () => controller.abort();
  }, []);

  const handleTypeChange = (type) => {
    setActiveType(type);
    // Switching type clears the filter — a movie genre ID is meaningless
    // against the TV endpoints.
    dispatch(setSelectedGenre({ id: null, type: null }));
  };

  // Clicking the active genre again clears it, so the filter is escapable
  // without hunting for the "All" pill.
  const selectGenre = (id) => {
    const alreadyActive =
      selectedGenreType === activeType && String(selectedGenreId) === String(id);
    dispatch(
      alreadyActive
        ? setSelectedGenre({ id: null, type: null })
        : setSelectedGenre({ id, type: activeType })
    );
  };

  const genres = genresByType[activeType] || [];
  const activeId = selectedGenreType === activeType ? selectedGenreId : null;

  const pill = (isActive) =>
    `shrink-0 rounded-full px-4 py-1.5 text-caption font-medium transition
     duration-150 border ${
       isActive
         ? "border-transparent bg-ink text-ink-invert"
         : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink"
     }`;

  return (
    <div className="flex flex-col gap-4 px-4 py-6 md:px-10">
      <div
        className="inline-flex w-fit rounded-full border border-hairline bg-surface p-1"
        role="group"
        aria-label="Filter by media type"
      >
        {[
          ["movie", "Movies"],
          ["tv", "TV Shows"],
        ].map(([type, label]) => (
          <button
            key={type}
            type="button"
            aria-pressed={activeType === type}
            onClick={() => handleTypeChange(type)}
            className={`rounded-full px-5 py-1.5 text-caption font-medium transition duration-150 ${
              activeType === type
                ? "bg-accent text-white"
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="scrollbar-none flex gap-2 overflow-x-auto"
        role="group"
        aria-label="Filter by genre"
      >
        <button
          type="button"
          onClick={() => dispatch(setSelectedGenre({ id: null, type: null }))}
          aria-pressed={activeId === null}
          className={pill(activeId === null)}
        >
          All
        </button>
        {genres.map((genre) => {
          const isActive = String(activeId) === String(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              onClick={() => selectGenre(genre.id)}
              aria-pressed={isActive}
              className={pill(isActive)}
            >
              {genre.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GenreFilter;
