import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Play, Plus, Check, Info, Star, X } from "lucide-react";
import { posterImage, backdropUrl } from "../lib/images";
import { detailsPath, titleOf, yearOf, ratingOf, resolveMediaType } from "../lib/media";
import { useTrailerKey } from "../lib/useTrailerKey";
import { previewEmbedUrl } from "../lib/youtube";
import { useWatchlist } from "../lib/useWatchlist";
import { useReducedMotion } from "../lib/useReducedMotion";

/** How long the expanded card waits before requesting the preview video. */
const PREVIEW_DELAY = 550;
/** Expanded card is this much wider than the slot it grew from. */
const SCALE = 1.5;
/** Keep this clear of the viewport edges when positioning. */
const EDGE_GUTTER = 16;

/**
 * The expanded card, rendered in a portal.
 *
 * WHY A PORTAL: the rail track has `overflow-x-auto` AND a `mask-image`, both
 * of which clip descendants. An in-flow card that grew past its slot would be
 * cut off at the rail's bounds. Rendering into document.body and positioning
 * `fixed` against the slot's measured rect avoids clipping completely — and
 * because the overlay is out of flow, expanding it cannot shift any layout.
 *
 * The trade-off is that the overlay must be dismissed on scroll/resize rather
 * than tracking the slot, which is handled below.
 */
const HoverPreviewCard = ({
  item,
  fallbackType,
  anchorRect,
  onClose,
  onPointerOver,
}) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { watchlist, toggle } = useWatchlist();

  const [entered, setEntered] = useState(false);
  const [wantsPreview, setWantsPreview] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const panelRef = useRef(null);
  const failTimer = useRef(null);

  const type = resolveMediaType(item, fallbackType);
  const to = detailsPath(item, fallbackType);
  const title = titleOf(item);
  const year = yearOf(item);
  const rating = ratingOf(item);
  const poster = posterImage(item.poster_path);
  const backdrop = backdropUrl(item.backdrop_path, "w780");
  const watchKey = `${type}:${item.id}`;
  const inList = watchlist.includes(watchKey);

  // Only fetch the trailer key once we've committed to showing a preview.
  const { trailerKey } = useTrailerKey(type, item.id, wantsPreview);

  /* --- Geometry ---------------------------------------------------------
     Width grows from the slot; the panel is centred on the slot and then
     clamped so it can never overflow the viewport. This is what stops cards
     at the start/end of a rail from being cut off — they shift inward
     instead of expanding symmetrically. */
  const width = Math.round(anchorRect.width * SCALE);
  const centre = anchorRect.left + anchorRect.width / 2;
  let left = Math.round(centre - width / 2);
  left = Math.max(EDGE_GUTTER, Math.min(left, window.innerWidth - width - EDGE_GUTTER));

  const mediaHeight = Math.round(width * (9 / 16));
  // Vertically centre-ish on the slot, then clamp to the viewport.
  let top = Math.round(anchorRect.top - 40);
  const estimatedHeight = mediaHeight + 190;
  top = Math.max(
    EDGE_GUTTER,
    Math.min(top, window.innerHeight - estimatedHeight - EDGE_GUTTER)
  );

  // Animate in on the next frame so the browser has a start state to
  // transition from.
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Delay the video request — a pointer passing across a rail shouldn't
  // trigger a dozen network calls.
  useEffect(() => {
    if (reduced) return; // No autoplaying preview under reduced motion.
    const t = setTimeout(() => setWantsPreview(true), PREVIEW_DELAY);
    return () => clearTimeout(t);
  }, [reduced]);

  /* If the embed hasn't reported load within a few seconds, treat it as
     failed and keep the poster. Covers blocked third-party frames, offline,
     and autoplay refusals. */
  useEffect(() => {
    if (!trailerKey || !wantsPreview) return;
    failTimer.current = setTimeout(() => {
      setVideoFailed((f) => (videoReady ? f : true));
    }, 6000);
    return () => clearTimeout(failTimer.current);
  }, [trailerKey, wantsPreview, videoReady]);

  /*
    Dismiss rather than chase the anchor: the measured rect goes stale the
    moment the page or rail scrolls.

    Two guards, both needed:
     - A short grace period. Focusing a card scrolls it into view, which fired
       a scroll event and closed the panel before it was ever visible — so
       keyboard users could never open it.
     - A movement threshold measured from the position at open, so scroll
       anchoring and sub-pixel jitter don't count as "the user scrolled away".
  */
  useEffect(() => {
    let baseline = window.scrollY;
    let armedForScroll = false;

    const arm = setTimeout(() => {
      baseline = window.scrollY;
      armedForScroll = true;
    }, 250);

    const onScroll = () => {
      if (!armedForScroll) return;
      if (Math.abs(window.scrollY - baseline) > 8) onClose();
    };
    const onResize = () => onClose();

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(arm);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!to) return null;

  const showVideo = wantsPreview && trailerKey && !videoFailed && !reduced;
  const embedUrl = showVideo ? previewEmbedUrl(trailerKey) : null;

  return createPortal(
    <div
      ref={panelRef}
      role="group"
      aria-label={`${title} preview`}
      onMouseEnter={onPointerOver}
      onMouseLeave={onClose}
      className="fixed z-[80] overflow-hidden bg-surface shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)]
                 ring-1 ring-hairline-strong"
      style={{
        left,
        top,
        width,
        borderRadius: entered ? "0.75rem" : "0.5rem",
        opacity: entered ? 1 : 0,
        // Scale from the slot's size to full size. Transform-only, so this
        // never triggers layout on the page beneath.
        transform: entered ? "scale(1)" : `scale(${anchorRect.width / width})`,
        transformOrigin: "center top",
        transition: reduced
          ? "none"
          : `opacity var(--duration-fast) var(--ease-out-soft),
             transform var(--duration-expand) var(--ease-emphasis),
             border-radius var(--duration-expand) var(--ease-emphasis)`,
      }}
    >
      {/* --- Media --- */}
      <div
        className="relative w-full overflow-hidden bg-surface-2"
        style={{ height: mediaHeight }}
      >
        {/* Poster/backdrop always renders underneath, so a failed or slow
            embed degrades to a still rather than a black box. */}
        {backdrop || poster ? (
          <img
            src={backdrop || poster.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {embedUrl && (
          <iframe
            key={trailerKey}
            src={embedUrl}
            title={`${title} preview`}
            allow="autoplay; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => setVideoReady(true)}
            onError={() => setVideoFailed(true)}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2
                       -translate-y-1/2 border-0"
            style={{
              // Overscan so YouTube's letterboxing is cropped out of frame.
              width: "134%",
              height: "134%",
              opacity: videoReady ? 1 : 0,
              transition: `opacity var(--duration-crossfade) var(--ease-out-soft)`,
            }}
          />
        )}

        {/* Scrim keeps the metadata legible over any frame of video. */}
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent"
          aria-hidden="true"
        />

        <button
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center
                     rounded-full bg-black/60 text-white/80 opacity-0 transition
                     hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* --- Body --- */}
      <div className="p-3.5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/watch/${type}/${item.id}`)}
            aria-label={`Play ${title} trailer`}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink
                       text-ink-invert transition hover:scale-105 hover:bg-white"
          >
            <Play size={15} className="ml-0.5 fill-current" aria-hidden="true" />
          </button>
          <button
            onClick={() => toggle(watchKey)}
            aria-pressed={inList}
            aria-label={inList ? `Remove ${title} from my list` : `Add ${title} to my list`}
            className="flex h-9 w-9 items-center justify-center rounded-full border
                       border-hairline-strong text-ink transition hover:bg-white/10"
          >
            {inList ? (
              <Check size={15} aria-hidden="true" />
            ) : (
              <Plus size={15} aria-hidden="true" />
            )}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate(to)}
            aria-label={`More info about ${title}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border
                       border-hairline-strong text-ink transition hover:bg-white/10"
          >
            <Info size={15} aria-hidden="true" />
          </button>
        </div>

        <h3 className="mt-3 line-clamp-1 text-sm font-semibold text-ink">
          {title}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-faint">
          {rating && (
            <span className="inline-flex items-center gap-1 text-muted">
              <Star size={10} className="fill-gold text-gold" aria-hidden="true" />
              {rating}
            </span>
          )}
          {year && <span className="tabular-nums">{year}</span>}
          <span className="rounded border border-hairline px-1 uppercase">
            {type === "tv" ? "Series" : "Film"}
          </span>
        </div>

        {item.overview && (
          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-muted">
            {item.overview}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};

export default HoverPreviewCard;
