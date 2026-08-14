import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RotateCcw } from "lucide-react";
import { previewEmbedUrl, play, pause, mute, unmute, restart } from "../lib/youtube";
import { useReducedMotion } from "../lib/useReducedMotion";
import { useInView } from "../lib/useInView";

/** How long the backdrop holds before the trailer fades in over it. */
const START_DELAY = 2200;
/** If the embed hasn't loaded by now, stay on the backdrop. */
const LOAD_TIMEOUT = 8000;

/**
 * Details-page hero background: static backdrop that crossfades into a muted,
 * autoplaying trailer.
 *
 * The backdrop image is never removed — the video fades in *on top of it*.
 * That's what avoids the black frame you get when swapping sources: at every
 * moment of the transition there is a fully-painted image behind the video,
 * so a slow first frame shows the still rather than a flash of black.
 *
 * Playback pauses when the hero scrolls out of view or the tab is hidden,
 * and falls back to the backdrop whenever there's no trailer, the embed
 * fails, or the user prefers reduced motion.
 */
const HeroTrailer = ({ backdropSrc, trailerKey, title, className = "" }) => {
  const reduced = useReducedMotion();
  const [containerRef, inView] = useInView({ once: false, threshold: 0.25 });

  const [armed, setArmed] = useState(false); // delay elapsed; mount the iframe
  const [ready, setReady] = useState(false); // iframe loaded; safe to fade in
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [tabHidden, setTabHidden] = useState(false);
  const iframeRef = useRef(null);

  const canPlay = Boolean(trailerKey) && !reduced && !failed;

  // Arm after the delay — but only once the hero is actually on screen, so a
  // deep-linked page scrolled past the hero never loads the embed at all.
  useEffect(() => {
    if (!canPlay || armed || !inView) return;
    const t = setTimeout(() => setArmed(true), START_DELAY);
    return () => clearTimeout(t);
  }, [canPlay, armed, inView]);

  // Give up gracefully if the embed never loads.
  useEffect(() => {
    if (!armed || ready) return;
    const t = setTimeout(() => setFailed((f) => (ready ? f : true)), LOAD_TIMEOUT);
    return () => clearTimeout(t);
  }, [armed, ready]);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Single place that decides whether the video should be running.
  useEffect(() => {
    if (!ready) return;
    const el = iframeRef.current;
    if (inView && !tabHidden) play(el);
    else pause(el);
  }, [ready, inView, tabHidden]);

  const toggleMuted = () => {
    const el = iframeRef.current;
    if (muted) unmute(el);
    else mute(el);
    setMuted(!muted);
  };

  const replay = () => {
    restart(iframeRef.current);
    play(iframeRef.current);
  };

  const showVideo = armed && ready && !failed;

  return (
    <div ref={containerRef} className={`absolute inset-0 overflow-clip ${className}`}>
      {/* Backdrop — always present underneath the video. */}
      {backdropSrc && (
        <img
          src={backdropSrc}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
        />
      )}

      {armed && trailerKey && (
        <iframe
          ref={iframeRef}
          src={previewEmbedUrl(trailerKey)}
          title={`${title} trailer`}
          allow="autoplay; encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2
                     -translate-y-1/2 border-0"
          style={{
            // Overscanned so YouTube's own letterboxing falls outside the
            // hero and the video reads as a full-bleed background.
            width: "177.78vh",
            minWidth: "100%",
            height: "56.25vw",
            minHeight: "100%",
            opacity: showVideo ? 1 : 0,
            transition: reduced
              ? "none"
              : "opacity var(--duration-crossfade) var(--ease-out-soft)",
          }}
        />
      )}

      {/* Gradients sit above the video so hero text stays readable over any
          frame. Unchanged from the static version. */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-base via-base/75 to-base/25"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-base via-base/60 to-transparent"
        aria-hidden="true"
      />

      {/* Controls appear only once the trailer is actually playing. */}
      {showVideo && (
        <div className="absolute bottom-5 right-4 z-20 flex items-center gap-2 md:right-10">
          <button
            onClick={replay}
            aria-label="Replay trailer"
            className="flex h-9 w-9 items-center justify-center rounded-full border
                       border-hairline-strong bg-black/40 text-ink backdrop-blur-sm
                       transition hover:bg-black/60"
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <button
            onClick={toggleMuted}
            aria-label={muted ? "Unmute trailer" : "Mute trailer"}
            aria-pressed={!muted}
            className="flex h-9 w-9 items-center justify-center rounded-full border
                       border-hairline-strong bg-black/40 text-ink backdrop-blur-sm
                       transition hover:bg-black/60"
          >
            {muted ? (
              <VolumeX size={15} aria-hidden="true" />
            ) : (
              <Volume2 size={15} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default HeroTrailer;
