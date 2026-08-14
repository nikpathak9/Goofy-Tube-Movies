import React, { useCallback, useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-youtube";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  ArrowLeft,
  Expand,
  Minimize,
  PictureInPicture2,
  RotateCcw,
  RotateCw,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  setPlaying,
  setMuted,
  setCurrentTime,
  setDuration,
} from "../redux/slices/videoSlice";
import MediaRail from "./MediaRail";
import { isPlayableType, titleOf } from "../lib/media";

const CONTROLS_HIDE_DELAY = 3000;
const SEEK_STEP = 10;

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const VideoPlayer = () => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const shellRef = useRef(null);
  const hideControlsTimer = useRef(null);

  const { id, type } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isPlaying, isMuted, currentTime, duration } = useSelector(
    (state) => state.video
  );

  const [trailerUrl, setTrailerUrl] = useState(null);
  const [meta, setMeta] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volume, setVolume] = useState(1);
  const [buffered, setBuffered] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  /*
    `isPlaying` is mirrored into a ref because the controls auto-hide timer is
    registered from Video.js event handlers that are bound once at init. The
    original read `isPlaying` directly from the closure, so it was frozen at
    its first-render value and auto-hide behaved unpredictably.
  */
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const showControlsTemporarily = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlayingRef.current) {
      hideControlsTimer.current = setTimeout(
        () => setControlsVisible(false),
        CONTROLS_HIDE_DELAY
      );
    }
  }, []);

  // ---- Data ---------------------------------------------------------------

  useEffect(() => {
    if (!isPlayableType(type)) {
      setError("That address doesn't point to a movie or show.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/${type}/${id}?language=en-US&append_to_response=videos,recommendations`,
          {
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

        const trailer =
          data.videos?.results?.find(
            (v) => v.site === "YouTube" && v.type === "Trailer" && v.key
          ) ||
          data.videos?.results?.find((v) => v.site === "YouTube" && v.key);

        setMeta(data);
        const seenRecommendationIds = new Set([String(id)]);
        setRecommendations(
          (data.recommendations?.results || [])
            .filter(
              (item) =>
                item?.id &&
                !seenRecommendationIds.has(String(item.id)) &&
                seenRecommendationIds.add(String(item.id))
            )
            .slice(0, 40)
        );
        setTrailerUrl(
          trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to fetch data", err);
          setError("Couldn't load this trailer. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [id, type]);

  // ---- Player lifecycle ---------------------------------------------------

  /*
    Initialised synchronously against a freshly-created <video> node.

    The original wrapped this in setTimeout(…, 100) and disposed the player in
    two places (the effect cleanup AND the top of init), which raced under
    StrictMode's double-invoked effects and produced intermittent
    "player was disposed" errors. There is now exactly one owner and no timer.
  */
  useEffect(() => {
    if (!trailerUrl || !videoRef.current) return;

    // Captured for the cleanup closure — videoRef.current may have changed
    // by the time cleanup runs.
    const mount = videoRef.current;

    const videoEl = document.createElement("video");
    videoEl.className =
      "video-js vjs-default-skin video-element vjs-big-play-centered";
    videoEl.playsInline = true;
    mount.appendChild(videoEl);

    const player = videojs(videoEl, {
      techOrder: ["youtube"],
      autoplay: true,
      muted: false,
      controls: false,
      // `fill` makes Video.js size itself to its container instead of its
      // built-in 300x150. The CSS in index.css under `.gt-stage` backs this
      // up for the YouTube iframe, which Video.js doesn't size for us.
      fluid: false,
      fill: true,
      responsive: true,
      loadingSpinner: false,
      sources: [{ src: trailerUrl, type: "video/youtube" }],
      youtube: {
        ytControls: 0,
        enablePrivacyEnhancedMode: true,
        modestbranding: 1,
        rel: 0,
      },
    });

    playerRef.current = player;

    const syncDuration = () => {
      const d = player.duration();
      if (d && !Number.isNaN(d)) dispatch(setDuration(d));
    };

    player.ready(() => {
      syncDuration();
      setVolume(player.volume());
    });

    /*
      With the YouTube tech, duration() returns 0 until playback actually
      begins, which left the seek bar dead (max={duration || 0}) for the first
      seconds. Polling until it resolves fixes the scrub bar on load.
    */
    const durationPoll = setInterval(() => {
      const d = player.duration();
      if (d && !Number.isNaN(d)) {
        dispatch(setDuration(d));
        clearInterval(durationPoll);
      }
    }, 400);

    player.on("loadedmetadata", syncDuration);
    player.on("durationchange", syncDuration);
    player.on("timeupdate", () => {
      dispatch(setCurrentTime(player.currentTime() || 0));
    });
    player.on("progress", () => {
      try {
        const b = player.buffered();
        if (b?.length) setBuffered(b.end(b.length - 1));
      } catch {
        // Some techs throw when buffered() is queried too early.
      }
    });
    player.on("play", () => {
      dispatch(setPlaying(true));
      showControlsTemporarily();
    });
    player.on("pause", () => {
      dispatch(setPlaying(false));
      setControlsVisible(true);
    });
    player.on("volumechange", () => {
      dispatch(setMuted(player.muted()));
      setVolume(player.volume());
    });
    player.on("error", () => {
      console.error("Video player error", player.error());
      setError("This trailer failed to play.");
      setIsLoading(false);
    });

    return () => {
      clearInterval(durationPoll);
      playerRef.current = null;
      if (!player.isDisposed()) player.dispose();
      // Video.js replaces the element it's given; clear whatever remains.
      if (mount) mount.innerHTML = "";
    };
  }, [trailerUrl, dispatch, showControlsTemporarily]);

  // ---- Fullscreen ---------------------------------------------------------

  /*
    Derived from the browser's own fullscreenchange event rather than toggled
    by hand. Pressing Esc previously left the icon showing "minimize" forever.
  */
  useEffect(() => {
    const onChange = () => {
      const active = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement
      );
      setIsFullScreen(active);
      showControlsTemporarily();
    };
    const events = ["fullscreenchange", "webkitfullscreenchange"];
    events.forEach((e) => document.addEventListener(e, onChange));
    return () => events.forEach((e) => document.removeEventListener(e, onChange));
  }, [showControlsTemporarily]);

  const toggleFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    const active =
      document.fullscreenElement || document.webkitFullscreenElement;
    if (active) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(
        document
      );
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    }
  }, []);

  // ---- Controls -----------------------------------------------------------

  const togglePlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (player.paused()) player.play()?.catch(() => {});
    else player.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    player.muted(!player.muted());
  }, []);

  const seekBy = useCallback((delta) => {
    const player = playerRef.current;
    if (!player) return;
    const next = Math.max(
      0,
      Math.min(player.duration() || 0, (player.currentTime() || 0) + delta)
    );
    player.currentTime(next);
  }, []);

  const changeVolume = useCallback((value) => {
    const player = playerRef.current;
    if (!player) return;
    player.volume(value);
    if (value > 0 && player.muted()) player.muted(false);
    setVolume(value);
  }, []);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    dispatch(setCurrentTime(time));
    if (playerRef.current) playerRef.current.currentTime(time);
  };

  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      const el = playerRef.current?.el()?.querySelector("video");
      if (el?.requestPictureInPicture) await el.requestPictureInPicture();
    } catch {
      // PiP isn't available for YouTube iframes in most browsers; ignore.
    }
  }, []);

  // Keyboard shortcuts, the standard set every video site implements.
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
        return;
      }
      const handled = {
        " ": togglePlay,
        k: togglePlay,
        f: toggleFullscreen,
        m: toggleMute,
        ArrowLeft: () => seekBy(-SEEK_STEP),
        ArrowRight: () => seekBy(SEEK_STEP),
        j: () => seekBy(-SEEK_STEP),
        l: () => seekBy(SEEK_STEP),
        ArrowUp: () => changeVolume(Math.min(1, volume + 0.1)),
        ArrowDown: () => changeVolume(Math.max(0, volume - 0.1)),
      }[e.key];

      if (handled) {
        e.preventDefault();
        handled();
        showControlsTemporarily();
        return;
      }

      if (/^[0-9]$/.test(e.key) && playerRef.current) {
        e.preventDefault();
        const d = playerRef.current.duration();
        if (d) playerRef.current.currentTime((parseInt(e.key, 10) / 10) * d);
        showControlsTemporarily();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    togglePlay,
    toggleFullscreen,
    toggleMute,
    seekBy,
    changeVolume,
    volume,
    showControlsTemporarily,
  ]);

  useEffect(
    () => () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    },
    []
  );

  const handleBack = () => {
    if (window.history.state?.idx > 0) navigate(-1);
    else navigate("/");
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (buffered / duration) * 100 : 0;
  const title = meta ? titleOf(meta) : "";

  // ---- Render -------------------------------------------------------------

  if (!isLoading && (error || !trailerUrl)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 text-center">
        <AlertTriangle size={36} className="text-faint" aria-hidden="true" />
        <h1 className="mt-5 text-h1 text-ink">
          {error ? "Playback problem" : "No trailer available"}
        </h1>
        <p className="mt-2 max-w-sm text-body text-muted">
          {error ?? `We couldn't find a trailer for ${title || "this title"}.`}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate(`/details/${type}/${id}`)}
            className="rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-ink-invert transition hover:bg-white"
          >
            View details
          </button>
          <button
            onClick={handleBack}
            className="rounded-full border border-hairline px-6 py-2.5 text-sm font-semibold text-ink transition hover:bg-surface-2"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const controlsShown = controlsVisible || !isPlaying;

  /*
    The player used to be a full-bleed 16:9 stage at up to 100svh with the
    navbar and footer hidden, which made every trailer look like it had
    force-entered fullscreen. It's now a contained theatre inside the page
    frame; real fullscreen is an explicit action, and only then do the
    max-width, rounding and aspect ratio drop away.
  */
  const stageClass = isFullScreen
    ? "gt-stage fixed inset-0 z-[100] h-screen w-screen rounded-none bg-black"
    : "gt-stage relative aspect-video w-full overflow-clip rounded-sheet bg-black ring-1 ring-hairline";

  return (
    <main className="px-4 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1200px]">
        {!isFullScreen && (
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-caption text-muted transition hover:text-ink"
            >
              <ArrowLeft size={15} aria-hidden="true" /> Back
            </button>
            <p className="eyebrow-muted truncate">Now playing</p>
          </div>
        )}

        <div
          ref={shellRef}
          className={`${stageClass} ${controlsShown ? "" : "cursor-none"}`}
          onMouseMove={showControlsTemporarily}
          onTouchStart={showControlsTemporarily}
        >
          {/* Sizing lives in index.css under `.gt-stage` — see the note there
              about Video.js's default 300x150 and YouTube's attribute-sized
              iframe. */}
          <div className="absolute inset-0" onClick={togglePlay}>
            <div ref={videoRef} data-vjs-player className="h-full w-full" />
          </div>

          {isLoading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
            </div>
          )}

          {/* Title bar over the video, fades with the controls. */}
          <div
            className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center
                        gap-3 bg-gradient-to-b from-black/80 to-transparent px-4 pb-10 pt-3
                        transition-opacity duration-300 ${
                          controlsShown ? "opacity-100" : "opacity-0"
                        }`}
          >
            <span className="truncate text-caption font-medium text-white/90">
              {title}
            </span>
          </div>

          {/* Centre play affordance while paused */}
          {!isPlaying && !isLoading && (
            <button
              onClick={togglePlay}
              aria-label="Play"
              className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2
                         -translate-y-1/2 items-center justify-center rounded-full
                         bg-accent text-white transition hover:scale-105 hover:bg-accent-hover"
            >
              <Play size={24} className="ml-1 fill-current" aria-hidden="true" />
            </button>
          )}

          {/* Control bar */}
          <div
            className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95
                        via-black/55 to-transparent px-3 pb-3 pt-14 transition-opacity
                        duration-300 md:px-4 ${
                          controlsShown ? "opacity-100" : "pointer-events-none opacity-0"
                        }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Scrub bar. Visible track is thin, but the input's hit area is
                the full 16px height so it's easy to grab. */}
            <div className="group/scrub relative mb-1 h-4 w-full">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="absolute inset-y-0 left-0 bg-white/40"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-accent"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div
                className={`pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2
                            -translate-y-1/2 rounded-full bg-accent transition-transform
                            duration-150 ${
                              scrubbing ? "scale-125" : "scale-0 group-hover/scrub:scale-100"
                            }`}
                style={{ left: `${progressPercent}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                onMouseDown={() => setScrubbing(true)}
                onMouseUp={() => setScrubbing(false)}
                onTouchStart={() => setScrubbing(true)}
                onTouchEnd={() => setScrubbing(false)}
                step="0.1"
                aria-label="Seek"
                aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none
                           bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                           [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:appearance-none
                           [&::-webkit-slider-thumb]:bg-transparent"
              />
            </div>

            <div className="flex items-center gap-1 text-white md:gap-1.5">
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10"
              >
                {isPlaying ? (
                  <Pause size={18} className="fill-current" aria-hidden="true" />
                ) : (
                  <Play size={18} className="fill-current" aria-hidden="true" />
                )}
              </button>

              <button
                onClick={() => seekBy(-SEEK_STEP)}
                aria-label="Back 10 seconds"
                className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 sm:flex"
              >
                <RotateCcw size={17} aria-hidden="true" />
              </button>
              <button
                onClick={() => seekBy(SEEK_STEP)}
                aria-label="Forward 10 seconds"
                className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 sm:flex"
              >
                <RotateCw size={17} aria-hidden="true" />
              </button>

              {/* Volume slider expands on hover — hidden on touch, where it
                  isn't usable anyway. */}
              <div className="group/vol hidden items-center sm:flex">
                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX size={17} aria-hidden="true" />
                  ) : volume < 0.5 ? (
                    <Volume1 size={17} aria-hidden="true" />
                  ) : (
                    <Volume2 size={17} aria-hidden="true" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => changeVolume(parseFloat(e.target.value))}
                  aria-label="Volume"
                  className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/30
                             opacity-0 transition-all duration-200 group-hover/vol:w-20
                             group-hover/vol:opacity-100 focus:w-20 focus:opacity-100
                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-white"
                />
              </div>

              <span className="ml-1 text-[12px] tabular-nums text-white/80">
                {formatTime(currentTime)}
                <span className="text-white/40"> / </span>
                {formatTime(duration)}
              </span>

              <div className="flex-1" />

              <button
                onClick={togglePiP}
                aria-label="Picture in picture"
                className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10 sm:flex"
              >
                <PictureInPicture2 size={17} aria-hidden="true" />
              </button>
              <button
                onClick={toggleFullscreen}
                aria-label={isFullScreen ? "Exit fullscreen" : "Fullscreen"}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-white/10"
              >
                {isFullScreen ? (
                  <Minimize size={17} aria-hidden="true" />
                ) : (
                  <Expand size={17} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Below the player ---------- */}
        {meta && (
          <div className="mt-8">
            <p className="eyebrow">
              Goofy Tube {type === "tv" ? "Series" : "Original"}
            </p>
            <h1 className="mt-3 display-title text-h1 text-ink md:text-[2.75rem]">
              {title}
            </h1>
            <p className="mt-4 max-w-prose text-body text-muted">
              {meta.overview}
            </p>
            <button
              onClick={() => navigate(`/details/${type}/${id}`)}
              className="mt-6 rounded-full border border-hairline px-5 py-2 text-caption
                         font-medium text-muted transition hover:border-hairline-strong hover:text-ink"
            >
              Full details
            </button>

            <p className="mt-6 text-[11px] text-faint">
              Shortcuts: <kbd>space</kbd> play · <kbd>←</kbd>/<kbd>→</kbd> seek 10s ·{" "}
              <kbd>↑</kbd>/<kbd>↓</kbd> volume · <kbd>f</kbd> fullscreen ·{" "}
              <kbd>m</kbd> mute
            </p>
          </div>
        )}
      </div>

      {recommendations.length > 0 && !isFullScreen && (
        <div className="mt-10">
          <MediaRail
            title="More like this"
            items={recommendations}
            fallbackType={type}
          />
        </div>
      )}
    </main>
  );
};

export default VideoPlayer;
