import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CareSystemState, AgentVoiceState, CareAlert, MedicationItem, ChatMessage } from './types/care';
import { careService } from './services/careService';
import { soundEngine } from './utils/soundEngine';
import { TopCommandBar } from './components/TopCommandBar';
import { EditorialNavBar, NavView } from './components/EditorialNavBar';
import { Alexa3DCanvas } from './components/Alexa3DCanvas';
import { VoiceSimulatorPanel } from './components/VoiceSimulatorPanel';
import { CaregiverDashboard } from './components/CaregiverDashboard';
import { CaregiverPhoneToast } from './components/CaregiverPhoneToast';
import { McpProtocolInspector } from './components/McpProtocolInspector';
import { Sparkles, X, Heart, Activity, Droplets, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export const App: React.FC = () => {
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('auracare_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  // Navigation State
  const [currentView, setCurrentView] = useState<NavView>('SPATIAL_HUB');

  // Care System State
  const [state, setState] = useState<CareSystemState>(careService.getState());
  const [voiceState, setVoiceState] = useState<AgentVoiceState>(careService.getVoiceState());
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeToastAlert, setActiveToastAlert] = useState<CareAlert | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(soundEngine.getIsMuted());

  // Auto-Demo Director state
  const [isAutoDemoRunning, setIsAutoDemoRunning] = useState<boolean>(false);
  const [autoDemoStep, setAutoDemoStep] = useState<number>(0);
  const [autoDemoStory, setAutoDemoStory] = useState<string>('');
  const [autoDemoTimeRemaining, setAutoDemoTimeRemaining] = useState<number>(90);
  const autoDemoTimerRef = useRef<any>(null);
  const autoDemoCountdownRef = useRef<any>(null);

  // Sync theme with HTML class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('auracare_theme', theme);
  }, [theme]);

  // Keyboard shortcuts (T for theme, 1-4 for views)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        handleToggleTheme();
      } else if (e.key === '1') {
        setCurrentView('SPATIAL_HUB');
      } else if (e.key === '2') {
        setCurrentView('CAREGIVER_BRIDGE');
      } else if (e.key === '3') {
        setCurrentView('MCP_LAB');
      } else if (e.key === '4') {
        setCurrentView('DUAL_STAGE');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme]);

  // Subscribe to service changes
  useEffect(() => {
    const unsubState = careService.subscribe((newState) => setState(newState));
    const unsubVoice = careService.subscribeVoiceState((newVs) => setVoiceState(newVs));
    const unsubTool = careService.subscribeActiveTool((tool) => setActiveTool(tool));
    const unsubChat = careService.subscribeChatHistory((msgs) => setChatMessages(msgs));
    const unsubToast = careService.subscribeToast((alert) => setActiveToastAlert(alert));

    return () => {
      unsubState();
      unsubVoice();
      unsubTool();
      unsubChat();
      unsubToast();
    };
  }, []);

  // --- Handlers ---
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleSendMessage = (msg: string) => {
    careService.handleAgentUtterance(msg);
  };

  const handlePillClick = (med: MedicationItem) => {
    careService.handleAgentUtterance(`Alexa, I just took my ${med.name}`);
  };

  const handleScenarioTrigger = (
    key: 'LOG_ELIQUIS' | 'CHECK_SCHEDULE' | 'ESCALATE_CHECKIN' | 'BOOK_APPOINTMENT'
  ) => {
    switch (key) {
      case 'LOG_ELIQUIS':
        careService.handleAgentUtterance('Alexa, I just took my afternoon Eliquis pill with a glass of water');
        break;
      case 'CHECK_SCHEDULE':
        careService.handleAgentUtterance("Alexa, what's my medication and doctor schedule today?");
        break;
      case 'ESCALATE_CHECKIN':
        careService.handleAgentUtterance("Alexa, Eleanor is having chest tightness and hasn't answered!");
        break;
      case 'BOOK_APPOINTMENT':
        careService.handleAgentUtterance('Alexa, schedule an eye exam with Dr. Priya Patel for tomorrow at 2:00 PM');
        break;
    }
  };

  const handleDirectMcpInvoke = async (toolName: string, args: Record<string, unknown>) => {
    if (toolName === 'log_medication_taken') {
      await careService.logMedicationTaken(
        (args.medication_id as string) || 'med_2',
        args.notes as string,
        'MCP Inspector Direct Test'
      );
    } else if (toolName === 'get_today_schedule') {
      await careService.getTodaySchedule();
    } else if (toolName === 'check_in_status') {
      await careService.checkInStatus((args.distress_level as any) || 'HIGH', args.note as string);
    } else if (toolName === 'add_appointment') {
      await careService.addAppointment(
        (args.title as string) || 'Doctor Follow-up',
        (args.specialty as string) || 'General',
        (args.date as string) || 'Tomorrow',
        (args.time as string) || '2:00 PM',
        (args.location as string) || 'Clinic'
      );
    } else if (toolName === 'notify_caregiver') {
      await careService.notifyCaregiver(
        (args.channel as string) || 'PUSH_AND_SMS',
        (args.urgency as any) || 'HIGH',
        (args.message as string) || 'Direct MCP trigger test'
      );
    }
  };

  const handleResetDemo = () => {
    stopAutoDemo();
    careService.resetDemo();
    setActiveToastAlert(null);
  };

  // --- 90-Second Choreographed Judge Auto-Demo Director ---
  const stopAutoDemo = useCallback(() => {
    setIsAutoDemoRunning(false);
    setAutoDemoStep(0);
    setAutoDemoStory('');
    if (autoDemoTimerRef.current) clearTimeout(autoDemoTimerRef.current);
    if (autoDemoCountdownRef.current) clearInterval(autoDemoCountdownRef.current);
  }, []);

  const runAutoDemoSequence = useCallback(() => {
    setIsAutoDemoRunning(true);
    setAutoDemoTimeRemaining(75);
    setCurrentView('DUAL_STAGE'); // Switch to dual stage for optimal judge visibility

    // Countdown interval
    autoDemoCountdownRef.current = setInterval(() => {
      setAutoDemoTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(autoDemoCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Step 1: Baseline inspection
    setAutoDemoStep(1);
    setAutoDemoStory(
      'Scene 1/4: Eleanor Vance (78, Portland, OR). Her 2:00 PM Eliquis dose is overdue. Notice the red 3D capsule, 50% adherence gauge, and warning status.'
    );

    // Step 2 (at 4s): Log Eliquis
    autoDemoTimerRef.current = setTimeout(() => {
      setAutoDemoStep(2);
      setAutoDemoStory(
        'Scene 2/4: Eleanor speaks: "Alexa, I just took my afternoon Eliquis pill". MCP log_medication_taken executes. 3D capsule turns green, adherence jumps to 75%, and Maya receives an instant push notification in Seattle!'
      );
      careService.handleAgentUtterance('Alexa, I just took my afternoon Eliquis pill with a glass of water');

      // Step 3 (at 20s): Book Doctor Appointment
      autoDemoTimerRef.current = setTimeout(() => {
        setAutoDemoStep(3);
        setAutoDemoStory(
          'Scene 3/4: Voice Care Coordination: Eleanor asks Alexa+ to schedule a retinal exam with Dr. Priya Patel. MCP add_appointment adds it to both her schedule and Maya’s synced dashboard.'
        );
        careService.handleAgentUtterance(
          'Alexa, could you schedule an eye exam with Dr. Priya Patel for tomorrow at 2:00 PM?'
        );

        // Step 4 (at 38s): Emergency Escalation Check
        autoDemoTimerRef.current = setTimeout(() => {
          setAutoDemoStep(4);
          setAutoDemoStory(
            'Scene 4/4: Emergency Guardian Escalate: Eleanor is unresponsive to proactive wellness prompt. MCP check_in_status sets status to CRITICAL, triggers alert sirens, and alerts Maya immediately.'
          );
          careService.handleAgentUtterance(
            'Alexa, Eleanor has not responded to the proactive living room check-in prompt!'
          );

          // Step 5 (at 56s): Safe Resolution
          autoDemoTimerRef.current = setTimeout(() => {
            setAutoDemoStory(
              'Resolution: Eleanor checks in verbally ("I\'m okay, just stepped outside for fresh air"). MCP resets status back to Healthy, reassuring Maya 680 miles away.'
            );
            careService.handleAgentUtterance("Alexa, I'm okay now, just stepped outside for fresh air");

            // Finish demo at 72s
            autoDemoTimerRef.current = setTimeout(() => {
              stopAutoDemo();
            }, 14000);
          }, 18000);
        }, 18000);
      }, 16000);
    }, 4000);
  }, [stopAutoDemo]);

  const hasOverdueMed = state.medications.some((m) => m.status === 'OVERDUE');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-400 selection:bg-cyan-500/30 selection:text-cyan-900 dark:selection:text-cyan-200">
      {/* Top Command Bar */}
      <TopCommandBar
        theme={theme}
        isLiveBackend={careService.getIsLiveBackend()}
        isAudioMuted={isAudioMuted}
        isAutoDemoRunning={isAutoDemoRunning}
        autoDemoStep={autoDemoStep}
        totalDemoSteps={4}
        autoDemoTimeRemaining={autoDemoTimeRemaining}
        onToggleTheme={handleToggleTheme}
        onToggleAudio={handleToggleAudio}
        onStartAutoDemo={runAutoDemoSequence}
        onPauseAutoDemo={stopAutoDemo}
        onResetDemo={handleResetDemo}
      />

      {/* Auto-Demo Live Narrative Banner */}
      {isAutoDemoRunning && (
        <div className="w-full bg-gradient-to-r from-cyan-900/90 via-indigo-900/90 to-slate-900/90 border-b border-cyan-400/50 px-4 py-2 text-xs text-white flex items-center justify-between shadow-lg animate-pulse z-30">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="font-semibold">{autoDemoStory}</span>
          </div>
          <button
            onClick={stopAutoDemo}
            className="text-slate-300 hover:text-white p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editorial Pill Navigation Bar (Inspired by aengel.io & byotone.com) */}
      <EditorialNavBar
        currentView={currentView}
        onSelectView={(v) => setCurrentView(v)}
        hasOverdueMed={hasOverdueMed}
        mcpFrameCount={state.mcp_telemetry_log.length}
      />

      {/* Main Content Area - Unclustered Page Views */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 transition-all duration-300">
        {/* VIEW 01: SPATIAL LIVING HUB (Dedicated 3D Living Room Focus) */}
        {currentView === 'SPATIAL_HUB' && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Quick Hero Banner with Living Room Context */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800">
                  CHAPTER 01 / LIVING ROOM
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Echo Show 15 Spatial Hub • Eleanor Vance (78)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ambient voice recognition, morphing Three.js 3D AI orb, and smart medication orbital dispenser.
                  </p>
                </div>
              </div>

              {/* Vitals Telemetry Glance */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span className="font-bold">{state.patient.vitals.heart_rate} BPM</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span className="font-bold">{state.patient.vitals.blood_pressure}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <Droplets className="w-4 h-4 text-sky-500" />
                  <span className="font-bold">
                    {state.patient.vitals.hydration_glasses}/{state.patient.vitals.hydration_goal} glasses
                  </span>
                </div>
              </div>
            </div>

            {/* Expansive 2-Column Showcase */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* 3D Canvas Centerpiece (7 cols) */}
              <div className="lg:col-span-7 h-[540px] w-full">
                <Alexa3DCanvas
                  state={state}
                  voiceState={voiceState}
                  activeTool={activeTool}
                  theme={theme}
                  onPillClick={handlePillClick}
                />
              </div>

              {/* Voice Simulator & Scenario Panel (5 cols) */}
              <div className="lg:col-span-5 h-[540px]">
                <VoiceSimulatorPanel
                  voiceState={voiceState}
                  activeTool={activeTool}
                  chatMessages={chatMessages}
                  onSendMessage={handleSendMessage}
                  onScenarioTrigger={handleScenarioTrigger}
                  onSelectToolLog={() => setCurrentView('MCP_LAB')}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 02: CAREGIVER COMMAND BRIDGE (Maya's 680-Mile Dashboard) */}
        {currentView === 'CAREGIVER_BRIDGE' && (
          <div className="flex flex-col gap-4 animate-fade-in max-w-5xl mx-auto">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 px-2.5 py-1 rounded-full bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200 dark:border-cyan-800">
                CHAPTER 02 / REMOTE COMMAND
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Synchronized live over WebSockets at &lt;10ms latency
              </span>
            </div>

            <CaregiverDashboard
              state={state}
              onLogMedication={(medId) => careService.logMedicationTaken(medId, 'Logged via Caregiver Portal')}
              onAddHydration={() => careService.addHydrationGlass()}
            />
          </div>
        )}

        {/* VIEW 03: MCP PROTOCOL LAB (Deep-Dive Spec 2025-11-25 Station) */}
        {currentView === 'MCP_LAB' && (
          <div className="flex flex-col gap-4 animate-fade-in max-w-6xl mx-auto">
            {/* Architectural Explanation Header */}
            <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800">
                    CHAPTER 03 / MCP SPEC 2025-11-25
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Streamable HTTP JSON-RPC 2.0 Protocol Terminal
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Every voice query from Eleanor invokes real Model Context Protocol (MCP) tool frames. Inspect raw payloads, measure transport latency, or fire direct tool calls.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Spec Compliant</span>
                </span>
              </div>
            </div>

            {/* Full-Height Protocol Inspector */}
            <McpProtocolInspector
              frames={state.mcp_telemetry_log}
              onDirectInvoke={handleDirectMcpInvoke}
              isFullView={true}
            />
          </div>
        )}

        {/* VIEW 04: DUAL STAGE (Split Mode for Hackathon Judges) */}
        {currentView === 'DUAL_STAGE' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-fade-in">
            {/* Left Stage (5 cols): 3D Alexa+ Living Room Canvas + Voice Panel */}
            <section className="lg:col-span-5 flex flex-col gap-4">
              <div className="h-[430px] w-full">
                <Alexa3DCanvas
                  state={state}
                  voiceState={voiceState}
                  activeTool={activeTool}
                  theme={theme}
                  onPillClick={handlePillClick}
                />
              </div>

              <VoiceSimulatorPanel
                voiceState={voiceState}
                activeTool={activeTool}
                chatMessages={chatMessages}
                onSendMessage={handleSendMessage}
                onScenarioTrigger={handleScenarioTrigger}
                onSelectToolLog={() => setCurrentView('MCP_LAB')}
              />
            </section>

            {/* Right Stage (7 cols): Caregiver Dashboard + Docked MCP Inspector */}
            <section className="lg:col-span-7 flex flex-col gap-4">
              <CaregiverDashboard
                state={state}
                onLogMedication={(medId) => careService.logMedicationTaken(medId, 'Logged via Caregiver Portal')}
                onAddHydration={() => careService.addHydrationGlass()}
              />

              <McpProtocolInspector
                frames={state.mcp_telemetry_log}
                onDirectInvoke={handleDirectMcpInvoke}
              />
            </section>
          </div>
        )}
      </main>

      {/* Slide-In Caregiver iPhone Push Alert Notification */}
      <CaregiverPhoneToast
        alert={activeToastAlert}
        onDismiss={() => setActiveToastAlert(null)}
        onAcknowledge={(alertId) => careService.acknowledgeAlert(alertId)}
      />

      {/* Editorial Footer Inspired by aengel.io */}
      <footer className="w-full border-t border-slate-200/90 dark:border-slate-800/80 bg-white/50 dark:bg-[#060a12]/50 py-3 px-6 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3 transition-colors duration-400">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300">AuraCare</span>
          <span>•</span>
          <span>Amazon Developer Hackathon (Build, Ship, Shape)</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500 font-mono text-[10px]">
          <span>Three.js / WebGL</span>
          <span>•</span>
          <span>Web Audio &amp; Speech API</span>
          <span>•</span>
          <span>MCP Spec 2025-11-25</span>
          <span>•</span>
          <span className="text-cyan-600 dark:text-cyan-400">Press &apos;T&apos; to toggle theme</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
