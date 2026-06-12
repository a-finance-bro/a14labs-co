"use client";

import { useEffect, useRef } from "react";

/**
 * Interactive coffee-bean field — fixed background canvas with N beans that
 * drift ambiently and bounce away from the cursor with spring-back.
 *
 * Each bean is two filled half-ellipses with a center groove (the bean
 * "slit"). Rotation + slow drift keep the field feeling alive even when
 * idle. Hover: cursor radius pushes the bean's velocity outward; over time
 * spring-back returns it to its anchor.
 */
export function BeanField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let mouseX = -10000;
    let mouseY = -10000;
    const DPR = Math.min(2, window.devicePixelRatio || 1);

    type Bean = {
      ax: number; // anchor x
      ay: number; // anchor y
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;  // length (radius)
      rot: number; // base rotation (radians)
      rotV: number; // ambient rotation velocity
      seed: number;
    };

    let beans: Bean[] = [];

    const layout = () => {
      const w = window.innerWidth;
      const h = Math.max(window.innerHeight, document.body.scrollHeight);
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

      // Density: scale bean count with viewport area. Aim for ~110-160 across
      // a typical 1440x900 desktop, fewer on phones.
      const area = w * h;
      const targetCount = Math.max(28, Math.min(180, Math.round(area / 14000)));
      beans = new Array(targetCount).fill(0).map((_, i) => {
        const ax = Math.random() * w;
        const ay = Math.random() * h;
        return {
          ax,
          ay,
          x: ax,
          y: ay,
          vx: 0,
          vy: 0,
          r: 6 + Math.random() * 12,
          rot: Math.random() * Math.PI * 2,
          rotV: (Math.random() - 0.5) * 0.004,
          seed: i,
        };
      });
    };

    const drawBean = (b: Bean, alpha: number) => {
      const cos = Math.cos(b.rot);
      const sin = Math.sin(b.rot);
      const lx = b.r;        // half-length
      const ly = b.r * 0.62; // half-width

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rot);

      // Body — filled ellipse.
      ctx.beginPath();
      ctx.ellipse(0, 0, lx, ly, 0, 0, Math.PI * 2);
      const grad = ctx.createLinearGradient(-lx, -ly, lx, ly);
      grad.addColorStop(0, `rgba(196, 146, 77, ${alpha * 0.32})`);
      grad.addColorStop(0.5, `rgba(107, 78, 54, ${alpha * 0.65})`);
      grad.addColorStop(1, `rgba(42, 26, 16, ${alpha})`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Slit — subtle interior groove down the long axis.
      ctx.beginPath();
      ctx.moveTo(-lx * 0.65, 0);
      ctx.bezierCurveTo(-lx * 0.2, -ly * 0.18, lx * 0.2, ly * 0.18, lx * 0.65, 0);
      ctx.strokeStyle = `rgba(21, 14, 8, ${alpha * 0.85})`;
      ctx.lineWidth = Math.max(0.8, b.r * 0.13);
      ctx.lineCap = "round";
      ctx.stroke();

      ctx.restore();
      // Suppress unused-vars warning
      void cos; void sin;
    };

    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      const w = canvas.width / DPR;
      const h = canvas.height / DPR;
      ctx.clearRect(0, 0, w, h);

      const repulseR = 140;
      const repulseR2 = repulseR * repulseR;

      for (let i = 0; i < beans.length; i++) {
        const b = beans[i];

        // Repulse from cursor.
        const dx = b.x - mouseX;
        const dy = b.y - mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < repulseR2 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / repulseR) * 0.7;
          b.vx += (dx / d) * f * 8;
          b.vy += (dy / d) * f * 8;
          b.rotV += (dx / d) * 0.0015 * f;
        }

        // Spring-back to anchor.
        const ax = (b.ax - b.x) * 0.012;
        const ay = (b.ay - b.y) * 0.012;
        b.vx = (b.vx + ax) * 0.92;
        b.vy = (b.vy + ay) * 0.92;
        b.rotV *= 0.985;

        b.x += b.vx * (dt / 16);
        b.y += b.vy * (dt / 16);
        b.rot += b.rotV * (dt / 16);

        // Ambient drift — gentle perlin-ish sway.
        b.x += Math.sin(now * 0.0002 + b.seed * 0.7) * 0.06;
        b.y += Math.cos(now * 0.00017 + b.seed * 1.3) * 0.05;

        drawBean(b, 0.42);
      }

      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX + window.scrollX;
      mouseY = e.clientY + window.scrollY;
    };
    const onLeave = () => {
      mouseX = -10000;
      mouseY = -10000;
    };
    const onScroll = () => {
      // Keep mouse anchor stable as the page scrolls — we tracked it in
      // document space, but window listener uses client coords so we need
      // to recompute next time the user moves the mouse.
      // (No-op intentionally; spring-back handles drift.)
    };

    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    if (!reduce) raf = requestAnimationFrame(tick);
    else {
      // One static frame so the field is at least visible.
      for (const b of beans) drawBean(b, 0.42);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", layout);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 opacity-90 mix-blend-screen"
    />
  );
}
