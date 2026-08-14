import React, { useEffect, useRef, useState } from "react";
import { mute, pause, play, previewEmbedUrl, restart } from "../lib/youtube";

const LOAD_TIMEOUT = 8000;

/** Backdrop-safe YouTube preview that only becomes visible after playback. */
const YouTubePreview = ({ trailerKey, title, active, paused = false, className = "" }) => {
  const iframeRef = useRef(null);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [warmedUp, setWarmedUp] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFrameLoaded(false);
    setPlayerReady(false);
    setPlaying(false);
    setWarmedUp(false);
    setFailed(false);
  }, [trailerKey, active]);

  useEffect(() => {
    if (!active || !frameLoaded || failed) return;
    const frame = iframeRef.current;
    let attempts = 0;
    const connect = () => {
      frame?.contentWindow?.postMessage(JSON.stringify({ event: "listening" }), "*");
      mute(frame);
      if (!paused) play(frame);
      attempts += 1;
      if (attempts >= 12) clearInterval(interval);
    };
    connect();
    const interval = setInterval(connect, 300);
    return () => clearInterval(interval);
  }, [active, frameLoaded, failed, paused]);

  useEffect(() => {
    if (!active) return;
    const onMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      let message = event.data;
      try {
        if (typeof message === "string") message = JSON.parse(message);
      } catch {
        return;
      }
      if (message?.event === "onReady") {
        setPlayerReady(true);
        mute(iframeRef.current);
        if (!paused) play(iframeRef.current);
      }
      if (message?.event === "onStateChange") {
        const state = Number(message.info);
        setPlaying(state === 1);
        if (state === 0 && !paused) {
          restart(iframeRef.current);
          play(iframeRef.current);
        }
      }
      if (message?.event === "initialDelivery") {
        setPlayerReady(true);
        setPlaying(Number(message.info?.playerState) === 1);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [active, paused]);

  // Some bare YouTube embeds never emit IFrame API state messages even
  // though muted autoplay succeeds. Reveal after a short warmup in that case;
  // the iframe load timeout below still protects the backdrop fallback.
  useEffect(() => {
    if (!active || !frameLoaded || paused) {
      setWarmedUp(false);
      return;
    }
    const warmup = setTimeout(() => setWarmedUp(true), 900);
    return () => clearTimeout(warmup);
  }, [active, frameLoaded, paused]);

  useEffect(() => {
    if (!active || frameLoaded) return;
    const timeout = setTimeout(() => setFailed(true), LOAD_TIMEOUT);
    return () => clearTimeout(timeout);
  }, [active, frameLoaded]);

  useEffect(() => {
    if (!active || paused || !playerReady || playing) return;
    const retry = setTimeout(() => {
      mute(iframeRef.current);
      play(iframeRef.current);
    }, 500);
    return () => clearTimeout(retry);
  }, [active, paused, playerReady, playing]);

  useEffect(() => {
    if (!frameLoaded) return;
    if (paused || !active) {
      pause(iframeRef.current);
      setPlaying(false);
    } else {
      mute(iframeRef.current);
      play(iframeRef.current);
    }
  }, [active, paused, frameLoaded]);

  if (!active || !trailerKey || failed) return null;

  return (
    <iframe
      ref={iframeRef}
      key={trailerKey}
      src={previewEmbedUrl(trailerKey)}
      title={`${title} trailer preview`}
      allow="autoplay; encrypted-media"
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={() => setFrameLoaded(true)}
      onError={() => setFailed(true)}
      aria-hidden="true"
      className={`pointer-events-none border-0 ${className}`}
      style={{ opacity: playing || warmedUp ? 1 : 0 }}
    />
  );
};

export default YouTubePreview;
