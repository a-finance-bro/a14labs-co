"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";

/**
 * RevealOnView — fades + lifts a block into view when it scrolls into the
 * viewport. Triggers once.
 */
export function RevealOnView({
  children,
  delay = 0,
  y = 28,
  duration = 0.9,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  duration?: number;
  className?: string;
  as?: "div" | "section" | "article" | "li" | "p" | "span" | "h1" | "h2" | "h3";
}) {
  const reduce = useReducedMotion();
  const M = motion[as] as typeof motion.div;
  return (
    <M
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </M>
  );
}

/**
 * RevealWords — splits a string on whitespace and fades each word in with a
 * small stagger. Use for hero headlines + section taglines.
 */
export function RevealWords({
  text,
  className,
  baseDelay = 0,
  charStagger = 0.06,
  italic = false,
}: {
  text: string;
  className?: string;
  baseDelay?: number;
  charStagger?: number;
  italic?: boolean;
}) {
  const reduce = useReducedMotion();
  const words = text.split(/(\s+)/);
  return (
    <span className={className}>
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
        return (
          <motion.span
            key={i}
            className="inline-block"
            style={italic ? { fontStyle: "italic" } : undefined}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 24, filter: "blur(8px)" }}
            whileInView={
              reduce
                ? undefined
                : { opacity: 1, y: 0, filter: "blur(0px)" }
            }
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
              delay: baseDelay + i * charStagger * 0.5,
            }}
          >
            {w}
          </motion.span>
        );
      })}
    </span>
  );
}
