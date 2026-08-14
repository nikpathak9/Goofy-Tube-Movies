import { useEffect, useState } from "react";

/**
 * Lazily resolves a YouTube trailer key for one title.
 *
 * Nothing is fetched until `enabled` flips true — that is what keeps the
 * homepage from firing a /videos request per card on load. A rail of 20 cards
 * costs zero requests until you actually hover one.
 *
 * Results are memoised per session in a module-level Map, so re-hovering a
 * card (or revisiting a page) never refetches. `null` is cached too: a title
 * with no trailer shouldn't be retried on every hover.
 */
const cache = new Map();
const inflight = new Map();

async function fetchTrailerKey(type, id) {
  const cacheKey = `${type}:${id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);

  const request = (async () => {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/${type}/${id}/videos?language=en-US`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_TMDB_READ_TOKEN}`,
          },
        }
      );
      if (!res.ok) throw new Error(`TMDB responded ${res.status}`);
      const data = await res.json();
      const results = data.results || [];

      // Prefer a real trailer, then a teaser, then any YouTube clip.
      const pick =
        results.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
        results.find((v) => v.site === "YouTube" && v.type === "Teaser") ||
        results.find((v) => v.site === "YouTube");

      const key = pick?.key ?? null;
      cache.set(cacheKey, key);
      return key;
    } catch {
      // Cache the miss so a flaky title doesn't refetch on every hover.
      cache.set(cacheKey, null);
      return null;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, request);
  return request;
}

export function useTrailerKey(type, id, enabled) {
  const requestedKey = `${type}:${id}`;
  const [key, setKey] = useState(() => cache.get(`${type}:${id}`) ?? null);
  const [keyOwner, setKeyOwner] = useState(requestedKey);
  const [state, setState] = useState(() =>
    cache.has(`${type}:${id}`) ? "ready" : "idle"
  );

  useEffect(() => {
    if (!enabled || !type || !id) return;

    const cacheKey = `${type}:${id}`;
    if (cache.has(cacheKey)) {
      setKey(cache.get(cacheKey));
      setKeyOwner(cacheKey);
      setState("ready");
      return;
    }

    let active = true;
    setKey(null);
    setKeyOwner(cacheKey);
    setState("loading");

    fetchTrailerKey(type, id)
      .then((k) => {
        if (!active) return;
        setKey(k);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("ready");
      });

    return () => {
      active = false;
    };
  }, [type, id, enabled]);

  return {
    trailerKey: keyOwner === requestedKey ? key : null,
    isResolved: keyOwner === requestedKey && state === "ready",
  };
}
