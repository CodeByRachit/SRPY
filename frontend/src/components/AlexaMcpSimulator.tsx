import React, { useState, useEffect, useRef } from 'react';
import { AgentVoiceState, ChatMessage, McpTelemetryFrame } from '../types/care';
import { AlexaVoiceOrbCanvas } from './Alexa3DCanvas';
import { ExternalLink, Sparkles, Mic, MicOff, Send, Zap, User, Bot } from 'lucide-react';
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
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation feed when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
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
        // Fallback default prompt if browser blocks Web Speech API
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
      ? 'Listening for voice...'
      : voiceState === 'THINKING' || activeTool !== null
      ? 'Thinking & Dispatching MCP...'
      : voiceState === 'ALERT'
      ? 'Emergency Alert Triggered'
      : 'Alexa+ Ready & Listening';

  return (
    <div className="flex flex-col h-full glass-card rounded-3xl p-4 sm:p-5 justify-between gap-3.5 select-none transition-all">
      {/* 1. Header: Alexa+ MCP Simulator + Active Pill */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-white/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
              Alexa+ MCP Simulator
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
              Echo Show 15
            </span>
          </div>
          <div className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] dark:bg-amber-950/80 border border-[#FCD34D] dark:border-amber-600/50 text-[#D97706] dark:text-amber-300 text-xs font-bold shadow-sm">
            Active
          </div>
        </div>

        {/* 2. Top Voice Interaction Header with 3D Orb */}
        <div className="flex items-center gap-3 py-2.5">
          <div className="shrink-0">
            <AlexaVoiceOrbCanvas
              voiceState={voiceState}
              activeTool={activeTool}
              className="w-16 h-16 sm:w-20 sm:h-20"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-xs text-slate-900 dark:text-white mb-0.5 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  voiceState === 'LISTENING' || isMicListening
                    ? 'bg-rose-500 animate-ping'
                    : voiceState === 'SPEAKING'
                    ? 'bg-cyan-500 animate-pulse'
                    : voiceState === 'THINKING' || activeTool !== null
                    ? 'bg-indigo-500 animate-spin'
                    : 'bg-emerald-500'
                }`}
              />
              <span className="truncate">{voiceStatusLabel}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live bi-directional voice pipeline with AWS Bedrock &amp; Model Context Protocol.
            </p>
          </div>
        </div>

        {/* 3. Real Interactive Conversational Dialogue Feed */}
        <div
          ref={chatScrollRef}
          className="rounded-2xl bg-white/70 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 p-3 h-[180px] sm:h-[200px] overflow-y-auto space-y-2 text-xs shadow-inner"
        >
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500 px-4">
              <Sparkles className="w-5 h-5 mb-1.5 text-cyan-500/60" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                &ldquo;Good afternoon Eleanor! I&apos;m listening on your Living Room Echo Show.&rdquo;
              </p>
              <p className="text-[11px] mt-1 text-slate-400">
                Click the microphone or try saying &ldquo;Alexa, I just took my afternoon Eliquis pill&rdquo;.
              </p>
            </div>
          ) : (
            chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 mb-0.5 px-1 text-[10px] text-slate-400">
                    {isUser ? (
                      <>
                        <span>{msg.timestamp}</span>
                        <span className="font-semibold text-cyan-700 dark:text-cyan-300">Eleanor</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Alexa+</span>
                        <span>{msg.timestamp}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[88%] rounded-2xl px-3 py-2 text-xs leading-relaxed select-text shadow-sm ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-sky-700 text-white rounded-tr-none font-medium'
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700 rounded-tl-none'
                    }`}
                  >
                    {msg.text}

                    {/* Clickable Real MCP Tool Badge if invoked */}
                    {msg.toolCall && (
                      <div className="mt-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/60 flex items-center gap-1.5">
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
                          <Zap className="w-3 h-3 text-indigo-500" />
                          <span>{msg.toolCall.name}()</span>
                          <span className="text-emerald-600 dark:text-emerald-400">({msg.toolCall.latency_ms}ms)</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 4. Voice Input & Text Form */}
        <form onSubmit={handleFormSubmit} className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={handleMicToggle}
            className={`p-2.5 rounded-xl transition-all flex items-center justify-center shrink-0 ${
              isMicListening
                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                : 'tactile-pill text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
            title={isMicListening ? 'Listening... click to stop' : 'Click to speak to Alexa+'}
          >
            {isMicListening ? <MicOff className="w-4 h-4 animate-bounce" /> : <Mic className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isMicListening ? 'Listening for speech...' : 'Speak or type to Alexa+...'}
            className="flex-1 bg-white/80 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none focus:border-cyan-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all shadow-sm active:scale-95 shrink-0"
            title="Send voice command to backend"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* 5. 1-Click Flagship Scenario Chips */}
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <button
            onClick={() => onScenarioTrigger('LOG_ELIQUIS')}
            className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate hover:bg-rose-50 dark:hover:bg-rose-950/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span className="truncate">Log Afternoon Eliquis</span>
          </button>
          <button
            onClick={() => onScenarioTrigger('GET_SCHEDULE')}
            className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate hover:bg-cyan-50 dark:hover:bg-cyan-950/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
            <span className="truncate">Check Schedule</span>
          </button>
          <button
            onClick={() => onScenarioTrigger('MISSED_CHECKIN_ESCALATION')}
            className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate hover:bg-amber-50 dark:hover:bg-amber-950/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span className="truncate">Escalate Alert</span>
          </button>
          <button
            onClick={() => onScenarioTrigger('ADD_APPOINTMENT')}
            className="tactile-pill px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-left flex items-center gap-1.5 truncate hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span className="truncate">Book Doctor Visit</span>
          </button>
        </div>
      </div>

      {/* 6. MCP Tool Execution Log Section */}
      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              MCP Protocol Stream (Spec 2025-11-25)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {mcpFrames.length} frames recorded
          </span>
        </div>

        {/* Frosted Terminal Code Card */}
        <div className="relative rounded-2xl bg-[#F8F7F4]/90 dark:bg-[#0B101E]/90 border border-slate-200/80 dark:border-slate-800 p-2.5 font-mono text-[10.5px] leading-relaxed text-slate-700 dark:text-slate-300 shadow-inner overflow-hidden max-h-[115px] overflow-y-auto pr-1">
          <div className="space-y-1 select-text">
            {mcpFrames.length > 0 ? (
              mcpFrames.slice(0, 4).map((frame) => (
                <div key={frame.id} className="flex items-center justify-between gap-2 border-b border-slate-200/40 dark:border-slate-800/60 pb-0.5 last:border-0">
                  <div className="truncate">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">[MCP]</span>{' '}
                    <span className="text-slate-900 dark:text-slate-100 font-medium">{frame.tool_name}()</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 text-[10px]">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">200 OK</span>
                    <span className="text-slate-400 font-mono">({frame.latency_ms}ms)</span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="text-slate-800 dark:text-slate-200">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">[MCP]</span> call_tool(&quot;get_today_schedule&quot;, patient_id=&quot;pat_eleanor_01&quot;)
                </div>
                <div className="text-slate-800 dark:text-slate-200">
                  <span className="font-bold text-indigo-700 dark:text-indigo-400">[MCP]</span> STATUS:{' '}
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">200 OK</span> - morning_meds_taken=true
                </div>
                <div className="text-slate-600 dark:text-slate-400 italic">
                  [Trace] &quot;Streamable HTTP JSON-RPC 2.0 connected on :8000/mcp&quot;
                </div>
              </>
            )}
          </div>

          <div className="absolute bottom-2 right-2.5 pointer-events-none opacity-40 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlexaMcpSimulator;
