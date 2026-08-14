import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Star, Play, Plus, Check, ExternalLink } from "lucide-react";
import MediaRail from "./MediaRail";
import HeroTrailer from "./HeroTrailer";
import Reveal from "./Reveal";
import { isPlayableType, titleOf, ratingOf } from "../lib/media";
import { profileImage, backdropUrl } from "../lib/images";
import { useWatchlist } from "../lib/useWatchlist";
import Seo from "./Seo";
import { absoluteSiteUrl, seoDescription } from "../lib/seo";

const CACHE_TTL = 3600 * 1000; // 1 hour
const MAX_MEDIA_CACHE_ENTRIES = 12;
const DEFAULT_WATCH_REGION = "IN";
const mediaCache = new Map();

const PROVIDER_GROUPS = [
  ["flatrate", "Stream"],
  ["free", "Watch free"],
  ["ads", "Free with ads"],
  ["rent", "Rent"],
  ["buy", "Buy"],
];

function regionName(region) {
  try {
    return new Intl.DisplayNames([navigator.language], { type: "region" }).of(region) || region;
  } catch {
    return region;
  }
}

/** Reads a cached payload, tolerating corrupt or evicted entries. */
function readCache(key) {
  const cached = mediaCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.timestamp <= CACHE_TTL) return cached.value;
  mediaCache.delete(key);
  return null;
}

function writeCache(key, value) {
  mediaCache.delete(key);
  mediaCache.set(key, { value, timestamp: Date.now() });
  while (mediaCache.size > MAX_MEDIA_CACHE_ENTRIES) {
    mediaCache.delete(mediaCache.keys().next().value);
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
  const [watchProviders, setWatchProviders] = useState({});
  const [watchRegion, setWatchRegion] = useState(DEFAULT_WATCH_REGION);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(false);
  const [providersRetryKey, setProvidersRetryKey] = useState(0);
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

  useEffect(() => {
    if (!isPlayableType(type)) return;
    const controller = new AbortController();

    const applyProviders = (results) => {
      const nextProviders = results || {};
      const regions = Object.keys(nextProviders);
      setWatchProviders(nextProviders);
      setWatchRegion((current) => {
        if (nextProviders[current]) return current;
        if (nextProviders[DEFAULT_WATCH_REGION]) return DEFAULT_WATCH_REGION;
        if (nextProviders.US) return "US";
        return regions[0] || DEFAULT_WATCH_REGION;
      });
    };

    const fetchProviders = async () => {
      setProvidersLoading(true);
      setProvidersError(false);

      const cacheKey = `tmdb_watch_${type}_${id}_v1`;
      const cached = readCache(cacheKey);
      if (cached) {
        applyProviders(cached);
        setProvidersLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}/watch/providers`,
          {
            signal: controller.signal,
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
            },
          }
        );
        if (!response.ok) throw new Error(`TMDB responded ${response.status}`);
        const data = await response.json();
        if (controller.signal.aborted) return;
        applyProviders(data.results);
        writeCache(cacheKey, data.results || {});
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to fetch watch providers:", error);
          setProvidersError(true);
        }
      } finally {
        if (!controller.signal.aborted) setProvidersLoading(false);
      }
    };

    fetchProviders();
    return () => controller.abort();
  }, [id, type, providersRetryKey]);

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
      <>
        <Seo
          title="Loading title"
          description="Loading movie or series details on Goofy Tube."
          path={`/details/${type}/${id}`}
          noIndex
        />
        <div className="pt-16">
          <div className="skeleton h-[52vh] w-full" />
          <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 md:px-10">
            <div className="skeleton h-8 w-1/3 rounded" />
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/2 rounded" />
          </div>
        </div>
      </>
    );
  }

  if (notFound || !media) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <Seo
          title="Title not found"
          description="The requested movie or series could not be found on Goofy Tube."
          path={`/details/${type}/${id}`}
          noIndex
        />
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
  const seoImage = backdropUrl(
    media.backdrop_path || media.poster_path,
    "w1280"
  );
  const directorNames = [...new Set(directors.map((d) => d.name))].slice(0, 3);
  const year = (media.release_date || media.first_air_date || "").slice(0, 4);
  const releaseDate = media.release_date || media.first_air_date || undefined;
  const detailsUrl = absoluteSiteUrl(`/details/${type}/${id}`);
  const detailsDescription = seoDescription(
    media.overview,
    `${title} is available to discover on Goofy Tube.`
  );
  const mediaSchema = {
    "@type": type === "movie" ? "Movie" : "TVSeries",
    name: title,
    url: detailsUrl,
    description: detailsDescription,
    image: seoImage || undefined,
    datePublished: releaseDate,
    genre: media.genres?.map((genre) => genre.name),
    inLanguage: media.original_language || undefined,
    director: directorNames.map((name) => ({ "@type": "Person", name })),
    actor: cast.slice(0, 8).map((person) => ({
      "@type": "Person",
      name: person.name,
    })),
    aggregateRating:
      rating && media.vote_count
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(rating),
            bestRating: 10,
            worstRating: 0,
            ratingCount: media.vote_count,
          }
        : undefined,
    sameAs: `https://www.themoviedb.org/${type}/${id}`,
  };
  const detailsJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      mediaSchema,
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: absoluteSiteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: type === "movie" ? "Movies" : "Series",
            item: absoluteSiteUrl(`/browse/${type}`),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: title,
            item: detailsUrl,
          },
        ],
      },
    ],
  };

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
  const availableRegions = Object.keys(watchProviders).sort((a, b) =>
    regionName(a).localeCompare(regionName(b))
  );
  const regionalProviders = watchProviders[watchRegion];
  const providerGroups = PROVIDER_GROUPS.map(([key, label]) => [
    key,
    label,
    regionalProviders?.[key] || [],
  ]).filter(([, , providers]) => providers.length > 0);

  return (
    <div>
      <Seo
        title={`${title}${year ? ` (${year})` : ""}`}
        description={detailsDescription}
        path={`/details/${type}/${id}`}
        image={seoImage || "/GT-logo.png"}
        imageAlt={`${title} backdrop`}
        type={type === "movie" ? "video.movie" : "video.tv_show"}
        jsonLd={detailsJsonLd}
      />
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

      {/* ---------- Regional streaming availability ---------- */}
      <Reveal as="section" className="mx-auto max-w-[1400px] px-4 pb-14 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-5 border-t border-hairline pt-12">
          <div>
            <p className="eyebrow">Availability</p>
            <h2 className="mt-2 text-h2 text-ink">Where to watch</h2>
            <p className="mt-2 max-w-xl text-caption text-muted">
              Streaming availability varies by country and can change over time.
            </p>
          </div>

          {availableRegions.length > 0 && (
            <label className="flex items-center gap-2 text-caption text-faint">
              Region
              <select
                value={watchRegion}
                onChange={(event) => setWatchRegion(event.target.value)}
                className="rounded-lg border border-hairline bg-surface px-3 py-2 text-caption text-ink transition hover:border-hairline-strong focus:outline-none focus:ring-2 focus:ring-accent/50"
              >
                {availableRegions.map((region) => (
                  <option value={region} key={region}>
                    {regionName(region)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {providersLoading ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" aria-label="Loading watch providers" role="status">
            <span className="sr-only">Loading watch providers…</span>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} aria-hidden="true" className="skeleton h-[74px] rounded-sheet" />
            ))}
          </div>
        ) : providersError ? (
          <div className="mt-7 rounded-sheet border border-hairline bg-surface px-5 py-6">
            <p className="text-caption text-muted">Watch availability could not be loaded.</p>
            <button
              type="button"
              onClick={() => setProvidersRetryKey((key) => key + 1)}
              className="mt-3 rounded-full border border-hairline-strong px-4 py-2 text-caption font-semibold text-ink transition hover:bg-surface-2"
            >
              Try again
            </button>
          </div>
        ) : providerGroups.length > 0 ? (
          <div className="mt-8 space-y-8">
            {providerGroups.map(([key, label, providers]) => (
              <div key={key}>
                <h3 className="text-caption font-semibold text-ink">{label}</h3>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {providers.map((provider) => (
                    <a
                      key={provider.provider_id}
                      href={regionalProviders.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`See where to watch ${title} with ${provider.provider_name} in ${regionName(watchRegion)}`}
                      className="group flex min-w-0 items-center gap-3 rounded-sheet border border-hairline bg-surface p-3 transition duration-200 hover:-translate-y-0.5 hover:border-hairline-strong hover:bg-surface-2"
                    >
                      {provider.logo_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-12 w-12 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-lg font-semibold text-faint">
                          {provider.provider_name.charAt(0)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block text-caption font-semibold leading-tight text-ink">
                          {provider.provider_name}
                        </span>
                        <span className="mt-1 block text-[10px] text-faint">View options</span>
                      </span>
                      <ExternalLink size={14} className="shrink-0 text-faint transition group-hover:text-ink" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            ))}

            <p className="text-[11px] text-faint">
              Availability data provided by{" "}
              <a href="https://www.justwatch.com/" target="_blank" rel="noreferrer noopener" className="underline decoration-hairline-strong underline-offset-4 transition hover:text-muted">
                JustWatch
              </a>
              . Provider links open TMDB&rsquo;s regional watch page.
            </p>
          </div>
        ) : (
          <div className="mt-7 rounded-sheet border border-hairline bg-surface px-5 py-6">
            <p className="text-caption text-muted">
              No streaming, rental, or purchase information is currently available for {regionName(watchRegion)}.
            </p>
          </div>
        )}
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
