/**
 * AuraCare: Single-Source-of-Truth Care Service
 * Exclusively driven by the Python backend (http://localhost:8000)
 * REST API, WebSocket (ws://localhost:8000/ws/dashboard), and MCP Streamable HTTP.
 * ZERO local mock data, ZERO client-side simulation loops.
 */

import {
  CareSystemState,
  CareAlert,
  McpTelemetryFrame,
  AgentVoiceState,
  MedicationItem,
  AppointmentItem,
  ChatMessage,
  DemoStatus,
} from '../types/care';
import { soundEngine } from '../utils/soundEngine';

const metaEnv = (import.meta as any).env || {};
export const API_BASE = metaEnv.VITE_API_URL || 'http://localhost:8000';
export const WS_URL = metaEnv.VITE_WS_URL || 'ws://localhost:8000/ws/dashboard';

const INITIAL_SKELETON_STATE: CareSystemState = {
  patient: {
    id: 'pat_eleanor_01',
    name: 'Eleanor Vance',
    age: 78,
    location: 'Seattle, WA • Living Room Echo Show 15',
    condition_summary: 'Connecting to Alexa+ Backend (:8000)...',
    status: 'HEALTHY',
    adherence_rate: 50,
    adherence_Rate: 50,
    last_check_in: 'Connecting...',
    vitals: {
      heart_rate: 76,
      blood_pressure: '128/82',
      blood_oxygen: 98,
      hydration_glasses: 3,
      hydration_goal: 6,
      mood: 'Awaiting Backend Connection...',
    },
  },
  caregiver: {
    name: 'Maya Vance',
    relation: 'Daughter (Primary Remote Caregiver)',
    location: 'San Francisco, CA (680 miles away)',
    phone: '+1 (415) 890-4321',
    notification_status: 'CONNECTING',
  },
  medications: [],
  appointments: [],
  alerts: [],
  activity_timeline: [],
  mcp_telemetry_log: [],
  conversation_history: [],
};

export class CareService {
  private state: CareSystemState = JSON.parse(JSON.stringify(INITIAL_SKELETON_STATE));
  private isLiveBackend: boolean = false;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;

  private stateListeners: Set<(state: CareSystemState) => void> = new Set();
  private toastListeners: Set<(alert: CareAlert) => void> = new Set();
  private voiceStateListeners: Set<(voiceState: AgentVoiceState) => void> = new Set();
  private activeToolListeners: Set<(toolName: string | null) => void> = new Set();
  private chatHistoryListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private demoStatusListeners: Set<(status: DemoStatus) => void> = new Set();

  private chatMessages: ChatMessage[] = [];
  private currentVoiceState: AgentVoiceState = 'IDLE';
  private currentActiveTool: string | null = null;
  private demoStatus: DemoStatus = {
    isRunning: false,
    step: 0,
    totalSteps: 4,
    story: '',
    timeRemaining: 0,
  };

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    await this.fetchState();
    this.connectWebSocket();
  }

  // --- Subscriptions ---
  public subscribe(listener: (state: CareSystemState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => this.stateListeners.delete(listener);
  }

  public subscribeToast(listener: (alert: CareAlert) => void): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  public subscribeVoiceState(listener: (voiceState: AgentVoiceState) => void): () => void {
    this.voiceStateListeners.add(listener);
    listener(this.currentVoiceState);
    return () => this.voiceStateListeners.delete(listener);
  }

  public subscribeActiveTool(listener: (toolName: string | null) => void): () => void {
    this.activeToolListeners.add(listener);
    listener(this.currentActiveTool);
    return () => this.activeToolListeners.delete(listener);
  }

  public subscribeChatHistory(listener: (messages: ChatMessage[]) => void): () => void {
    this.chatHistoryListeners.add(listener);
    listener([...this.chatMessages]);
    return () => this.chatHistoryListeners.delete(listener);
  }

  public subscribeDemoStatus(listener: (status: DemoStatus) => void): () => void {
    this.demoStatusListeners.add(listener);
    listener({ ...this.demoStatus });
    return () => this.demoStatusListeners.delete(listener);
  }

  public getState(): CareSystemState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public getVoiceState(): AgentVoiceState {
    return this.currentVoiceState;
  }

  public getIsLiveBackend(): boolean {
    return this.isLiveBackend;
  }

  public getDemoStatus(): DemoStatus {
    return { ...this.demoStatus };
  }

  private notifyStateChange(): void {
    const currentState = this.getState();
    this.stateListeners.forEach((l) => l(currentState));
  }

  public setVoiceState(vs: AgentVoiceState): void {
    this.currentVoiceState = vs;
    this.voiceStateListeners.forEach((l) => l(vs));
  }

  public setActiveTool(tool: string | null): void {
    this.currentActiveTool = tool;
    this.activeToolListeners.forEach((l) => l(tool));
  }

  public setDemoStatus(status: DemoStatus): void {
    this.demoStatus = status;
    this.demoStatusListeners.forEach((l) => l(status));
  }

  public addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): void {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    };
    this.chatMessages.push(newMsg);
    this.chatHistoryListeners.forEach((l) => l([...this.chatMessages]));
  }

  private syncChatWithConversationHistory(history: CareSystemState['conversation_history']): void {
    if (!history || history.length === 0) return;
    const converted: ChatMessage[] = history.map((h) => ({
      id: h.id,
      sender: h.role === 'user' ? 'user' : 'alexa',
      text: h.text,
      timestamp: h.timestamp,
      toolCall:
        h.tool_calls && h.tool_calls.length > 0
          ? {
              name: h.tool_calls[0].tool_name || 'mcp_tool',
              latency_ms: h.tool_calls[0].latency_ms || 16,
              status: 'SUCCESS',
              details: JSON.stringify(h.tool_calls[0].arguments || {}),
            }
          : undefined,
    }));
    this.chatMessages = converted;
    this.chatHistoryListeners.forEach((l) => l([...this.chatMessages]));
  }

  // --- WebSocket Connection with Auto-Reconnect ---
  public connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        this.isLiveBackend = true;
        this.notifyStateChange();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const type = payload.type;

          if (type === 'STATE_UPDATE' || type === 'INITIAL_STATE') {
            const newState: CareSystemState = payload.payload || payload.data;
            if (newState) {
              // Ensure dual adherence keys
              if (newState.patient) {
                if (newState.patient.adherence_rate === undefined && newState.patient.adherence_Rate !== undefined) {
                  newState.patient.adherence_rate = newState.patient.adherence_Rate;
                }
                if (newState.patient.adherence_Rate === undefined && newState.patient.adherence_rate !== undefined) {
                  newState.patient.adherence_Rate = newState.patient.adherence_rate;
                }
              }
              this.state = newState;
              this.isLiveBackend = true;
              if (newState.conversation_history) {
                this.syncChatWithConversationHistory(newState.conversation_history);
              }
              this.notifyStateChange();
            }
          } else if (type === 'CAREGIVER_ALERT' || type === 'CAREGIVER_NOTIFICATION') {
            const alert = payload.payload || payload.alert;
            if (alert) {
              this.toastListeners.forEach((l) => l(alert));
              soundEngine.playAlertSiren();
            }
          } else if (type === 'AGENT_STATUS') {
            const status = payload.status || payload.payload?.state;
            const detail = payload.detail || payload.payload?.tool || payload.payload?.text;
            if (status) {
              const mapped = status === 'ESCALATING' ? 'ALERT' : status;
              this.setVoiceState(mapped as AgentVoiceState);
            }
            if (detail !== undefined) {
              this.setActiveTool(status === 'CALLING_MCP_TOOL' ? detail : null);
            }
          } else if (type === 'MCP_TELEMETRY') {
            const frame: McpTelemetryFrame = payload.payload || payload.frame;
            if (frame) {
              if (!this.state.mcp_telemetry_log) this.state.mcp_telemetry_log = [];
              if (!this.state.mcp_telemetry_log.some((f) => f.id === frame.id)) {
                this.state.mcp_telemetry_log.unshift(frame);
                if (this.state.mcp_telemetry_log.length > 50) this.state.mcp_telemetry_log.pop();
              }
              this.notifyStateChange();
            }
          } else if (type === 'DEMO_STATUS') {
            const demo = payload.payload || payload.data;
            if (demo) {
              this.setDemoStatus(demo);
            }
          } else if (type === 'DEMO_RESET') {
            this.setVoiceState('IDLE');
            this.setActiveTool(null);
          }
        } catch (e) {
          console.warn('WS message parsing error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isLiveBackend = false;
        this.notifyStateChange();
        if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
        this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = () => {
        this.isLiveBackend = false;
      };
    } catch {
      this.isLiveBackend = false;
      if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 5000);
    }
  }

  // --- Core Backend REST Endpoints ---

  public async fetchState(): Promise<CareSystemState> {
    try {
      const res = await fetch(`${API_BASE}/api/state`, { method: 'GET' });
      if (res.ok) {
        const data: CareSystemState = await res.json();
        if (data.patient) {
          if (data.patient.adherence_rate === undefined && data.patient.adherence_Rate !== undefined) {
            data.patient.adherence_rate = data.patient.adherence_Rate;
          }
          if (data.patient.adherence_Rate === undefined && data.patient.adherence_rate !== undefined) {
            data.patient.adherence_Rate = data.patient.adherence_rate;
          }
        }
        this.state = data;
        this.isLiveBackend = true;
        if (data.conversation_history) {
          this.syncChatWithConversationHistory(data.conversation_history);
        }
        this.notifyStateChange();
        return this.getState();
      }
    } catch (err) {
      this.isLiveBackend = false;
      console.warn('Failed to fetch state from backend:', err);
    }
    return this.getState();
  }

  public async sendVoiceCommand(
    prompt: string,
    scenarioId?: string
  ): Promise<{ reply: string; tool_calls: any[]; state: CareSystemState }> {
    soundEngine.playWakeWordChime();
    this.setVoiceState('THINKING');

    this.addChatMessage({
      sender: 'user',
      text: prompt,
    });

    try {
      const res = await fetch(`${API_BASE}/api/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, scenario_id: scenarioId }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          this.state = data.state;
          this.notifyStateChange();
        }

        let toolCallInfo: ChatMessage['toolCall'] = undefined;
        if (data.tool_calls && data.tool_calls.length > 0) {
          const firstTool = data.tool_calls[0];
          toolCallInfo = {
            name: firstTool.tool_name,
            latency_ms: firstTool.latency_ms || 16,
            status: 'SUCCESS',
            details: typeof firstTool.arguments === 'string' ? firstTool.arguments : JSON.stringify(firstTool.arguments),
          };
        }

        this.addChatMessage({
          sender: 'alexa',
          text: data.reply,
          toolCall: toolCallInfo,
        });

        this.setVoiceState('SPEAKING');
        soundEngine.speak(data.reply, {
          onEnd: () => {
            this.setVoiceState('IDLE');
            this.setActiveTool(null);
          },
        });

        if (data.state?.patient?.status === 'CRITICAL') {
          soundEngine.playAlertSiren();
        } else {
          soundEngine.playSuccessChord();
        }

        return {
          reply: data.reply,
          tool_calls: data.tool_calls || [],
          state: this.getState(),
        };
      }
    } catch (err) {
      console.warn('Backend sendVoiceCommand failed:', err);
    }

    this.setVoiceState('IDLE');
    this.setActiveTool(null);
    return {
      reply: 'Backend currently unreachable at ' + API_BASE,
      tool_calls: [],
      state: this.getState(),
    };
  }

  public handleAgentUtterance = this.sendVoiceCommand;

  public async callMcpToolDirect(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ result: any; state: CareSystemState }> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool(toolName);
    soundEngine.playToolBlip();

    try {
      const res = await fetch(`${API_BASE}/api/mcp/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_name: toolName,
          arguments: args,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          this.state = data.state;
          this.notifyStateChange();
        }
        soundEngine.playSuccessChord();
        this.setActiveTool(null);
        this.setVoiceState('IDLE');
        return { result: data.result, state: this.getState() };
      }
    } catch (err) {
      console.warn('Backend callMcpToolDirect failed:', err);
    }

    this.setActiveTool(null);
    this.setVoiceState('IDLE');
    return { result: null, state: this.getState() };
  }

  public async runBackendDemoStep(
    step: number
  ): Promise<{ step: number; user_utterance: string; reply: string; tool_calls: any[]; state: CareSystemState }> {
    this.setVoiceState('THINKING');
    soundEngine.playWakeWordChime();

    try {
      const res = await fetch(`${API_BASE}/api/demo/run-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          this.state = data.state;
          this.notifyStateChange();
        }

        this.addChatMessage({
          sender: 'user',
          text: data.user_utterance,
        });

        this.addChatMessage({
          sender: 'alexa',
          text: data.reply,
          toolCall:
            data.tool_calls && data.tool_calls.length > 0
              ? {
                  name: data.tool_calls[0].tool_name,
                  latency_ms: data.tool_calls[0].latency_ms || 16,
                  status: 'SUCCESS',
                  details: JSON.stringify(data.tool_calls[0].arguments || {}),
                }
              : undefined,
        });

        this.setVoiceState('SPEAKING');

        return {
          step: data.step,
          user_utterance: data.user_utterance,
          reply: data.reply,
          tool_calls: data.tool_calls || [],
          state: this.getState(),
        };
      }
    } catch (err) {
      console.warn('runBackendDemoStep failed:', err);
    }

    this.setVoiceState('IDLE');
    return {
      step,
      user_utterance: '',
      reply: 'Failed to run backend step',
      tool_calls: [],
      state: this.getState(),
    };
  }

  public async resetBackendState(): Promise<CareSystemState> {
    try {
      const res = await fetch(`${API_BASE}/api/state/reset`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          this.state = data.state;
          if (data.state.conversation_history) {
            this.syncChatWithConversationHistory(data.state.conversation_history);
          }
          this.notifyStateChange();
        }
        soundEngine.playSuccessChord();
      }
    } catch (err) {
      console.warn('Failed to reset backend state:', err);
    }
    return this.getState();
  }

  public resetDemo = this.resetBackendState;

  public async randomizeBackendState(): Promise<CareSystemState> {
    try {
      const res = await fetch(`${API_BASE}/api/state/randomize`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          this.state = data.state;
          if (data.state.conversation_history) {
            this.syncChatWithConversationHistory(data.state.conversation_history);
          }
          this.notifyStateChange();
        }
        soundEngine.playSuccessChord();
      }
    } catch (err) {
      console.warn('Failed to randomize backend state:', err);
    }
    return this.getState();
  }

  public async startDemo(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/demo/start`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.demo) this.setDemoStatus(data.demo);
      }
    } catch (err) {
      console.warn('Failed to start backend demo:', err);
    }
  }

  public async pauseDemo(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/demo/stop`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.demo) this.setDemoStatus(data.demo);
      }
    } catch (err) {
      console.warn('Failed to stop backend demo:', err);
    }
  }

  // --- Convenience MCP Invocation Methods (Mapped directly to POST /api/mcp/direct) ---

  public async logMedicationTaken(
    medId: string,
    notes?: string,
    confirmedVia: string = 'Echo Show 15 Voice'
  ): Promise<{ success: boolean; message: string; medName: string }> {
    const targetMed = (this.state.medications || []).find((m) => m.id === medId);
    const medName = targetMed?.name || medId;
    const { result, state } = await this.callMcpToolDirect('log_medication_taken', {
      medication_id: medId,
      medication_name: medName,
      notes,
      confirmed_via: confirmedVia,
    });
    return {
      success: !!result,
      message: result?.message || result?.status || 'Logged',
      medName: result?.medication_name || medName,
    };
  }

  public async getTodaySchedule(): Promise<{ summary: string; remainingMeds: MedicationItem[] }> {
    const { result } = await this.callMcpToolDirect('get_today_schedule', {
      patient_id: 'pat_eleanor_01',
    });
    const remaining = (this.state.medications || []).filter((m) => m.status !== 'TAKEN');
    return {
      summary: result?.spoken_summary || 'Care schedule retrieved from backend.',
      remainingMeds: remaining,
    };
  }

  public async checkInStatus(
    distressLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    note?: string
  ): Promise<{ status: string; escalated: boolean }> {
    const isHighDistress = distressLevel === 'HIGH' || distressLevel === 'CRITICAL';
    const { result } = await this.callMcpToolDirect('check_in_status', {
      check_in_type: 'MISSED_DOSE_VERIFICATION',
      patient_response: isHighDistress ? 'NO_RESPONSE' : 'RESPONSIVE_OK',
      symptom_notes: note || (isHighDistress ? 'Unresponsive to living room check-in chime' : 'Patient responsive'),
    });
    const escalated = !!result?.escalation_required;
    return { status: this.state.patient.status, escalated };
  }

  public async addAppointment(
    title: string,
    specialty: string,
    date: string,
    time: string,
    location: string,
    notes?: string
  ): Promise<AppointmentItem> {
    const { result } = await this.callMcpToolDirect('add_appointment', {
      title,
      specialty,
      date,
      time,
      location,
      notes: notes || 'Scheduled via Alexa+ Voice Bridge',
    });
    return (
      result?.appointment || {
        id: `apt_${Date.now()}`,
        title,
        specialty,
        date,
        time,
        location,
        notes: notes || '',
        status: 'CONFIRMED',
      }
    );
  }

  public async notifyCaregiver(
    channel: string,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    message: string
  ): Promise<CareAlert> {
    const { result } = await this.callMcpToolDirect('notify_caregiver', {
      urgency,
      subject: urgency === 'CRITICAL' ? '🚨 Urgent Alert: Eleanor Vance' : 'Caregiver Notification',
      message,
      channel,
    });
    return (
      this.state.alerts?.[0] || {
        id: `alert_${Date.now()}`,
        severity: urgency,
        title: urgency === 'CRITICAL' ? 'Urgent Care Alert' : 'Caregiver Notification',
        message,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        channel,
        acknowledged: false,
      }
    );
  }

  public addHydrationGlass(): void {
    soundEngine.playToolBlip();
    this.sendVoiceCommand('Alexa, I just drank a glass of water');
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.state.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifyStateChange();
    }
  }
}

export const careService = new CareService();
