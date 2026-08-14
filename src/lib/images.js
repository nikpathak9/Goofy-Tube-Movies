/**
 * TMDB image URL helpers.
 *
 * Posters were previously always requested at w500 even when rendered at
 * ~180px wide. These builders emit a `srcSet` so the browser can pick an
 * appropriately sized file, and return null (rather than "" or a missing
 * /fallback.jpg) when there is no image, so callers can render a real
 * placeholder instead of a broken <img>.
 *
 * IMPORTANT: every size below must be a real TMDB size segment. TMDB serves
 * a fixed whitelist per image type and 404s anything else — and because a
 * browser given a `srcSet` ignores `src` entirely, ONE invalid candidate
 * breaks the image even when the `src` fallback is valid.
 *
 * From /configuration:
 *   poster:   w92 w154 w185 w342 w500 w780 original
 *   backdrop: w300 w780 w1280 original
 *   profile:  w45 w185 h632 original      <- note h632, there is no w632
 *   still:    w92 w185 w300 original
 */

const BASE = "https://image.tmdb.org/t/p";

// [size segment, approximate rendered width in px for the `w` descriptor]
const POSTER_SIZES = [
  ["w154", 154],
  ["w185", 185],
  ["w342", 342],
  ["w500", 500],
  ["w780", 780],
];

const BACKDROP_SIZES = [
  ["w300", 300],
  ["w780", 780],
  ["w1280", 1280],
];

/*
  Profiles are the odd one out: TMDB's largest profile size is height-based
  (h632). At the usual 2:3 portrait crop that is roughly 421px wide, which is
  what the srcSet width descriptor needs to advertise.

  This is the bug that broke every cast photo: the list used to read
  [45, 185, 632] and the builder prefixed all of them with "w", requesting a
  non-existent `w632`.
*/
const PROFILE_SIZES = [
  ["w45", 45],
  ["w185", 185],
  ["h632", 421],
];

function build(sizes, path, fallbackSegment) {
  if (!path) return null;
  return {
    src: `${BASE}/${fallbackSegment}${path}`,
    srcSet: sizes
      .map(([segment, width]) => `${BASE}/${segment}${path} ${width}w`)
      .join(", "),
  };
}

export function posterImage(path) {
  return build(POSTER_SIZES, path, "w342");
}

export function profileImage(path) {
  return build(PROFILE_SIZES, path, "w185");
}

export function backdropImage(path) {
  return build(BACKDROP_SIZES, path, "w1280");
}

/** Full-bleed hero backdrop. No srcSet — it always fills the viewport. */
export function backdropUrl(path, size = "original") {
  return path ? `${BASE}/${size}${path}` : null;
}
