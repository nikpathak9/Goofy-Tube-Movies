import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Play, Plus, Check } from "lucide-react";
import MediaRail from "./MediaRail";
import HeroTrailer from "./HeroTrailer";
import Reveal from "./Reveal";
import { isPlayableType, titleOf, ratingOf } from "../lib/media";
import { profileImage, backdropUrl } from "../lib/images";
import { useWatchlist } from "../lib/useWatchlist";

const CACHE_TTL = 3600 * 1000; // 1 hour

/** Reads a cached payload, tolerating corrupt or evicted entries. */
function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
  } catch {
    // QuotaExceededError — the cache is an optimisation, not a requirement.
  }
}

const MovieDetails = () => {
  const { id, type } = useParams();
  const navigate = useNavigate();
  const { watchlist, toggle: toggleWatchlistKey, isAuthenticated } = useWatchlist();
  const location = useLocation();
  const watchKey = `${type}:${id}`;
  const toggleWatchlist = () => {
    if (!isAuthenticated) {
      navigate("/signin", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    toggleWatchlistKey(watchKey);
  };

  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  // The key (not a full URL) — HeroTrailer builds its own embed URL from it,
  // and the append_to_response payload already contains it, so the hero costs
  // no extra request.
  const [trailerKey, setTrailerKey] = useState(null);
  const [cast, setCast] = useState([]);
  const [directors, setDirectors] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [images, setImages] = useState([]);
  const galleryRef = useRef(null);
  const [galleryEdges, setGalleryEdges] = useState({ start: true, end: false });

  const updateGalleryEdges = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    setGalleryEdges({
      start: el.scrollLeft <= 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    const el = galleryRef.current;
    if (!el || !images.length) return;
    updateGalleryEdges();
    el.addEventListener("scroll", updateGalleryEdges, { passive: true });
    const observer = new ResizeObserver(updateGalleryEdges);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateGalleryEdges);
      observer.disconnect();
    };
  }, [images, updateGalleryEdges]);

  const scrollGallery = (direction) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(300, el.clientWidth * 0.8), behavior: "smooth" });
  };

  /*
    Guard against an invalid :type in the URL (e.g. /details/person/123).
    `loading` must be cleared here too — the fetch effect below bails out for
    invalid types, so nothing else would ever turn it off and the page would
    sit on the skeleton forever instead of showing "not found".
  */
  useEffect(() => {
    if (!isPlayableType(type)) {
      setNotFound(true);
      setLoading(false);
    }
  }, [type]);

  /*
    One request instead of five (plus one per TV season). `append_to_response`
    folds credits, videos, images and recommendations into the detail call.
  */
  useEffect(() => {
    if (!isPlayableType(type)) return;
    const controller = new AbortController();

    const applyPayload = (data) => {
      setMedia(data);
      setImages(data.images?.backdrops?.slice(0, 12) || []);
      setRecommendations(data.recommendations?.results || []);
      setCast(data.credits?.cast?.slice(0, 12) || []);

      const crew = data.credits?.crew || [];
      setDirectors(
        type === "movie"
          ? crew.filter(({ job }) => job === "Director")
          : crew.filter(
              ({ job, known_for_department }) =>
                job === "Director" || known_for_department === "Directing"
            )
      );

      const videos = data.videos?.results || [];
      const trailer =
        videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.key) ||
        videos.find((v) => v.site === "YouTube" && v.type === "Teaser" && v.key) ||
        videos.find((v) => v.site === "YouTube" && v.key);
      setTrailerKey(trailer?.key ?? null);
    };

    const fetchAll = async () => {
      setLoading(true);
      setNotFound(false);

      const cacheKey = `tmdb_${type}_${id}_v2`;
      const cached = readCache(cacheKey);
      if (cached) {
        applyPayload(cached);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}?language=en-US&append_to_response=credits,videos,images,recommendations&include_image_language=en,null`,
          {
            method: "GET",
            signal: controller.signal,
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) throw new Error(`TMDB responded ${res.status}`);

        const data = await res.json();
        if (controller.signal.aborted) return;
        applyPayload(data);
        writeCache(cacheKey, data);
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch media details:", err);
          setNotFound(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchAll();
    return () => controller.abort();
  }, [id, type]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatRuntime = (minutes) => {
    if (!minutes) return "Unknown";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours ? `${hours}h ${mins}m` : `${mins}m`;
  };

  /* navigate(-1) keeps the user in the app. window.history.back() sent them
     off-site when they arrived via a shared link or a refresh. */
  const handleBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  if (loading) {
    return (
      <div className="pt-16">
        <div className="skeleton h-[52vh] w-full" />
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 md:px-10">
          <div className="skeleton h-8 w-1/3 rounded" />
          <div className="skeleton h-4 w-2/3 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (notFound || !media) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-h1 text-ink">Title not found</h1>
        <p className="mt-2 text-body text-muted">
          We couldn&rsquo;t find anything at that address.
        </p>
        <button
          onClick={handleBack}
          className="mt-6 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert transition hover:bg-white"
        >
          Go back
        </button>
      </div>
    );
  }

  const title = titleOf(media);
  const rating = ratingOf(media);
  const backdrop = backdropUrl(media.backdrop_path || media.poster_path);
  const directorNames = [...new Set(directors.map((d) => d.name))].slice(0, 3);
  const year = (media.release_date || media.first_air_date || "").slice(0, 4);

  // Bullet-separated meta row: 2026 • 2h 08m • Sci-Fi Thriller • 16+
  const metaParts = [
    year || null,
    type === "movie"
      ? media.runtime
        ? formatRuntime(media.runtime)
        : null
      : media.number_of_seasons
        ? `${media.number_of_seasons} season${media.number_of_seasons === 1 ? "" : "s"}`
        : null,
    media.genres?.slice(0, 2).map((g) => g.name).join(" ") || null,
    media.adult ? "18+" : type === "tv" ? "TV" : "PG",
  ].filter(Boolean);

  // Right-hand spec table from the reference layout.
  const specs = [
    ["Release", formatDate(media.release_date || media.first_air_date)],
    [
      type === "movie" ? "Runtime" : "Episodes",
      type === "movie"
        ? formatRuntime(media.runtime)
        : /*
             TMDB returns this directly. The old code fired one sequential
             request PER SEASON to count episodes by hand.
           */
          (media.number_of_episodes ?? "Unknown"),
    ],
    ["Director", directorNames.length ? directorNames.join(", ") : "Not specified"],
    [
      type === "movie" ? "Production" : "Network",
      (type === "movie"
        ? media.production_companies?.slice(0, 2).map((c) => c.name).join(", ")
        : media.networks?.map((n) => n.name).join(", ")) || "Not specified",
    ],
    [
      "Country / Language",
      [
        media.production_countries?.[0]?.iso_3166_1,
        media.original_language?.toUpperCase(),
      ]
        .filter(Boolean)
        .join(" / ") || "Not specified",
    ],
  ];

  const inWatchlist = watchlist.includes(watchKey);

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative">
        {/*
          Backdrop that crossfades into the trailer. Scrim gradients live
          inside HeroTrailer so they stay above the video and hero text
          remains readable over any frame. The scrim is still confined to the
          hero — the original stretched it over the whole scrolling page.
        */}
        <HeroTrailer
          backdropSrc={backdrop}
          trailerKey={trailerKey}
          title={title}
        />

        <div className="relative px-4 pb-12 pt-10 md:px-10 md:pb-16 md:pt-16">
          <button
            onClick={handleBack}
            className="mb-10 inline-flex items-center gap-2 text-caption text-muted
                       transition hover:text-ink"
          >
            <ArrowLeft size={15} aria-hidden="true" /> Back
          </button>

          <div className="max-w-2xl pt-16 md:pt-28">
            <p className="eyebrow">
              Goofy Tube {type === "tv" ? "Series" : "Original"}
            </p>

            <h1 className="mt-3 display-title text-[2.5rem] text-ink sm:text-[3.5rem] md:text-[4.25rem]">
              {title}
            </h1>

            <div className="meta-dots mt-4 text-caption text-muted">
              {metaParts.map((part) => (
                <span key={part}>{part}</span>
              ))}
              {/*
                Read through ratingOf(), which tolerates the field being
                absent. `media.vote_average.toFixed(1)` used to throw and
                white-screen the entire page.
              */}
              {rating && (
                <span className="inline-flex items-center gap-1 text-ink">
                  <Star size={12} className="fill-gold text-gold" aria-hidden="true" />
                  {rating}
                </span>
              )}
            </div>

            {/*
              The tagline goes here rather than the overview — the overview
              has its own section below, and printing it in both places read
              as a duplication bug.
            */}
            {media.tagline && (
              <p className="mt-5 max-w-lg text-body italic text-muted">
                {media.tagline}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {trailerKey ? (
                <button
                  onClick={() => navigate(`/watch/${type}/${id}`)}
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3
                             text-caption font-semibold text-white transition duration-200
                             hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play size={16} className="fill-current" aria-hidden="true" />
                  Watch trailer
                </button>
              ) : (
                <span className="rounded-full border border-hairline px-6 py-3 text-caption text-faint">
                  No trailer available
                </span>
              )}

              <button
                onClick={toggleWatchlist}
                aria-pressed={isAuthenticated ? inWatchlist : false}
                aria-label={!isAuthenticated ? `Sign in to add ${title} to my list` : inWatchlist ? `Remove ${title} from my list` : `Add ${title} to my list`}
                className="inline-flex items-center gap-2 rounded-full border border-hairline-strong
                           bg-white/5 px-6 py-3 text-caption font-semibold text-ink
                           backdrop-blur-sm transition duration-200 hover:bg-white/10"
              >
                {inWatchlist ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Plus size={16} aria-hidden="true" />
                )}
                {!isAuthenticated
                  ? "Sign in to add to watch list"
                  : inWatchlist
                    ? "Remove from watch list"
                    : "Add to watch list"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Overview + specs ---------- */}
      <Reveal as="section" className="mx-auto grid max-w-[1400px] gap-10 px-4 py-14 md:grid-cols-[1fr_minmax(280px,420px)] md:gap-16 md:px-10">
        <div>
          <p className="eyebrow">Overview</p>
          <p className="mt-5 max-w-prose text-body leading-relaxed text-muted">
            {media.overview || "No overview available."}
          </p>
        </div>

        <dl className="self-start">
          {specs.map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-6 border-b border-hairline py-3.5"
            >
              <dt className="shrink-0 text-caption text-faint">{label}</dt>
              <dd className="text-right text-caption text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      {/* ---------- Cast ---------- */}
      {cast.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pb-14 md:px-10">
          <Reveal>
            <h2 className="text-h2 text-ink">Cast</h2>
          </Reveal>
          {/* 8 columns at the capped width keeps each card ~150px — in line
              with the poster cards in the rails. It was 6 columns across the
              full viewport, which ballooned to ~300px on a wide monitor. */}
          <div className="mt-6 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {cast.map((actor, i) => {
              const profile = profileImage(actor.profile_path);
              return (
                <Reveal
                  key={actor.credit_id ?? actor.id}
                  delay={Math.min(i, 8) * 40}
                >
                  {profile ? (
                    <img
                      src={profile.src}
                      srcSet={profile.srcSet}
                      sizes="(max-width: 640px) 30vw, 160px"
                      alt={actor.name}
                      loading="lazy"
                      className="aspect-[2/3] w-full rounded-card object-cover ring-1 ring-hairline"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] w-full items-center justify-center rounded-card bg-surface-2 text-xl text-faint">
                      {(actor.name || "?").charAt(0)}
                    </div>
                  )}
                  <p className="mt-2.5 line-clamp-1 text-caption font-semibold text-ink">
                    {actor.name}
                  </p>
                  <p className="line-clamp-1 text-[11px] text-faint">
                    {actor.character}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- Gallery ---------- */}
      {images.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 pb-14 md:px-10">
          <Reveal className="flex items-center justify-between gap-4">
            <h2 className="text-h2 text-ink">Gallery</h2>
            <div className="flex gap-2" aria-label="Gallery navigation">
              <button type="button" onClick={() => scrollGallery(-1)} disabled={galleryEdges.start} aria-label="Previous gallery images" className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-ink transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={20} aria-hidden="true" /></button>
              <button type="button" onClick={() => scrollGallery(1)} disabled={galleryEdges.end} aria-label="Next gallery images" className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-ink transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={20} aria-hidden="true" /></button>
            </div>
          </Reveal>
          <div ref={galleryRef} tabIndex="0" aria-label={`${title} image gallery`} className="scrollbar-none mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth focus-visible:outline-none">
            {images.map((img, i) => (
              <img
                key={img.file_path ?? i}
                src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                alt={`Still from ${title}`}
                loading="lazy"
                decoding="async"
                className="aspect-video w-[70vw] shrink-0 snap-start rounded-card object-cover ring-1 ring-hairline sm:w-[300px]"
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- More like this ---------- */}
      {/*
        Reuses MediaRail rather than a bespoke grid. As a 6-column grid across
        the full viewport these cards grew to ~300px wide on a large monitor;
        the rail pins them at the same ~180px used everywhere else, so card
        size is defined in exactly one place.
      */}
      {recommendations.length > 0 && (
        <div className="pb-10">
          <MediaRail
            title="More like this"
            items={recommendations}
            fallbackType={type}
          />
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
