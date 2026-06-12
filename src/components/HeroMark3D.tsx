"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { Group, Mesh, Shape, ExtrudeGeometry } from "three";

/**
 * 3D hero variant — the A14 mark extruded into 3D, rotating ambiently,
 * parallaxing to mouse, and sitting behind the headline.
 *
 * Same vector paths as the 2D <A14Mark>, just scaled into Three.js Shape
 * geometry. Runs at low resolution on mobile.
 */

// SVG path commands → Shape, hand-translated for clarity. We mirror the Y
// axis because Three.js shape space is +Y up, but our SVG coords were +Y
// down. Each "Glyph" is a Shape used to build an ExtrudeGeometry.

function makeAShape() {
  const s = new Shape();
  // (4,116) → (56,8) → (108,116) → (90,116) → (56,44) → (22,116)
  // mirror Y around 124/2 = 62 → newY = 124 - oldY
  const flip = (y: number) => 124 - y;
  s.moveTo(4, flip(116));
  s.lineTo(56, flip(8));
  s.lineTo(108, flip(116));
  s.lineTo(90, flip(116));
  s.lineTo(56, flip(44));
  s.lineTo(22, flip(116));
  s.closePath();
  return s;
}

function makeFootShape() {
  const s = new Shape();
  const flip = (y: number) => 124 - y;
  s.moveTo(112, flip(113));
  s.lineTo(196, flip(113));
  s.lineTo(196, flip(119));
  s.lineTo(112, flip(119));
  s.closePath();
  return s;
}

function makeOneShape() {
  // Vertical bar.
  const s = new Shape();
  const flip = (y: number) => 124 - y;
  s.moveTo(124, flip(8));
  s.lineTo(144, flip(8));
  s.lineTo(144, flip(104));
  s.lineTo(124, flip(104));
  s.closePath();
  return s;
}

function makeOneFlagShape() {
  const s = new Shape();
  const flip = (y: number) => 124 - y;
  s.moveTo(144, flip(8));
  s.lineTo(156, flip(18));
  s.lineTo(144, flip(22));
  s.closePath();
  return s;
}

function makeFourShape() {
  // Block 4 — two parallel verticals + crossbar.
  const s = new Shape();
  const flip = (y: number) => 124 - y;
  s.moveTo(158, flip(8));
  s.lineTo(170, flip(8));
  s.lineTo(170, flip(64));
  s.lineTo(184, flip(64));
  s.lineTo(184, flip(8));
  s.lineTo(196, flip(8));
  s.lineTo(196, flip(116));
  s.lineTo(184, flip(116));
  s.lineTo(184, flip(80));
  s.lineTo(158, flip(80));
  s.closePath();
  return s;
}

function Mark({ depth }: { depth: number }) {
  const ref = useRef<Group>(null!);
  const { viewport } = useThree();

  const extrudeSettings = useMemo(
    () => ({
      depth,
      bevelEnabled: true,
      bevelThickness: 1.4,
      bevelSize: 1.0,
      bevelSegments: 4,
      steps: 1,
    }),
    [depth]
  );

  const shapes = useMemo(
    () => [
      makeAShape(),
      makeFootShape(),
      makeOneShape(),
      makeOneFlagShape(),
      makeFourShape(),
    ],
    []
  );

  // Mouse parallax.
  const mouse = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((state, dt) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    // Ambient sway + mouse parallax.
    const targetY = mouse.current.x * 0.45 + Math.sin(t * 0.4) * 0.08;
    const targetX = -mouse.current.y * 0.25 + Math.cos(t * 0.3) * 0.05;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * Math.min(1, dt * 3);
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * Math.min(1, dt * 3);
  });

  // Auto-fit to viewport.
  const viewW = viewport.width;
  const targetW = viewW * 0.55;
  const scale = targetW / 200;

  return (
    <group ref={ref} position={[0, 0, 0]} scale={scale}>
      <group position={[-100, -62, 0]}>
        {shapes.map((s, i) => (
          <mesh key={i} castShadow receiveShadow>
            <extrudeGeometry args={[s, extrudeSettings]} />
            <meshStandardMaterial
              color="#c4924d"
              roughness={0.42}
              metalness={0.65}
              emissive="#2a1a10"
              emissiveIntensity={0.4}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function HeroMark3D({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 220], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} color="#f0e1cc" />
        <pointLight position={[80, 70, 100]} intensity={1.1} color="#c4924d" />
        <pointLight position={[-80, -40, 60]} intensity={0.7} color="#6b4e36" />
        <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.6}>
          <Mark depth={22} />
        </Float>
      </Canvas>
    </div>
  );
}
