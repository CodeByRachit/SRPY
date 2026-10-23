import React, { useState } from 'react';
import { AgentVoiceState, ChatMessage, McpTelemetryFrame } from '../types/care';
import { AlexaVoiceOrbCanvas } from './Alexa3DCanvas';
import { ExternalLink, Sparkles, Mic, MicOff, Send } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface AlexaMcpSimulatorProps {
  voiceState: AgentVoiceState;
  activeTool: string | null;
  chatMessages: ChatMessage[];
  mcpFrames: McpTelemetryFrame[];
  onSendMessage: (msg: string) => void;
  onScenarioTrigger: (scenarioKey: 'LOG_ELIQUIS' | 'GET_SCHEDULE' | 'MISSED_CHECKIN_ESCALATION' | 'ADD_APPOINTMENT') => void;
}

export const AlexaMcpSimulator: React.FC<AlexaMcpSimulatorProps> = ({
  voiceState,
  activeTool,
  chatMessages,
  mcpFrames,
  onSendMessage,
  onScenarioTrigger,
}) => {
  const [inputText, setInputText] = useState('');
  const [isMicListening, setIsMicListening] = useState(false);

  // Latest conversational utterance
  const latestMessage = chatMessages[chatMessages.length - 1];
  const defaultQuote = '“Evelyn, would you like me to check your afternoon schedule?”';
  const displayQuote = latestMessage
    ? `“${latestMessage.text}”`
    : defaultQuote;

  const handleMicToggle = () => {
    if (isMicListening) {
      soundEngine.stopSpeechRecognition();
      setIsMicListening(false);
    } else {
      const started = soundEngine.startSpeechRecognition(
        (transcript) => {
          setInputText(transcript);
          onSendMessage(transcript);
          setInputText('');
          setIsMicListening(false);
        },
        (listening) => {
          setIsMicListening(listening);
        },
        (err) => {
          console.warn('Mic error or permission denied:', err);
          setIsMicListening(false);
        }
      );
      if (!started) {
        setInputText('Alexa, I just took my afternoon Eliquis pill');
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const voiceStatusLabel =
    voiceState === 'SPEAKING'
      ? 'Alexa+ Speaking...'
      : voiceState === 'LISTENING' || isMicListening
      ? 'Alexa+ Listening...'
      : voiceState === 'THINKING' || activeTool !== null
      ? 'Alexa+ Thinking & Dispatching...'
      : voiceState === 'ALERT'
      ? 'Alexa+ Alert Active'
      : 'Alexa+ Listening...';

  return (
    <div className="flex flex-col h-full glass-card rounded-3xl p-5 sm:p-6 justify-between gap-5 select-none transition-all">
      {/* 1. Header: Alexa+ MCP Simulator + Active Pill */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-white/60 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Alexa+ MCP Simulator
          </h2>
          <div className="px-3 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-amber-950/80 border border-[#FCD34D] dark:border-amber-600/50 text-[#D97706] dark:text-amber-300 text-xs font-bold shadow-sm">
            Active
          </div>
        </div>

        {/* 2. Voice Interaction Section (Orb + Transcript + Clean Voice Input) */}
        <div className="pt-4">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">
            Voice Interaction
          </h3>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* 3D Glowing Spatial Voice Orb */}
            <div className="shrink-0 flex items-center justify-center">
              <AlexaVoiceOrbCanvas
                voiceState={voiceState}
                activeTool={activeTool}
                className="w-24 h-24 sm:w-28 sm:h-28"
              />
            </div>

            {/* Voice Status & Live Conversational Quote */}
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-xs text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    voiceState === 'LISTENING' || isMicListening
                      ? 'bg-rose-500 animate-ping'
                      : voiceState === 'SPEAKING'
                      ? 'bg-cyan-500 animate-pulse'
                      : 'bg-emerald-500'
                  }`}
                />
                <span>{voiceStatusLabel}</span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed font-normal line-clamp-3">
                {displayQuote}
              </p>
            </div>
          </div>

          {/* Dedicated Clean Space for Voice Input / Text Command to Backend */}
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2 mt-3.5 pt-3 border-t border-slate-200/60 dark:border-slate-800">
            <button
              type="button"
              onClick={handleMicToggle}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
                isMicListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                  : 'tactile-pill text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
              title={isMicListening ? 'Stop listening' : 'Speak to Alexa+'}
            >
              {isMicListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Speak or type to Alexa+..."
              className="flex-1 bg-white/75 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-cyan-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all shadow-sm active:scale-95 shrink-0"
              title="Send to Alexa+"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Scenario Chips */}
          <div className="grid grid-cols-2 gap-2 mt-2.5">
            <button
              onClick={() => onScenarioTrigger('LOG_ELIQUIS')}
              className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="truncate">Log Afternoon Meds</span>
            </button>
            <button
              onClick={() => onScenarioTrigger('GET_SCHEDULE')}
              className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
              <span className="truncate">Check Schedule</span>
            </button>
            <button
              onClick={() => onScenarioTrigger('MISSED_CHECKIN_ESCALATION')}
              className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">Escalate Alert</span>
            </button>
            <button
              onClick={() => onScenarioTrigger('ADD_APPOINTMENT')}
              className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">Book Doctor Visit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MCP Tool Execution Log Section (Exact match to reference image terminal) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
            MCP Tool Execution Log
          </h3>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
        </div>

        {/* Frosted Terminal Code Card */}
        <div className="relative rounded-2xl bg-[#F8F7F4]/90 dark:bg-[#0B101E]/90 border border-slate-200/80 dark:border-slate-800 p-3.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 shadow-inner overflow-hidden">
          <div className="space-y-1 overflow-x-auto select-text max-h-[170px] overflow-y-auto pr-1">
            {/* Primary lines matching reference image */}
            <div className="text-slate-800 dark:text-slate-200">
              <span className="font-bold text-indigo-700 dark:text-indigo-400">[MCP]</span> call_tool(&quot;get_medications&quot;, patient_id=&quot;evelyn_carter&quot;)
            </div>

            <div className="text-slate-800 dark:text-slate-200">
              <span className="font-bold text-indigo-700 dark:text-indigo-400">[MCP]</span> STATUS:{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">200 OK</span> - morning_meds_taken=true
            </div>

            <div className="text-slate-800 dark:text-slate-200">
              <span className="font-bold text-indigo-700 dark:text-indigo-400">[MCP]</span> call_tool(&quot;update_family_status&quot;, contact=&quot;Sarah&quot;)
            </div>

            <div className="text-slate-800 dark:text-slate-200">
              <span className="font-bold text-cyan-700 dark:text-cyan-400">[HTTP]</span> POST /v1/alexa/voice_intent ...{' '}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">OK</span>
            </div>

            <div className="text-slate-600 dark:text-slate-400 italic">
              [Trace] &quot;Prompting patient for afternoon schedule.&quot;
            </div>

            {/* Dynamic recent telemetry frames if active */}
            {mcpFrames.slice(0, 3).map((frame) => (
              <div key={frame.id} className="text-slate-700 dark:text-slate-300 pt-1 border-t border-slate-200/50 dark:border-slate-800/60">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">[MCP:{frame.tool_name}]</span>{' '}
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">200 OK</span> ({frame.latency_ms}ms)
              </div>
            ))}
          </div>

          {/* Sparkle glyph in bottom right corner */}
          <div className="absolute bottom-2.5 right-3 pointer-events-none opacity-40 text-slate-400 dark:text-slate-500">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlexaMcpSimulator;
