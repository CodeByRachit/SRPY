import React from 'react';
import {
  Activity,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Radio,
  Cpu,
  Layers,
  Pause,
} from 'lucide-react';
import { CuteThemeToggle } from './CuteThemeToggle';

interface TopCommandBarProps {
  theme: 'dark' | 'light';
  isLiveBackend: boolean;
  isAudioMuted: boolean;
  isAutoDemoRunning: boolean;
  autoDemoStep: number;
  totalDemoSteps: number;
  autoDemoTimeRemaining: number;
  onToggleTheme: () => void;
  onToggleAudio: () => void;
  onStartAutoDemo: () => void;
  onPauseAutoDemo: () => void;
  onResetDemo: () => void;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({
  theme,
  isLiveBackend,
  isAudioMuted,
  isAutoDemoRunning,
  autoDemoStep,
  totalDemoSteps,
  autoDemoTimeRemaining,
  onToggleTheme,
  onToggleAudio,
  onStartAutoDemo,
  onPauseAutoDemo,
  onResetDemo,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-[#080d19]/80 border-b border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xl px-4 py-2.5 shadow-sm transition-colors duration-400">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Editorial Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-600 to-indigo-600 shadow-md shadow-cyan-500/20">
            <Activity className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>AuraCare</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-light">Alexa+</span>
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-cyan-950/80 text-slate-600 dark:text-cyan-300 border border-slate-200 dark:border-cyan-800/70">
                Hackathon Primary Track: Alexa+
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Spatial Voice Caregiving &amp; Remote Family Bridge
            </p>
          </div>
        </div>

        {/* Status & Architecture Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Connection Status: LIVE BACKEND vs AUTONOMOUS CLIENT */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              isLiveBackend
                ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-cyan-50 dark:bg-cyan-950/70 border-cyan-300 dark:border-cyan-500/50 text-cyan-800 dark:text-cyan-300'
            }`}
          >
            <Radio
              className={`w-3 h-3 ${
                isLiveBackend ? 'text-emerald-600 dark:text-emerald-400 animate-pulse' : 'text-cyan-600 dark:text-cyan-400'
              }`}
            />
            <span>
              {isLiveBackend ? 'LIVE BACKEND WS :8000' : 'AUTONOMOUS CLIENT MCP ENGINE'}
            </span>
          </div>

          {/* MCP Spec Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-indigo-950/70 border border-slate-200 dark:border-indigo-500/50 text-slate-700 dark:text-indigo-300 text-[11px] font-mono">
            <Layers className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
            <span>MCP Spec 2025-11-25 • Streamable HTTP</span>
          </div>

          {/* AWS Bedrock Badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono">
            <Cpu className="w-3 h-3 text-amber-500 dark:text-amber-400" />
            <span>AWS Bedrock Converse API</span>
          </div>
        </div>

        {/* Action Controls + Cute Theme Toggle */}
        <div className="flex items-center gap-2">
          {/* Audio Mute Toggle */}
          <button
            onClick={onToggleAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isAudioMuted
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
                : 'bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-500/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 shadow-sm'
            }`}
            title={isAudioMuted ? 'Unmute Web Speech & Audio' : 'Mute Web Speech & Audio'}
          >
            {isAudioMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                <span className="hidden sm:inline">Voice Synthesizer ON</span>
              </>
            )}
          </button>

          {/* 90-Second Judge Auto-Demo Director Button */}
          <button
            onClick={isAutoDemoRunning ? onPauseAutoDemo : onStartAutoDemo}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              isAutoDemoRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse shadow-amber-600/30'
                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/30'
            }`}
          >
            {isAutoDemoRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>
                  Demo Running ({autoDemoStep}/{totalDemoSteps}) • {autoDemoTimeRemaining}s
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
            onClick={onResetDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all"
            title="Reset to 2:45 PM initial state"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          {/* Cute Theme Toggle */}
          <CuteThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
};
