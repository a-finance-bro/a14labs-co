"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The A14 mark.
 *
 * Custom letterform. A tall, sharp `A` (no center bar) flanked by a chunky
 * `14`. The A's right diagonal extends past the baseline and tucks under the
 * 14 as a unifying foot — one continuous gesture.
 *
 *   /|     /|
 *  / |    / 1  4
 * /__|___/___|__
 *
 * The path is drawn as a single SVG <path> so it strokes/fills cleanly and
 * supports the "build-in" animation on first paint.
 */
export function A14Mark({
  size = 64,
  animated = false,
  strokeOnly = false,
  className,
}: {
  size?: number;
  animated?: boolean;
  strokeOnly?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const animate = animated && !reduce;

  return (
    <svg
      width={size}
      height={size * 0.62}
      viewBox="0 0 200 124"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="A14 Labs"
    >
      {/* The A — sharp peak triangle, no inner bar. */}
      <motion.path
        d="M 4 116 L 56 8 L 108 116 L 90 116 L 56 44 L 22 116 Z"
        fill={strokeOnly ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={strokeOnly ? 4 : 0}
        strokeLinejoin="miter"
        initial={animate ? { pathLength: 0, opacity: 0 } : undefined}
        animate={animate ? { pathLength: 1, opacity: 1 } : undefined}
        transition={animate ? { duration: 1.1, ease: [0.22, 1, 0.36, 1] } : undefined}
      />

      {/* Unifying foot under the 14 — a hairline that visually continues
          the A's right diagonal across the baseline. */}
      <motion.line
        x1="112" y1="116" x2="196" y2="116"
        stroke="currentColor"
        strokeWidth={strokeOnly ? 4 : 6}
        initial={animate ? { pathLength: 0 } : undefined}
        animate={animate ? { pathLength: 1 } : undefined}
        transition={animate ? { duration: 0.7, delay: 0.6, ease: "easeOut" } : undefined}
      />

      {/* The 1 — a chunky vertical bar with a small flag at the top. */}
      <motion.path
        d="M 124 8 L 144 8 L 144 104 L 124 104 Z M 144 8 L 156 18 L 144 22 Z"
        fill={strokeOnly ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={strokeOnly ? 3 : 0}
        initial={animate ? { y: -16, opacity: 0 } : undefined}
        animate={animate ? { y: 0, opacity: 1 } : undefined}
        transition={animate ? { duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] } : undefined}
      />

      {/* The 4 — single outline polygon: vertical bar + crossbar +
          diagonal slope back up to the top of the vertical. */}
      <motion.path
        d="M 172 8 L 196 8 L 196 116 L 172 116 L 172 88 L 130 88 L 130 76 Z"
        fill={strokeOnly ? "none" : "currentColor"}
        stroke="currentColor"
        strokeWidth={strokeOnly ? 4 : 0}
        strokeLinejoin="miter"
        initial={animate ? { pathLength: 0, opacity: 0, scale: 0.9 } : undefined}
        animate={animate ? { pathLength: 1, opacity: 1, scale: 1 } : undefined}
        transition={animate ? { duration: 0.9, delay: 0.5, ease: [0.22, 1, 0.36, 1] } : undefined}
        style={{ transformOrigin: "163px 62px" }}
      />
    </svg>
  );
}

/**
 * Wordmark variant — the mark + "A14 LABS" caption in tight tracking.
 */
export function A14Lockup({
  size = 28,
  className,
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <A14Mark size={size} animated={animated} />
      <span
        className="font-mono uppercase tracking-[0.36em]"
        style={{ fontSize: Math.round(size * 0.36) }}
      >
        A14 Labs
      </span>
    </span>
  );
}
