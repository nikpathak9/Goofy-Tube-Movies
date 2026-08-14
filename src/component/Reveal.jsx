import React, { useEffect, useState } from "react";
import { useInView } from "../lib/useInView";
import { useReducedMotion } from "../lib/useReducedMotion";

/**
 * Fades and lifts its children into view once, when scrolled to.
 *
 * `delay` staggers siblings (rail items, grid cards). Keep stagger small —
 * beyond ~60ms per item a row starts to feel sluggish rather than polished.
 *
 * Under reduced motion this renders fully visible with no transition at all,
 * rather than a faster animation.
 */
const Reveal = ({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  ...rest
}) => {
  const reduced = useReducedMotion();
  const [ref, inView] = useInView();
  const [settled, setSettled] = useState(false);

  // Drop `will-change` once the transition is done so we don't leave a
  // promoted compositor layer per revealed element.
  useEffect(() => {
    if (!inView || reduced) return;
    const t = setTimeout(() => setSettled(true), 400 + delay + 50);
    return () => clearTimeout(t);
  }, [inView, reduced, delay]);

  if (reduced) {
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={`reveal ${inView ? "is-revealed" : ""} ${
        settled ? "is-settled" : ""
      } ${className}`}
      style={{ "--reveal-delay": `${delay}ms` }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
