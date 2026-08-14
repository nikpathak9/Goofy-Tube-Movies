import React, { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Info, Play, Plus, Star } from "lucide-react";
import { detailsPath, ratingOf, resolveMediaType, titleOf, yearOf } from "../lib/media";
import { backdropUrl, posterImage } from "../lib/images";
import { useHasHover, useReducedMotion } from "../lib/useReducedMotion";
import { useWatchlist } from "../lib/useWatchlist";
import { useTrailerKey } from "../lib/useTrailerKey";
import YouTubePreview from "./YouTubePreview";

const HOVER_INTENT_MS = 400;
const PREVIEW_ACTIVE_EVENT = "media-card:preview-active";

/** A poster card whose original DOM node expands without a portal or clone. */
const MediaCard = ({ item, fallbackType, className = "", enablePreview = true }) => {
  const cardRef = useRef(null);
  const intentTimer = useRef(null);
  const revealTimer = useRef(null);
  const expandFrame = useRef(null);
  const resetTimer = useRef(null);
  const expandedRef = useRef(false);
  const closeRef = useRef(null);
  const hasHover = useHasHover();
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const { watchlist, toggle, isAuthenticated } = useWatchlist();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [cardHeight, setCardHeight] = useState(null);
  const [wantsPreview, setWantsPreview] = useState(false);

  const type = resolveMediaType(item, fallbackType);
  const to = detailsPath(item, fallbackType);
  const title = titleOf(item);
  const year = yearOf(item);
  const rating = ratingOf(item);
  const poster = posterImage(item.poster_path);
  const backdrop = backdropUrl(item.backdrop_path, "w780");
  const watchKey = `${type}:${item.id}`;
  const inList = watchlist.includes(watchKey);
  const { trailerKey } = useTrailerKey(type, item.id, wantsPreview);
  const previewActive = Boolean(expanded && wantsPreview && trailerKey && !reduced);
  const toggleWatchlist = () => {
    if (!isAuthenticated) {
      navigate("/signin", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    toggle(watchKey);
  };

  const applyExpansion = (nextExpanded) => {
    const layout = cardRef.current?.closest("[data-media-layout]");
    const slots = layout
      ? Array.from(layout.children).filter((node) => node.matches?.("[data-media-slot]"))
      : [];
    const layoutBefore = layout?.getBoundingClientRect();
    const first = new Map(slots.map((slot) => [slot, slot.getBoundingClientRect()]));
    slots.forEach((slot) => slot.getAnimations().filter((animation) => animation.id === "media-card-flip").forEach((animation) => animation.cancel()));
    layout?.getAnimations().filter((animation) => animation.id === "media-layout-flip").forEach((animation) => animation.cancel());
    expandedRef.current = nextExpanded;
    flushSync(() => setExpanded(nextExpanded));
    if (reduced) return;
    const layoutAfter = layout?.getBoundingClientRect();
    if (layout && layoutBefore && layoutAfter && Math.abs(layoutBefore.height - layoutAfter.height) > 0.5 && typeof layout.animate === "function") {
      const layoutAnimation = layout.animate(
        [{ height: `${layoutBefore.height}px` }, { height: `${layoutAfter.height}px` }],
        { duration: 440, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "none" }
      );
      layoutAnimation.id = "media-layout-flip";
    }
    slots.forEach((slot) => {
      const before = first.get(slot);
      const after = slot.getBoundingClientRect();
      if (!before || (!before.width && !before.height)) return;
      const deltaX = before.left - after.left;
      const deltaY = before.top - after.top;
      const scaleX = before.width / Math.max(after.width, 1);
      const scaleY = before.height / Math.max(after.height, 1);
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && Math.abs(scaleX - 1) < 0.005 && Math.abs(scaleY - 1) < 0.005) return;
      if (typeof slot.animate !== "function") return;
      const activeSlot = slot.contains(cardRef.current);
      const animation = slot.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${activeSlot ? scaleX : 1}, ${activeSlot ? scaleY : 1})` },
          { transform: "translate3d(0, 0, 0) scale(1, 1)" },
        ],
        { duration: 440, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "none" }
      );
      animation.id = "media-card-flip";
    });
  };

  const open = () => {
    if (!enablePreview || !cardRef.current || expanded) return;
    window.dispatchEvent(new CustomEvent(PREVIEW_ACTIVE_EVENT, { detail: cardRef.current }));
    clearTimeout(resetTimer.current);
    const surface = cardRef.current.querySelector(".media-card-surface");
    setCardHeight(surface?.getBoundingClientRect().height || cardRef.current.getBoundingClientRect().height);
    clearTimeout(revealTimer.current);
    cancelAnimationFrame(expandFrame.current);
    expandFrame.current = requestAnimationFrame(() => {
      applyExpansion(true);
      revealTimer.current = setTimeout(() => {
        cardRef.current?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }, reduced ? 0 : 460);
    });
  };
  const close = () => {
    clearTimeout(intentTimer.current);
    clearTimeout(revealTimer.current);
    cancelAnimationFrame(expandFrame.current);
    applyExpansion(false);
    resetTimer.current = setTimeout(() => {
      setCardHeight(null);
    }, reduced ? 0 : 460);
  };
  closeRef.current = close;

  useEffect(() => () => {
    clearTimeout(intentTimer.current);
    clearTimeout(revealTimer.current);
    clearTimeout(resetTimer.current);
    cancelAnimationFrame(expandFrame.current);
  }, []);
  useEffect(() => {
    const onAnotherPreview = (event) => {
      if (event.detail !== cardRef.current && expandedRef.current) closeRef.current?.();
    };
    const onVisibility = () => {
      if (document.hidden && expandedRef.current) closeRef.current?.();
    };
    window.addEventListener(PREVIEW_ACTIVE_EVENT, onAnotherPreview);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener(PREVIEW_ACTIVE_EVENT, onAnotherPreview);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!expanded || reduced) {
      setWantsPreview(false);
      return;
    }
    const timer = setTimeout(() => setWantsPreview(true), 450);
    return () => clearTimeout(timer);
  }, [expanded, reduced]);
  if (!to) return null;

  return (
    <article
      ref={cardRef}
      data-expanded={expanded || undefined}
      className={`media-card group relative shrink-0 ${expanded ? "media-card-expanded" : ""} ${className}`}
      style={cardHeight ? {
        "--media-card-height": `${cardHeight}px`,
      } : undefined}
      onMouseEnter={() => {
        if (!hasHover || !enablePreview) return;
        clearTimeout(intentTimer.current);
        intentTimer.current = setTimeout(open, HOVER_INTENT_MS);
      }}
      onMouseLeave={() => {
        const focused = cardRef.current?.contains(document.activeElement);
        let keyboardFocused = false;
        try {
          keyboardFocused = focused && document.activeElement.matches(":focus-visible");
        } catch {
          keyboardFocused = false;
        }
        if (!keyboardFocused) close();
      }}
      onFocusCapture={(event) => {
        // Pointer focus must not start a reflow between mousedown and mouseup,
        // otherwise the link can move before its click is delivered.
        try {
          if (event.target.matches(":focus-visible")) open();
        } catch {
          // Older browsers still retain the normal click/touch interaction.
        }
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <div className={`media-card-surface ${expanded ? "shadow-[0_18px_42px_-14px_rgba(0,0,0,.85)]" : ""}`}>
        <Link to={to} className="media-card-media-link block focus-visible:outline-none">
          <div className="media-card-media relative aspect-[2/3] overflow-hidden rounded-card bg-surface-2 ring-1 ring-hairline transition-[border-radius] duration-300 group-hover:ring-hairline-strong group-focus-within:ring-2 group-focus-within:ring-accent">
            {poster ? <img src={poster.src} srcSet={poster.srcSet} sizes="(max-width: 640px) 40vw, (max-width: 1024px) 22vw, 180px" alt={`${title} poster`} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-surface-3"><span className="text-4xl font-semibold text-faint">{title.charAt(0)}</span></div>}
            {backdrop && <img src={backdrop} alt="" aria-hidden="true" className="media-card-backdrop absolute inset-0 h-full w-full object-cover" />}
            <YouTubePreview trailerKey={trailerKey} title={title} active={previewActive} className="media-card-preview absolute left-1/2 top-1/2" />
          </div>
        </Link>
        {enablePreview && (
          <div className="media-card-details">
            <Link to={to} tabIndex={-1} aria-hidden="true" aria-label={`View details for ${title}`} className="pointer-events-auto absolute inset-0 z-0 focus-visible:outline-none" />
            <div className="media-card-gradient pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" aria-hidden="true" />
            <div className="media-card-copy pointer-events-none relative z-10 mt-auto w-full p-3">
              <h3 className="media-card-title line-clamp-1 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/75">
                {year && <span>{year}</span>}
                {year && rating && <span aria-hidden="true">·</span>}
                {rating && <span className="inline-flex items-center gap-1"><Star size={10} className="fill-gold text-gold" aria-hidden="true" />{rating}</span>}
              </p>
              <div className="media-card-expanded-content" aria-hidden={!expanded}>
                {item.overview && <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-white/75">{item.overview}</p>}
                <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => navigate(`/watch/${type}/${item.id}`)} tabIndex={expanded ? 0 : -1} aria-label={`Play ${title} trailer`} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-invert transition duration-200 hover:scale-105 active:scale-95"><Play size={15} className="ml-0.5 fill-current" aria-hidden="true" /></button>
                <button type="button" onClick={toggleWatchlist} tabIndex={expanded ? 0 : -1} aria-pressed={isAuthenticated ? inList : false} aria-label={!isAuthenticated ? `Sign in to add ${title} to watch list` : inList ? `Remove ${title} from watch list` : `Add ${title} to watch list`} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-white transition duration-200 hover:bg-white/10 active:scale-95">{inList ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}</button>
                <button type="button" onClick={() => navigate(to)} tabIndex={expanded ? 0 : -1} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-full bg-accent px-3 text-[11px] font-semibold text-white transition duration-200 hover:bg-accent-hover active:scale-[.98]"><Info size={14} aria-hidden="true" />More info</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {enablePreview && !hasHover && <button type="button" onClick={() => expanded ? close() : open()} aria-expanded={expanded} aria-label={`${expanded ? "Close" : "Preview"} ${title}`} className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur-sm"><ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" /></button>}
    </article>
  );
};

export default MediaCard;
