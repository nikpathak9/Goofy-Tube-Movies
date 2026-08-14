import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnv } from "vite";

const projectRoot = process.cwd();
const env = loadEnv("production", projectRoot, "");
const siteUrl = (
  env.VITE_SITE_URL ||
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  "https://goofy-tube-movies.netlify.app"
).replace(/\/+$/, "");
const token = env.VITE_TMDB_READ_TOKEN;
const apiKey = env.VITE_TMDB_API_KEY;
const publicDirectory = path.join(projectRoot, "public");
const detailPages = 5;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function fetchPopular(type, page) {
  const url = new URL(`https://api.themoviedb.org/3/${type}/popular`);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", String(page));
  if (!token && apiKey) url.searchParams.set("api_key", apiKey);

  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(
          `TMDB ${type} page ${page} responded ${response.status}`
        );
      }
      const payload = await response.json();
      return (payload.results || []).map((item) => ({ type, id: item.id }));
    } catch (error) {
      lastError = error;
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  }
  throw new Error(
    `TMDB ${type} page ${page} failed: ${lastError?.message || "unknown error"}`
  );
}

async function collectDetailRoutes() {
  if (!token && !apiKey) {
    console.warn(
      "Sitemap: no TMDB credential was found; generating core routes only."
    );
    return [];
  }

  const seen = new Set();
  const routes = [];
  // Keep requests sequential. This runs only during a production build and
  // avoids a burst of requests being throttled by TMDB or the build host.
  for (const type of ["movie", "tv"]) {
    for (let page = 1; page <= detailPages; page += 1) {
      try {
        const items = await fetchPopular(type, page);
        for (const item of items) {
          const route = `/details/${item.type}/${item.id}`;
          if (seen.has(route)) continue;
          seen.add(route);
          routes.push(route);
        }
      } catch (error) {
        console.warn(`Sitemap: ${error.message}`);
      }
    }
  }
  return routes;
}

const coreRoutes = ["/", "/browse/movie", "/browse/tv"];
const detailRoutes = await collectDetailRoutes();
const routes = [...coreRoutes, ...detailRoutes];
const urlEntries = routes
  .map(
    (route) =>
      `  <url><loc>${escapeXml(`${siteUrl}${route}`)}</loc></url>`
  )
  .join("\n");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

await mkdir(publicDirectory, { recursive: true });
await Promise.all([
  writeFile(path.join(publicDirectory, "sitemap.xml"), sitemap, "utf8"),
  writeFile(path.join(publicDirectory, "robots.txt"), robots, "utf8"),
]);

console.log(
  `Sitemap: wrote ${routes.length} routes for ${siteUrl} (${detailRoutes.length} title pages).`
);
