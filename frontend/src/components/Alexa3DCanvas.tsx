import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Html, Sparkles, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { CareSystemState, AgentVoiceState, MedicationItem } from '../types/care';
import { soundEngine } from '../utils/soundEngine';
import { Sparkles as SparklesIcon, CheckCircle2, AlertTriangle, Clock, Zap, Volume2 } from 'lucide-react';

interface Alexa3DCanvasProps {
  state: CareSystemState;
  voiceState: AgentVoiceState;
  activeTool: string | null;
  theme?: 'dark' | 'light';
  onPillClick: (med: MedicationItem) => void;
}

// --- Alexa+ Core Centerpiece ---
const AlexaCore: React.FC<{
  voiceState: AgentVoiceState;
  patientStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  activeTool: string | null;
}> = ({ voiceState, patientStatus, activeTool }) => {
  const coreMeshRef = useRef<THREE.Mesh>(null!);
  const ring1Ref = useRef<THREE.Mesh>(null!);
  const ring2Ref = useRef<THREE.Mesh>(null!);
  const ring3Ref = useRef<THREE.Mesh>(null!);

  // Dynamic colors and distortion based on state
  const { coreColor, emissiveColor, distort, speed, scaleTarget } = useMemo(() => {
    if (patientStatus === 'CRITICAL' || voiceState === 'ALERT') {
      return {
        coreColor: '#f43f5e',
        emissiveColor: '#be123c',
        distort: 0.65,
        speed: 5.5,
        scaleTarget: 1.15,
      };
    }
    if (voiceState === 'CALLING_MCP_TOOL') {
      return {
        coreColor: '#6366f1',
        emissiveColor: '#4338ca',
        distort: 0.5,
        speed: 7.0,
        scaleTarget: 1.1,
      };
    }
    if (voiceState === 'SPEAKING' || voiceState === 'LISTENING') {
      return {
        coreColor: '#06b6d4',
        emissiveColor: '#8b5cf6',
        distort: 0.58,
        speed: 6.0,
        scaleTarget: 1.12,
      };
    }
    if (patientStatus === 'WARNING') {
      // Idle with warning (Eliquis overdue)
      return {
        coreColor: '#0ea5e9',
        emissiveColor: '#f59e0b',
        distort: 0.28,
        speed: 2.2,
        scaleTarget: 1.0,
      };
    }
    // Idle healthy
    return {
      coreColor: '#06b6d4',
      emissiveColor: '#10b981',
      distort: 0.2,
      speed: 1.8,
      scaleTarget: 1.0,
    };
  }, [voiceState, patientStatus]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Rotate gyroscopic halo rings in counter directions
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = t * 0.7;
      ring1Ref.current.rotation.y = t * 0.9;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -t * 0.8;
      ring2Ref.current.rotation.z = t * 0.5;
    }
    if (ring3Ref.current) {
      ring3Ref.current.rotation.x = -t * 0.4;
      ring3Ref.current.rotation.z = -t * 0.85;
    }

    // Voice reactivity pulsing
    if (coreMeshRef.current) {
      const speechVolume = soundEngine.getSpeechReactivityLevel();
      const targetScale = scaleTarget + speechVolume * 0.25;
      coreMeshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8);
    }
  });

  return (
    <group position={[0, 0.7, 0]}>
      {/* Dynamic Point Light from inside the core */}
      <pointLight color={coreColor} intensity={2.8} distance={6} decay={2} />

      {/* Core AI Sphere with Distort Material */}
      <mesh ref={coreMeshRef}>
        <sphereGeometry args={[0.55, 64, 64]} />
        <MeshDistortMaterial
          color={coreColor}
          emissive={emissiveColor}
          emissiveIntensity={0.65}
          roughness={0.12}
          metalness={0.4}
          clearcoat={0.9}
          clearcoatRoughness={0.1}
          distort={distort}
          speed={speed}
        />
      </mesh>

      {/* Outer Gyroscopic Light Ring 1 */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[0.88, 0.018, 16, 100]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={coreColor}
          emissiveIntensity={0.9}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Gyroscopic Light Ring 2 */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.96, 0.015, 16, 100]} />
        <meshStandardMaterial
          color={emissiveColor}
          emissive={emissiveColor}
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Outer Gyroscopic Light Ring 3 */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[1.04, 0.012, 16, 100]} />
        <meshStandardMaterial
          color={patientStatus === 'WARNING' ? '#f59e0b' : '#38bdf8'}
          emissive={patientStatus === 'WARNING' ? '#f59e0b' : '#38bdf8'}
          emissiveIntensity={0.7}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* 3D Floating Tool Call Status Badge */}
      {voiceState === 'CALLING_MCP_TOOL' && activeTool && (
        <Html position={[0, 1.25, 0]} center distanceFactor={8}>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-900/90 border border-indigo-400 text-indigo-200 text-xs font-mono font-bold rounded-full shadow-lg shadow-indigo-500/50 backdrop-blur-md animate-bounce whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-indigo-300 animate-spin" />
            <span>MCP EXEC: {activeTool}()</span>
          </div>
        </Html>
      )}

      {/* 3D Voice State Indicator */}
      {(voiceState === 'SPEAKING' || voiceState === 'LISTENING') && (
        <Html position={[0, 1.22, 0]} center distanceFactor={8}>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/90 border border-cyan-400 text-cyan-200 text-xs font-medium rounded-full shadow-lg shadow-cyan-500/40 backdrop-blur-md whitespace-nowrap">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>{voiceState === 'SPEAKING' ? 'Alexa+ Speaking...' : 'Alexa+ Listening...'}</span>
          </div>
        </Html>
      )}
    </group>
  );
};

// --- Single 3D Smart Pill Capsule with Pedestal ---
const PillCapsule: React.FC<{
  med: MedicationItem;
  position: [number, number, number];
  onClick: () => void;
}> = ({ med, position, onClick }) => {
  const capsuleGroupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = React.useState(false);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (capsuleGroupRef.current) {
      if (med.status === 'OVERDUE') {
        // Urgent bobbing and alert tilt
        capsuleGroupRef.current.position.y = position[1] + Math.sin(t * 5) * 0.08 + 0.05;
        capsuleGroupRef.current.rotation.y = t * 1.5;
        capsuleGroupRef.current.rotation.z = Math.sin(t * 3) * 0.1;
      } else if (med.status === 'TAKEN') {
        // Serene calm float
        capsuleGroupRef.current.position.y = position[1] + Math.sin(t * 1.2 + position[0]) * 0.03;
        capsuleGroupRef.current.rotation.y = t * 0.4;
        capsuleGroupRef.current.rotation.z = 0;
      } else {
        // Upcoming gentle float
        capsuleGroupRef.current.position.y = position[1] + Math.sin(t * 1.8 + position[0]) * 0.04;
        capsuleGroupRef.current.rotation.y = t * 0.6;
        capsuleGroupRef.current.rotation.z = 0;
      }
    }
  });

  const statusColor = useMemo(() => {
    if (med.status === 'TAKEN') return '#10b981';
    if (med.status === 'OVERDUE') return '#f43f5e';
    return '#64748b';
  }, [med.status]);

  return (
    <group position={position}>
      {/* Illuminated Pedestal Pad */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.38, 0.44, 0.08, 32]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Pedestal Halo Ring */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.36, 0.42, 32]} />
        <meshBasicMaterial
          color={statusColor}
          side={THREE.DoubleSide}
          transparent
          opacity={med.status === 'OVERDUE' ? 0.95 : 0.65}
        />
      </mesh>

      {/* Floating Two-Tone Capsule Group */}
      <group
        ref={capsuleGroupRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
      >
        {/* Upper Half Capsule (Primary Color) */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.22, 24]} />
          <meshPhysicalMaterial
            color={med.pill_color}
            emissive={med.status === 'OVERDUE' ? '#f43f5e' : med.pill_color}
            emissiveIntensity={med.status === 'OVERDUE' ? 0.5 : 0.15}
            metalness={0.25}
            roughness={0.15}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <mesh position={[0, 0.23, 0]}>
          <sphereGeometry args={[0.13, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color={med.pill_color}
            emissive={med.status === 'OVERDUE' ? '#f43f5e' : med.pill_color}
            emissiveIntensity={med.status === 'OVERDUE' ? 0.5 : 0.15}
            metalness={0.25}
            roughness={0.15}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Lower Half Capsule (Secondary Color) */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.22, 24]} />
          <meshPhysicalMaterial
            color={med.secondary_color}
            metalness={0.25}
            roughness={0.15}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>
        <mesh position={[0, -0.21, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.13, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshPhysicalMaterial
            color={med.secondary_color}
            metalness={0.25}
            roughness={0.15}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>

        {/* Hover Highlight Ring */}
        {hovered && (
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.25, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} />
          </mesh>
        )}

        {/* Floating HTML Status Tag */}
        <Html position={[0, 0.48, 0]} center distanceFactor={7}>
          <div
            className={`cursor-pointer select-none px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap shadow-md backdrop-blur-md transition-all duration-200 border ${
              med.status === 'OVERDUE'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse'
                : med.status === 'TAKEN'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900/80 border-slate-700 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1">
              {med.status === 'TAKEN' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>TAKEN • {med.taken_at || '8:05 AM'}</span>
                </>
              ) : med.status === 'OVERDUE' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-400 animate-bounce" />
                  <span className="font-bold">OVERDUE • 2:00 PM</span>
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{med.scheduled_time}</span>
                </>
              )}
            </div>
            <div className="text-[9px] text-center opacity-85 truncate max-w-[100px]">
              {med.name}
            </div>
          </div>
        </Html>
      </group>
    </group>
  );
};

// --- Laser / Particle Data Beam from Core to Active Capsule during MCP Call ---
const McpDataBeam: React.FC<{
  activeTool: string | null;
}> = ({ activeTool }) => {
  const lineObject = useMemo(() => {
    const points = [new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(-0.7, -1.15, 0.05)];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#6366f1',
      transparent: true,
      opacity: 0.8,
      linewidth: 3,
    });
    return new THREE.Line(geometry, material);
  }, []);

  useFrame((state) => {
    if (lineObject) {
      const mat = lineObject.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(state.clock.getElapsedTime() * 10));
      }
    }
  });

  if (activeTool !== 'log_medication_taken') return null;

  return <primitive object={lineObject} />;
};

export const Alexa3DCanvas: React.FC<Alexa3DCanvasProps> = ({
  state,
  voiceState,
  activeTool,
  theme = 'dark',
  onPillClick,
}) => {
  const isDark = theme === 'dark';

  // Pill positions along a smooth spatial living-room arc
  const pillArcPositions: [number, number, number][] = [
    [-2.1, -1.15, -0.15], // Lisinopril
    [-0.7, -1.15, 0.05],  // Eliquis
    [0.7, -1.15, 0.05],   // Metformin
    [2.1, -1.15, -0.15],  // Atorvastatin
  ];

  return (
    <div
      className={`relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden border shadow-2xl transition-all duration-500 ${
        isDark
          ? 'bg-gradient-to-b from-[#0a1020] via-[#070b14] to-[#04070d] border-cyan-500/20'
          : 'bg-gradient-to-b from-slate-100 via-sky-50/50 to-slate-200/80 border-slate-300/80'
      }`}
    >
      {/* HUD Overlay Top Header */}
      <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/60 backdrop-blur-md pointer-events-auto shadow-sm">
          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            Echo Show 15 • Living Room
          </span>
          <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono bg-cyan-100 dark:bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-800">
            Spatial 3D Hub
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-full backdrop-blur-md shadow-sm">
          <SparklesIcon className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
          <span>Interactive WebGL Scene</span>
        </div>
      </div>

      {/* R3F Canvas */}
      <Canvas
        camera={{ position: [0, 0.2, 4.4], fov: 46 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Lighting Setup */}
        <ambientLight intensity={isDark ? 0.5 : 0.8} />
        <directionalLight position={[5, 6, 4]} intensity={isDark ? 1.2 : 1.4} />
        <pointLight position={[-4, 2, -2]} color="#0ea5e9" intensity={1.5} />
        <pointLight position={[4, 2, -2]} color="#8b5cf6" intensity={1.2} />
        <pointLight position={[0, -2, 2]} color="#10b981" intensity={0.8} />

        {/* Ambient Sparkles */}
        <Sparkles
          count={45}
          scale={5.5}
          size={1.6}
          speed={0.4}
          color={isDark ? '#38bdf8' : '#0284c7'}
          opacity={isDark ? 0.35 : 0.45}
        />

        {/* Alexa+ Core */}
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
          <AlexaCore
            voiceState={voiceState}
            patientStatus={state.patient.status}
            activeTool={activeTool}
          />
        </Float>

        {/* MCP Active Beam */}
        <McpDataBeam activeTool={activeTool} />

        {/* 4 Smart Pill Capsules on Pedestals */}
        {state.medications.map((med, idx) => (
          <PillCapsule
            key={med.id}
            med={med}
            position={pillArcPositions[idx] || [0, -1.15, 0]}
            onClick={() => onPillClick(med)}
          />
        ))}

        {/* Ground Radial Reflector Plane */}
        <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[10, 10]} />
          <meshStandardMaterial
            color={isDark ? '#080e1b' : '#cbd5e1'}
            roughness={0.85}
            metalness={0.2}
          />
        </mesh>

        {/* Constrained Orbit Controls for Judge Interactivity */}
        <OrbitControls
          enablePan={false}
          minDistance={3.2}
          maxDistance={5.8}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2 + 0.05}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Bottom Hint Banner inside Canvas */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-950/75 border border-slate-200 dark:border-slate-800/80 px-3.5 py-1.5 rounded-xl backdrop-blur-md shadow-sm">
        <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Click any <strong className="text-cyan-700 dark:text-cyan-300">3D Pill Capsule</strong> to trigger Alexa+ dose confirmation
        </span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
          Drag to rotate 3D hub • Pinch/Scroll to zoom
        </span>
      </div>
    </div>
  );
};
