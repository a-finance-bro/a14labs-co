"use client";

import { HTMLMotionProps, motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useRef } from "react";

type Props = Omit<HTMLMotionProps<"a">, "ref"> & {
  href?: string;
  strength?: number; // px deflection at the edge of the hotzone
  hotzonePx?: number; // distance at which the link starts deflecting
};

export function MagneticLink({
  children,
  className,
  strength = 14,
  hotzonePx = 80,
  ...rest
}: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 400, damping: 22, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 400, damping: 22, mass: 0.4 });

  const onMove = (e: { clientX: number; clientY: number }) => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const k = Math.max(0, 1 - dist / hotzonePx);
    x.set((dx / hotzonePx) * strength * k);
    y.set((dy / hotzonePx) * strength * k);
  };

  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      ref={ref}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`inline-block ${className ?? ""}`}
      {...rest}
    >
      {children}
    </motion.a>
  );
}
