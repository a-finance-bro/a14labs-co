"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Window-light projection shader.
 *
 * The window — and everything between it and the wall — is BEHIND the
 * camera. We only see what the sunlight paints on the wall:
 *   - the coffee-crema flow as the wall surface
 *   - a straight-edged warm rectangle of projected window light with a
 *     slow "breathing" intensity
 *   - soft two-layer clouds drifting across the upper light
 *   - shadows cast inside the light, color-matched (warm dark brown, not
 *     black): the A14 mark with a BLINKING accent square (terminal
 *     cursor) and a desk-scene lineup —
 *     mug with steam, poted plant with pointed fanning leaves, solid
 *     MacBook silhouette, digital desk clock with buttons, pen cup
 *   - three string-light strands with detailed bulbs, swaying gently
 *   - per-object contact shadows grounding everything on the sill, and
 *     faint rim light on top curves
 *   - cursor parallax: desk items shift opposite the mouse slightly more
 *     than the brand block (depth illusion)
 *   - venetian blinds drawn DOWN as the visitor scrolls — with slight
 *     side + bottom clearance and a gentle sway when down
 *   - after the sticky hero releases, the light lifts away with the page
 *   - dust motes, film grain, soft vignette
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform float uScroll;       // 0..1 — blind close progress
  uniform float uLift;         // viewport-heights scrolled past the hero
  uniform vec2  uMouse;        // smoothed cursor, -1..1 (y up)
  uniform sampler2D uLogo;     // alpha = brand shadow mask
  uniform vec2 uLogoAspect;    // texture (w, h) px
  uniform vec4 uSqRect;        // accent square rect in texture UV (x0,y0,x1,y1)

  // -------- noise -----------------
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  // -------- 2D SDFs ---------------
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdCircle(vec2 p, float r) { return length(p) - r; }
  float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a; vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }
  // Tapered capsule — width shrinks to a point at b. Pointed leaf / pencil tip.
  float sdLeaf(vec2 p, vec2 a, vec2 b, float w) {
    vec2 pa = p - a; vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float r = w * (1.0 - h * 0.94);
    return length(pa - ba * h) - r;
  }
  // Curved leaf: two tapered segments base→mid→tip. The kink at the mid
  // point + taper reads as a naturally bowing leaf.
  float sdBentLeaf(vec2 p, vec2 a, vec2 m, vec2 b, float w) {
    vec2 pa = p - a; vec2 ba = m - a;
    float h1 = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float d1 = length(pa - ba * h1) - mix(w, w * 0.68, h1);
    vec2 pm = p - m; vec2 bm = b - m;
    float h2 = clamp(dot(pm, bm) / dot(bm, bm), 0.0, 1.0);
    float d2 = length(pm - bm * h2) - mix(w * 0.68, 0.0006, h2);
    return min(d1, d2);
  }

  // True catenary profile: 1 at the belly, 0 at the anchors. Flatter at
  // the bottom of the droop, steeper into the pins — unlike a parabola.
  float catShape(float u, float k) {
    float c0 = (exp(0.5 * k) + exp(-0.5 * k)) * 0.5;
    float x = (u - 0.5) * k;
    float cu = (exp(x) + exp(-x)) * 0.5;
    return (c0 - cu) / (c0 - 1.0);
  }

  // One strand of string lights — a catenary wire with weighted bulbs.
  // Breeze physics: the belly swings the most (anchors fixed), driven by
  // two overlapping sine waves (slow main sway + faster flutter). Bulbs
  // hang plumb from their attach point with a small pendulum lag.
  // Edges are soft: the strand hangs at the window, furthest from the
  // wall, so its shadow has the widest penumbra of the scene.
  float lightStrand(vec2 pv, vec2 A, vec2 B, float sag, float t, float ph, float pxA, int nB) {
    float m = 0.0;
    float span = B.x - A.x;

    float uRaw = (pv.x - A.x) / span;
    float shape0 = catShape(clamp(uRaw, 0.0, 1.0), 3.2);
    // Belly-weighted breeze: main sway + flutter.
    float breeze = sin(t * 0.35 + ph) * 0.014 + sin(t * 0.95 + ph * 1.7) * 0.0045;
    float u2 = (pv.x - breeze * shape0 - A.x) / span;
    if (u2 >= 0.0 && u2 <= 1.0) {
      float wireY = mix(A.y, B.y, u2) - sag * catShape(u2, 3.2);
      // Thin wire, hazy edge (light wraps around thin objects).
      m = max(m, (1.0 - smoothstep(0.0006, 0.0050, abs(pv.y - wireY))) * 0.92);
    }

    // Pendulum-lagged sway for the bulbs (they trail the wire slightly).
    float lagged = sin(t * 0.35 + ph - 0.55) * 0.016 + sin(t * 0.95 + ph * 1.7 - 0.8) * 0.005;

    for (int k = 1; k <= 6; k++) {
      if (k > nB) break;
      float ub = float(k) / (float(nB) + 1.0);
      float bShape = catShape(ub, 3.2);
      // Attach point rides the swaying wire; the bulb trails it.
      float bx = mix(A.x, B.x, ub) + breeze * bShape * 0.7 + lagged * bShape * 0.45;
      float by = mix(A.y, B.y, ub) - sag * bShape;
      // Bulbs hang plumb — cap + globe drop straight down from the wire.
      vec2 d = vec2((pv.x - bx) * pxA, pv.y - by);
      float cap = sdRoundedBox(d - vec2(0.0, -0.0050), vec2(0.0024, 0.0038), 0.0012);
      float bulb = sdCircle(d - vec2(0.0, -0.0150), 0.0078);
      m = max(m, 1.0 - smoothstep(0.0, 0.0062, min(cap, bulb)));
    }
    return m;
  }

  // Sample brand texture with soft blur — returns shadow density 0..1.
  float sampleLogo(vec2 uv, float blurPx) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    vec2 px = blurPx / uLogoAspect;
    float s = 0.0;
    s += texture2D(uLogo, uv).a * 0.20;
    s += texture2D(uLogo, uv + vec2( px.x, 0.0)).a * 0.11;
    s += texture2D(uLogo, uv + vec2(-px.x, 0.0)).a * 0.11;
    s += texture2D(uLogo, uv + vec2(0.0,  px.y)).a * 0.11;
    s += texture2D(uLogo, uv + vec2(0.0, -px.y)).a * 0.11;
    s += texture2D(uLogo, uv + vec2( px.x,  px.y) * 0.7).a * 0.08;
    s += texture2D(uLogo, uv + vec2(-px.x,  px.y) * 0.7).a * 0.08;
    s += texture2D(uLogo, uv + vec2( px.x, -px.y) * 0.7).a * 0.08;
    s += texture2D(uLogo, uv + vec2(-px.x, -px.y) * 0.7).a * 0.08;
    s += texture2D(uLogo, uv + vec2( 2.0 * px.x, 0.0)).a * 0.01;
    s += texture2D(uLogo, uv + vec2(-2.0 * px.x, 0.0)).a * 0.01;
    s += texture2D(uLogo, uv + vec2(0.0,  2.0 * px.y)).a * 0.01;
    s += texture2D(uLogo, uv + vec2(0.0, -2.0 * px.y)).a * 0.01;
    return clamp(s, 0.0, 1.0);
  }

  // Soft elliptical contact shadow under an object base.
  float groundContact(vec2 op, float w) {
    vec2 g = vec2(op.x, (op.y - 0.006) * 4.5);
    return 1.0 - smoothstep(w * 0.35, w, length(g));
  }

  // -------- main ------------------
  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;

    // ===== BASE: coffee-crema flow =====
    vec2 cuv = uv;
    cuv.x *= aspect;
    float t = uTime * 0.045;
    vec2 q = vec2(
      fbm(cuv * 1.6 + vec2(0.0, t)),
      fbm(cuv * 1.6 + vec2(5.2, 1.3 - t))
    );
    vec2 r = vec2(
      fbm(cuv * 2.0 + q * 1.5 + vec2(t * 0.6, 0.0)),
      fbm(cuv * 2.0 + q * 1.5 + vec2(8.3, 2.8 + t * 0.4))
    );
    float v = fbm(cuv * 2.4 + r * 2.0 - vec2(0.0, t * 0.7));

    vec3 espresso = vec3(0.082, 0.055, 0.031);
    vec3 mocha    = vec3(0.165, 0.102, 0.063);
    vec3 roast    = vec3(0.420, 0.306, 0.212);
    vec3 caramel  = vec3(0.769, 0.573, 0.302);

    vec3 base = mix(espresso, mocha, smoothstep(0.0, 0.55, v));
    base = mix(base, roast,   smoothstep(0.5, 0.85, v) * 0.45);
    base = mix(base, caramel, smoothstep(0.78, 1.0, v) * 0.22);

    // ===== PROJECTED WINDOW LIGHT =====
    vec2 p = uv;
    vec2 patchC = vec2(0.5, 0.52 + uLift);
    vec2 patchH = vec2(0.36, 0.40);
    vec2 d2 = abs(p - patchC) - patchH;
    float dPatch = max(d2.x, d2.y);

    float pen = mix(0.014, 0.040, smoothstep(0.2, 0.9, p.y));
    float patchMask = 1.0 - smoothstep(-pen, pen, dPatch);

    vec2 puv = (p - (patchC - patchH)) / (patchH * 2.0);
    vec2 patchPx = patchH * 2.0 * uRes;
    float pxAspect = patchPx.x / patchPx.y;

    // Cursor parallax — desk items shift opposite the cursor; the brand
    // block shifts less (it hangs closer to the wall).
    // Side-to-side only — vertical parallax would un-ground the items.
    vec2 puvObj   = puv + vec2(uMouse.x * 0.012, 0.0);
    vec2 puvBrand = puv + vec2(uMouse.x * 0.005, 0.0);

    // ----- clouds, two drifting layers -----
    float cloudBand = smoothstep(0.35, 0.88, puv.y);
    float cloud1 = fbm(vec2(puv.x * 1.8 + uTime * 0.020, puv.y * 1.5 + 3.7));
    float cloud2 = fbm(vec2(puv.x * 3.1 - uTime * 0.011, puv.y * 2.3 + 9.2));
    float cloud = smoothstep(0.30, 0.80, cloud1 * 0.65 + cloud2 * 0.45);

    // ----- venetian blinds: real unstacking mechanics -----
    // Raised blinds are a tight stack of slats riding the bottom rail.
    // Scrolling lowers the rail; each slat stays in the stack until the
    // cord pays out to its deployed slot (y = max(slot, stackPos)).
    // Phase 2 (last ~22% of scroll) tilts the slats closed: their cast
    // shadow widens until only thin slits of light remain.
    float occ = 0.0;  // union of every shadow caster — one sun, one shadow
    float blindFrac = smoothstep(0.02, 0.78, uScroll);   // lowering
    float tiltClose = smoothstep(0.78, 1.0, uScroll);    // closing
    float swayX = sin(uTime * 0.40) * 0.004 + sin(uTime * 0.23 + 1.7) * 0.0025;
    float swayY = sin(uTime * 0.33 + 0.6) * 0.003;
    // Side clearance — the blind hangs slightly narrower than the light.
    float sideM = 0.018;
    float sideMask = smoothstep(sideM - 0.005 + swayX, sideM + 0.005 + swayX, puv.x)
                   * (1.0 - smoothstep(1.0 - sideM - 0.005 + swayX, 1.0 - sideM + 0.005 + swayX, puv.x));

    const int NS = 16;
    float slatH = 0.0085;          // physical slat shadow thickness
    float railH = 0.013;
    float railY = mix(1.07, 0.035 + swayY, blindFrac);
    float spacingFull = (1.0 - 0.035) / float(NS);
    // Closing widens the projected slat shadow toward the full spacing,
    // leaving a thin slit (penumbra-soft) between neighbours.
    float apparentH = mix(slatH, spacingFull * 0.86, tiltClose);

    float slatCover = 0.0;
    for (int i = 0; i < NS; i++) {
      float fi = float(i);
      float slot = 1.0 - (fi + 0.5) * spacingFull;                       // deployed
      float stacked = railY + railH * 0.5 + (float(NS) - fi - 0.5) * slatH; // in stack
      float yi = max(slot, stacked);
      if (yi > 1.05) continue;   // still hidden above the window
      // Minute per-slat imperfection — a fraction of a degree of tilt.
      float imperfect = (hash(vec2(fi * 3.7, 7.3)) - 0.5) * 0.006;
      float yy = puv.y - (yi + imperfect * (puv.x - 0.5));
      // ~2px penumbra on each slat edge.
      float band = 1.0 - smoothstep(apparentH * 0.5 - 0.0015, apparentH * 0.5 + 0.0042, abs(yy));
      slatCover = max(slatCover, band * 0.94);
    }
    // Bottom rail — slightly thicker, denser.
    {
      float band = 1.0 - smoothstep(railH * 0.5 - 0.002, railH * 0.5 + 0.0045, abs(puv.y - railY));
      slatCover = max(slatCover, band * 0.97);
    }
    // Lift strings — three thin vertical lines from the top down to the
    // rail, paying out with the blind.
    if (blindFrac > 0.02) {
      for (int s2 = 0; s2 < 3; s2++) {
        float sx = 0.18 + 0.32 * float(s2);
        float within = step(railY, puv.y);
        float line = (1.0 - smoothstep(0.0008, 0.0028, abs(puv.x - sx - swayX * 0.6))) * within;
        slatCover = max(slatCover, line * 0.28);
      }
    }
    occ = max(occ, slatCover * sideMask);

    // ----- ghost mullions: the frame's own diffuse shadow -----
    // Extremely faint + broad, hinting the window cross without drawing it.
    float mullV = 1.0 - smoothstep(0.0, 0.060, abs(puv.x - 0.5));
    float mullH = 1.0 - smoothstep(0.0, 0.050, abs(puv.y - 0.62));
    float mull = max(mullV, mullH) * 0.11;

    // ----- shadow silhouettes + rim accumulation -----
    // Every caster below merges into occ via max() — overlapping
    // shadows can never double-darken under a single light source.
    float rimGlow = 0.0;

    // Brand shadow — "A14" centered (texture) + blinking accent square.
    {
      float texAspect = uLogoAspect.x / uLogoAspect.y;
      float boxW = 0.95;
      float boxH = boxW * pxAspect / texAspect;
      if (boxH > 0.84) { boxW *= 0.84 / boxH; boxH = 0.84; }
      vec2 luvC = vec2(0.5, 0.52);
      vec2 luv = (puvBrand - luvC) / vec2(boxW, boxH) + 0.5;
      float depthBlur = mix(5.0, 1.6, smoothstep(0.25, 0.75, luv.y));
      float s = sampleLogo(luv, depthBlur);

      // Accent square — drawn here (not in the texture) so it can blink
      // like a terminal cursor. Steady ~1 Hz cadence.
      float blink = step(fract(uTime * 0.85), 0.58);
      float e = 0.004;
      float inSq = smoothstep(uSqRect.x - e, uSqRect.x + e, luv.x)
                 * (1.0 - smoothstep(uSqRect.z - e, uSqRect.z + e, luv.x))
                 * smoothstep(uSqRect.y - e, uSqRect.y + e, luv.y)
                 * (1.0 - smoothstep(uSqRect.w - e, uSqRect.w + e, luv.y));
      s = max(s, inSq * blink * 0.96);

      occ = max(occ, s * 0.90);
    }

    // ----- string lights: three deliberate strands, gently swaying -----
    {
      float lights = 0.0;
      // Anchors sit WELL past the window borders so the wire's cut ends
      // stay hidden even at full sway — no floating tips.
      // Strand 1 (5 bulbs) — left border ~34% down → pin on the top border.
      lights = max(lights, lightStrand(
        puvObj, vec2(-0.07, 0.63), vec2(0.47, 1.04),
        0.105, uTime, 0.0, pxAspect, 5));
      // Strand 2 (4 bulbs) — swag along the top border, x 0.33 → 0.63.
      lights = max(lights, lightStrand(
        puvObj, vec2(0.33, 1.03), vec2(0.63, 1.03),
        0.10, uTime, 2.1, pxAspect, 4));
      // Strand 3 (3 bulbs) — drapes the top-right corner.
      lights = max(lights, lightStrand(
        puvObj, vec2(0.68, 1.04), vec2(1.07, 0.73),
        0.07, uTime, 4.3, pxAspect, 3));

      // Furthest from the wall → most diffuse, least dense.
      occ = max(occ, lights * 0.74);
    }

    // ===== DESK SCENE — irregular spacing, grounded, aspect-true =====

    // Coffee mug + steam (left).
    {
      vec2 mp = (puvObj - vec2(0.215, 0.038)) * vec2(pxAspect, 1.0);
      float body = sdRoundedBox(mp, vec2(0.030, 0.040), 0.012);
      float hOuter = sdCircle(mp - vec2(0.042, 0.004), 0.021);
      float hInner = sdCircle(mp - vec2(0.042, 0.004), 0.012);
      float handle = max(hOuter, -hInner);
      float sil = min(body, handle);
      float silMask = 1.0 - smoothstep(0.0, 0.005, sil);
      occ = max(occ, silMask * 0.88);
      occ = max(occ, groundContact(mp + vec2(0.0, 0.038), 0.055) * 0.30);
      rimGlow += (1.0 - smoothstep(0.001, 0.008, abs(sil - 0.004)))
               * smoothstep(0.01, 0.045, mp.y) * 0.55;

      vec2 sp = (puvObj - vec2(0.215, 0.085)) * vec2(pxAspect, 1.0);
      if (sp.y > -0.02 && sp.y < 0.40) {
        float swayS = sin(sp.y * 10.0 + uTime * 1.1) * 0.022
                    + sin(sp.y * 23.0 - uTime * 0.6) * 0.009;
        float ribbon = abs(sp.x - swayS);
        float widthFade = 1.0 - smoothstep(0.0, 0.026 + sp.y * 0.06, ribbon);
        float heightFade = (1.0 - smoothstep(0.07, 0.36, sp.y));
        float plume = fbm(vec2(sp.x * 8.0, sp.y * 3.0 - uTime * 0.26));
        float steamMask = widthFade * heightFade * smoothstep(0.32, 0.72, plume);
        occ = max(occ, steamMask * 0.46);
      }
    }

    // Potted plant — curved leaves bowing outward, far right.
    {
      vec2 pp = (puvObj - vec2(0.90, 0.0)) * vec2(pxAspect, 1.0);
      float pot = sdRoundedBox(pp - vec2(0.0, 0.032), vec2(0.027, 0.032), 0.008);
      vec2 rim = vec2(0.0, 0.062);
      float swayL = sin(uTime * 0.5) * 0.004;
      // Each leaf: base → bowed mid → drooping tip (sdBentLeaf).
      float l1 = sdBentLeaf(pp, rim, vec2(-0.040, 0.105), vec2(-0.078 + swayL, 0.118), 0.0105);
      float l2 = sdBentLeaf(pp, rim, vec2(-0.020, 0.125), vec2(-0.048 + swayL, 0.162), 0.0105);
      float l3 = sdBentLeaf(pp, rim, vec2( 0.003, 0.135), vec2(-0.006 + swayL, 0.180), 0.0115);
      float l4 = sdBentLeaf(pp, rim, vec2( 0.024, 0.122), vec2( 0.054 + swayL, 0.155), 0.0105);
      float l5 = sdBentLeaf(pp, rim, vec2( 0.042, 0.100), vec2( 0.080 + swayL, 0.112), 0.0100);
      float leaves = min(min(min(l1, l2), l3), min(l4, l5));
      float sil = min(pot, leaves);
      float silMask = 1.0 - smoothstep(0.0, 0.005, sil);
      occ = max(occ, silMask * 0.86);
      occ = max(occ, groundContact(pp, 0.050) * 0.30);
      rimGlow += (1.0 - smoothstep(0.001, 0.008, abs(sil - 0.004)))
               * smoothstep(0.07, 0.14, pp.y) * 0.45;
    }

    // MacBook — solid silhouette (light can't pass through the lid),
    // nearly upright, off-center left.
    {
      vec2 lp = (puvObj - vec2(0.46, 0.0)) * vec2(pxAspect, 1.0);
      // Keyboard deck — a slim sliver, no separate contact shadow.
      float lapBase = sdRoundedBox(lp - vec2(0.0, 0.0045), vec2(0.128, 0.0045), 0.003);
      vec2 sp2 = lp - vec2(0.0, 0.080);
      sp2.x += sp2.y * 0.03;   // barely leaning
      float lid = sdRoundedBox(sp2, vec2(0.112, 0.071), 0.010);
      float sil = min(lapBase, lid);
      float silMask = 1.0 - smoothstep(0.0, 0.005, sil);
      occ = max(occ, silMask * 0.88);
      rimGlow += (1.0 - smoothstep(0.001, 0.008, abs(sil - 0.004)))
               * smoothstep(0.07, 0.14, lp.y) * 0.50;
    }

    // Digital desk clock — slab with two buttons on top.
    {
      vec2 kp = (puvObj - vec2(0.60, 0.0)) * vec2(pxAspect, 1.0);
      float bodyC = sdRoundedBox(kp - vec2(0.0, 0.023), vec2(0.040, 0.023), 0.007);
      float btn1 = sdRoundedBox(kp - vec2(-0.017, 0.049), vec2(0.007, 0.003), 0.002);
      float btn2 = sdRoundedBox(kp - vec2( 0.009, 0.049), vec2(0.009, 0.003), 0.002);
      float sil = min(bodyC, min(btn1, btn2));
      float silMask = 1.0 - smoothstep(0.0, 0.005, sil);
      occ = max(occ, silMask * 0.86);
      occ = max(occ, groundContact(kp, 0.050) * 0.28);
    }

    // Pen cup — shorter pens, one pencil with a pointed tip.
    {
      vec2 cp = (puvObj - vec2(0.745, 0.040)) * vec2(pxAspect, 1.0);
      float cup = sdRoundedBox(cp, vec2(0.024, 0.042), 0.008);
      float pencilBody = sdCapsule(cp, vec2(-0.009, 0.036), vec2(-0.014, 0.094), 0.0050);
      float pencilTip  = sdLeaf(cp, vec2(-0.014, 0.094), vec2(-0.015, 0.110), 0.0046);
      float pen2 = sdCapsule(cp, vec2( 0.002, 0.036), vec2( 0.008, 0.105), 0.0052);
      float pen3 = sdCapsule(cp, vec2( 0.012, 0.036), vec2( 0.019, 0.084), 0.0048);
      float sil = min(cup, min(min(pencilBody, pencilTip), min(pen2, pen3)));
      float silMask = 1.0 - smoothstep(0.0, 0.005, sil);
      occ = max(occ, silMask * 0.88);
      occ = max(occ, groundContact(cp + vec2(0.0, 0.040), 0.045) * 0.28);
    }

    // Resolve the union: a single sun casts a single shadow layer.
    float shadows = 1.0 - occ;

    // ----- light color + composition -----
    vec3 sunCol = vec3(1.00, 0.80, 0.50);
    float shimmer = 0.92 + fbm(p * 3.0 + uTime * 0.05) * 0.16;
    float hot = 1.0 - length((puv - vec2(0.35, 0.80)) * vec2(1.0, 0.8));
    float heat = 0.55 + max(hot, 0.0) * 0.75;
    // Slow breathing of the light source.
    heat *= 0.96 + 0.045 * sin(uTime * 0.30);

    float lightRaw = patchMask * shimmer * heat;
    lightRaw *= 1.0 - cloud * 0.42 * cloudBand;
    lightRaw *= 1.0 - mull;
    lightRaw *= mix(1.0, 0.78, tiltClose);

    float lightAmt = lightRaw * shadows;

    vec3 col = base * 0.82 + sunCol * lightAmt * 0.88;
    // Color-matched shadows — silhouettes block direct sun but the wall
    // still catches ambient bounce. Core tone lands near #2a1e12.
    col += vec3(0.20, 0.145, 0.088) * lightRaw * (1.0 - shadows) * 0.42;
    // Rim light on top curves of the desk objects.
    col += sunCol * rimGlow * lightRaw * 0.15;

    // Bounce-glow beyond the patch edge.
    float glow = exp(-max(dPatch, 0.0) * 9.0) * (1.0 - patchMask);
    col += sunCol * glow * 0.15 * mix(1.0, 0.25, max(blindFrac * 0.6, tiltClose));

    // ===== DUST MOTES in the light =====
    {
      vec2 muv = uv * vec2(70.0, 40.0)
               + vec2(mod(uTime * 0.55, 1024.0), -mod(uTime * 0.21, 1024.0));
      float cell = hash(floor(muv));
      vec2 fpos = fract(muv) - 0.5;
      float mote = smoothstep(0.10, 0.02, length(fpos)) * step(0.975, cell);
      // Dust fades as the blinds shut the light down.
      col += sunCol * mote * 0.07 * lightAmt * (1.0 - tiltClose * 0.7);
    }

    // ===== FILM GRAIN + SOFT VIGNETTE =====
    // Keep hash inputs small — unbounded uTime * 137 exceeds float32
    // precision after a few minutes and the noise degenerates into fast
    // vertical bands.
    vec2 gp = mod(uv * uRes.xy + mod(uTime, 4.0) * 137.0, 512.0);
    float grain = (hash(gp) - 0.5) * 0.034;
    col += grain;
    // Vignette shaped toward the rectangular beam rather than a pure
    // radial falloff — the room edge follows the window's geometry.
    vec2 bv = abs(uv - 0.5) * vec2(1.04, 1.16);
    float vig = mix(length(bv), max(bv.x, bv.y), 0.6);
    col *= 1.0 - smoothstep(0.44, 0.85, vig) * 0.32;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Brand shadow texture: a big centered "A14" plus the Wend + Fintellect
 * marks flanking beneath. The accent square is NOT drawn here — the shader
 * renders it so it can blink like a terminal cursor; we return its rect
 * (texture-UV space) for the shader.
 */
function makeLogoTexture(width = 2048, height = 1200): {
  texture: THREE.CanvasTexture;
  aspect: [number, number];
  sqRect: [number, number, number, number];
} {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";

  const sans = `ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif`;

  // --- "A14" big, centered ---
  const fontSize = Math.floor(height * 0.46);
  ctx.font = `900 ${fontSize}px ${sans}`;
  const tw = ctx.measureText("A14").width;
  const sq = fontSize * 0.18;
  const gap = fontSize * 0.12;
  const groupW = sq + gap + tw;
  const x0 = (width - groupW) / 2;
  const baseline = height * 0.5 + fontSize * 0.36;
  ctx.fillText("A14", x0 + sq + gap, baseline);

  // Square rect (baseline-aligned, like the nav lockup) in texture UV.
  // flipY texture → v = 1 - y/height.
  const sx0 = x0;
  const sx1 = x0 + sq;
  const sy0 = baseline - sq;
  const sy1 = baseline;
  const sqRect: [number, number, number, number] = [
    sx0 / width,
    1 - sy1 / height,
    sx1 / width,
    1 - sy0 / height,
  ];

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;

  return { texture: tex, aspect: [width, height], sqRect };
}

function ShaderQuad() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();
  const scrollRef = useRef(0);
  const liftRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const logoData = useMemo(() => makeLogoTexture(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(size.width, size.height) },
      uScroll: { value: 0 },
      uLift: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uLogo: { value: logoData.texture },
      uLogoAspect: { value: new THREE.Vector2(logoData.aspect[0], logoData.aspect[1]) },
      uSqRect: { value: new THREE.Vector4(...logoData.sqRect) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const update = () => {
      const vh = window.innerHeight;
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / vh));
      liftRef.current = Math.max(0, window.scrollY - vh) / vh;
    };
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  useFrame((state) => {
    if (!matRef.current) return;
    const u = matRef.current.uniforms;
    u.uTime.value = state.clock.getElapsedTime();
    u.uRes.value.set(size.width, size.height);
    u.uScroll.value += (scrollRef.current - u.uScroll.value) * 0.08;
    u.uLift.value += (liftRef.current - u.uLift.value) * 0.12;
    u.uMouse.value.x += (mouseRef.current.x - u.uMouse.value.x) * 0.06;
    u.uMouse.value.y += (mouseRef.current.y - u.uMouse.value.y) * 0.06;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function WindowLightShader({ className }: { className?: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setOk(supportsWebGL());
  }, []);

  if (!ok) {
    return (
      <div
        className={className}
        aria-hidden
        style={{
          background:
            "radial-gradient(90% 70% at 50% 38%, #2a1a10 0%, #150e08 70%)",
        }}
      />
    );
  }

  return (
    <div className={className} aria-hidden>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2, zoom: 1 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      >
        <ShaderQuad />
      </Canvas>
    </div>
  );
}
