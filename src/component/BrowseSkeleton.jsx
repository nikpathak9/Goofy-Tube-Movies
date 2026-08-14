import React from "react";

const CARD_COUNT = 18;

/** Layout-stable loading state shared by the Movies and Series browsers. */
const BrowseSkeleton = ({ label }) => (
  <div
    data-media-layout
    className="media-grid mt-8 gap-x-3 gap-y-7 sm:gap-x-4"
    aria-busy="true"
    aria-label={`Loading ${label.toLowerCase()}`}
    role="status"
  >
    <span className="sr-only">Loading {label.toLowerCase()}…</span>
    {Array.from({ length: CARD_COUNT }).map((_, index) => (
      <div className="media-grid-item" aria-hidden="true" key={index}>
        <div
          className="skeleton browse-card-skeleton aspect-[2/3] rounded-card"
          style={{ animationDelay: `${(index % 6) * 70}ms` }}
        >
          <div className="absolute inset-x-0 bottom-0 z-10 p-3">
            <div className="h-3.5 w-3/4 rounded bg-white/10" />
            <div className="mt-2 flex gap-2">
              <div className="h-2.5 w-8 rounded bg-white/[0.07]" />
              <div className="h-2.5 w-12 rounded bg-white/[0.07]" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default BrowseSkeleton;
