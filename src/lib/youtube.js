/**
 * Minimal YouTube embed helpers.
 *
 * Deliberately NOT Video.js: the player chunk is ~700KB and is only worth
 * loading on /watch. Card previews and the details hero use a bare iframe
 * with the IFrame API's postMessage interface, which costs nothing extra.
 */

const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : undefined;

/**
 * Builds an embed URL for a muted, chromeless, autoplaying preview.
 *
 * `enablejsapi=1` is what makes `command()` below work. `playsinline=1` stops
 * iOS from hijacking into its native fullscreen player.
 */
export function previewEmbedUrl(key, { loop = true, controls = false } = {}) {
  if (!key) return null;
  const params = new URLSearchParams({
    autoplay: "1",
    mute: "1",
    controls: controls ? "1" : "0",
    modestbranding: "1",
    playsinline: "1",
    rel: "0",
    iv_load_policy: "3",
    disablekb: "1",
    enablejsapi: "1",
    fs: "0",
  });
  if (loop) {
    // YouTube requires an explicit playlist for a single video to loop.
    params.set("loop", "1");
    params.set("playlist", key);
  }
  if (ORIGIN) params.set("origin", ORIGIN);
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}

/**
 * Sends a command to an embedded player.
 * Safe to call before the iframe is ready — the message is simply ignored.
 */
export function command(iframeEl, func, args = []) {
  try {
    iframeEl?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func, args }),
      "*"
    );
  } catch {
    // Cross-origin restrictions in some embedding contexts; non-fatal.
  }
}

export const play = (el) => command(el, "playVideo");
export const pause = (el) => command(el, "pauseVideo");
export const mute = (el) => command(el, "mute");
export const unmute = (el) => command(el, "unMute");
export const restart = (el) => command(el, "seekTo", [0, true]);
