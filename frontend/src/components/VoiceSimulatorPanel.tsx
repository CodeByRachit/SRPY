import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Pill,
  Calendar,
  AlertOctagon,
  Stethoscope,
  Zap,
  Volume2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AgentVoiceState, ChatMessage } from '../types/care';
import { soundEngine } from '../utils/soundEngine';

interface VoiceSimulatorPanelProps {
  voiceState: AgentVoiceState;
  activeTool: string | null;
  chatMessages: ChatMessage[];
  onSendMessage: (msg: string) => void;
  onScenarioTrigger: (scenarioKey: 'LOG_ELIQUIS' | 'GET_SCHEDULE' | 'MISSED_CHECKIN_ESCALATION' | 'ADD_APPOINTMENT') => void;
  onSelectToolLog?: (toolName: string) => void;
}

export const VoiceSimulatorPanel: React.FC<VoiceSimulatorPanelProps> = ({
  voiceState,
  activeTool,
  chatMessages,
  onSendMessage,
  onScenarioTrigger,
  onSelectToolLog,
}) => {
  const [inputText, setInputText] = useState('');
  const [isMicListening, setIsMicListening] = useState(false);
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation feed
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, voiceState]);

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

  return (
    <div className="flex flex-col h-full bg-white/80 dark:bg-[#0b1120]/90 border border-slate-200/90 dark:border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md transition-colors duration-400">
      {/* Header & Waveform */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span
              className={`w-3 h-3 rounded-full inline-block ${
                voiceState === 'LISTENING' || isMicListening
                  ? 'bg-rose-500 animate-ping'
                  : voiceState === 'SPEAKING'
                  ? 'bg-cyan-500 animate-pulse'
                  : voiceState === 'CALLING_MCP_TOOL'
                  ? 'bg-indigo-500 animate-spin'
                  : 'bg-emerald-500'
              }`}
            />
            <span
              className={`w-3 h-3 rounded-full inline-block absolute inset-0 ${
                voiceState === 'LISTENING' || isMicListening
                  ? 'bg-rose-500'
                  : voiceState === 'SPEAKING'
                  ? 'bg-cyan-500'
                  : voiceState === 'CALLING_MCP_TOOL'
                  ? 'bg-indigo-500'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Alexa+ Ambient Voice Gateway</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/70">
                Web Speech + Audio
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Living Room Voice Session • Sub-10ms Synchronized Bridge
            </p>
          </div>
        </div>

        {/* Audio Waveform Bars */}
        <div className="flex items-end gap-1 h-5 px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
          {[0.3, 0.7, 1.0, 0.6, 0.9, 0.4, 0.8, 0.5].map((scale, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                voiceState === 'SPEAKING' || voiceState === 'LISTENING' || isMicListening
                  ? 'bg-cyan-500 dark:bg-cyan-400 animate-pulse'
                  : 'bg-slate-300 dark:bg-slate-700'
              }`}
              style={{
                height:
                  voiceState === 'SPEAKING' || voiceState === 'LISTENING' || isMicListening
                    ? `${Math.max(4, scale * 18)}px`
                    : '4px',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* 4 Judge Scenario Trigger Buttons */}
      <div className="py-2.5">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Judge 1-Click Scenario Triggers</span>
          <span className="text-cyan-600 dark:text-cyan-400 font-mono">Live MCP Call</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Scenario 1: Log Eliquis */}
          <button
            onClick={() => onScenarioTrigger('LOG_ELIQUIS')}
            className="flex items-center gap-2 p-2 rounded-xl text-left text-xs bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 transition-all group shadow-sm"
          >
            <div className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <Pill className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold truncate">Log Overdue Eliquis</div>
              <div className="text-[10px] text-rose-600/80 dark:text-rose-300/80 font-mono truncate">
                log_medication_taken
              </div>
            </div>
          </button>

          {/* Scenario 2: Today's Schedule */}
          <button
            onClick={() => onScenarioTrigger('GET_SCHEDULE')}
            className="flex items-center gap-2 p-2 rounded-xl text-left text-xs bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-200 transition-all group shadow-sm"
          >
            <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold truncate">Check Today&apos;s Schedule</div>
              <div className="text-[10px] text-cyan-600/80 dark:text-cyan-300/80 font-mono truncate">
                get_today_schedule
              </div>
            </div>
          </button>

          {/* Scenario 3: Check-in Escalation */}
          <button
            onClick={() => onScenarioTrigger('MISSED_CHECKIN_ESCALATION')}
            className="flex items-center gap-2 p-2 rounded-xl text-left text-xs bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-500/40 text-amber-800 dark:text-amber-200 transition-all group shadow-sm"
          >
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold truncate">Wellness Escalation</div>
              <div className="text-[10px] text-amber-600/80 dark:text-amber-300/80 font-mono truncate">
                check_in_status (Alert)
              </div>
            </div>
          </button>

          {/* Scenario 4: Book Doctor Appointment */}
          <button
            onClick={() => onScenarioTrigger('ADD_APPOINTMENT')}
            className="flex items-center gap-2 p-2 rounded-xl text-left text-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-500/40 text-indigo-800 dark:text-indigo-200 transition-all group shadow-sm"
          >
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden">
              <div className="font-semibold truncate">Book Dr. Patel Visit</div>
              <div className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 font-mono truncate">
                add_appointment
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Live Alexa+ Conversation & Tool Execution Feed */}
      <div className="flex-1 min-h-[170px] max-h-[260px] overflow-y-auto space-y-2.5 my-2 pr-1 text-xs">
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1 px-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {msg.sender === 'user' ? 'Eleanor (Patient)' : 'Alexa+ Assistant'}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">{msg.timestamp}</span>
            </div>

            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-sky-700 text-white rounded-tr-none shadow-md shadow-cyan-600/20'
                  : 'bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/70 text-slate-800 dark:text-slate-200 rounded-tl-none'
              }`}
            >
              {msg.text}

              {/* Clickable MCP Tool Execution Badge if tool was called */}
              {msg.toolCall && (
                <div
                  onClick={() => onSelectToolLog?.(msg.toolCall!.name)}
                  className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                  title="Click to inspect raw JSON-RPC 2.0 packet in MCP Inspector"
                >
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/50 text-[10px] font-mono text-indigo-800 dark:text-indigo-300">
                    <Zap className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                    <span>⚡ {msg.toolCall.name}</span>
                    <span className="text-indigo-600 dark:text-indigo-400">({msg.toolCall.latency_ms}ms)</span>
                  </span>
                  <span className="text-[9px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>Streamable HTTP</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live Typing / Thinking Indicator */}
        {voiceState === 'THINKING' && (
          <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-800 text-cyan-700 dark:text-cyan-300 text-xs">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Alexa+ Bedrock Reasoning &amp; MCP Dispatch...</span>
          </div>
        )}

        <div ref={feedEndRef} />
      </div>

      {/* Mic Button & Custom Voice Prompt Input Bar */}
      <form onSubmit={handleFormSubmit} className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
        <button
          type="button"
          onClick={handleMicToggle}
          className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
            isMicListening
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-600/30'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}
          title={isMicListening ? 'Stop listening' : 'Speak via microphone (Web Speech API)'}
        >
          {isMicListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isMicListening ? 'Listening to speech...' : 'Type or speak to Alexa+ (e.g. "I took my Eliquis")...'}
          className="flex-1 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all font-sans"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white transition-all shadow-md shadow-cyan-600/30 flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
