"use client";

import { motion } from "framer-motion";

export function Marquee({
  items,
  durationSec = 38,
  className,
  separator = "·",
}: {
  items: string[];
  durationSec?: number;
  className?: string;
  separator?: string;
}) {
  const loop = [...items, ...items, ...items];
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="flex w-max items-center gap-12 whitespace-nowrap"
        animate={{ x: ["0%", "-33.333%"] }}
        transition={{ duration: durationSec, ease: "linear", repeat: Infinity }}
      >
        {loop.map((it, i) => (
          <span key={i} className="flex items-center gap-12">
            <span>{it}</span>
            <span aria-hidden className="opacity-40">
              {separator}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
