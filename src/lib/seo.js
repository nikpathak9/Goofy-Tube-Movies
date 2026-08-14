export const DEFAULT_SEO_DESCRIPTION =
  "Discover popular and top-rated movies and TV shows, watch trailers, and build your watch list on Goofy Tube.";

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function siteOrigin() {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  if (configured) return trimTrailingSlash(configured);
  if (typeof window !== "undefined") return trimTrailingSlash(window.location.origin);
  return "https://goofy-tube.netlify.app";
}

export function absoluteSiteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${siteOrigin()}${normalizedPath}`;
}

export function seoDescription(value, fallback = DEFAULT_SEO_DESCRIPTION) {
  const text = String(value || fallback)
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 160) return text;
  return `${text.slice(0, 157).trimEnd()}…`;
}
