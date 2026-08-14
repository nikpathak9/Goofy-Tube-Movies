/**
 * Helpers for dealing with TMDB's `media_type` field.
 *
 * TMDB's /search/multi endpoint returns three kinds of result: "movie", "tv"
 * and "person". The app only has detail pages for movies and TV, so routing a
 * person straight to /details/person/:id produced a broken page. These helpers
 * are the single place that decision is made.
 */

/** Media types that have a working /details route. */
export const PLAYABLE_TYPES = ["movie", "tv"];

export function isPlayableType(type) {
  return PLAYABLE_TYPES.includes(type);
}

/**
 * Best-effort media type for a search result.
 *
 * /search/multi always sets media_type, but nested endpoints
 * (recommendations, similar) often omit it. In that case we infer from which
 * title/date fields are present rather than inheriting the parent's type,
 * which is how TV recommendations ended up opening as movies.
 */
export function resolveMediaType(item, fallback) {
  if (item?.media_type && isPlayableType(item.media_type)) {
    return item.media_type;
  }
  if (item?.media_type === "person") return "person";
  if (item?.title || item?.release_date) return "movie";
  if (item?.name || item?.first_air_date) return "tv";
  return fallback ?? "movie";
}

/**
 * Route for a search/list item, or null when the item has no viewable page.
 * Callers should skip rendering a link when this returns null.
 */
export function detailsPath(item, fallbackType) {
  const type = resolveMediaType(item, fallbackType);
  if (!isPlayableType(type)) return null;
  if (!item?.id) return null;
  return `/details/${type}/${item.id}`;
}

/** Display title across movies, TV and people. */
export function titleOf(item) {
  return item?.title || item?.name || "Untitled";
}

/** Release/air date across movies and TV. */
export function releaseDateOf(item) {
  return item?.release_date || item?.first_air_date || null;
}

export function yearOf(item) {
  const date = releaseDateOf(item);
  if (!date) return null;
  const year = new Date(date).getFullYear();
  return Number.isNaN(year) ? null : year;
}

/** Rating to one decimal, or null when TMDB omits/zeroes it. */
export function ratingOf(item) {
  const value = item?.vote_average;
  if (typeof value !== "number" || Number.isNaN(value) || value === 0) {
    return null;
  }
  return value.toFixed(1);
}
