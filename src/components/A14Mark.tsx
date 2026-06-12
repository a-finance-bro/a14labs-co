"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * A14 mark — a typographic lockup, not an icon. A small caramel accent
 * square sits to the left of a heavy "A14" wordmark in Bricolage Grotesque,
 * with the option to render "LABS" in mono caps next to it (Lockup).
 *
 * Type does the work. No custom letterforms.
 */
export function A14Mark({
  size = 32,
  animated = false,
  className,
  accentColor = "var(--color-caramel, #c4924d)",
}: {
  size?: number;
  animated?: boolean;
  className?: string;
  accentColor?: string;
}) {
  const reduce = useReducedMotion();
  const animate = animated && !reduce;
  const dot = size * 0.22;

  return (
    <motion.span
      className={`inline-flex items-baseline gap-2 ${className ?? ""}`}
      aria-label="A14"
      initial={animate ? { opacity: 0, y: -4 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={animate ? { duration: 0.7, ease: [0.22, 1, 0.36, 1] } : undefined}
    >
      <motion.span
        aria-hidden
        className="inline-block shrink-0 translate-y-[-0.05em]"
        style={{
          width: dot,
          height: dot,
          background: accentColor,
        }}
        initial={animate ? { scale: 0, rotate: -10 } : undefined}
        animate={animate ? { scale: 1, rotate: 0 } : undefined}
        transition={animate ? { duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] } : undefined}
      />
      <span
        className="font-display font-extrabold leading-none"
        style={{
          fontSize: size,
          letterSpacing: "-0.045em",
        }}
      >
        A14
      </span>
    </motion.span>
  );
}

/**
 * Wordmark variant — the mark + "LABS" caption in mono caps.
 */
export function A14Lockup({
  size = 32,
  className,
  animated = false,
}: {
  size?: number;
  className?: string;
  animated?: boolean;
}) {
  return (
    <span className={`inline-flex items-baseline gap-3 ${className ?? ""}`}>
      <A14Mark size={size} animated={animated} />
      <span
        className="font-mono uppercase font-medium leading-none"
        style={{
          fontSize: Math.round(size * 0.4),
          letterSpacing: "0.32em",
        }}
      >
        Labs
      </span>
    </span>
  );
}
