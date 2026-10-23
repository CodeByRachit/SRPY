import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// 1. Central Ambient Care Core (Eldercare AI Core with Gyroscopic Rings)
// ---------------------------------------------------------------------------
const CentralAiCore: React.FC<{ pointer: React.MutableRefObject<[number, number]> }> = ({ pointer }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const coreRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const ring3Ref = useRef<THREE.Mesh>(null!);
  const waveDiscRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Mouse parallax reaction
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, pointer.current[0] * 0.4 + t * 0.15, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -pointer.current[1] * 0.25, 0.05);
    }

    // Inner glowing sphere pulsing
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 2.2) * 0.06;
      coreRef.current.scale.set(pulse, pulse, pulse);
    }

    // Wave disc rotation
    if (waveDiscRef.current) {
      waveDiscRef.current.rotation.z = t * 0.8;
      const waveScale = 1 + Math.cos(t * 3.1) * 0.08;
      waveDiscRef.current.scale.set(waveScale, waveScale, 1);
    }

    // Gyroscopic orbital rings
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.2;
      ring1Ref.current.rotation.y = t * 0.6;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -Math.PI / 3 + Math.cos(t * 0.4) * 0.25;
      ring2Ref.current.rotation.z = -t * 0.7;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.y = Math.PI / 4 + Math.sin(t * 0.45) * 0.3;
      ring3Ref.current.rotation.x = t * 0.4;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Dynamic Luminous Point Lights */}
      <pointLight color="#00E5FF" intensity={3.5} distance={7} />
      <pointLight color="#8B5CF6" intensity={2.8} distance={6} position={[1, 1, 1]} />
      <pointLight color="#10B981" intensity={2.2} distance={6} position={[-1, -1, -1]} />

      {/* Internal Luminous Wave Disc */}
      <mesh ref={waveDiscRef}>
        <cylinderGeometry args={[1.15, 1.15, 0.04, 64]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#8B5CF6"
          emissiveIntensity={2.2}
          transparent
          opacity={0.8}
          roughness={0.1}
          metalness={0.3}
        />
      </mesh>

      {/* Glowing Inner Core Sphere */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.85, 48, 48]} />
        <meshStandardMaterial
          color="#0F172A"
          emissive="#00A8E1"
          emissiveIntensity={1.8}
          roughness={0.2}
          metalness={0.85}
        />
      </mesh>

      {/* Outer Semi-transparent Holographic Orb Shell */}
      <mesh>
        <sphereGeometry args={[1.05, 32, 32]} />
        <meshStandardMaterial
          color="#38BDF8"
          roughness={0.05}
          metalness={0.1}
          transparent
          opacity={0.22}
          wireframe={false}
        />
      </mesh>

      {/* Concentric Orbital Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.5, 0.022, 16, 100]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={2.5} roughness={0.1} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.85, 0.018, 16, 100]} />
        <meshStandardMaterial color="#EC4899" emissive="#EC4899" emissiveIntensity={2.0} roughness={0.1} />
      </mesh>
      <mesh ref={ring3Ref}>
        <torusGeometry args={[2.2, 0.015, 16, 100]} />
        <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={1.8} roughness={0.1} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 2. Orbiting Satellite 3D Node: Pill, Echo, MCP, Family
// ---------------------------------------------------------------------------
const SatelliteNode: React.FC<{
  position: [number, number, number];
  color: string;
  label: string;
  type: 'pill' | 'echo' | 'mcp' | 'bridge';
  orbitSpeed: number;
  orbitRadius: number;
  initialAngle: number;
}> = ({ color, type, orbitSpeed, orbitRadius, initialAngle }) => {
  const meshRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const angle = initialAngle + t * orbitSpeed;
    const x = Math.cos(angle) * orbitRadius;
    const z = Math.sin(angle) * orbitRadius;
    const y = Math.sin(angle * 2) * 0.45;

    if (meshRef.current) {
      meshRef.current.position.set(x, y, z);
      meshRef.current.rotation.y = t * 1.2;
      meshRef.current.rotation.x = Math.sin(t * 1.5) * 0.2;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Point glow for this node */}
      <pointLight color={color} intensity={1.5} distance={2.5} />

      {type === 'pill' ? (
        // 3D Capsule Pill
        <group scale={[0.55, 0.55, 0.55]}>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.3, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#F43F5E" emissive="#BE123C" emissiveIntensity={1.2} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.7, 24]} />
            <meshStandardMaterial color="#F43F5E" emissive="#BE123C" emissiveIntensity={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.35, 0]} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.3, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#38BDF8" emissive="#0284C7" emissiveIntensity={1.2} roughness={0.2} />
          </mesh>
        </group>
      ) : type === 'echo' ? (
        // Echo Show 15 Smart Display Hologram
        <group scale={[0.6, 0.6, 0.6]}>
          <mesh>
            <boxGeometry args={[0.9, 0.6, 0.08]} />
            <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.045]}>
            <planeGeometry args={[0.82, 0.52]} />
            <meshStandardMaterial color="#00E5FF" emissive="#00A8E1" emissiveIntensity={1.5} roughness={0.1} />
          </mesh>
        </group>
      ) : type === 'mcp' ? (
        // MCP Protocol Hexagon / Octahedron
        <mesh scale={[0.5, 0.5, 0.5]}>
          <octahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial
            color="#8B5CF6"
            emissive="#6D28D9"
            emissiveIntensity={2.0}
            roughness={0.1}
            metalness={0.7}
            wireframe={false}
          />
        </mesh>
      ) : (
        // Family Caregiver Bridge Sphere
        <group scale={[0.55, 0.55, 0.55]}>
          <mesh>
            <sphereGeometry args={[0.45, 24, 24]} />
            <meshStandardMaterial color="#10B981" emissive="#047857" emissiveIntensity={1.8} roughness={0.2} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.65, 0.02, 16, 32]} />
            <meshStandardMaterial color="#34D399" emissive="#34D399" emissiveIntensity={2.0} />
          </mesh>
        </group>
      )}

      {/* Subtle glowing halo aura */}
      <mesh>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshStandardMaterial color={color} transparent opacity={0.15} roughness={0.1} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------------------
// 3. Floating Ambient Stardust / Particle Field
// ---------------------------------------------------------------------------
const AmbientStarField: React.FC<{ count?: number }> = ({ count = 120 }) => {
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const colorPalette = [
      new THREE.Color('#00E5FF'),
      new THREE.Color('#8B5CF6'),
      new THREE.Color('#38BDF8'),
      new THREE.Color('#10B981'),
      new THREE.Color('#F43F5E'),
    ];

    for (let i = 0; i < count; i++) {
      const radius = 2.5 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      pos[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      pos[i * 3 + 1] = radius * Math.sin(phi);
      pos[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.04;
      pointsRef.current.rotation.x = Math.sin(t * 0.03) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.065} vertexColors transparent opacity={0.75} sizeAttenuation />
    </points>
  );
};

// ---------------------------------------------------------------------------
// 4. Main Exported 3D Canvas
// ---------------------------------------------------------------------------
export const IntroThreeHero: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  const pointer = useRef<[number, number]>([0, 0]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointer.current = [x, y];
  };

  return (
    <div
      className={`relative w-full h-[360px] sm:h-[440px] md:h-[500px] rounded-3xl overflow-hidden select-none ${className}`}
      onPointerMove={handlePointerMove}
    >
      <Canvas
        camera={{ position: [0, 1.2, 5.2], fov: 48 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[4, 6, 5]} intensity={1.5} color="#FFFFFF" />
        <directionalLight position={[-4, -4, -3]} intensity={0.6} color="#00E5FF" />

        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
          <CentralAiCore pointer={pointer} />

          {/* 4 Orbiting Satellite Nodes representing AuraCare subsystems */}
          <SatelliteNode
            position={[0, 0, 0]}
            color="#F43F5E"
            label="Eliquis Regimen"
            type="pill"
            orbitSpeed={0.35}
            orbitRadius={2.4}
            initialAngle={0}
          />
          <SatelliteNode
            position={[0, 0, 0]}
            color="#00E5FF"
            label="Echo Show 15 Ambient"
            type="echo"
            orbitSpeed={0.35}
            orbitRadius={2.4}
            initialAngle={Math.PI * 0.5}
          />
          <SatelliteNode
            position={[0, 0, 0]}
            color="#8B5CF6"
            label="Model Context Protocol (MCP)"
            type="mcp"
            orbitSpeed={0.35}
            orbitRadius={2.4}
            initialAngle={Math.PI}
          />
          <SatelliteNode
            position={[0, 0, 0]}
            color="#10B981"
            label="Family Caregiver Bridge"
            type="bridge"
            orbitSpeed={0.35}
            orbitRadius={2.4}
            initialAngle={Math.PI * 1.5}
          />

          <AmbientStarField count={140} />
        </Float>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.7}
          minPolarAngle={Math.PI / 2.5}
          rotateSpeed={0.4}
        />
      </Canvas>

      {/* Floating 3D Node Subsystem Badges */}
      <div className="absolute bottom-3 inset-x-3 flex flex-wrap items-center justify-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Echo Show 15 Ambient Voice
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400" />
          Model Context Protocol Spec 2025-11-25
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-rose-500/30 text-rose-800 dark:text-rose-300 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          Eliquis &amp; Vitals Telemetry
        </span>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          680-Mile Remote Family Bridge
        </span>
      </div>
    </div>
  );
};
