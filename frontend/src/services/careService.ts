import {
  CareSystemState,
  CareAlert,
  AgentVoiceState,
  ChatMessage,
} from '../types/care';
import { soundEngine } from '../utils/soundEngine';

const BACKEND_URL = 'http://localhost:8000';
const BACKEND_WS = 'ws://localhost:8000/ws/dashboard';

// Seed State Schema matching backend state_store.py SEED_CARE_STATE exactly
const INITIAL_DEMO_STATE: CareSystemState = {
  patient: {
    id: 'pat_eleanor_01',
    name: 'Eleanor Vance',
    age: 78,
    location: 'Seattle, WA • Living Room Echo Show 15',
    condition_summary: 'Atrial Fibrillation, Type 2 Diabetes, Essential Hypertension',
    status: 'WARNING',
    adherence_Rate: 50,
    last_check_in: '08:04 AM PST',
    vitals: {
      heart_rate: 78,
      blood_pressure: '132/84',
      blood_oxygen: 97,
      hydration_glasses: 3,
      hydration_goal: 6,
      mood: 'Awaiting Afternoon Check-in',
    },
  },
  caregiver: {
    name: 'Maya Vance',
    relation: 'Daughter (Primary Remote Caregiver)',
    location: 'San Francisco, CA (680 miles away)',
    phone: '+1 (415) 890-4321',
    notification_status: 'CONNECTED',
  },
  medications: [
    {
      id: 'med_01',
      name: 'Lisinopril',
      dosage: '10mg',
      scheduled_time: '08:00 AM',
      purpose: 'Hypertension / Blood Pressure',
      instructions: 'Take 1 tablet by mouth every morning with water',
      criticality: 'MEDIUM',
      status: 'TAKEN',
      taken_at: '08:04 AM',
      pill_color: '#38bdf8',
      secondary_color: '#0284c7',
      shape: 'capsule',
    },
    {
      id: 'med_02',
      name: 'Eliquis (Apixaban)',
      dosage: '5mg',
      scheduled_time: '02:00 PM',
      purpose: 'Atrial Fibrillation / Stroke Prevention',
      instructions: 'Take 1 tablet by mouth with water. Do not skip doses.',
      criticality: 'CRITICAL',
      status: 'OVERDUE',
      taken_at: null,
      pill_color: '#f43f5e',
      secondary_color: '#be123c',
      shape: 'capsule',
    },
    {
      id: 'med_03',
      name: 'Metformin',
      dosage: '500mg',
      scheduled_time: '06:30 PM',
      purpose: 'Type 2 Diabetes / Glucose Control',
      instructions: 'Take with evening meal',
      criticality: 'HIGH',
      status: 'UPCOMING',
      taken_at: null,
      pill_color: '#10b981',
      secondary_color: '#047857',
      shape: 'oval',
    },
    {
      id: 'med_04',
      name: 'Atorvastatin',
      dosage: '20mg',
      scheduled_time: '09:00 PM',
      purpose: 'Cholesterol / Lipid Management',
      instructions: 'Take before bedtime',
      criticality: 'MEDIUM',
      status: 'UPCOMING',
      taken_at: null,
      pill_color: '#a855f7',
      secondary_color: '#6d28d9',
      shape: 'round',
    },
  ],
  appointments: [
    {
      id: 'apt_01',
      title: 'Dr. Aris Thorne — Cardiology Telehealth',
      specialty: 'Cardiology',
      date: 'Today, Oct 23, 2026',
      time: '04:30 PM',
      location: 'Alexa+ Echo Show Video Call',
      notes: 'Review afternoon Eliquis adherence and blood pressure trend',
      status: 'CONFIRMED',
    },
    {
      id: 'apt_02',
      title: 'Northwest Senior Mobility & Balance Lab',
      specialty: 'Physical Therapy',
      date: 'Tomorrow, Oct 24, 2026',
      time: '10:30 AM',
      location: 'Seattle Medical Pavilion, Suite 210',
      notes: 'Maya booked Lyft Assisted ride for 09:50 AM',
      status: 'CONFIRMED',
    },
  ],
  alerts: [
    {
      id: 'alt_01',
      severity: 'HIGH',
      title: 'Overdue Critical Dose: Eliquis 5mg',
      message: "Eleanor's 02:00 PM Eliquis (Apixaban) 5mg dose is overdue by 45 minutes. Waiting for voice confirmation.",
      timestamp: '02:45 PM',
      channel: 'ALEXA_PLUS_MONITOR',
      acknowledged: false,
    },
  ],
  activity_timeline: [
    {
      id: 'evt_01',
      timestamp: '08:04 AM',
      type: 'MED_LOGGED',
      actor: 'Eleanor (via Alexa+)',
      summary: 'Logged morning Lisinopril 10mg on time.',
    },
    {
      id: 'evt_02',
      timestamp: '02:45 PM',
      type: 'MISSED_DOSE_FLAG',
      actor: 'AuraCare MCP Watchdog',
      summary: 'Flagged overdue 02:00 PM Eliquis 5mg dose; awaiting voice check-in.',
    },
  ],
  mcp_telemetry_log: [],
};

class CareService {
  private state: CareSystemState = JSON.parse(JSON.stringify(INITIAL_DEMO_STATE));
  private isLiveBackend: boolean = false;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private stateListeners: Set<(state: CareSystemState) => void> = new Set();
  private toastListeners: Set<(alert: CareAlert) => void> = new Set();
  private voiceStateListeners: Set<(voiceState: AgentVoiceState) => void> = new Set();
  private activeToolListeners: Set<(toolName: string | null) => void> = new Set();
  private chatHistoryListeners: Set<(messages: ChatMessage[]) => void> = new Set();
  private chatMessages: ChatMessage[] = [
    {
      id: 'msg_seed_1',
      sender: 'alexa',
      text: "Good afternoon, Eleanor. Your 02:00 PM Eliquis dose is pending. Whenever you're ready, let me know once you take it with a glass of water!",
      timestamp: '02:45 PM',
    },
  ];
  private currentVoiceState: AgentVoiceState = 'IDLE';
  private currentActiveTool: string | null = null;
  private sessionId: string = `mcp-sess-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;

  constructor() {
    this.attemptBackendConnection();
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

  public getState(): CareSystemState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public getVoiceState(): AgentVoiceState {
    return this.currentVoiceState;
  }

  public getIsLiveBackend(): boolean {
    return this.isLiveBackend;
  }

  private notifyStateChange(): void {
    const currentState = this.getState();
    this.stateListeners.forEach((l) => l(currentState));
  }

  private setVoiceState(vs: AgentVoiceState): void {
    this.currentVoiceState = vs;
    this.voiceStateListeners.forEach((l) => l(vs));
  }

  private setActiveTool(tool: string | null): void {
    this.currentActiveTool = tool;
    this.activeToolListeners.forEach((l) => l(tool));
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

  // --- Backend Connection & Real-Time WebSocket Hub ---
  public async attemptBackendConnection(): Promise<void> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/state`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        this.state = data;
        this.isLiveBackend = true;
        this.notifyStateChange();
        this.connectWebSocket();
        return;
      }
    } catch {
      this.isLiveBackend = false;
    }

    // Schedule retry check every 5 seconds to lock onto backend as soon as it boots
    if (!this.wsReconnectTimer) {
      this.wsReconnectTimer = setInterval(() => {
        if (!this.isLiveBackend) {
          this.attemptBackendConnection();
        }
      }, 5000);
    }
  }

  private connectWebSocket(): void {
    try {
      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return;
      }

      this.ws = new WebSocket(BACKEND_WS);

      this.ws.onopen = () => {
        this.isLiveBackend = true;
        this.notifyStateChange();
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === 'INITIAL_STATE' && payload.payload) {
            this.state = payload.payload;
            this.notifyStateChange();
          } else if (payload.type === 'STATE_UPDATE' && payload.payload) {
            this.state = payload.payload;
            this.notifyStateChange();
          } else if (payload.type === 'CAREGIVER_ALERT' && payload.payload) {
            this.toastListeners.forEach((l) => l(payload.payload));
          } else if (payload.type === 'AGENT_STATUS') {
            const mappedState = this.mapBackendStatusToVoiceState(payload.status);
            this.setVoiceState(mappedState);
            if (payload.detail) {
              this.setActiveTool(payload.detail);
            }
          } else if (payload.type === 'MCP_TELEMETRY' && payload.payload) {
            if (!this.state.mcp_telemetry_log) {
              this.state.mcp_telemetry_log = [];
            }
            this.state.mcp_telemetry_log.unshift(payload.payload);
            if (this.state.mcp_telemetry_log.length > 100) {
              this.state.mcp_telemetry_log.pop();
            }
            this.notifyStateChange();
          }
        } catch (e) {
          console.warn('WS message parsing error:', e);
        }
      };

      this.ws.onclose = () => {
        this.isLiveBackend = false;
        this.notifyStateChange();
      };

      this.ws.onerror = () => {
        this.isLiveBackend = false;
      };
    } catch {
      this.isLiveBackend = false;
    }
  }

  private mapBackendStatusToVoiceState(status: string): AgentVoiceState {
    switch (status) {
      case 'THINKING':
        return 'THINKING';
      case 'CALLING_MCP_TOOL':
        return 'CALLING_MCP_TOOL';
      case 'SPEAKING':
        return 'SPEAKING';
      case 'ESCALATING':
      case 'ALERT':
        return 'ALERT';
      case 'LISTENING':
        return 'LISTENING';
      default:
        return 'IDLE';
    }
  }

  // --- Backend-Driven Voice & Agent Interaction ---

  /**
   * Sends voice or text utterance to the backend API (`POST /api/agent/chat`).
   * The backend executes MCP tools over JSON-RPC 2.0, mutates state, broadcasts via WebSocket,
   * and returns the clinical reply and tool calls.
   */
  public async handleAgentUtterance(userUtterance: string): Promise<void> {
    // Record user message in feed
    this.addChatMessage({
      sender: 'user',
      text: userUtterance,
    });

    soundEngine.playWakeWordChime();
    this.setVoiceState('THINKING');

    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userUtterance,
            session_id: this.sessionId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          // Update state from backend response
          if (data.state) {
            this.state = data.state;
            this.notifyStateChange();
          }

          const reply = data.reply || "I've processed that for you, Eleanor.";
          const firstTool = data.tool_calls && data.tool_calls.length > 0 ? data.tool_calls[0] : null;

          this.addChatMessage({
            sender: 'alexa',
            text: reply,
            toolCall: firstTool
              ? {
                  name: firstTool.tool_name,
                  latency_ms: 12,
                  status: 'SUCCESS',
                  details: JSON.stringify(firstTool.arguments),
                }
              : undefined,
          });

          this.setVoiceState('SPEAKING');
          soundEngine.speak(reply, {
            onEnd: () => {
              this.setVoiceState('IDLE');
              this.setActiveTool(null);
            },
          });
          return;
        }
      } catch (err) {
        console.warn('Backend call failed, using graceful offline fallback:', err);
      }
    }

    // Fallback if backend is momentarily unreachable
    await this.handleLocalFallbackUtterance(userUtterance);
  }

  /**
   * Triggers one of the 5 flagship scenarios defined in backend `bedrock_agent.py`:
   * - "LOG_ELIQUIS"
   * - "GET_SCHEDULE"
   * - "MISSED_CHECKIN_ESCALATION"
   * - "ADD_APPOINTMENT"
   * - "LOG_METFORMIN"
   */
  public async executeScenario(scenarioId: 'LOG_ELIQUIS' | 'GET_SCHEDULE' | 'MISSED_CHECKIN_ESCALATION' | 'ADD_APPOINTMENT' | 'LOG_METFORMIN', promptText: string): Promise<void> {
    this.addChatMessage({
      sender: 'user',
      text: promptText,
    });

    soundEngine.playWakeWordChime();
    this.setVoiceState('THINKING');

    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText,
            scenario_id: scenarioId,
            session_id: this.sessionId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            this.state = data.state;
            this.notifyStateChange();
          }

          const reply = data.reply;
          const firstTool = data.tool_calls && data.tool_calls.length > 0 ? data.tool_calls[0] : null;

          this.addChatMessage({
            sender: 'alexa',
            text: reply,
            toolCall: firstTool
              ? {
                  name: firstTool.tool_name,
                  latency_ms: 14,
                  status: 'SUCCESS',
                  details: JSON.stringify(firstTool.arguments),
                }
              : undefined,
          });

          this.setVoiceState('SPEAKING');
          soundEngine.speak(reply, {
            onEnd: () => {
              this.setVoiceState('IDLE');
              this.setActiveTool(null);
            },
          });
          return;
        }
      } catch (err) {
        console.warn('Backend scenario call failed:', err);
      }
    }

    // Offline fallback for scenario
    await this.handleLocalFallbackUtterance(promptText);
  }

  /**
   * Executes a tool directly on the backend via `POST /api/mcp/direct`
   */
  public async directMcpInvoke(toolName: string, args: Record<string, unknown>): Promise<void> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool(toolName);
    soundEngine.playToolBlip();

    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/mcp/direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool_name: toolName,
            arguments: args,
            session_id: this.sessionId,
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
          return;
        }
      } catch (err) {
        console.warn('Backend direct tool call failed:', err);
      }
    }

    // Fallback direct execution
    this.executeLocalToolFallback(toolName, args);
  }

  /**
   * Direct Log Medication Taken helper for UI click actions
   */
  public async logMedicationTaken(medNameOrId: string, notes: string = 'Confirmed via UI'): Promise<void> {
    const med = this.state.medications.find(
      (m) => m.id === medNameOrId || m.name.toLowerCase().includes(medNameOrId.toLowerCase())
    );
    const resolvedName = med ? med.name : 'Eliquis (Apixaban)';

    await this.directMcpInvoke('log_medication_taken', {
      medication_name: resolvedName,
      taken_time: 'now',
      hydration_glass_added: true,
      notes,
    });
  }

  /**
   * Direct Hydration Glass helper
   */
  public async addHydrationGlass(): Promise<void> {
    soundEngine.playToolBlip();
    this.state.patient.vitals.hydration_glasses = Math.min(
      this.state.patient.vitals.hydration_goal + 2,
      this.state.patient.vitals.hydration_glasses + 1
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    this.state.activity_timeline.unshift({
      id: `evt_hyd_${Date.now()}`,
      timestamp: nowTime,
      type: 'MED_LOGGED',
      actor: 'Eleanor (via Alexa+)',
      summary: `Logged +1 glass of water (${this.state.patient.vitals.hydration_glasses}/${this.state.patient.vitals.hydration_goal} target).`,
    });

    this.notifyStateChange();
  }

  /**
   * Resets State to Seed via Backend API `POST /api/state/reset`
   */
  public async resetDemo(): Promise<void> {
    soundEngine.stopSpeaking();

    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/state/reset`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          if (data.state) {
            this.state = data.state;
          }
        }
      } catch (err) {
        console.warn('Backend reset failed:', err);
      }
    }

    if (!this.isLiveBackend) {
      this.state = JSON.parse(JSON.stringify(INITIAL_DEMO_STATE));
    }

    this.chatMessages = [
      {
        id: `msg_init_${Date.now()}`,
        sender: 'alexa',
        text: "Good afternoon, Eleanor. Your 02:00 PM Eliquis dose is pending. Whenever you're ready, let me know once you take it with a glass of water!",
        timestamp: '02:45 PM',
      },
    ];

    this.setVoiceState('IDLE');
    this.setActiveTool(null);
    this.notifyStateChange();
    this.chatHistoryListeners.forEach((l) => l([...this.chatMessages]));
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.state.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifyStateChange();
    }
  }

  // --- Local Fallback Engine (Active only when backend is disconnected) ---
  private async handleLocalFallbackUtterance(userUtterance: string): Promise<void> {
    const textLower = userUtterance.toLowerCase();
    let reply = '';
    let toolName: string | undefined;

    if (textLower.includes('eliquis') || textLower.includes('pill') || textLower.includes('took')) {
      const med = this.state.medications.find((m) => m.name.includes('Eliquis'));
      if (med) {
        med.status = 'TAKEN';
        med.taken_at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      this.state.patient.adherence_Rate = 75;
      this.state.patient.status = 'HEALTHY';
      this.state.patient.vitals.hydration_glasses = Math.min(6, this.state.patient.vitals.hydration_glasses + 1);

      const careAlert: CareAlert = {
        id: `alt_${Date.now()}`,
        severity: 'LOW',
        title: '✅ Eliquis 5mg Logged by Eleanor',
        message: 'Eleanor confirmed taking her 2:00 PM Eliquis dose. Adherence is now 75%.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        channel: 'ALEXA_APP_AND_SMS',
        acknowledged: false,
      };
      this.state.alerts.unshift(careAlert);
      this.toastListeners.forEach((l) => l(careAlert));

      reply = "Wonderful, Eleanor! I've logged your afternoon Eliquis 5 milligram dose and marked down an extra glass of water. I also sent a note to Maya so she knows you're all set.";
      toolName = 'log_medication_taken';
    } else if (textLower.includes('schedule') || textLower.includes('today')) {
      reply = "Here is your care schedule for today, Eleanor: You completed morning Lisinopril, Eliquis is due, and you have your 4:30 PM Cardiology Telehealth call with Dr. Thorne.";
      toolName = 'get_today_schedule';
    } else if (textLower.includes('help') || textLower.includes('emergency') || textLower.includes('not responded')) {
      this.state.patient.status = 'CRITICAL';
      soundEngine.playAlertSiren();
      const careAlert: CareAlert = {
        id: `alt_${Date.now()}`,
        severity: 'CRITICAL',
        title: '🚨 URGENT: Check-in Escalation',
        message: 'Eleanor did not respond to check-in prompts. Escalating to primary caregiver.',
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        channel: 'ALEXA_APP_AND_SMS',
        acknowledged: false,
      };
      this.state.alerts.unshift(careAlert);
      this.toastListeners.forEach((l) => l(careAlert));

      reply = "Attention: I did not detect a voice response from Eleanor. I have escalated her status to Critical and notified Maya Vance.";
      toolName = 'check_in_status';
    } else {
      reply = `I'm right here with you, Eleanor. Your vitals are steady at ${this.state.patient.vitals.heart_rate} BPM and blood pressure ${this.state.patient.vitals.blood_pressure}. Let me know if you need anything!`;
    }

    this.addChatMessage({
      sender: 'alexa',
      text: reply,
      toolCall: toolName
        ? {
            name: toolName,
            latency_ms: 12,
            status: 'SUCCESS',
          }
        : undefined,
    });

    this.notifyStateChange();
    this.setVoiceState('SPEAKING');
    soundEngine.speak(reply, {
      onEnd: () => {
        this.setVoiceState('IDLE');
        this.setActiveTool(null);
      },
    });
  }

  private executeLocalToolFallback(toolName: string, args: Record<string, unknown>): void {
    if (toolName === 'log_medication_taken') {
      const med = this.state.medications.find(
        (m) => m.name.toLowerCase().includes(String(args.medication_name || '').toLowerCase())
      );
      if (med) {
        med.status = 'TAKEN';
        med.taken_at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      this.state.patient.adherence_Rate = 75;
      this.state.patient.status = 'HEALTHY';
    }
    this.notifyStateChange();
    this.setActiveTool(null);
    this.setVoiceState('IDLE');
  }
}

export const careService = new CareService();
