import React from "react";
import {
  absoluteSiteUrl,
  DEFAULT_SEO_DESCRIPTION,
  seoDescription,
} from "../lib/seo";

function serializeJsonLd(value) {
  // Escaping '<' prevents user/API text from prematurely closing the script.
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const Seo = ({
  title,
  description = DEFAULT_SEO_DESCRIPTION,
  path = "/",
  image = "/GT-logo.png",
  imageAlt,
  type = "website",
  noIndex = false,
  jsonLd,
}) => {
  const pageTitle = title ? `${title} | Goofy Tube` : "Goofy Tube";
  const summary = seoDescription(description);
  const canonical = absoluteSiteUrl(path);
  const socialImage = absoluteSiteUrl(image);
  const robots = noIndex ? "noindex, nofollow" : "index, follow";

  return (
    <>
      <title>{pageTitle}</title>
      <meta name="description" content={summary} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content="Goofy Tube" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={summary} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={socialImage} />
      <meta property="og:image:alt" content={imageAlt || pageTitle} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={summary} />
      <meta name="twitter:image" content={socialImage} />
      <meta name="twitter:image:alt" content={imageAlt || pageTitle} />

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
    </>
  );
};

export default Seo;
