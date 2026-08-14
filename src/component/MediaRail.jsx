import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MediaCard from "./MediaCard";
import Reveal from "./Reveal";

/**
 * A horizontally scrolling row of poster cards.
 *
 * Consolidates four copy-pasted blocks from Homepage. Arrow state comes from
 * a real scroll listener, fixing the bug where the left arrow only appeared
 * after clicking right and neither arrow disabled at the ends of the track.
 *
 * Uses a ref rather than getElementById so multiple rails can't collide.
 */
const MediaRail = ({ title, items, fallbackType, loading = false }) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // 8px slack absorbs sub-pixel rounding at either end of the track.
    setCanScrollLeft(scrollLeft > 8);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, items]);

  const scrollByPage = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!loading && !items?.length) return null;

  // Mask the trailing edge until the user scrolls, then both edges — so
  // content reads as continuing off-screen instead of stopping at a boundary.
  const maskClass = canScrollLeft
    ? canScrollRight
      ? "rail-mask"
      : ""
    : canScrollRight
      ? "rail-mask-start"
      : "";

  return (
    <section className="group/rail relative py-5">
      <Reveal className="mb-3 flex items-baseline justify-between px-4 md:px-10">
        <h2 className="text-h2 text-ink">{title}</h2>
      </Reveal>

      <div className="relative">
        {/* Arrows are conditionally rendered rather than using the `hidden`
            attribute, which `display: flex` silently overrides. */}
        {canScrollLeft && (
          <button
            onClick={() => scrollByPage(-1)}
            aria-label={`Scroll ${title} left`}
            className="absolute left-2 top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2
                       items-center justify-center rounded-full border border-hairline
                       bg-base/80 text-ink opacity-0 backdrop-blur-md transition
                       duration-200 hover:scale-105 hover:bg-surface-2
                       focus-visible:opacity-100 group-hover/rail:opacity-100
                       md:flex"
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}

        <div
          ref={trackRef}
          data-media-layout
          className={`media-rail-track scrollbar-none flex gap-3 overflow-x-auto scroll-smooth
                      px-4 pb-2 md:gap-4 md:px-10 ${maskClass}`}
        >
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-[38vw] shrink-0 sm:w-[22vw] lg:w-[180px]">
                  <div className="skeleton aspect-[2/3] rounded-card" />
                  <div className="skeleton mt-2.5 h-3.5 w-3/4 rounded" />
                  <div className="skeleton mt-1.5 h-3 w-1/3 rounded" />
                </div>
              ))
            : items.map((item, i) => (
                // Stagger capped at 8 items: past that the last card in a
                // 20-item rail would wait most of a second to appear.
                <Reveal
                  key={`${item.media_type ?? fallbackType}-${item.id}`}
                  data-media-slot
                  delay={Math.min(i, 8) * 45}
                  className="media-rail-item w-[38vw] shrink-0 sm:w-[22vw] lg:w-[180px]"
                >
                  <MediaCard
                    item={item}
                    fallbackType={fallbackType}
                    className="w-full"
                  />
                </Reveal>
              ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scrollByPage(1)}
            aria-label={`Scroll ${title} right`}
            className="absolute right-2 top-[38%] z-20 hidden h-11 w-11 -translate-y-1/2
                       items-center justify-center rounded-full border border-hairline
                       bg-base/80 text-ink opacity-0 backdrop-blur-md transition
                       duration-200 hover:scale-105 hover:bg-surface-2
                       focus-visible:opacity-100 group-hover/rail:opacity-100
                       md:flex"
          >
            <ChevronRight size={22} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
};

export default MediaRail;
