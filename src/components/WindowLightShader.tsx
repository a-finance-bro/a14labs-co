"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Window-light projection shader.
 *
 * The window (and everything between it and the wall) is BEHIND the
 * camera — we only see what the sunlight paints on the wall:
 *   - the coffee-crema flow as the wall surface
 *   - a straight-edged warm rectangle of projected window light
 *   - soft clouds drifting across the upper part of the light
 *   - shadows cast inside that light: the A14 brand block (logo +
 *     headline + caption), a coffee mug with animated steam, a pen cup
 *   - venetian blinds drawn DOWN from the top as the visitor scrolls;
 *     invisible at first paint, fully closed (thin slits) after one
 *     viewport of scrolling
 *   - after the sticky hero releases, the light patch lifts away with
 *     the page (uLift) so later sections read on dark crema
 *   - film grain + vignette
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
  uniform float uScroll;       // 0..1 — drives blind close + sun fade
  uniform float uLift;         // viewport-heights the page has scrolled past the hero
  uniform sampler2D uLogo;     // alpha = logo mask
  uniform vec2 uLogoAspect;    // logo (w, h) px

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
  float sdBox(vec2 p, vec2 b) {
    vec2 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }
  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdCircle(vec2 p, float r) { return length(p) - r; }
  // capsule from a to b, radius r
  float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a; vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
  }

  // Sample logo with soft offset blur — returns shadow density 0..1.
  float sampleLogo(vec2 uv, float blurPx) {
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    vec2 px = blurPx / uLogoAspect;
    float s = 0.0;
    // 13-tap gaussian-ish.
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

  // -------- main ------------------
  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / uRes.y;

    // ===== BASE: coffee-crema flow (the wall surface) =====
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
    // Window is behind the camera; this is its light cast on the wall.
    // Straight-on projection — clean vertical edges.
    vec2 p = uv;

    vec2 patchC = vec2(0.5, 0.52 + uLift);
    vec2 patchH = vec2(0.36, 0.40);
    vec2 d2 = abs(p - patchC) - patchH;
    float dPatch = max(d2.x, d2.y);

    float pen = mix(0.014, 0.040, smoothstep(0.2, 0.9, p.y));
    float patchMask = 1.0 - smoothstep(-pen, pen, dPatch);

    // Patch-local coordinates 0..1 (y: 0 = bottom of window light).
    vec2 puv = (p - (patchC - patchH)) / (patchH * 2.0);
    // Patch dimensions in real pixels — keeps every shadow aspect-true
    // regardless of viewport shape.
    vec2 patchPx = patchH * 2.0 * uRes;
    float pxAspect = patchPx.x / patchPx.y;

    // ----- clouds drifting past, upper window -----
    float cloudBand = smoothstep(0.40, 0.92, puv.y);
    float cloud = fbm(vec2(puv.x * 2.1 + uTime * 0.022, puv.y * 1.7 + 3.7));
    cloud = smoothstep(0.34, 0.82, cloud);

    // ----- venetian blinds: drawn DOWN from the top as you scroll -----
    // uScroll 0 → no blinds at all (clean light).
    // uScroll 1 → blinds cover the whole window; only thin slits pass light.
    float blindFrac = smoothstep(0.02, 0.95, uScroll);  // fraction covered, from top
    float coverEdge = 1.0 - blindFrac;                  // puv.y of the blind bottom
    // Covered where puv.y > coverEdge (blinds hang from the top).
    float inBlind = smoothstep(coverEdge - 0.008, coverEdge + 0.008, puv.y);

    float nSlats = 18.0;
    float slatPos = fract(puv.y * nSlats);
    // Thin slit of light between slats — fixed thin width.
    float slitHalf = 0.10;
    float distC = abs(slatPos - 0.5);
    float slit = 1.0 - smoothstep(slitHalf - 0.04, slitHalf + 0.04, distC);
    float blindLight = max(slit, 0.045);   // tiny leak through slats

    // Light through the window: full where uncovered, slit-pattern where covered.
    float blind = mix(1.0, blindLight, inBlind);

    // Bottom rail of the blind stack — a solid dark bar at the cover edge.
    if (blindFrac > 0.01 && blindFrac < 0.995) {
      float rail = 1.0 - smoothstep(0.004, 0.012, abs(puv.y - coverEdge));
      blind = mix(blind, 0.03, rail);
    }

    // ----- shadow silhouettes (objects between window and wall) -----
    float shadows = 1.0;

    // Brand shadow — the A14 block, large + aspect-true. Blur varies with
    // height: the A14 mark (top) casts sharp; the caption (bottom) hangs
    // further from the wall and blurs.
    {
      float texAspect = uLogoAspect.x / uLogoAspect.y;
      float boxW = 0.95;
      float boxH = boxW * pxAspect / texAspect;
      if (boxH > 0.84) { boxW *= 0.84 / boxH; boxH = 0.84; }
      vec2 luvC = vec2(0.5, 0.50);
      vec2 luv = (puv - luvC) / vec2(boxW, boxH) + 0.5;
      float depthBlur = mix(6.0, 1.6, smoothstep(0.25, 0.75, luv.y));
      float s = sampleLogo(luv, depthBlur);
      shadows *= 1.0 - s * 0.90;
    }

    // Coffee mug — aspect-true (x measured in patch-height units), base
    // clipped just below the patch floor so it sits on the sill.
    {
      vec2 mp = (puv - vec2(0.13, 0.072)) * vec2(pxAspect, 1.0);
      float body = sdRoundedBox(mp, vec2(0.055, 0.078), 0.022);
      float hOuter = sdCircle(mp - vec2(0.078, 0.008), 0.038);
      float hInner = sdCircle(mp - vec2(0.078, 0.008), 0.022);
      float handle = max(hOuter, -hInner);
      float mug = min(body, handle);
      float mugMask = 1.0 - smoothstep(0.0, 0.012, mug);
      shadows *= 1.0 - mugMask * 0.88;

      // Steam shadow — rises from the rim. Slightly more present.
      vec2 sp = (puv - vec2(0.13, 0.165)) * vec2(pxAspect, 1.0);
      if (sp.y > -0.02 && sp.y < 0.55) {
        float sway = sin(sp.y * 9.0 + uTime * 1.1) * 0.030
                   + sin(sp.y * 21.0 - uTime * 0.6) * 0.012;
        float ribbon = abs(sp.x - sway);
        float widthFade = 1.0 - smoothstep(0.0, 0.038 + sp.y * 0.08, ribbon);
        float heightFade = (1.0 - smoothstep(0.10, 0.52, sp.y));
        float plume = fbm(vec2(sp.x * 7.0, sp.y * 2.8 - uTime * 0.26));
        float steamMask = widthFade * heightFade * smoothstep(0.32, 0.72, plume);
        shadows *= 1.0 - steamMask * 0.46;
      }
    }

    // Pen cup — aspect-true, grounded lower-right.
    {
      vec2 cp = (puv - vec2(0.875, 0.058)) * vec2(pxAspect, 1.0);
      float cup = sdRoundedBox(cp, vec2(0.036, 0.066), 0.012);
      float cupMask = 1.0 - smoothstep(0.0, 0.012, cup);
      shadows *= 1.0 - cupMask * 0.88;
      float pen1 = sdCapsule(cp, vec2(-0.015, 0.06), vec2(-0.026, 0.185), 0.0058);
      float pen2 = sdCapsule(cp, vec2( 0.004, 0.06), vec2( 0.016, 0.205), 0.0062);
      float pen3 = sdCapsule(cp, vec2( 0.020, 0.06), vec2( 0.033, 0.150), 0.0055);
      float penM = 1.0 - smoothstep(0.0, 0.010, min(min(pen1, pen2), pen3));
      shadows *= 1.0 - penM * 0.90;
    }

    // ----- light color + composition -----
    vec3 sunCol = vec3(1.00, 0.80, 0.50);
    float shimmer = 0.92 + fbm(p * 3.0 + uTime * 0.05) * 0.16;
    float hot = 1.0 - length((puv - vec2(0.35, 0.80)) * vec2(1.0, 0.8));
    float heat = 0.55 + max(hot, 0.0) * 0.75;

    float lightAmt = patchMask * blind * shadows * shimmer * heat;
    // Clouds passing outside soften the upper window light.
    lightAmt *= 1.0 - cloud * 0.30 * cloudBand;
    // Room darkens as blinds close.
    lightAmt *= mix(1.0, 0.80, blindFrac);

    vec3 col = base * 0.82 + sunCol * lightAmt * 0.88;
    // Bounce-glow bleeding past the patch edge, dims with the blinds.
    float glow = exp(-max(dPatch, 0.0) * 9.0) * (1.0 - patchMask);
    col += sunCol * glow * 0.15 * mix(1.0, 0.25, blindFrac);

    // ===== FILM GRAIN + VIGNETTE =====
    float grain = (hash(uv * uRes.xy + uTime * 137.0) - 0.5) * 0.022;
    col += grain;
    float vig = length((uv - 0.5) * vec2(1.05, 1.15));
    col *= 1.0 - smoothstep(0.5, 1.0, vig) * 0.45;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * Render the full brand shadow to an offscreen canvas → CanvasTexture.
 * The hero has no HTML headline — everything the visitor reads on first
 * paint is this shadow: accent square + "A14" + the headline lines.
 */
function makeLogoTexture(width = 2048, height = 1200): {
  texture: THREE.CanvasTexture;
  aspect: [number, number];
} {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";

  const sans = `ui-sans-serif, -apple-system, "Helvetica Neue", Arial, sans-serif`;
  const serifItalic = `Georgia, "Times New Roman", serif`;

  // --- "A14" big, with accent square ---
  const a14Size = Math.floor(height * 0.34);
  ctx.font = `900 ${a14Size}px ${sans}`;
  const a14W = ctx.measureText("A14").width;
  const sq = a14Size * 0.2;
  const gap = a14Size * 0.12;
  const groupW = sq + gap + a14W;
  const a14X = (width - groupW) / 2;
  const a14Baseline = height * 0.40;
  ctx.fillRect(a14X, a14Baseline - a14Size * 0.74, sq, sq);
  ctx.fillText("A14", a14X + sq + gap, a14Baseline);

  // --- headline lines ---
  const lineSize = Math.floor(height * 0.095);
  ctx.font = `700 ${lineSize}px ${sans}`;
  const l1 = "We build the tools";
  const l1W = ctx.measureText(l1).width;
  ctx.fillText(l1, (width - l1W) / 2, height * 0.58);

  ctx.font = `italic 400 ${lineSize}px ${serifItalic}`;
  const l2 = "we wished existed.";
  const l2W = ctx.measureText(l2).width;
  ctx.fillText(l2, (width - l2W) / 2, height * 0.70);

  // --- studio caption ---
  const capSize = Math.floor(height * 0.042);
  ctx.font = `500 ${capSize}px ${sans}`;
  const cap = "A I - N A T I V E   P R O D U C T   S T U D I O";
  const capW = ctx.measureText(cap).width;
  ctx.fillText(cap, (width - capW) / 2, height * 0.82);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return { texture: tex, aspect: [width, height] };
}

function ShaderQuad() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();
  const scrollRef = useRef(0);
  const liftRef = useRef(0);

  // Logo texture — built once on mount.
  const logoData = useMemo(() => makeLogoTexture(), []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(size.width, size.height) },
      uScroll: { value: 0 },
      uLift: { value: 0 },
      uLogo: { value: logoData.texture },
      uLogoAspect: { value: new THREE.Vector2(logoData.aspect[0], logoData.aspect[1]) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const update = () => {
      // Blinds close over the first viewport-height of scrolling (the
      // sticky hero's scroll range) — not the whole document.
      const vh = window.innerHeight;
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / vh));
      // After the sticky hero releases (1vh of scroll), the window light is
      // "painted on the wall" — it slides up and away with the page.
      liftRef.current = Math.max(0, window.scrollY - vh) / vh;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useFrame((state) => {
    if (!matRef.current) return;
    matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    matRef.current.uniforms.uRes.value.set(size.width, size.height);
    // Smooth-follow scroll for less jitter.
    const target = scrollRef.current;
    const current = matRef.current.uniforms.uScroll.value;
    matRef.current.uniforms.uScroll.value = current + (target - current) * 0.08;
    const liftT = liftRef.current;
    const liftC = matRef.current.uniforms.uLift.value;
    matRef.current.uniforms.uLift.value = liftC + (liftT - liftC) * 0.12;
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
    // Static warm gradient fallback — no WebGL (or pre-hydration).
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
