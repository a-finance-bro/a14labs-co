"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

/**
 * Ambient passive background: a few large, slow-drifting bean-shaped blurs
 * in the coffee palette. Sits behind everything at low opacity to give the
 * page a warm, alive backdrop without competing with type.
 */
export function AmbientField() {
  const reduce = useReducedMotion();

  const blobs = useMemo(
    () => [
      { left: "8%", top: "18%", size: 460, color: "var(--color-roast)", delay: 0, dur: 26 },
      { left: "72%", top: "12%", size: 380, color: "var(--color-caramel)", delay: 4, dur: 32 },
      { left: "58%", top: "60%", size: 520, color: "var(--color-mocha)", delay: 8, dur: 38 },
      { left: "18%", top: "78%", size: 360, color: "var(--color-roast)", delay: 12, dur: 30 },
    ],
    []
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {blobs.map((b, i) => (
        <motion.span
          key={i}
          className="absolute rounded-[55%_45%_60%_40%/55%_60%_40%_45%] blur-[120px]"
          style={{
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size * 0.7,
            background: b.color,
            opacity: 0.22,
            mixBlendMode: "screen",
          }}
          animate={
            reduce
              ? undefined
              : {
                  x: [0, 60, -40, 30, 0],
                  y: [0, -30, 40, -20, 0],
                  scale: [1, 1.08, 0.96, 1.04, 1],
                  rotate: [0, 6, -4, 3, 0],
                }
          }
          transition={
            reduce
              ? undefined
              : {
                  duration: b.dur,
                  delay: b.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
        />
      ))}
      {/* Subtle grain overlay to give the warm bg some paper texture. */}
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
      />
    </div>
  );
}
