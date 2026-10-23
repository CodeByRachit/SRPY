import React, { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Activity,
  Heart,
  AlertTriangle,
  Bell,
  Shield,
  MessageSquare,
  Cpu,
  Radio,
  Wifi,
  Clock,
  Zap,
  Droplets,
  Terminal,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Crosshair,
  Thermometer,
  Layers,
  X,
} from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

// ===========================================================================
// 1. CENTRAL 3D ALEXA ECHO HUB + HOLOGRAPHIC ALEXA PROJECTION CORE
// A 3D Amazon Echo smart speaker with its signature rotating cyan LED ring,
// upward vertical holographic projection cone, floating acoustic voice orb,
// and 3D in-canvas holographic reticle dials. NO ORBITING SATELLITES.
// ===========================================================================
const AlexaALEXACenterPiece: React.FC<{
  pointer: React.MutableRefObject<[number, number]>;
  isSpeaking: boolean;
  heartRate: number;
}> = ({ pointer, isSpeaking, heartRate }) => {
  const speakerGroupRef = useRef<THREE.Group>(null!);
  const lightRingRef = useRef<THREE.Mesh>(null!);
  const voiceOrbRef = useRef<THREE.Mesh>(null!);
  const waveDiscRef = useRef<THREE.Mesh>(null!);
  const projectionBeamRef = useRef<THREE.Mesh>(null!);
  const holoRing1Ref = useRef<THREE.Mesh>(null!);
  const holoRing2Ref = useRef<THREE.Mesh>(null!);
  const holoRing3Ref = useRef<THREE.Mesh>(null!);
  const compassRingRef = useRef<THREE.Mesh>(null!);
  const pointLightRef = useRef<THREE.PointLight>(null!);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Subtle responsive tilt to mouse pointer
    if (speakerGroupRef.current) {
      speakerGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        speakerGroupRef.current.rotation.y,
        pointer.current[0] * 0.35 + t * 0.08,
        0.05
      );
      speakerGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        speakerGroupRef.current.rotation.x,
        -pointer.current[1] * 0.2 + 0.12,
        0.05
      );
    }

    // Iconic Alexa Signature Rotating Light Ring (Electric Cyan & Neon Azure)
    if (lightRingRef.current) {
      lightRingRef.current.rotation.z = -t * 2.8;
    }

    // Holographic Vertical Projection Cone Beam (Iron Man ALEXA style)
    if (projectionBeamRef.current) {
      projectionBeamRef.current.rotation.y = t * 0.15;
      const mat = projectionBeamRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = 0.22 + Math.sin(t * 3.5) * 0.06;
    }

    // Concentric In-Canvas 3D Holographic Reticle Dials hovering above Alexa
    if (holoRing1Ref.current) {
      holoRing1Ref.current.rotation.z = t * 0.6;
      holoRing1Ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.6) * 0.08;
    }
    if (holoRing2Ref.current) {
      holoRing2Ref.current.rotation.z = -t * 0.85;
      holoRing2Ref.current.rotation.y = Math.PI / 6 + Math.cos(t * 0.5) * 0.12;
    }
    if (holoRing3Ref.current) {
      holoRing3Ref.current.rotation.z = t * 1.3;
    }

    // Floor Holographic Pedestal Compass Ring
    if (compassRingRef.current) {
      compassRingRef.current.rotation.z = -t * 0.25;
    }

    // Floating Holographic Acoustic Voice Orb Pulsation (syncs with heart rate & voice)
    if (voiceOrbRef.current) {
      const pulseSpeed = isSpeaking ? 6.0 : (heartRate / 60) * 2.5;
      const pulse = 1 + Math.sin(t * pulseSpeed) * 0.12;
      voiceOrbRef.current.scale.set(pulse, pulse, pulse);
      voiceOrbRef.current.position.y = 1.05 + Math.sin(t * 2.2) * 0.04;
    }

    // Acoustic Voice Disc inside voice orb
    if (waveDiscRef.current) {
      waveDiscRef.current.rotation.z = t * 2.0;
      const waveScale = 1 + Math.sin(t * 4.5) * 0.08;
      waveDiscRef.current.scale.set(waveScale, waveScale, 1);
    }

    // Dynamic light pulsing
    if (pointLightRef.current) {
      pointLightRef.current.intensity = 3.6 + Math.sin(t * 4) * 0.8;
    }
  });

  return (
    <group ref={speakerGroupRef} position={[0, -0.65, 0]}>
      {/* Dynamic Luminous Cyan / Azure Holographic Lights */}
      <pointLight ref={pointLightRef} color="#00E5FF" intensity={3.8} distance={8} position={[0, 1.2, 0]} />
      <pointLight color="#38BDF8" intensity={2.2} distance={6} position={[0, -0.2, 1.5]} />
      <pointLight color="#818CF8" intensity={1.8} distance={6} position={[-1.2, 0.8, -1.2]} />

      {/* ---------------- 1. Echo Speaker Physical Body ---------------- */}
      {/* Charcoal Matte Fabric Body */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.82, 0.9, 1.35, 48]} />
        <meshStandardMaterial color="#0B1120" roughness={0.4} metalness={0.3} />
      </mesh>

      {/* Weighted Base Ring */}
      <mesh position={[0, -0.68, 0]}>
        <cylinderGeometry args={[0.92, 0.92, 0.08, 48]} />
        <meshStandardMaterial color="#030712" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Top Metallic Bevel Collar */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.06, 48]} />
        <meshStandardMaterial color="#1E293B" roughness={0.25} metalness={0.7} />
      </mesh>

      {/* Recessed Control Pad Face */}
      <mesh position={[0, 0.71, 0]}>
        <cylinderGeometry args={[0.77, 0.77, 0.02, 48]} />
        <meshStandardMaterial color="#0F172A" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Top Buttons: Volume -, Volume +, Alexa Action Button */}
      <mesh position={[0.26, 0.725, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
        <meshStandardMaterial color="#374151" roughness={0.5} />
      </mesh>
      <mesh position={[-0.26, 0.725, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
        <meshStandardMaterial color="#374151" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.725, 0.26]}>
        <cylinderGeometry args={[0.045, 0.045, 0.02, 16]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={1.8} />
      </mesh>

      {/* ------------- 2. SIGNATURE ALEXA CYAN LED LIGHT RING ------------- */}
      {/* Outer Cyan Ring Base */}
      <mesh position={[0, 0.705, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.035, 16, 64]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00E5FF"
          emissiveIntensity={3.5}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>

      {/* Rotating Active Light Segment */}
      <mesh ref={lightRingRef} position={[0, 0.71, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.04, 16, 64, Math.PI * 0.85]} />
        <meshStandardMaterial
          color="#38BDF8"
          emissive="#0284C7"
          emissiveIntensity={4.8}
          roughness={0.05}
        />
      </mesh>

      {/* ------------- 3. HOLOGRAPHIC PROJECTION BEAM (ALEXA STYLE) ------------- */}
      {/* Upward Holographic Light Projection Cone */}
      <mesh ref={projectionBeamRef} position={[0, 1.8, 0]}>
        <cylinderGeometry args={[1.9, 0.78, 2.2, 32, 1, true]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00A8E1"
          emissiveIntensity={1.8}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
          roughness={0.1}
        />
      </mesh>

      {/* Secondary Holographic Wireframe Cone Grid */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[1.92, 0.79, 2.2, 16, 4, true]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.15} wireframe side={THREE.DoubleSide} />
      </mesh>

      {/* ------------- 4. FLOATING HOLOGRAPHIC RETICLES & DATA DIALS ------------- */}
      {/* Reticle Ring 1: Collar Level */}
      <mesh ref={holoRing1Ref} position={[0, 0.95, 0]}>
        <torusGeometry args={[1.05, 0.012, 16, 64]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={2.5} transparent opacity={0.65} />
      </mesh>

      {/* Reticle Ring 2: Mid Holographic Dial */}
      <mesh ref={holoRing2Ref} position={[0, 1.5, 0]}>
        <ringGeometry args={[1.25, 1.35, 48]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      {/* Reticle Ring 3: Top Aperture Ring */}
      <mesh ref={holoRing3Ref} position={[0, 2.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.015, 16, 64]} />
        <meshStandardMaterial color="#00E5FF" emissive="#00E5FF" emissiveIntensity={3.0} transparent opacity={0.7} />
      </mesh>

      {/* ------------- 5. HOLOGRAPHIC ACOUSTIC VOICE AI ORB ------------- */}
      <mesh ref={voiceOrbRef} position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.32, 32, 32]} />
        <meshPhysicalMaterial
          color="#00E5FF"
          emissive="#0284C7"
          emissiveIntensity={2.4}
          roughness={0.1}
          metalness={0.1}
          clearcoat={1.0}
          transmission={0.45}
          thickness={0.5}
        />
      </mesh>

      {/* Undulating Acoustic Core inside voice orb */}
      <mesh ref={waveDiscRef} position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.02, 32]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#8B5CF6"
          emissiveIntensity={3.2}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Holo-Table Circular Radial Floor Pedestal */}
      <mesh position={[0, -0.73, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.1, 2.2, 48]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.18} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={compassRingRef} position={[0, -0.728, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 1.9, 36]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.25} wireframe side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.725, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

// ===========================================================================
// 2. FLOATING STARDUST & GLOWING DATA PARTICLES
// ===========================================================================
const HolographicDataParticles: React.FC<{ count?: number }> = ({ count = 95 }) => {
  const pointsRef = useRef<THREE.Points>(null!);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cyan = new THREE.Color('#00E5FF');
    const azure = new THREE.Color('#38BDF8');
    const violet = new THREE.Color('#818CF8');

    for (let i = 0; i < count; i++) {
      const radius = 0.9 + Math.random() * 3.3;
      const theta = Math.random() * Math.PI * 2;
      const y = -0.6 + Math.random() * 3.4;

      pos[i * 3] = radius * Math.cos(theta);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = radius * Math.sin(theta);

      const c = i % 3 === 0 ? cyan : i % 3 === 1 ? azure : violet;
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.05;
      const posArray = pointsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        posArray[i * 3 + 1] += 0.005;
        if (posArray[i * 3 + 1] > 2.8) {
          posArray[i * 3 + 1] = -0.5;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.7} sizeAttenuation />
    </points>
  );
};

// ===========================================================================
// 3. SCI-FI IRON MAN / ALEXA FLOATING BLUE HUD SCREENS
// Real-time fluctuating heart rate, dynamic health vitals, animated ECG wave,
// popping critical care messages, and sound blips.
// ===========================================================================

interface HudMessage {
  id: string;
  category: 'VITALS' | 'ALERTS' | 'FAMILY' | 'MCP';
  title: string;
  detail: string;
  badge: string;
  time: string;
  urgencyColor: string;
  statusText: string;
}

export const IntroThreeHero: React.FC<{ className?: string }> = ({ className = 'w-full h-full' }) => {
  const pointer = useRef<[number, number]>([0, 0]);

  // -------------------------------------------------------------------------
  // Dynamic ALEXA Telemetry Feed
  // -------------------------------------------------------------------------
  const hudMessages: HudMessage[] = useMemo(
    () => [
      {
        id: 'msg_01',
        category: 'ALERTS',
        title: 'OVERDUE MEDICATION WATCHDOG',
        detail: 'Eleanor Vance: 2:00 PM Eliquis 5mg dose pending voice confirmation. Maya alerted.',
        badge: '🚨 CRITICAL ESCALATION',
        time: '02:45 PM',
        urgencyColor: 'text-rose-400 border-rose-500/50 bg-rose-500/15',
        statusText: 'ACTION REQUIRED',
      },
      {
        id: 'msg_02',
        category: 'FAMILY',
        title: 'REMOTE CAREGIVER BRIDGE',
        detail: 'Maya Vance (San Francisco, 680 mi): "Mom, I noticed you logged your morning Lisinopril. Love you!"',
        badge: '💬 FAMILY DROP-IN ACTIVE',
        time: '01:20 PM',
        urgencyColor: 'text-cyan-400 border-cyan-500/50 bg-cyan-500/15',
        statusText: 'VOICE LINK READY',
      },
      {
        id: 'msg_03',
        category: 'ALERTS',
        title: 'CARDIOLOGY TELEHEALTH VISIT',
        detail: 'Dr. Aris Thorne video review today at 4:30 PM on Living Room Echo Show 15.',
        badge: '📅 APPOINTMENT LOCKED',
        time: '04:30 PM',
        urgencyColor: 'text-amber-400 border-amber-500/50 bg-amber-500/15',
        statusText: 'SYNC CONFIRMED',
      },
      {
        id: 'msg_04',
        category: 'VITALS',
        title: 'CARDIAC BIOMETRICS TELEMETRY',
        detail: 'Heart Rate: 76 BPM (Stable) • BP: 128/82 mmHg • SpO2: 98% Optimal • Sinus Rhythm Verified.',
        badge: '💓 SINUS RHYTHM STABLE',
        time: 'LIVE SYNC',
        urgencyColor: 'text-emerald-400 border-emerald-500/50 bg-emerald-500/15',
        statusText: 'HEALTHY BASELINE',
      },
      {
        id: 'msg_05',
        category: 'MCP',
        title: 'MODEL CONTEXT PROTOCOL STREAM',
        detail: 'Streamable HTTP JSON-RPC 2.0 tool execution: tools/call("check_in_status") in 1.8ms.',
        badge: '⚡ SPEC 2025-11-25',
        time: 'SUB-2MS',
        urgencyColor: 'text-indigo-400 border-indigo-500/50 bg-indigo-500/15',
        statusText: 'RPC CONNECTED',
      },
      {
        id: 'msg_06',
        category: 'VITALS',
        title: 'HYDRATION WATCHDOG GOAL',
        detail: 'Eleanor has completed 4 of 6 daily water glasses. Alexa reminder queued for 3:30 PM.',
        badge: '💧 HYDRATION 67%',
        time: 'ON TRACK',
        urgencyColor: 'text-sky-400 border-sky-500/50 bg-sky-500/15',
        statusText: 'ON SCHEDULE',
      },
    ],
    []
  );

  // -------------------------------------------------------------------------
  // Live Dynamic State (Fluctuating Heart Rate, Vitals & Popping Messages)
  // -------------------------------------------------------------------------
  const [currentMessageIndex, setCurrentMessageIndex] = useState<number>(0);
  const [isAutoCycle, setIsAutoCycle] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'VITALS' | 'ALERTS' | 'FAMILY' | 'MCP'>('ALL');
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(true);

  // Live fluctuating biometrics (like ALEXA Iron Man HUD)
  const [heartRate, setHeartRate] = useState<number>(76);
  const [isHeartPulse, setIsHeartPulse] = useState<boolean>(false);
  const [bloodPressure, setBloodPressure] = useState<string>('126/82');
  const [oxygenSat, setOxygenSat] = useState<number>(98);
  const [coreTemp, setCoreTemp] = useState<number>(98.6);
  const [clockTime, setClockTime] = useState<string>('11:45:00');

  // Popping toast notification modal that pops up on dispatch updates
  const [poppingAlert, setPoppingAlert] = useState<HudMessage | null>(null);
  const [popupVisible, setPopupVisible] = useState<boolean>(false);

  // Filter messages based on category
  const filteredMessages = useMemo(() => {
    if (activeCategory === 'ALL') return hudMessages;
    return hudMessages.filter((m) => m.category === activeCategory);
  }, [hudMessages, activeCategory]);

  const activeMsg = filteredMessages[currentMessageIndex % filteredMessages.length] || hudMessages[0];

  // -------------------------------------------------------------------------
  // 1. Live Heartbeat Pulse & Biometric Fluctuations (Every 1.2 - 2.5s)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const hrInterval = setInterval(() => {
      // Natural HRV (Heart Rate Variability) range: 74 - 78 BPM
      const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
      const newHr = Math.min(82, Math.max(72, 76 + delta));
      setHeartRate(newHr);

      // Trigger heart pulse visual
      setIsHeartPulse(true);
      setTimeout(() => setIsHeartPulse(false), 450);

      // Slight natural fluctuations in vitals
      if (Math.random() > 0.6) {
        setOxygenSat(Math.random() > 0.5 ? 98 : 99);
      }
      if (Math.random() > 0.7) {
        const sys = 126 + (Math.random() > 0.5 ? 2 : -1);
        const dia = 82 + (Math.random() > 0.5 ? 1 : -1);
        setBloodPressure(`${sys}/${dia}`);
      }
    }, 1400);

    return () => clearInterval(hrInterval);
  }, []);

  // -------------------------------------------------------------------------
  // 2. Real-time Clock Sync
  // -------------------------------------------------------------------------
  useEffect(() => {
    const clockInterval = setInterval(() => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // -------------------------------------------------------------------------
  // 3. Popping Alert Dispatch Cycle (Auto cycles every 4.0 seconds)
  // -------------------------------------------------------------------------
  const triggerMessageTransition = useCallback((nextIdx: number) => {
    setCurrentMessageIndex(nextIdx);
    const nextMsg = filteredMessages[nextIdx % filteredMessages.length] || hudMessages[0];

    // Trigger popping alert banner
    setPoppingAlert(nextMsg);
    setPopupVisible(true);

    if (sfxEnabled) {
      soundEngine.playToolBlip();
    }

    // Auto-hide the popping toast banner after 2.6 seconds
    const timer = setTimeout(() => {
      setPopupVisible(false);
    }, 2600);

    return () => clearTimeout(timer);
  }, [filteredMessages, hudMessages, sfxEnabled]);

  useEffect(() => {
    if (!isAutoCycle || filteredMessages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const next = (prev + 1) % filteredMessages.length;
        triggerMessageTransition(next);
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, [isAutoCycle, filteredMessages.length, triggerMessageTransition]);

  // Pointer move handler for 3D mouse parallax
  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    pointer.current = [x, y];
  };

  // Next Message button handler
  const handleNextMessage = () => {
    const next = (currentMessageIndex + 1) % filteredMessages.length;
    triggerMessageTransition(next);
  };

  // Manual Trigger Popup Alert button (Simulate ALEXA popping critical alert)
  const handleSimulateCriticalPopup = () => {
    if (sfxEnabled) {
      soundEngine.playAlertSiren();
    }
    const criticalMsg = hudMessages[0]; // Medication Watchdog
    setPoppingAlert(criticalMsg);
    setPopupVisible(true);
    setTimeout(() => setPopupVisible(false), 3500);
  };

  return (
    <div
      className={`relative w-full h-[430px] sm:h-[490px] md:h-[550px] rounded-3xl overflow-hidden select-none bg-[#030712] border border-cyan-500/35 shadow-[0_0_60px_rgba(0,229,255,0.18)] ${className}`}
      onPointerMove={handlePointerMove}
    >
      {/* ----------------- 1. SCI-FI SCANLINES & CYBER VIGNETTE ----------------- */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/25 via-[#030712]/85 to-[#02050e] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,229,255,0.025)_51%)] bg-[length:100%_4px] pointer-events-none" />

      {/* Cyber Glow Orbs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-cyan-500/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-indigo-500/12 rounded-full blur-3xl pointer-events-none" />

      {/* ----------------- 2. THREE.JS 3D CANVAS (CENTERED ALEXA) ----------------- */}
      <Canvas
        camera={{ position: [0, 1.4, 4.8], fov: 46 }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 4]} intensity={1.5} color="#FFFFFF" />
        <directionalLight position={[-4, -3, -3]} intensity={0.7} color="#00E5FF" />

        <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.25}>
          {/* Central Alexa Echo Device with ALEXA Holographic Light Cone */}
          <AlexaALEXACenterPiece pointer={pointer} isSpeaking={true} heartRate={heartRate} />

          {/* Floating Data Particles */}
          <HolographicDataParticles count={95} />
        </Float>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.75}
          minPolarAngle={Math.PI / 2.5}
          rotateSpeed={0.35}
        />
      </Canvas>

      {/* ----------------- 3. TOP ALEXA STATUS & TELEMETRY BAR ----------------- */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-auto">
        {/* Left: System Reticle & Patient Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#030B17]/90 border border-cyan-500/40 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-[11px] font-black tracking-widest text-cyan-200 uppercase">
              ALEXA
            </span>
            <span className="text-slate-500 font-mono text-[10px]">|</span>
            <span className="text-[10px] font-mono text-cyan-400/90 tracking-wide">
              ELEANOR VANCE (78)
            </span>
          </div>

          <span className="hidden sm:inline-flex text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300">
            ECHO SHOW 15: CONNECTED
          </span>
        </div>

        {/* Center: Live Real-Time Clock */}
        <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#030B17]/80 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 backdrop-blur-md">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{clockTime}</span>
        </div>

        {/* Right: Audio Spectrum Bars & Sound Toggle */}
        <div className="flex items-center gap-2">
          {/* Animated Audio Spectrum Bars */}
          <div className="hidden sm:flex items-end gap-0.5 h-4 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
            {[0.3, 0.7, 1.0, 0.5, 0.8, 0.4, 0.9, 0.6].map((h, i) => (
              <span
                key={i}
                className="w-0.5 bg-cyan-400 rounded-full animate-pulse"
                style={{ height: `${h * 12}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>

          {/* Sound Mute/Unmute Toggle Button */}
          <button
            type="button"
            onClick={() => setSfxEnabled(!sfxEnabled)}
            className="p-1.5 rounded-full bg-[#030B17]/90 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 transition-colors cursor-pointer"
            title={sfxEnabled ? 'SFX Audio Enabled' : 'SFX Audio Muted'}
          >
            {sfxEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          {/* Protocol Badge */}
          <div className="px-2 py-1 rounded-full bg-slate-900/90 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 tracking-wide flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="hidden sm:inline">SPEC 2025-11-25</span>
          </div>
        </div>
      </div>

      {/* ----------------- 4. LEFT HUD: BIOMETRICS & CARDIAC MONITOR (IRON MAN BLUE) ----------------- */}
      <div className="absolute left-3.5 top-14 sm:top-16 z-20 w-44 sm:w-56 pointer-events-auto transition-all duration-300">
        <div className="relative rounded-2xl bg-[#030B17]/85 border border-cyan-500/40 backdrop-blur-xl p-3 shadow-[0_0_30px_rgba(0,229,255,0.2)]">
          {/* Tech Corner Crosshairs */}
          <span className="absolute -top-1 -left-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">┌</span>
          <span className="absolute -top-1 -right-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">┐</span>
          <span className="absolute -bottom-1 -left-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">└</span>
          <span className="absolute -bottom-1 -right-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">┘</span>

          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-cyan-500/30">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-200 uppercase">
                BIOMETRICS HUD
              </span>
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          {/* Real-time Animated ECG Heartbeat Wave SVG */}
          <div className="relative h-9 w-full bg-cyan-950/40 rounded-lg border border-cyan-500/20 overflow-hidden mb-2.5 flex items-center px-1">
            <svg className="w-full h-8" viewBox="0 0 200 40" fill="none">
              <path
                d="M0 20 L30 20 L40 10 L50 30 L60 20 L80 20 L90 5 L100 35 L110 20 L140 20 L150 12 L160 28 L170 20 L200 20"
                stroke="#00E5FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pulse"
              />
            </svg>
            {/* Animated Scanning Beam Bar */}
            <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-pulse pointer-events-none" />
            <div className="absolute right-1.5 top-1 text-[9px] font-mono text-cyan-400 font-bold">
              ECG LIVE
            </div>
          </div>

          {/* Key Vitals Grid with Fluctuating Numbers */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* Fluctuating Heart Rate */}
            <div
              className={`p-1.5 rounded-lg border transition-all duration-300 ${isHeartPulse
                ? 'bg-rose-950/50 border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : 'bg-cyan-950/30 border-cyan-500/20'
                }`}
            >
              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <Heart
                  className={`w-2.5 h-2.5 transition-transform duration-200 ${isHeartPulse ? 'text-rose-400 fill-rose-400 scale-125' : 'text-rose-400 fill-rose-400/40'
                    }`}
                />
                <span>HEART RATE</span>
              </div>
              <div className="text-sm font-extrabold text-cyan-100 flex items-baseline gap-1 mt-0.5">
                <span>{heartRate}</span>
                <span className="text-[9px] font-normal text-cyan-400">BPM</span>
              </div>
            </div>

            {/* Blood Pressure */}
            <div className="p-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
              <div className="text-[9px] text-slate-400">BLOOD PRESS.</div>
              <div className="text-sm font-extrabold text-cyan-100 mt-0.5">{bloodPressure}</div>
            </div>

            {/* SpO2 Oxygen */}
            <div className="p-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
              <div className="text-[9px] text-slate-400">SpO2 OXYGEN</div>
              <div className="text-sm font-extrabold text-emerald-300 flex items-baseline gap-1 mt-0.5">
                <span>{oxygenSat}%</span>
                <span className="text-[8px] text-emerald-400">NORM</span>
              </div>
            </div>

            {/* Core Body Temp */}
            <div className="p-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
              <div className="text-[9px] text-slate-400 flex items-center gap-1">
                <Thermometer className="w-2.5 h-2.5 text-amber-400" />
                <span>CORE TEMP</span>
              </div>
              <div className="text-sm font-extrabold text-amber-300 mt-0.5">{coreTemp}°F</div>
            </div>
          </div>

          {/* Hydration Tracker */}
          <div className="mt-2 p-1.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Droplets className="w-2.5 h-2.5 text-sky-400" />
              <span>HYDRATION</span>
            </span>
            <span className="text-sky-300 font-bold">4 / 6 Glasses</span>
          </div>
        </div>
      </div>

      {/* ----------------- 5. RIGHT HUD: POPPING & CYCLING IMPORTANT MESSAGES (ALEXA STYLE) ----------------- */}
      <div className="absolute right-3.5 top-14 sm:top-16 z-20 w-48 sm:w-64 pointer-events-auto transition-all duration-300">
        <div className="relative rounded-2xl bg-[#030B17]/90 border border-cyan-500/40 backdrop-blur-xl p-3 sm:p-3.5 shadow-[0_0_35px_rgba(0,229,255,0.25)]">
          {/* Tech Corner Crosshairs */}
          <span className="absolute -top-1 -left-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">┌</span>
          <span className="absolute -top-1 -right-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">┐</span>
          <span className="absolute -bottom-1 -left-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">└</span>
          <span className="absolute -bottom-1 -right-1 text-[10px] font-mono text-cyan-400 font-bold leading-none">┘</span>

          {/* Header & Auto-Cycle Switch */}
          <div className="flex items-center justify-between pb-1.5 mb-2.5 border-b border-cyan-500/30">
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
              <span className="text-[10px] font-mono font-bold tracking-wider text-cyan-200 uppercase">
                CRITICAL DISPATCH
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-400">
              <span>
                {(currentMessageIndex % filteredMessages.length) + 1}/{filteredMessages.length}
              </span>
              <button
                type="button"
                onClick={() => setIsAutoCycle(!isAutoCycle)}
                className="p-1 rounded hover:bg-cyan-950 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title={isAutoCycle ? 'Pause Auto Cycle' : 'Resume Auto Cycle'}
              >
                {isAutoCycle ? <Pause className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={handleNextMessage}
                className="p-1 rounded hover:bg-cyan-950 text-cyan-300 hover:text-white transition-colors cursor-pointer"
                title="Next ALEXA Message"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Dynamic Active Message Card with Sci-Fi Scanner Animation */}
          <div className="space-y-2">
            {/* Urgent Badge */}
            <div className="flex items-center justify-between gap-1">
              <span
                className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${activeMsg.urgencyColor}`}
              >
                {activeMsg.badge}
              </span>
              <span className="text-[9px] font-mono text-slate-400">{activeMsg.time}</span>
            </div>

            {/* Title */}
            <h4 className="text-xs font-black tracking-wide text-white uppercase font-mono leading-tight">
              {activeMsg.title}
            </h4>

            {/* Detail Paragraph */}
            <p className="text-[11px] font-sans text-cyan-100/90 leading-relaxed bg-cyan-950/30 p-2 rounded-xl border border-cyan-500/20">
              {activeMsg.detail}
            </p>

            {/* Progress Bar showing countdown until next message pops up */}
            <div className="w-full bg-cyan-950/80 h-1 rounded-full overflow-hidden border border-cyan-500/30">
              <div
                key={activeMsg.id}
                className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 animate-progress"
                style={{ animationDuration: '4.0s' }}
              />
            </div>

            {/* Test Trigger Button: Pop Up ALEXA Alert */}
            <button
              type="button"
              onClick={handleSimulateCriticalPopup}
              className="w-full mt-1 py-1 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
              <span>SIMULATE ALEXA POPUP</span>
            </button>
          </div>
        </div>
      </div>

      {/* ----------------- 6. DYNAMIC POPPING TOAST BANNER (ALEXA BLUE SCREEN POPUP) ----------------- */}
      {popupVisible && poppingAlert && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-[88%] max-w-[380px] pointer-events-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="relative rounded-2xl bg-[#030B17]/95 border-2 border-cyan-400 backdrop-blur-2xl p-4 shadow-[0_0_50px_rgba(0,229,255,0.45)]">
            {/* Tech Corner Crosshairs */}
            <span className="absolute -top-1 -left-1 text-[12px] font-mono text-cyan-300 font-bold leading-none">┌</span>
            <span className="absolute -top-1 -right-1 text-[12px] font-mono text-cyan-300 font-bold leading-none">┐</span>
            <span className="absolute -bottom-1 -left-1 text-[12px] font-mono text-cyan-300 font-bold leading-none">└</span>
            <span className="absolute -bottom-1 -right-1 text-[12px] font-mono text-cyan-300 font-bold leading-none">┘</span>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setPopupVisible(false)}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-cyan-950 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Popup Banner Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="font-mono text-[10px] font-black tracking-widest text-cyan-300 uppercase">
                ALEXA LIVE POPUP // {poppingAlert.statusText}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${poppingAlert.urgencyColor}`}>
                {poppingAlert.badge}
              </span>
              <h3 className="text-xs font-black tracking-wider text-white font-mono uppercase">
                {poppingAlert.title}
              </h3>
              <p className="text-[11px] font-sans text-cyan-100/90 leading-relaxed bg-cyan-950/40 p-2.5 rounded-xl border border-cyan-500/30">
                {poppingAlert.detail}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- 7. BOTTOM HUD: SCI-FI TOPIC NAVIGATION TICKER ----------------- */}
      <div className="absolute bottom-3 inset-x-3 z-20 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pointer-events-auto">
        {/* Category Filter Pills */}
        {(['ALL', 'VITALS', 'ALERTS', 'FAMILY', 'MCP'] as const).map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                if (sfxEnabled) soundEngine.playToolBlip();
                setActiveCategory(cat);
                setCurrentMessageIndex(0);
              }}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer backdrop-blur-md ${isSelected
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(0,229,255,0.8)] scale-105 border border-cyan-300'
                : 'bg-[#030B17]/85 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-950/60 hover:text-white'
                }`}
            >
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default IntroThreeHero;
