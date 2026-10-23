import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { CareSystemState, AgentVoiceState, MedicationItem } from '../types/care';
import { soundEngine } from '../utils/soundEngine';

// ==========================================
// 1. CENTRAL 3D GLOWING SPATIAL VOICE ORB
// Exact Match to Reference Image:
// Dark iridescent sphere with glowing cyan/magenta/yellow internal acoustic wave
// ==========================================
const VoiceOrbMesh: React.FC<{
  voiceState: AgentVoiceState;
  activeTool: string | null;
}> = ({ voiceState, activeTool }) => {
  const outerSphereRef = useRef<THREE.Mesh>(null!);
  const innerWaveRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const glowLightRef = useRef<THREE.PointLight>(null!);

  const isAlert = voiceState === 'ALERT';
  const isWorking = voiceState === 'THINKING' || activeTool !== null || voiceState === 'CALLING_MCP_TOOL';
  const isSpeaking = voiceState === 'SPEAKING';
  const isListening = voiceState === 'LISTENING';

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();
    const speed = isWorking ? 2.8 : isSpeaking ? 2.0 : isListening ? 1.6 : 0.9;

    // Outer shell gentle float
    if (outerSphereRef.current) {
      outerSphereRef.current.rotation.y = t * 0.25 * speed;
      outerSphereRef.current.rotation.x = Math.sin(t * 0.4) * 0.1;
    }

    // Concentric acoustic rings gyroscopic rotation
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.7 * speed) * 0.2;
      ring1Ref.current.rotation.y = t * 0.8 * speed;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.x = -Math.PI / 3 + Math.cos(t * 0.6 * speed) * 0.25;
      ring2Ref.current.rotation.z = -t * 0.9 * speed;
    }

    // Audio reactivity breathing
    const speechVol = soundEngine.getSpeechReactivityLevel();
    const targetScale = 1.0 + (isSpeaking || isListening ? 0.08 : 0) + speechVol * 0.18;

    if (innerWaveRef.current) {
      // Horizontal undulating energetic wave
      innerWaveRef.current.rotation.z = t * 1.2 * speed;
      innerWaveRef.current.scale.x = targetScale * (1 + Math.sin(t * 4 * speed) * 0.08);
      innerWaveRef.current.scale.y = targetScale * (1 + Math.cos(t * 3 * speed) * 0.06);
    }

    if (outerSphereRef.current) {
      outerSphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 6);
    }

    if (glowLightRef.current) {
      glowLightRef.current.intensity = 2.0 + Math.sin(t * 5 * speed) * 0.5 + speechVol * 1.2;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Dynamic Colored Center Lights */}
      <pointLight ref={glowLightRef} color="#00E5FF" intensity={2.2} distance={4} />
      <pointLight color="#E040FB" intensity={1.8} distance={3.5} position={[0.2, 0, 0.1]} />
      <pointLight color="#FFD700" intensity={1.5} distance={3} position={[-0.2, 0, -0.1]} />

      {/* Internal Luminous Acoustic Wave Disc */}
      <mesh ref={innerWaveRef}>
        <cylinderGeometry args={[0.55, 0.55, 0.06, 32]} />
        <meshStandardMaterial
          color={isAlert ? '#FF1744' : '#00E5FF'}
          emissive={isAlert ? '#D50000' : '#E040FB'}
          emissiveIntensity={2.5}
          roughness={0.1}
          metalness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Inner Glowing Core Sphere */}
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial
          color="#0F172A"
          emissive={isAlert ? '#FF1744' : isWorking ? '#F59E0B' : '#00A8E1'}
          emissiveIntensity={1.4}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Dark Iridescent Glass Orb */}
      <mesh ref={outerSphereRef}>
        <sphereGeometry args={[0.62, 64, 64]} />
        <meshPhysicalMaterial
          color="#111827"
          emissive={isAlert ? '#BE123C' : '#4338CA'}
          emissiveIntensity={0.25}
          roughness={0.08}
          metalness={0.2}
          clearcoat={1.0}
          clearcoatRoughness={0.06}
          transmission={0.58}
          thickness={0.6}
          ior={1.45}
          iridescence={0.9}
          iridescenceIOR={1.35}
          transparent
          opacity={0.92}
        />
      </mesh>

      {/* Concentric Acoustic Torus Ring 1 (Cyan / Violet) */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.82, 0.015, 16, 80]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Concentric Acoustic Torus Ring 2 (Magenta / Amber) */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.92, 0.012, 16, 80]} />
        <meshStandardMaterial
          color="#E040FB"
          emissive="#E040FB"
          emissiveIntensity={1.0}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
};

export interface AlexaVoiceOrbProps {
  voiceState: AgentVoiceState;
  activeTool?: string | null;
  className?: string;
}

export const AlexaVoiceOrbCanvas: React.FC<AlexaVoiceOrbProps> = ({
  voiceState,
  activeTool = null,
  className = 'w-24 h-24 sm:w-28 sm:h-28',
}) => {
  return (
    <div className={`relative ${className} shrink-0`}>
      <Canvas
        camera={{ position: [0, 0, 2.6], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.8} color="#FFFFFF" />
        <directionalLight position={[4, 5, 3]} intensity={1.5} color="#FFFFFF" />
        <directionalLight position={[-3, -2, -2]} intensity={0.5} color="#818CF8" />

        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.15}>
          <VoiceOrbMesh voiceState={voiceState} activeTool={activeTool} />
        </Float>
      </Canvas>
    </div>
  );
};

// ==========================================
// 2. TACTILE 3D PILL CAPSULES CANVAS
// Exact Match to Reference Image:
// Two-tone physical capsules (coral-pink & azure-cyan) on illuminated tile
// ==========================================
const TactilePillMeshes: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.5) * 0.04;
      groupRef.current.rotation.y = 0.5 + Math.sin(t * 0.8) * 0.12;
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.05, 0]} rotation={[0.4, 0.6, -0.2]}>
      {/* Pill 1: Slanted Pink/White Capsule */}
      <group position={[-0.15, 0.1, 0.1]} rotation={[0.2, -0.3, 0.8]}>
        {/* Top Half: Coral Pink */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.28, 24]} />
          <meshPhysicalMaterial
            color="#FB7185"
            roughness={0.12}
            metalness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#FB7185"
            roughness={0.12}
            metalness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>

        {/* Bottom Half: Soft Alabaster White */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.28, 24]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            roughness={0.15}
            metalness={0.05}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            roughness={0.15}
            metalness={0.05}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>
      </group>

      {/* Pill 2: Slanted Cyan/White Capsule resting beside it */}
      <group position={[0.18, -0.08, -0.1]} rotation={[-0.1, 0.4, 0.6]}>
        {/* Top Half: Soft Cyan Blue */}
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.28, 24]} />
          <meshPhysicalMaterial
            color="#38BDF8"
            roughness={0.12}
            metalness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <sphereGeometry args={[0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#38BDF8"
            roughness={0.12}
            metalness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>

        {/* Bottom Half: Soft Alabaster White */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.16, 0.16, 0.28, 24]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            roughness={0.15}
            metalness={0.05}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh position={[0, -0.2, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.16, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color="#FFFFFF"
            roughness={0.15}
            metalness={0.05}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
          />
        </mesh>
      </group>
    </group>
  );
};

export const Tactile3DPillCanvas: React.FC<{ className?: string }> = ({
  className = 'w-16 h-16 sm:w-20 sm:h-20',
}) => {
  return (
    <div className={`relative ${className} shrink-0`}>
      <Canvas
        camera={{ position: [0, 0.8, 2.2], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.1} color="#FFFFFF" />
        <directionalLight position={[4, 6, 4]} intensity={1.6} color="#FFFFFF" />
        <directionalLight position={[-3, 2, -1]} intensity={0.6} color="#CBD5E1" />

        <TactilePillMeshes />

        <ContactShadows
          position={[0, -0.65, 0]}
          opacity={0.4}
          scale={2.5}
          blur={1.8}
          far={1.5}
        />
      </Canvas>
    </div>
  );
};

// ==========================================
// 3. TACTILE 3D ISOMETRIC HOUSE CANVAS
// Exact Match to Reference Image:
// Warm terracotta roof house for Check-In Status
// ==========================================
const TactileHouseMesh: React.FC = () => {
  const houseGroupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (houseGroupRef.current) {
      houseGroupRef.current.position.y = Math.sin(t * 1.6) * 0.02;
    }
  });

  return (
    <group ref={houseGroupRef} position={[0, -0.05, 0]} rotation={[0.3, -0.65, 0]}>
      {/* Base Walls (Soft Warm White Box) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.65, 0.5, 0.65]} />
        <meshPhysicalMaterial
          color="#FFFDF9"
          roughness={0.25}
          metalness={0.05}
          clearcoat={0.6}
        />
      </mesh>

      {/* Terracotta Pitched Roof */}
      <mesh position={[0, 0.42, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.6, 0.38, 4]} />
        <meshPhysicalMaterial
          color="#F97316"
          roughness={0.3}
          metalness={0.1}
          clearcoat={0.4}
        />
      </mesh>

      {/* Chimney */}
      <mesh position={[0.18, 0.48, -0.1]}>
        <boxGeometry args={[0.1, 0.22, 0.1]} />
        <meshStandardMaterial color="#EA580C" roughness={0.4} />
      </mesh>

      {/* Front Door */}
      <mesh position={[0.02, -0.08, 0.33]}>
        <boxGeometry args={[0.14, 0.24, 0.02]} />
        <meshStandardMaterial color="#D97706" roughness={0.3} />
      </mesh>

      {/* Cozy Window */}
      <mesh position={[-0.18, 0.06, 0.33]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshStandardMaterial color="#60A5FA" roughness={0.1} metalness={0.2} />
      </mesh>
    </group>
  );
};

export const Tactile3DHouseCanvas: React.FC<{ className?: string }> = ({
  className = 'w-14 h-14 sm:w-16 sm:h-16',
}) => {
  return (
    <div className={`relative ${className} shrink-0`}>
      <Canvas
        camera={{ position: [0, 0.4, 2.1], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.2} color="#FFFFFF" />
        <directionalLight position={[4, 6, 3]} intensity={1.7} color="#FFF8F0" />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#CBD5E1" />

        <TactileHouseMesh />

        <ContactShadows
          position={[0, -0.45, 0]}
          opacity={0.35}
          scale={2.2}
          blur={1.8}
          far={1.5}
        />
      </Canvas>
    </div>
  );
};

// Default export wrapper for backwards compatibility
export interface Alexa3DCanvasProps {
  state?: CareSystemState;
  voiceState: AgentVoiceState;
  activeTool: string | null;
  theme?: 'dark' | 'light';
  onPillClick?: (med: MedicationItem) => void;
}

export const Alexa3DCanvas: React.FC<Alexa3DCanvasProps> = ({
  voiceState,
  activeTool,
}) => {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <AlexaVoiceOrbCanvas
        voiceState={voiceState}
        activeTool={activeTool}
        className="w-36 h-36 sm:w-44 sm:h-44"
      />
    </div>
  );
};

export default Alexa3DCanvas;
