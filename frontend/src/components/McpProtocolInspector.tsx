import React, { useState } from 'react';
import { McpTelemetryFrame } from '../types/care';
import {
  Terminal,
  Maximize2,
  Minimize2,
  Zap,
  Play,
  Code2,
  Layers,
} from 'lucide-react';

interface McpProtocolInspectorProps {
  frames: McpTelemetryFrame[];
  onDirectInvoke: (toolName: string, args: Record<string, unknown>) => void;
  selectedToolFilter?: string | null;
  isFullView?: boolean;
}

export const McpProtocolInspector: React.FC<McpProtocolInspectorProps> = ({
  frames,
  onDirectInvoke,
  isFullView = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(isFullView);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'DIRECT_INVOKE'>('TELEMETRY');

  // Direct tool invoker state
  const [selectedTool, setSelectedTool] = useState<string>('log_medication_taken');
  const [customArgsJson, setCustomArgsJson] = useState<string>(
    JSON.stringify({ medication_id: 'med_2', notes: 'Judge manual test invocation' }, null, 2)
  );

  const activeFrame =
    frames.find((f) => f.id === selectedFrameId) || frames[0] || null;

  const handleToolPresetChange = (tool: string) => {
    setSelectedTool(tool);
    if (tool === 'log_medication_taken') {
      setCustomArgsJson(JSON.stringify({ medication_id: 'med_2', notes: 'Manual dose test' }, null, 2));
    } else if (tool === 'get_today_schedule') {
      setCustomArgsJson(JSON.stringify({ patient_id: 'pt_eleanor_vance' }, null, 2));
    } else if (tool === 'check_in_status') {
      setCustomArgsJson(JSON.stringify({ distress_level: 'HIGH', note: 'Manual emergency test' }, null, 2));
    } else if (tool === 'add_appointment') {
      setCustomArgsJson(
        JSON.stringify(
          {
            title: 'Dr. Priya Patel (Ophthalmology)',
            specialty: 'Retinal Examination',
            date: 'Tomorrow, Oct 24',
            time: '2:00 PM',
            location: 'Suite 400',
          },
          null,
          2
        )
      );
    } else if (tool === 'notify_caregiver') {
      setCustomArgsJson(
        JSON.stringify(
          {
            channel: 'PUSH_AND_SMS',
            urgency: 'HIGH',
            message: 'Manual test caregiver ping from MCP inspector',
          },
          null,
          2
        )
      );
    }
  };

  const handleExecuteDirectTool = () => {
    try {
      const parsedArgs = JSON.parse(customArgsJson);
      onDirectInvoke(selectedTool, parsedArgs);
    } catch {
      alert('Invalid JSON in arguments field');
    }
  };

  return (
    <div
      className={`transition-all duration-300 rounded-2xl border border-indigo-500/30 bg-[#090e1a]/95 text-slate-100 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden ${
        isFullView ? 'h-[620px]' : isExpanded ? 'h-[480px]' : 'h-[250px]'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200">
            MCP Streamable HTTP JSON-RPC 2.0 Protocol Inspector
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
            Spec: 2025-11-25
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setActiveTab('TELEMETRY')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeTab === 'TELEMETRY'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Telemetry ({frames.length})
            </button>
            <button
              onClick={() => setActiveTab('DIRECT_INVOKE')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                activeTab === 'DIRECT_INVOKE'
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Tool Tester
            </button>
          </div>

          {!isFullView && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title={isExpanded ? 'Minimize view' : 'Expand full view'}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Inspector Body */}
      {activeTab === 'TELEMETRY' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden text-xs font-mono">
          {/* Frame List Sidebar (5 cols) */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto p-2 space-y-1.5 bg-[#070b14]/70">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 px-1 flex items-center justify-between">
              <span>Recorded Packets</span>
              <span>Latency</span>
            </div>

            {frames.map((frame) => {
              const isSelected = activeFrame?.id === frame.id;
              return (
                <div
                  key={frame.id}
                  onClick={() => setSelectedFrameId(frame.id)}
                  className={`p-2 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-500/70 text-indigo-100 shadow-md'
                      : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold flex items-center gap-1 text-slate-200">
                      <Zap className="w-3 h-3 text-indigo-400" />
                      {frame.tool_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-bold border border-indigo-700/50">
                      {frame.latency_ms}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{frame.timestamp}</span>
                    <span className="text-emerald-400">200 OK</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Frame Details & JSON Viewer (7 cols) */}
          <div className="md:col-span-7 flex flex-col overflow-hidden bg-[#0a101f]/90 p-2.5">
            {activeFrame ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* HTTP Header Preview */}
                <div className="mb-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 space-y-0.5 select-text">
                  <div className="text-indigo-400 font-bold">
                    POST /mcp HTTP/1.1
                  </div>
                  <div className="text-slate-400">
                    Host: localhost:8000 • Content-Type: application/json
                  </div>
                  <div className="text-slate-400">
                    Accept: application/json, text/event-stream
                  </div>
                  <div className="text-slate-400">
                    Mcp-Session-Id: <span className="text-slate-200">{activeFrame.session_id}</span> • Protocol: <span className="text-emerald-400">{activeFrame.protocol_version}</span>
                  </div>
                </div>

                {/* Request & Response Side-by-Side */}
                <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden text-[10px]">
                  {/* Request */}
                  <div className="flex flex-col rounded-lg bg-slate-950/80 border border-slate-800 p-2 overflow-hidden">
                    <div className="text-slate-400 font-bold mb-1 flex items-center gap-1">
                      <Code2 className="w-3 h-3 text-cyan-400" />
                      <span>jsonrpc_request</span>
                    </div>
                    <pre className="flex-1 overflow-y-auto text-cyan-300/90 whitespace-pre-wrap select-text">
                      {JSON.stringify(activeFrame.jsonrpc_request, null, 2)}
                    </pre>
                  </div>

                  {/* Response */}
                  <div className="flex flex-col rounded-lg bg-slate-950/80 border border-slate-800 p-2 overflow-hidden">
                    <div className="text-slate-400 font-bold mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-400" />
                      <span>jsonrpc_response</span>
                    </div>
                    <pre className="flex-1 overflow-y-auto text-emerald-300/90 whitespace-pre-wrap select-text">
                      {JSON.stringify(activeFrame.jsonrpc_response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                No MCP telemetry frames recorded yet.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Direct MCP Tool Invoker Tab */
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0a101f]/90 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                Select MCP Tool
              </label>
              <select
                value={selectedTool}
                onChange={(e) => handleToolPresetChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-mono text-xs outline-none focus:border-indigo-500"
              >
                <option value="log_medication_taken">log_medication_taken(medication_id, notes, confirmed_via)</option>
                <option value="get_today_schedule">get_today_schedule(patient_id)</option>
                <option value="check_in_status">check_in_status(distress_level, note)</option>
                <option value="add_appointment">add_appointment(title, specialty, date, time, location)</option>
                <option value="notify_caregiver">notify_caregiver(channel, urgency, message)</option>
              </select>
            </div>

            <div className="self-end">
              <button
                onClick={handleExecuteDirectTool}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute via MCP</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Tool Arguments (JSON Payload)
            </label>
            <textarea
              rows={isFullView ? 8 : 4}
              value={customArgsJson}
              onChange={(e) => setCustomArgsJson(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-indigo-300 text-xs outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
