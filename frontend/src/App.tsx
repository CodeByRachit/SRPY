import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CareSystemState, AgentVoiceState, CareAlert, ChatMessage } from './types/care';
import { careService } from './services/careService';
import { soundEngine } from './utils/soundEngine';
import { CaregiverDashboard } from './components/CaregiverDashboard';
import { AlexaMcpSimulator } from './components/AlexaMcpSimulator';
import { CaregiverPhoneToast } from './components/CaregiverPhoneToast';
import { CuteThemeToggle } from './components/CuteThemeToggle';
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Layers,
  Dice5,
} from 'lucide-react';

export const App: React.FC = () => {
  // Theme State - Default to Warm Spatial Light Theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('auracare_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Care System State (Connected directly to backend & WebSocket)
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
  const [autoDemoTimeRemaining, setAutoDemoTimeRemaining] = useState<number>(75);
  const autoDemoCountdownRef = useRef<any>(null);
  const cancelDemoRef = useRef<boolean>(false);

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

  // Keyboard shortcut: T for theme toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        handleToggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [theme]);

  // Subscribe to careService backend updates
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

  // Handlers
  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleAudio = () => {
    const muted = soundEngine.toggleMute();
    setIsAudioMuted(muted);
  };

  const handleSendMessage = (msg: string) => {
    careService.sendVoiceCommand(msg);
  };

  const handleScenarioTrigger = (
    key: 'LOG_ELIQUIS' | 'GET_SCHEDULE' | 'MISSED_CHECKIN_ESCALATION' | 'ADD_APPOINTMENT'
  ) => {
    switch (key) {
      case 'LOG_ELIQUIS':
        careService.sendVoiceCommand(
          'Alexa, I just took my afternoon Eliquis pill with a glass of water',
          'LOG_ELIQUIS'
        );
        break;
      case 'GET_SCHEDULE':
        careService.sendVoiceCommand("Alexa, what's my care schedule for today?", 'GET_SCHEDULE');
        break;
      case 'MISSED_CHECKIN_ESCALATION':
        careService.sendVoiceCommand(
          'Alexa, Eleanor did not respond to the living room check-in chime!',
          'MISSED_CHECKIN_ESCALATION'
        );
        break;
      case 'ADD_APPOINTMENT':
        careService.sendVoiceCommand(
          'Alexa, schedule an eye exam with Dr. Priya Patel for tomorrow at 2:00 PM',
          'ADD_APPOINTMENT'
        );
        break;
    }
  };

  const stopAutoDemo = useCallback(() => {
    cancelDemoRef.current = true;
    setIsAutoDemoRunning(false);
    setAutoDemoStep(0);
    setAutoDemoStory('');
    if (autoDemoCountdownRef.current) clearInterval(autoDemoCountdownRef.current);
  }, []);

  const handleResetDemo = () => {
    stopAutoDemo();
    careService.resetBackendState();
    setActiveToastAlert(null);
  };

  const handleRandomizeScenario = () => {
    stopAutoDemo();
    careService.randomizeBackendState();
  };

  // Helper function to synthesize speech and wait for Alexa+'s reply
  const speakAndWait = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (soundEngine.getIsMuted() || !text) {
        setTimeout(resolve, 2000);
        return;
      }
      soundEngine.speak(text, {
        onEnd: () => setTimeout(resolve, 800),
        onError: () => setTimeout(resolve, 1500),
      });
    });
  };

  // 90-Second Backend-Driven Judge Auto-Demo Director (Steps 1..4 on Python Backend)
  const runAutoDemoSequence = useCallback(async () => {
    cancelDemoRef.current = false;
    setIsAutoDemoRunning(true);
    setAutoDemoTimeRemaining(75);

    autoDemoCountdownRef.current = setInterval(() => {
      setAutoDemoTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(autoDemoCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const stepStories = [
      'Scene 1/4: Alexa+ checks Eleanor’s schedule via get_today_schedule & flags overdue Eliquis 5mg.',
      'Scene 2/4: Eleanor confirms taking Eliquis; log_medication_taken clears alert & updates adherence to 75%!',
      'Scene 3/4: Voice Care Scheduling: Eleanor schedules an eye exam via MCP add_appointment.',
      'Scene 4/4: Emergency Watchdog: Proactive check-in detected no reply; check_in_status escalates patient to CRITICAL and alerts Maya.',
    ];

    for (let step = 1; step <= 4; step++) {
      if (cancelDemoRef.current) break;
      setAutoDemoStep(step);
      setAutoDemoStory(stepStories[step - 1]);

      const res = await careService.runBackendDemoStep(step);
      if (cancelDemoRef.current) break;

      if (res.reply) {
        await speakAndWait(res.reply);
      }
      if (cancelDemoRef.current) break;

      await new Promise((r) => setTimeout(r, 1200));
    }

    setIsAutoDemoRunning(false);
    setAutoDemoStep(0);
    setAutoDemoStory('');
    if (autoDemoCountdownRef.current) clearInterval(autoDemoCountdownRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F2EE] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-400 selection:bg-cyan-500/30 selection:text-cyan-900 p-2 sm:p-4 md:p-6 justify-center items-center">
      {/* 1. Floating Top Command Bar (Judge Controls & Status) */}
      <div className="max-w-[1340px] w-full flex flex-wrap items-center justify-between gap-3 mb-3 px-2">
        {/* Brand & Connection Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
              AuraCare <span className="text-cyan-600 font-light">Alexa+</span>
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-mono font-semibold shadow-sm transition-colors ${
              careService.getIsLiveBackend()
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
            }`}
          >
            <Radio
              className={`w-3 h-3 ${
                careService.getIsLiveBackend()
                  ? 'text-emerald-600 dark:text-emerald-400 animate-pulse'
                  : 'text-amber-600 dark:text-amber-400 animate-ping'
              }`}
            />
            <span>
              {careService.getIsLiveBackend() ? 'LIVE BACKEND WS :8000' : 'CONNECTING TO BACKEND :8000'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-800 dark:text-indigo-300 text-[11px] font-mono">
            <Layers className="w-3 h-3 text-indigo-500" />
            <span>MCP Spec 2025-11-25 • Streamable HTTP</span>
          </div>
        </div>

        {/* Action Buttons: 90s Judge Auto-Demo, Randomize Scenario, Reset, Audio, Theme */}
        <div className="flex items-center gap-2">
          {/* Audio Synthesizer Toggle */}
          <button
            onClick={handleToggleAudio}
            className={`tactile-pill px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
              isAudioMuted
                ? 'text-slate-400 hover:text-slate-600'
                : 'text-cyan-800 dark:text-cyan-300 font-bold'
            }`}
            title={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
                <span className="hidden sm:inline">Sound ON</span>
              </>
            )}
          </button>

          {/* New Backend Scenario Button */}
          <button
            onClick={handleRandomizeScenario}
            className="tactile-pill px-3 py-1.5 rounded-xl text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600/50 text-xs font-semibold flex items-center gap-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all shadow-sm"
            title="Generate fresh eldercare scenario dynamically on Python backend"
          >
            <Dice5 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">🎲 New Scenario</span>
          </button>

          {/* 90-Second Judge Auto-Demo Director CTA */}
          <button
            onClick={isAutoDemoRunning ? stopAutoDemo : runAutoDemoSequence}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
              isAutoDemoRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse shadow-amber-600/30'
                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/30 hover:-translate-y-0.5'
            }`}
          >
            {isAutoDemoRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>
                  Demo ({autoDemoStep}/4) • {autoDemoTimeRemaining}s
                </span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play 90s Judge Demo</span>
              </>
            )}
          </button>

          {/* Reset Demo State Button */}
          <button
            onClick={handleResetDemo}
            className="tactile-pill px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
            title="Reset to initial seed state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          {/* Cute Theme Toggle */}
          <CuteThemeToggle theme={theme} onToggle={handleToggleTheme} />
        </div>
      </div>

      {/* Auto-Demo Live Narrative Bar */}
      {isAutoDemoRunning && (
        <div className="max-w-[1340px] w-full glass-card border border-cyan-400/40 px-4 py-2 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between shadow-md mb-3 rounded-2xl animate-fade-in">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-mono font-bold text-[10px] shrink-0">
              SCENE {autoDemoStep}/4
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
              {autoDemoStory}
            </span>
          </div>
          <button
            onClick={stopAutoDemo}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. THE MASTER GLASS SLAB */}
      <main className="max-w-[1340px] w-full glass-slab p-3 sm:p-4.5 flex flex-col lg:flex-row items-stretch gap-4 min-h-[660px]">
        {/* Left Column (approx 65% width): Caregiver Dashboard */}
        <div className="lg:w-[65%] w-full flex flex-col">
          <CaregiverDashboard
            state={state}
            activeTool={activeTool}
            onLogMedication={(medId) =>
              careService.callMcpToolDirect('log_medication_taken', { medication_id: medId })
            }
            onAddHydration={() => careService.addHydrationGlass()}
          />
        </div>

        {/* Right Column (approx 35% width): Alexa+ MCP Simulator */}
        <div className="lg:w-[35%] w-full flex flex-col">
          <AlexaMcpSimulator
            voiceState={voiceState}
            activeTool={activeTool}
            chatMessages={chatMessages}
            mcpFrames={state.mcp_telemetry_log}
            onSendMessage={handleSendMessage}
            onScenarioTrigger={handleScenarioTrigger}
          />
        </div>
      </main>

      {/* Slide-In Caregiver iPhone Push Alert Notification */}
      <CaregiverPhoneToast
        alert={activeToastAlert}
        onDismiss={() => setActiveToastAlert(null)}
        onAcknowledge={(alertId) => careService.acknowledgeAlert(alertId)}
      />

      {/* Subtle Bottom Credit */}
      <footer className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-3 font-mono">
        <span>AuraCare • AWS Builder Hackathon (Alexa+ Track)</span>
        <span>•</span>
        <span>Press &apos;T&apos; to toggle theme</span>
      </footer>
    </div>
  );
};

export default App;
