"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

/**
 * A coffee-colored cursor dot that tracks the mouse with a soft spring lag,
 * grows + reveals a label on data-cursor-hover targets, and hides on touch.
 */
export function Cursor() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const x = useSpring(mx, { stiffness: 600, damping: 38, mass: 0.4 });
  const y = useSpring(my, { stiffness: 600, damping: 38, mass: 0.4 });
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduce) return;
    if (typeof window === "undefined") return;
    // No custom cursor on touch — too jittery and adds nothing.
    if (window.matchMedia("(hover: none)").matches) return;

    document.documentElement.style.cursor = "none";

    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };

    const onPointerOver = (e: PointerEvent) => {
      const t = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-cursor-hover], a, button"
      );
      const ring = ringRef.current;
      const label = labelRef.current;
      if (!ring || !label) return;
      if (t) {
        const lbl = t.getAttribute("data-cursor-label");
        ring.style.transform = "translate(-50%, -50%) scale(2.6)";
        ring.style.borderColor = "var(--color-accent, #c4924d)";
        if (lbl) {
          label.textContent = lbl;
          label.style.opacity = "1";
        } else {
          label.style.opacity = "0";
        }
      } else {
        ring.style.transform = "translate(-50%, -50%) scale(1)";
        ring.style.borderColor = "var(--color-foreground, #f0e1cc)";
        label.style.opacity = "0";
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("pointerover", onPointerOver);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerover", onPointerOver);
      document.documentElement.style.cursor = "";
    };
  }, [mx, my, reduce]);

  if (reduce) return null;

  return (
    <motion.div
      style={{ x, y }}
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden lg:block"
      aria-hidden
    >
      {/* Inner dot. */}
      <div
        className="absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground"
      />
      {/* Outer ring. */}
      <div
        ref={ringRef}
        className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border border-foreground/70 transition-transform duration-300 ease-out"
      />
      {/* Label that appears on hover targets with data-cursor-label. */}
      <span
        ref={labelRef}
        className="absolute left-6 top-6 whitespace-nowrap rounded-full bg-foreground px-3 py-1 font-mono text-[10px] uppercase tracking-[0.32em] text-background opacity-0 transition-opacity duration-200"
      />
    </motion.div>
  );
}
