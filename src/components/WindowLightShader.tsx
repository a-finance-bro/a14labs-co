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

  // One strand of string lights: a catenary-ish wire from A to B with
  // n detailed bulbs (socket cap + glass globe) hanging beneath it.
  float lightStrand(vec2 pv, vec2 A, vec2 B, float sag, float sway, float pxA, int nB) {
    float m = 0.0;
    float u = (pv.x - A.x) / (B.x - A.x);
    float dip = 4.0 * u * (1.0 - u);
    float wireY = mix(A.y, B.y, clamp(u, 0.0, 1.0))
                - sag * (dip + sway * sin(3.14159 * u));
    if (u >= 0.0 && u <= 1.0) {
      m = max(m, 1.0 - smoothstep(0.0014, 0.0034, abs(pv.y - wireY)));
    }
    for (int k = 1; k <= 6; k++) {
      if (k > nB) break;
      float ub = float(k) / (float(nB) + 1.0);
      float bx = mix(A.x, B.x, ub);
      float bdip = 4.0 * ub * (1.0 - ub);
      float by = mix(A.y, B.y, ub) - sag * (bdip + sway * sin(3.14159 * ub));
      vec2 d = vec2((pv.x - bx) * pxA, pv.y - by);
      // socket cap, slim, hugging the wire
      float cap = sdRoundedBox(d - vec2(0.0, -0.0055), vec2(0.0028, 0.0042), 0.0012);
      // glass globe below the cap
      float bulb = sdCircle(d - vec2(0.0, -0.0162), 0.0082);
      m = max(m, 1.0 - smoothstep(0.0, 0.003, min(cap, bulb)));
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
    vec2 puvObj   = puv + uMouse * vec2(0.012, 0.007);
    vec2 puvBrand = puv + uMouse * vec2(0.005, 0.003);

    // ----- clouds, two drifting layers -----
    float cloudBand = smoothstep(0.35, 0.88, puv.y);
    float cloud1 = fbm(vec2(puv.x * 1.8 + uTime * 0.020, puv.y * 1.5 + 3.7));
    float cloud2 = fbm(vec2(puv.x * 3.1 - uTime * 0.011, puv.y * 2.3 + 9.2));
    float cloud = smoothstep(0.30, 0.80, cloud1 * 0.65 + cloud2 * 0.45);

    // ----- venetian blinds: drawn DOWN from the top on scroll -----
    float blindFrac = smoothstep(0.02, 0.95, uScroll);
    // Gentle sway when hanging — lateral drift + slight bob of the rail.
    float swayX = sin(uTime * 0.40) * 0.004 + sin(uTime * 0.23 + 1.7) * 0.0025;
    float swayY = sin(uTime * 0.33 + 0.6) * 0.003;
    // Blinds stop a touch above the patch floor (clearance at the bottom).
    float coverEdge = mix(1.02, 0.035 + swayY, blindFrac);
    // Side clearance — the blind is slightly narrower than the window light.
    float sideM = 0.018;
    float sideMask = smoothstep(sideM - 0.005 + swayX, sideM + 0.005 + swayX, puv.x)
                   * (1.0 - smoothstep(1.0 - sideM - 0.005 + swayX, 1.0 - sideM + 0.005 + swayX, puv.x));
    float inBlind = smoothstep(coverEdge - 0.008, coverEdge + 0.008, puv.y) * sideMask;

    float nSlats = 18.0;
    float slatPos = fract(puv.y * nSlats);
    float slitHalf = 0.10;
    float distC = abs(slatPos - 0.5);
    float slit = 1.0 - smoothstep(slitHalf - 0.04, slitHalf + 0.04, distC);
    float blindLight = max(slit, 0.045);
    float blind = mix(1.0, blindLight, inBlind);

    if (blindFrac > 0.01 && blindFrac < 0.995) {
      float rail = (1.0 - smoothstep(0.004, 0.012, abs(puv.y - coverEdge))) * sideMask;
      blind = mix(blind, 0.03, rail);
    }

    // ----- shadow silhouettes + rim accumulation -----
    float shadows = 1.0;
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

      shadows *= 1.0 - s * 0.90;
    }

    // ----- string lights: three deliberate strands, gently swaying -----
    {
      float lights = 0.0;
      // Strand 1 — from the left edge ~30% down, pinned at x = 0.40.
      lights = max(lights, lightStrand(
        puvObj, vec2(-0.02, 0.70), vec2(0.40, 0.78),
        0.075, sin(uTime * 0.38) * 0.05, pxAspect, 5));
      // Strand 2 — higher, overlapping strand 1, hanging to a left pin.
      lights = max(lights, lightStrand(
        puvObj, vec2(-0.02, 0.92), vec2(0.18, 0.74),
        0.05, sin(uTime * 0.45 + 1.6) * 0.05, pxAspect, 3));
      // Strand 3 — along the top, x 0.25 → 0.55.
      lights = max(lights, lightStrand(
        puvObj, vec2(0.25, 1.015), vec2(0.55, 1.015),
        0.105, sin(uTime * 0.32 + 3.1) * 0.04, pxAspect, 4));

      shadows *= 1.0 - lights * 0.85;
    }

    // ===== DESK SCENE — irregular spacing, grounded, aspect-true =====

    // Coffee mug + steam (left).
    {
      vec2 mp = (puvObj - vec2(0.215, 0.072)) * vec2(pxAspect, 1.0);
      float body = sdRoundedBox(mp, vec2(0.055, 0.078), 0.022);
      float hOuter = sdCircle(mp - vec2(0.078, 0.008), 0.038);
      float hInner = sdCircle(mp - vec2(0.078, 0.008), 0.022);
      float handle = max(hOuter, -hInner);
      float sil = min(body, handle);
      float silMask = 1.0 - smoothstep(0.0, 0.012, sil);
      shadows *= 1.0 - silMask * 0.88;
      shadows *= 1.0 - groundContact(mp + vec2(0.0, 0.072), 0.085) * 0.30;
      rimGlow += (1.0 - smoothstep(0.001, 0.009, abs(sil - 0.004)))
               * smoothstep(0.02, 0.07, mp.y) * 0.55;

      vec2 sp = (puvObj - vec2(0.215, 0.165)) * vec2(pxAspect, 1.0);
      if (sp.y > -0.02 && sp.y < 0.55) {
        float swayS = sin(sp.y * 9.0 + uTime * 1.1) * 0.030
                    + sin(sp.y * 21.0 - uTime * 0.6) * 0.012;
        float ribbon = abs(sp.x - swayS);
        float widthFade = 1.0 - smoothstep(0.0, 0.038 + sp.y * 0.08, ribbon);
        float heightFade = (1.0 - smoothstep(0.10, 0.52, sp.y));
        float plume = fbm(vec2(sp.x * 7.0, sp.y * 2.8 - uTime * 0.26));
        float steamMask = widthFade * heightFade * smoothstep(0.32, 0.72, plume);
        shadows *= 1.0 - steamMask * 0.46;
      }
    }

    // Potted plant — pointed leaves fanning out, far right.
    {
      vec2 pp = (puvObj - vec2(0.90, 0.0)) * vec2(pxAspect, 1.0);
      float pot = sdRoundedBox(pp - vec2(0.0, 0.042), vec2(0.038, 0.042), 0.010);
      vec2 rim = vec2(0.0, 0.085);
      float swayL = sin(uTime * 0.5) * 0.005;
      float l1 = sdLeaf(pp, rim, vec2(-0.085 + swayL, 0.190), 0.015);
      float l2 = sdLeaf(pp, rim, vec2(-0.040 + swayL, 0.235), 0.015);
      float l3 = sdLeaf(pp, rim, vec2( 0.004 + swayL, 0.255), 0.016);
      float l4 = sdLeaf(pp, rim, vec2( 0.048 + swayL, 0.225), 0.015);
      float l5 = sdLeaf(pp, rim, vec2( 0.088 + swayL, 0.175), 0.014);
      float l6 = sdLeaf(pp, rim, vec2(-0.060 + swayL, 0.140), 0.012);
      float l7 = sdLeaf(pp, rim, vec2( 0.058 + swayL, 0.130), 0.012);
      float leaves = min(min(min(l1, l2), min(l3, l4)), min(min(l5, l6), l7));
      float sil = min(pot, leaves);
      float silMask = 1.0 - smoothstep(0.0, 0.011, sil);
      shadows *= 1.0 - silMask * 0.86;
      shadows *= 1.0 - groundContact(pp, 0.075) * 0.30;
      rimGlow += (1.0 - smoothstep(0.001, 0.009, abs(sil - 0.004)))
               * smoothstep(0.10, 0.20, pp.y) * 0.45;
    }

    // MacBook — solid silhouette (light can't pass through the lid),
    // nearly upright, off-center left.
    {
      vec2 lp = (puvObj - vec2(0.46, 0.0)) * vec2(pxAspect, 1.0);
      // Keyboard deck — a slim sliver, no separate contact shadow.
      float lapBase = sdRoundedBox(lp - vec2(0.0, 0.0045), vec2(0.128, 0.0045), 0.003);
      vec2 sp2 = lp - vec2(0.0, 0.072);
      sp2.x += sp2.y * 0.03;   // barely leaning
      float lid = sdRoundedBox(sp2, vec2(0.112, 0.063), 0.010);
      float sil = min(lapBase, lid);
      float silMask = 1.0 - smoothstep(0.0, 0.010, sil);
      shadows *= 1.0 - silMask * 0.88;
      rimGlow += (1.0 - smoothstep(0.001, 0.008, abs(sil - 0.004)))
               * smoothstep(0.07, 0.14, lp.y) * 0.50;
    }

    // Digital desk clock — slab with two buttons on top.
    {
      vec2 kp = (puvObj - vec2(0.60, 0.0)) * vec2(pxAspect, 1.0);
      float bodyC = sdRoundedBox(kp - vec2(0.0, 0.030), vec2(0.052, 0.030), 0.009);
      float btn1 = sdRoundedBox(kp - vec2(-0.022, 0.064), vec2(0.009, 0.004), 0.002);
      float btn2 = sdRoundedBox(kp - vec2( 0.012, 0.064), vec2(0.012, 0.004), 0.002);
      float sil = min(bodyC, min(btn1, btn2));
      float silMask = 1.0 - smoothstep(0.0, 0.009, sil);
      shadows *= 1.0 - silMask * 0.86;
      shadows *= 1.0 - groundContact(kp, 0.065) * 0.28;
    }

    // Pen cup — shorter pens, one pencil with a pointed tip.
    {
      vec2 cp = (puvObj - vec2(0.745, 0.058)) * vec2(pxAspect, 1.0);
      float cup = sdRoundedBox(cp, vec2(0.034, 0.060), 0.010);
      float pencilBody = sdCapsule(cp, vec2(-0.012, 0.050), vec2(-0.019, 0.135), 0.0068);
      float pencilTip  = sdLeaf(cp, vec2(-0.019, 0.135), vec2(-0.0205, 0.158), 0.0062);
      float pen2 = sdCapsule(cp, vec2( 0.003, 0.050), vec2( 0.011, 0.150), 0.0070);
      float pen3 = sdCapsule(cp, vec2( 0.017, 0.050), vec2( 0.027, 0.120), 0.0064);
      float sil = min(cup, min(min(pencilBody, pencilTip), min(pen2, pen3)));
      float silMask = 1.0 - smoothstep(0.0, 0.010, sil);
      shadows *= 1.0 - silMask * 0.88;
      shadows *= 1.0 - groundContact(cp + vec2(0.0, 0.058), 0.060) * 0.28;
    }

    // ----- light color + composition -----
    vec3 sunCol = vec3(1.00, 0.80, 0.50);
    float shimmer = 0.92 + fbm(p * 3.0 + uTime * 0.05) * 0.16;
    float hot = 1.0 - length((puv - vec2(0.35, 0.80)) * vec2(1.0, 0.8));
    float heat = 0.55 + max(hot, 0.0) * 0.75;
    // Slow breathing of the light source.
    heat *= 0.96 + 0.045 * sin(uTime * 0.30);

    float lightRaw = patchMask * blind * shimmer * heat;
    lightRaw *= 1.0 - cloud * 0.42 * cloudBand;
    lightRaw *= mix(1.0, 0.80, blindFrac);

    float lightAmt = lightRaw * shadows;

    vec3 col = base * 0.82 + sunCol * lightAmt * 0.88;
    // Color-matched shadows — silhouettes absorb the amber, staying warm
    // dark brown instead of dropping to black.
    col += vec3(0.30, 0.125, 0.075) * lightRaw * (1.0 - shadows) * 0.34;
    // Rim light on top curves of the desk objects.
    col += sunCol * rimGlow * lightRaw * 0.15;

    // Bounce-glow beyond the patch edge.
    float glow = exp(-max(dPatch, 0.0) * 9.0) * (1.0 - patchMask);
    col += sunCol * glow * 0.15 * mix(1.0, 0.25, blindFrac);

    // ===== DUST MOTES in the light =====
    {
      vec2 muv = uv * vec2(70.0, 40.0) + vec2(uTime * 0.55, -uTime * 0.21);
      float cell = hash(floor(muv));
      vec2 fpos = fract(muv) - 0.5;
      float mote = smoothstep(0.10, 0.02, length(fpos)) * step(0.975, cell);
      col += sunCol * mote * 0.07 * lightAmt;
    }

    // ===== FILM GRAIN + SOFT VIGNETTE =====
    float grain = (hash(uv * uRes.xy + uTime * 137.0) - 0.5) * 0.034;
    col += grain;
    float vig = length((uv - 0.5) * vec2(1.02, 1.10));
    col *= 1.0 - smoothstep(0.62, 1.25, vig) * 0.34;

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
