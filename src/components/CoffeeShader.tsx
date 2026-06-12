"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Coffee-crema flowing shader background. A single full-screen quad with a
 * fragment shader that domain-warps fractal noise into slow, organic warm
 * patterns. Continuous, no interaction. Reads as crema swirling on a pour.
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
  uniform vec2 uRes;

  // Cheap 2D value noise.
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
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.0;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    // Square-up the UV so the swirl doesn't stretch on wide viewports.
    vec2 uv = vUv;
    uv.x *= uRes.x / uRes.y;

    float t = uTime * 0.045;

    // Domain warp: two layers of noise drive the sample position of a third.
    vec2 q = vec2(
      fbm(uv * 1.6 + vec2(0.0, t)),
      fbm(uv * 1.6 + vec2(5.2, 1.3 - t))
    );
    vec2 r = vec2(
      fbm(uv * 2.0 + q * 1.5 + vec2(t * 0.6, 0.0)),
      fbm(uv * 2.0 + q * 1.5 + vec2(8.3, 2.8 + t * 0.4))
    );
    float v = fbm(uv * 2.4 + r * 2.0 - vec2(0.0, t * 0.7));

    // Coffee palette — espresso → mocha → roast → caramel highlights.
    vec3 espresso = vec3(0.082, 0.055, 0.031);
    vec3 mocha    = vec3(0.165, 0.102, 0.063);
    vec3 roast    = vec3(0.420, 0.306, 0.212);
    vec3 caramel  = vec3(0.769, 0.573, 0.302);

    vec3 col = mix(espresso, mocha, smoothstep(0.0, 0.55, v));
    col = mix(col, roast,   smoothstep(0.5, 0.85, v) * 0.55);
    col = mix(col, caramel, smoothstep(0.78, 1.0, v) * 0.38);

    // Vignette so corners stay dark and don't compete with text.
    float d = length(vUv - 0.5);
    col *= 1.0 - smoothstep(0.45, 0.95, d) * 0.55;

    gl_FragColor = vec4(col, 1.0);
  }
`;

function ShaderQuad() {
  const ref = useRef<THREE.ShaderMaterial>(null!);
  const { size } = useThree();
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(size.width, size.height) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.uniforms.uTime.value = state.clock.getElapsedTime();
    ref.current.uniforms.uRes.value.set(size.width, size.height);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={ref}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthWrite={false}
      />
    </mesh>
  );
}

export function CoffeeShader({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], near: 0, far: 2, zoom: 1 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      >
        <ShaderQuad />
      </Canvas>
    </div>
  );
}
