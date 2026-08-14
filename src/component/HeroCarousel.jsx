import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Play } from "lucide-react";
import { backdropUrl } from "../lib/images";
import { ratingOf, titleOf, yearOf } from "../lib/media";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useTrailerKey } from "../lib/useTrailerKey";
import YouTubePreview from "./YouTubePreview";

const SLIDE_MS = 7000;
const PREVIEW_DELAY = 1400;

const HeroCarousel = () => {
  const [movies, setMovies] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => document.hidden);
  const [previewArmed, setPreviewArmed] = useState(false);
  const heroRef = useRef(null);
  const [heroInView, setHeroInView] = useState(false);
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const elapsedRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const pausedRef = useRef(false);
  const pointerInsideRef = useRef(false);
  const interactionFrameRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPopularMovies = async () => {
      try {
        const response = await fetch(
          "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
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
        if (!controller.signal.aborted) {
          setMovies((data.results || []).filter((movie) => movie.backdrop_path).slice(0, 5));
        }
      } catch (error) {
        if (error.name !== "AbortError") console.error("Failed to fetch popular movies:", error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchPopularMovies();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || loading || !movies.length) return;
    if (typeof IntersectionObserver === "undefined") {
      setHeroInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setHeroInView(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [loading, movies.length]);

  const syncInteractionState = useCallback((clearPointer = false) => {
    const hero = heroRef.current;
    const nextHidden = document.hidden;
    if (clearPointer) pointerInsideRef.current = false;
    const focusInside = Boolean(hero?.contains(document.activeElement));
    const nextPaused = nextHidden || pointerInsideRef.current || focusInside;

    if (pausedRef.current === nextPaused && tabHidden === nextHidden) return;

    pausedRef.current = nextPaused;
    lastTimestampRef.current = performance.now();
    setTabHidden(nextHidden);
    setPaused(nextPaused);
  }, [tabHidden]);

  const scheduleInteractionSync = useCallback((clearPointer = false) => {
    cancelAnimationFrame(interactionFrameRef.current);
    interactionFrameRef.current = requestAnimationFrame(() =>
      syncInteractionState(clearPointer)
    );
  }, [syncInteractionState]);

  useEffect(() => {
    const clearStalePointerPause = () => scheduleInteractionSync(true);
    const syncCurrentState = () => scheduleInteractionSync(false);
    const syncVisibility = () => syncInteractionState(document.hidden);

    syncInteractionState(true);
    window.addEventListener("scroll", clearStalePointerPause, { passive: true });
    window.addEventListener("resize", clearStalePointerPause);
    window.addEventListener("pageshow", clearStalePointerPause);
    window.addEventListener("focus", syncCurrentState);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      cancelAnimationFrame(interactionFrameRef.current);
      pointerInsideRef.current = false;
      window.removeEventListener("scroll", clearStalePointerPause);
      window.removeEventListener("resize", clearStalePointerPause);
      window.removeEventListener("pageshow", clearStalePointerPause);
      window.removeEventListener("focus", syncCurrentState);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [scheduleInteractionSync, syncInteractionState]);

  // One clock owns both autoplay and progress for the component's lifetime.
  useEffect(() => {
    if (movies.length <= 1) return;
    let frame;
    let lastPaint = 0;
    lastTimestampRef.current = performance.now();
    const tick = (now) => {
      const previous = lastTimestampRef.current ?? now;
      const delta = Math.min(now - previous, 250);
      lastTimestampRef.current = now;
      if (!pausedRef.current) {
        elapsedRef.current += delta;
        if (elapsedRef.current >= SLIDE_MS) {
          elapsedRef.current = 0;
          setProgress(0);
          setActiveIndex((index) => (index + 1) % movies.length);
        } else if (!reduced || now - lastPaint >= 250) {
          setProgress(elapsedRef.current / SLIDE_MS);
          lastPaint = now;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [movies.length, reduced]);

  const active = movies[activeIndex];

  useEffect(() => {
    setPreviewArmed(false);
    if (!active?.id || reduced || tabHidden || !heroInView) return;
    const timer = setTimeout(() => setPreviewArmed(true), PREVIEW_DELAY);
    return () => clearTimeout(timer);
  }, [active?.id, reduced, tabHidden, heroInView]);

  const { trailerKey } = useTrailerKey("movie", active?.id, previewArmed);

  const selectSlide = (index) => {
    elapsedRef.current = 0;
    lastTimestampRef.current = performance.now();
    setProgress(0);
    setActiveIndex(index);
  };

  if (loading) return <div className="skeleton h-[56vh] min-h-[380px] w-full md:h-[70vh]" />;
  if (!movies.length || !active) return null;

  const title = titleOf(active);
  const year = yearOf(active);
  const rating = ratingOf(active);

  return (
    <section
      ref={heroRef}
      className="relative h-[56vh] min-h-[380px] w-full overflow-clip md:h-[70vh]"
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        pointerInsideRef.current = true;
        syncInteractionState();
      }}
      onPointerLeave={() => {
        pointerInsideRef.current = false;
        syncInteractionState();
      }}
      onFocusCapture={() => syncInteractionState()}
      onBlurCapture={() => scheduleInteractionSync(false)}
      aria-roledescription="carousel"
      aria-label="Featured titles"
    >
      {movies.map((movie, index) => (
        <div key={movie.id} className={`absolute inset-0 transition-opacity duration-700 ease-out ${index === activeIndex ? "opacity-100" : "opacity-0"}`} aria-hidden={index !== activeIndex}>
          <img src={backdropUrl(movie.backdrop_path)} alt="" className="h-full w-full object-cover object-top" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "low"} />
        </div>
      ))}

      <YouTubePreview
        trailerKey={trailerKey}
        title={title}
        active={Boolean(previewArmed && heroInView && !tabHidden && !reduced && trailerKey)}
        paused={paused}
        className="hero-carousel-preview absolute left-1/2 top-1/2"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-base via-base/70 to-transparent" aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/40 to-transparent" aria-hidden="true" />

      <div className="absolute inset-x-0 bottom-0 px-4 pb-14 md:px-10 md:pb-16">
        <div key={active.id} className="animate-fade-up max-w-xl">
          <p className="eyebrow mb-3">Goofy Tube Original</p>
          <h2 className="display-title text-[2.25rem] text-ink sm:text-[3rem] md:text-[3.75rem]">{title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted">
            {year && <span className="tabular-nums">{year}</span>}
            {rating && <><span className="text-faint" aria-hidden="true">·</span><span className="tabular-nums">★ {rating}</span></>}
          </div>
          <p className="mt-3 line-clamp-2 max-w-lg text-body text-muted">{active.overview}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={() => navigate(`/watch/movie/${active.id}`)} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-caption font-semibold text-white transition duration-200 hover:scale-[1.02] hover:bg-accent-hover active:scale-[0.98]"><Play size={16} className="fill-current" aria-hidden="true" />Watch trailer</button>
            <button onClick={() => navigate(`/details/movie/${active.id}`)} className="inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-white/5 px-6 py-3 text-caption font-semibold text-ink backdrop-blur-sm transition duration-200 hover:bg-white/10"><Info size={16} aria-hidden="true" />More info</button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-4 flex gap-1.5 md:left-10">
        {movies.map((movie, index) => (
          <button key={movie.id} onClick={() => selectSlide(index)} aria-label={`Show ${titleOf(movie)}`} aria-current={index === activeIndex} className="group h-6 w-8 py-2.5">
            <span className="block h-[3px] w-full overflow-hidden rounded-full bg-white/25 group-hover:bg-white/50">
              <span className={`block h-full origin-left bg-ink ${reduced ? "" : "transition-transform duration-75 linear"}`} style={{ transform: `scaleX(${index === activeIndex ? progress : index < activeIndex ? 1 : 0})` }} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default HeroCarousel;
