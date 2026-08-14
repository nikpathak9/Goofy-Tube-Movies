import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setPopular,
  setTopRated,
  setTVPopular,
  setTVTopRated,
  setLoading,
  setError,
} from "../redux/slices/movieSlice";
import HeroCarousel from "./HeroCarousel";
import GenreFilter from "./GenreFilter";
import MediaRail from "./MediaRail";
import Seo from "./Seo";
import { absoluteSiteUrl } from "../lib/seo";

const API_BASE_URL = "https://api.themoviedb.org/3";

const Homepage = () => {
  const dispatch = useDispatch();
  const {
    popular,
    topRated,
    tvPopular,
    tvTopRated,
    isLoading,
    error,
    selectedGenreId,
    selectedGenreType,
  } = useSelector((state) => state.movies);

  useEffect(() => {
    const controller = new AbortController();

    const fetchMovies = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));

      const options = {
        method: "GET",
        signal: controller.signal,
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
        },
      };

      // A genre filter only applies to the section it belongs to. Previously
      // picking a TV genre left the movie rows showing unfiltered "popular"
      // with no indication why.
      const movieFilter =
        selectedGenreId && selectedGenreType === "movie"
          ? `&with_genres=${selectedGenreId}`
          : null;
      const tvFilter =
        selectedGenreId && selectedGenreType === "tv"
          ? `&with_genres=${selectedGenreId}`
          : null;

      const urls = [
        movieFilter
          ? `${API_BASE_URL}/discover/movie?language=en-US&page=1${movieFilter}`
          : `${API_BASE_URL}/movie/popular?language=en-US&page=1`,
        movieFilter
          ? `${API_BASE_URL}/discover/movie?language=en-US&page=1&sort_by=vote_average.desc&vote_count.gte=200${movieFilter}`
          : `${API_BASE_URL}/movie/top_rated?language=en-US&page=1`,
        tvFilter
          ? `${API_BASE_URL}/discover/tv?language=en-US&page=1${tvFilter}`
          : `${API_BASE_URL}/tv/popular?language=en-US&page=1`,
        tvFilter
          ? `${API_BASE_URL}/discover/tv?language=en-US&page=1&sort_by=vote_average.desc&vote_count.gte=200${tvFilter}`
          : `${API_BASE_URL}/tv/top_rated?language=en-US&page=1`,
      ];

      const setters = [setPopular, setTopRated, setTVPopular, setTVTopRated];

      try {
        const settled = await Promise.allSettled(
          urls.map((url) => fetch(url, options).then((r) => r.json()))
        );
        if (controller.signal.aborted) return;

        settled.forEach((result, i) => {
          dispatch(
            setters[i](
              result.status === "fulfilled" ? result.value.results || [] : []
            )
          );
        });

        // Surface a message only when every request failed — a single flaky
        // row shouldn't blank the page.
        if (settled.every((r) => r.status === "rejected")) {
          dispatch(setError("Couldn't reach the movie database."));
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          dispatch(setError("Something went wrong while fetching data."));
        }
      } finally {
        // The boot loader is owned solely by main.jsx — see hideBootLoader().
        if (!controller.signal.aborted) dispatch(setLoading(false));
      }
    };

    fetchMovies();
    return () => controller.abort();
  }, [dispatch, selectedGenreId, selectedGenreType]);

  const filterLabel = selectedGenreId
    ? selectedGenreType === "tv"
      ? "TV Shows"
      : "Movies"
    : null;

  return (
    <main>
      <Seo
        description="Discover popular and top-rated movies and TV shows, watch trailers, and build your watch list on Goofy Tube."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Goofy Tube",
          url: absoluteSiteUrl("/"),
          description:
            "Discover popular and top-rated movies and TV shows, watch trailers, and build your watch list.",
        }}
      />
      <HeroCarousel />

      <GenreFilter />

      {error ? (
        <div className="px-4 py-20 text-center md:px-10">
          <h2 className="text-h2 text-ink">Can&rsquo;t load titles</h2>
          <p className="mt-2 text-body text-muted">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert transition hover:bg-white"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="pb-8">
          {/* When a genre filter is active, only the matching media type has
              meaningfully filtered results, so the other pair is suppressed
              rather than shown as unfiltered defaults. */}
          {(!filterLabel || filterLabel === "Movies") && (
            <>
              <MediaRail
                title="Popular Movies"
                items={popular}
                fallbackType="movie"
                loading={isLoading}
              />
              <MediaRail
                title="Top Rated Movies"
                items={topRated}
                fallbackType="movie"
                loading={isLoading}
              />
            </>
          )}
          {(!filterLabel || filterLabel === "TV Shows") && (
            <>
              <MediaRail
                title="Popular TV Shows"
                items={tvPopular}
                fallbackType="tv"
                loading={isLoading}
              />
              <MediaRail
                title="Top Rated TV Shows"
                items={tvTopRated}
                fallbackType="tv"
                loading={isLoading}
              />
            </>
          )}
        </div>
      )}
    </main>
  );
};

export default Homepage;
