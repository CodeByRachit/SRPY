import {
  CareSystemState,
  CareAlert,
  TimelineEvent,
  McpTelemetryFrame,
  AgentVoiceState,
  MedicationItem,
  AppointmentItem,
  ChatMessage,
} from '../types/care';
import { soundEngine } from '../utils/soundEngine';

const BACKEND_URL = 'http://localhost:8000';
const BACKEND_WS = 'ws://localhost:8000/ws/dashboard';

// Initial Hackathon Demo State Seed
const INITIAL_DEMO_STATE: CareSystemState = {
  patient: {
    id: 'pt_eleanor_vance',
    name: 'Eleanor Vance',
    age: 78,
    location: "Eleanor's Living Room • Portland, OR",
    condition_summary: 'Hypertension & Mild Cognitive Decline • Fall Risk 2',
    status: 'WARNING', // Warning because 2:00 PM Eliquis is currently overdue
    adherence_Rate: 50,
    last_check_in: '2:15 PM (30m ago)',
    vitals: {
      heart_rate: 78,
      blood_pressure: '132/84',
      blood_oxygen: 98,
      hydration_glasses: 3,
      hydration_goal: 6,
      mood: 'Alert & Pleasant',
    },
  },
  caregiver: {
    name: 'Maya Vance',
    relation: 'Daughter (Primary Caregiver)',
    location: 'Seattle, WA (680 miles away)',
    phone: '+1 (206) 555-0192',
    notification_status: 'Active • High-Priority Push & SMS Enabled',
  },
  medications: [
    {
      id: 'med_1',
      name: 'Lisinopril 10mg',
      dosage: '10mg',
      scheduled_time: '8:00 AM',
      purpose: 'Hypertension & Cardioprotection',
      instructions: 'Take 1 tablet in the morning with food and water',
      criticality: 'HIGH',
      status: 'TAKEN',
      taken_at: '8:05 AM',
      pill_color: '#38bdf8',
      secondary_color: '#0284c7',
      shape: 'capsule',
    },
    {
      id: 'med_2',
      name: 'Eliquis 5mg',
      dosage: '5mg',
      scheduled_time: '2:00 PM',
      purpose: 'Anticoagulant & Stroke Prevention',
      instructions: 'Take 1 tablet every 12h with a full glass of water',
      criticality: 'CRITICAL',
      status: 'OVERDUE', // Highlighted in 3D canvas and judge scenario
      taken_at: null,
      pill_color: '#f43f5e',
      secondary_color: '#fb7185',
      shape: 'capsule',
    },
    {
      id: 'med_3',
      name: 'Metformin 500mg',
      dosage: '500mg',
      scheduled_time: '6:00 PM',
      purpose: 'Type 2 Glycemic Regulation',
      instructions: 'Take with evening meal to minimize GI discomfort',
      criticality: 'MEDIUM',
      status: 'UPCOMING',
      taken_at: null,
      pill_color: '#a855f7',
      secondary_color: '#c084fc',
      shape: 'oval',
    },
    {
      id: 'med_4',
      name: 'Atorvastatin 20mg',
      dosage: '20mg',
      scheduled_time: '9:00 PM',
      purpose: 'Lipid Lowering & Plaque Stabilization',
      instructions: 'Take once daily at bedtime',
      criticality: 'LOW',
      status: 'UPCOMING',
      taken_at: null,
      pill_color: '#34d399',
      secondary_color: '#10b981',
      shape: 'round',
    },
  ],
  appointments: [
    {
      id: 'apt_1',
      title: 'Dr. Sarah Lin (Cardiology)',
      specialty: 'Cardiovascular Health Check',
      date: 'Tomorrow, Oct 24',
      time: '10:30 AM',
      location: 'Swedish Heart & Vascular Clinic',
      notes: 'Review 30-day vitals telemetry and Lisinopril efficacy.',
      status: 'CONFIRMED',
    },
  ],
  alerts: [
    {
      id: 'alert_initial',
      severity: 'HIGH',
      title: 'Afternoon Dose Overdue',
      message: 'Eliquis 5mg was scheduled for 2:00 PM and is now 45 minutes overdue.',
      timestamp: '2:45 PM',
      channel: 'Echo Show 15 + Alexa Care Push',
      acknowledged: false,
      recommended_action: 'Prompt Eleanor via ambient voice; notify Maya if unconfirmed.',
    },
  ],
  activity_timeline: [
    {
      id: 'tl_1',
      timestamp: '8:05 AM',
      type: 'MED_LOGGED',
      actor: 'Eleanor Vance (Echo Show 15)',
      summary: 'Confirmed taking morning Lisinopril 10mg with breakfast.',
    },
    {
      id: 'tl_2',
      timestamp: '2:00 PM',
      type: 'MISSED_DOSE_FLAG',
      actor: 'AuraCare Schedule Monitor',
      summary: 'Scheduled dose window opened for Eliquis 5mg.',
    },
    {
      id: 'tl_3',
      timestamp: '2:30 PM',
      type: 'MISSED_DOSE_FLAG',
      actor: 'AuraCare Agent',
      summary: '30-minute grace window elapsed without patient confirmation.',
    },
    {
      id: 'tl_4',
      timestamp: '2:45 PM',
      type: 'CAREGIVER_NOTIFIED',
      actor: 'AuraCare Bridge (MCP)',
      summary: 'Push alert dispatched to Maya Vance (Seattle, WA).',
    },
  ],
  mcp_telemetry_log: [
    {
      id: 'mcp_seed_1',
      timestamp: '2:45:02 PM',
      protocol_version: '2025-11-25',
      transport: 'Streamable HTTP (POST /mcp)',
      session_id: 'mcp-sess-e9b4-71a2',
      tool_name: 'notify_caregiver',
      jsonrpc_request: {
        jsonrpc: '2.0',
        id: 'req_001',
        method: 'tools/call',
        params: {
          name: 'notify_caregiver',
          arguments: {
            recipient: 'Maya Vance',
            channel: 'PUSH_AND_SMS',
            urgency: 'HIGH',
            message: 'Eliquis 5mg overdue for Eleanor Vance (Portland, OR)',
          },
        },
      },
      jsonrpc_response: {
        jsonrpc: '2.0',
        id: 'req_001',
        result: {
          content: [
            {
              type: 'text',
              text: 'Push notification successfully queued and delivered to Maya Vance iOS device.',
            },
          ],
          structuredContent: {
            delivered: true,
            recipient_distance_mi: 680,
            delivery_latency_ms: 8,
          },
        },
      },
      latency_ms: 12,
      status: 'SUCCESS',
    },
  ],
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
      text: 'Good afternoon, Eleanor. I noticed it is 2:45 PM and your 2:00 PM Eliquis dose hasn’t been checked off yet. Whenever you’re ready, let me know once you take it!',
      timestamp: '2:45 PM',
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

  // --- Backend Connection & Graceful Fallback ---
  private async attemptBackendConnection(): Promise<void> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/state`, { method: 'GET', signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        this.state = data;
        this.isLiveBackend = true;
        this.notifyStateChange();
        this.connectWebSocket();
        return;
      }
    } catch {
      // Backend not running; operate in invincible standalone mode
      this.isLiveBackend = false;
    }

    // Schedule retry check every 10 seconds in case backend spins up later
    if (!this.wsReconnectTimer) {
      this.wsReconnectTimer = setInterval(() => {
        if (!this.isLiveBackend) {
          this.attemptBackendConnection();
        }
      }, 10000);
    }
  }

  private connectWebSocket(): void {
    try {
      this.ws = new WebSocket(BACKEND_WS);
      this.ws.onopen = () => {
        this.isLiveBackend = true;
        this.notifyStateChange();
      };
      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'STATE_UPDATE' && payload.data) {
            this.state = payload.data;
            this.notifyStateChange();
          } else if (payload.type === 'CAREGIVER_NOTIFICATION' && payload.alert) {
            this.toastListeners.forEach((l) => l(payload.alert));
          }
        } catch (e) {
          console.warn('WS parsing error:', e);
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

  // --- Client-Side MCP 2025-11-25 Telemetry Recorder ---
  private recordMcpTelemetry(
    toolName: string,
    reqArgs: Record<string, unknown>,
    respData: Record<string, unknown>,
    latencyMs: number,
    status: 'SUCCESS' | 'ERROR' = 'SUCCESS'
  ): McpTelemetryFrame {
    const frame: McpTelemetryFrame = {
      id: `mcp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }),
      protocol_version: '2025-11-25',
      transport: 'Streamable HTTP (POST /mcp)',
      session_id: this.sessionId,
      tool_name: toolName,
      jsonrpc_request: {
        jsonrpc: '2.0',
        id: `req_${Date.now().toString(36)}`,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: reqArgs,
        },
      },
      jsonrpc_response: {
        jsonrpc: '2.0',
        id: `req_${Date.now().toString(36)}`,
        result: {
          content: [
            {
              type: 'text',
              text: (respData.message as string) || `Tool ${toolName} executed successfully.`,
            },
          ],
          structuredContent: respData,
        },
      },
      latency_ms: latencyMs,
      status,
    };

    this.state.mcp_telemetry_log.unshift(frame);
    if (this.state.mcp_telemetry_log.length > 50) {
      this.state.mcp_telemetry_log.pop();
    }
    return frame;
  }

  // --- MCP Tool Executions (Hybrid Live + Fallback Simulation) ---

  /**
   * MCP Tool 1: log_medication_taken
   */
  public async logMedicationTaken(medId: string, notes?: string, confirmedVia: string = 'Echo Show 15 Voice'): Promise<{ success: boolean; message: string; medName: string }> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool('log_medication_taken');
    soundEngine.playToolBlip();

    const startTime = performance.now();

    // If live backend is available, call it first
    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/mcp/direct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool_name: 'log_medication_taken',
            arguments: { medication_id: medId, notes, confirmed_via: confirmedVia },
          }),
        });
        if (res.ok) {
          const result = await res.json();
          const latency = Math.round(performance.now() - startTime);
          soundEngine.playSuccessChord();
          this.setActiveTool(null);
          this.setVoiceState('IDLE');
          return result;
        }
      } catch (err) {
        console.warn('Backend call failed, using client MCP simulation:', err);
      }
    }

    // Client-Side Invincible Simulation
    await new Promise((r) => setTimeout(r, 60)); // Simulate sub-10ms network transport
    const med = this.state.medications.find((m) => m.id === medId || m.name.toLowerCase().includes(medId.toLowerCase()));
    const medName = med ? med.name : 'Eliquis 5mg';

    if (med) {
      med.status = 'TAKEN';
      med.taken_at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    // Recalculate adherence
    const takenCount = this.state.medications.filter((m) => m.status === 'TAKEN').length;
    this.state.patient.adherence_Rate = Math.round((takenCount / this.state.medications.length) * 100);

    // Update status to HEALTHY if no other overdue meds
    const hasOverdue = this.state.medications.some((m) => m.status === 'OVERDUE');
    if (!hasOverdue) {
      this.state.patient.status = 'HEALTHY';
    }

    // Increment hydration glasses (+1) because pills are taken with water
    if (this.state.patient.vitals.hydration_glasses < this.state.patient.vitals.hydration_goal) {
      this.state.patient.vitals.hydration_glasses += 1;
    }

    // Add Timeline Event
    const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    this.state.activity_timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: nowTime,
      type: 'MED_LOGGED',
      actor: 'Eleanor Vance (Echo Show 15)',
      summary: `Confirmed taking ${medName} with a glass of water.`,
    });

    // Fire Caregiver Notification Alert
    const careAlert: CareAlert = {
      id: `alert_${Date.now()}`,
      severity: 'LOW',
      title: 'Dose Logged & On Track',
      message: `Eleanor Vance took her ${medName} at ${nowTime}. Adherence is now ${this.state.patient.adherence_Rate}%.`,
      timestamp: nowTime,
      channel: 'Alexa Care Bridge Push',
      acknowledged: false,
      recommended_action: 'No action needed. Eleanor is on track.',
    };
    this.state.alerts.unshift(careAlert);
    this.toastListeners.forEach((l) => l(careAlert));

    const latency = Math.round(performance.now() - startTime) || 14;
    this.recordMcpTelemetry(
      'log_medication_taken',
      { medication_id: medId, notes: notes || 'Taken with full glass of water', confirmed_via: confirmedVia },
      {
        confirmed: true,
        medication: medName,
        adherence_rate: this.state.patient.adherence_Rate,
        patient_status: this.state.patient.status,
      },
      latency
    );

    soundEngine.playSuccessChord();
    this.notifyStateChange();
    this.setActiveTool(null);
    this.setVoiceState('IDLE');

    return {
      success: true,
      message: `Logged ${medName} as taken. Adherence updated to ${this.state.patient.adherence_Rate}%.`,
      medName,
    };
  }

  /**
   * MCP Tool 2: get_today_schedule
   */
  public async getTodaySchedule(): Promise<{ summary: string; remainingMeds: string[] }> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool('get_today_schedule');
    soundEngine.playToolBlip();

    const startTime = performance.now();
    await new Promise((r) => setTimeout(r, 40));

    const remaining = this.state.medications
      .filter((m) => m.status !== 'TAKEN')
      .map((m) => `${m.name} at ${m.scheduled_time}`);

    const latency = Math.round(performance.now() - startTime) || 9;
    this.recordMcpTelemetry(
      'get_today_schedule',
      { patient_id: this.state.patient.id },
      {
        adherence_rate: this.state.patient.adherence_Rate,
        medications_count: this.state.medications.length,
        remaining_count: remaining.length,
        appointments_count: this.state.appointments.length,
      },
      latency
    );

    this.setActiveTool(null);
    this.setVoiceState('IDLE');

    const summary = `Eleanor has ${this.state.medications.length} total scheduled medications today. ${remaining.length} remaining. Cardiology tomorrow at 10:30 AM.`;
    return { summary, remainingMeds: remaining };
  }

  /**
   * MCP Tool 3: check_in_status (Wellness check & escalation)
   */
  public async checkInStatus(distressLevel: 'NONE' | 'MODERATE' | 'HIGH' = 'NONE', note?: string): Promise<{ status: string; escalated: boolean }> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool('check_in_status');
    soundEngine.playToolBlip();

    const startTime = performance.now();
    await new Promise((r) => setTimeout(r, 50));

    const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    let escalated = false;

    if (distressLevel === 'HIGH') {
      escalated = true;
      this.state.patient.status = 'CRITICAL';
      this.state.patient.vitals.mood = 'Distressed / Unresponsive';
      this.state.patient.vitals.heart_rate = 94;

      soundEngine.playAlertSiren();

      // Urgent timeline
      this.state.activity_timeline.unshift({
        id: `tl_${Date.now()}`,
        timestamp: nowTime,
        type: 'CHECKIN_ESCALATION',
        actor: 'Alexa+ Ambient Guardian',
        summary: note || 'Patient failed to respond to 3:00 PM proactive check-in prompt.',
      });

      // Urgent Caregiver Alert
      const alert: CareAlert = {
        id: `alert_${Date.now()}`,
        severity: 'CRITICAL',
        title: 'Emergency: Wellness Check Escalation',
        message: 'Eleanor did not respond to living room voice prompts. Heart rate elevated to 94 BPM.',
        timestamp: nowTime,
        channel: 'Alexa+ Urgent Escalation Siren & Auto-Call',
        acknowledged: false,
        recommended_action: 'Call Eleanor immediately or contact emergency neighbor contact.',
      };
      this.state.alerts.unshift(alert);
      this.toastListeners.forEach((l) => l(alert));
    } else {
      this.state.patient.status = 'HEALTHY';
      this.state.patient.vitals.mood = 'Calm & Reassured';
      this.state.patient.vitals.heart_rate = 74;
      this.state.patient.last_check_in = `Just now (${nowTime})`;

      this.state.activity_timeline.unshift({
        id: `tl_${Date.now()}`,
        timestamp: nowTime,
        type: 'CHECKIN_ESCALATION',
        actor: 'Eleanor Vance (Echo Show 15)',
        summary: 'Checked in verbally. Patient reports feeling well.',
      });
    }

    const latency = Math.round(performance.now() - startTime) || 15;
    this.recordMcpTelemetry(
      'check_in_status',
      { patient_id: this.state.patient.id, distress_level: distressLevel, note },
      { escalated, patient_status: this.state.patient.status, vitals: this.state.patient.vitals },
      latency,
      escalated ? 'ERROR' : 'SUCCESS'
    );

    this.notifyStateChange();
    this.setActiveTool(null);
    this.setVoiceState(escalated ? 'ALERT' : 'IDLE');

    return { status: this.state.patient.status, escalated };
  }

  /**
   * MCP Tool 4: add_appointment
   */
  public async addAppointment(
    title: string,
    specialty: string,
    date: string,
    time: string,
    location: string,
    notes?: string
  ): Promise<AppointmentItem> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool('add_appointment');
    soundEngine.playToolBlip();

    const startTime = performance.now();
    await new Promise((r) => setTimeout(r, 60));

    const newApt: AppointmentItem = {
      id: `apt_${Date.now()}`,
      title,
      specialty,
      date,
      time,
      location,
      notes: notes || 'Added via Alexa+ Voice Bridge with Maya Vance auto-sync.',
      status: 'CONFIRMED',
    };

    this.state.appointments.push(newApt);

    const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    this.state.activity_timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: nowTime,
      type: 'APPOINTMENT_ADDED',
      actor: 'Alexa+ Scheduler',
      summary: `Booked ${title} for ${date} at ${time}.`,
    });

    const alert: CareAlert = {
      id: `alert_${Date.now()}`,
      severity: 'LOW',
      title: 'New Appointment Scheduled',
      message: `Eleanor added: ${title} on ${date} at ${time}. Synchronized to Maya’s caregiver calendar.`,
      timestamp: nowTime,
      channel: 'Alexa Care Calendar Bridge',
      acknowledged: false,
    };
    this.state.alerts.unshift(alert);
    this.toastListeners.forEach((l) => l(alert));

    const latency = Math.round(performance.now() - startTime) || 16;
    this.recordMcpTelemetry(
      'add_appointment',
      { title, specialty, date, time, location, notes },
      { appointment_id: newApt.id, confirmed: true },
      latency
    );

    soundEngine.playSuccessChord();
    this.notifyStateChange();
    this.setActiveTool(null);
    this.setVoiceState('IDLE');

    return newApt;
  }

  /**
   * MCP Tool 5: notify_caregiver
   */
  public async notifyCaregiver(channel: string, urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', message: string): Promise<CareAlert> {
    this.setVoiceState('CALLING_MCP_TOOL');
    this.setActiveTool('notify_caregiver');
    soundEngine.playToolBlip();

    const startTime = performance.now();
    await new Promise((r) => setTimeout(r, 45));

    const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const alert: CareAlert = {
      id: `alert_${Date.now()}`,
      severity: urgency,
      title: urgency === 'CRITICAL' ? 'Urgent Care Alert' : 'Caregiver Notification',
      message,
      timestamp: nowTime,
      channel,
      acknowledged: false,
    };

    this.state.alerts.unshift(alert);
    this.toastListeners.forEach((l) => l(alert));

    this.state.activity_timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: nowTime,
      type: 'CAREGIVER_NOTIFIED',
      actor: 'AuraCare Bridge',
      summary: `Dispatched ${urgency} alert to Maya Vance: "${message.substring(0, 50)}..."`,
    });

    const latency = Math.round(performance.now() - startTime) || 11;
    this.recordMcpTelemetry(
      'notify_caregiver',
      { channel, urgency, message, recipient: this.state.caregiver.name },
      { delivered: true, recipient_distance_mi: 680, push_id: `apns_${Date.now()}` },
      latency
    );

    this.notifyStateChange();
    this.setActiveTool(null);
    this.setVoiceState('IDLE');

    return alert;
  }

  /**
   * Helper: Add Hydration Glass (+1)
   */
  public addHydrationGlass(): void {
    soundEngine.playToolBlip();
    this.state.patient.vitals.hydration_glasses = Math.min(
      this.state.patient.vitals.hydration_goal + 2,
      this.state.patient.vitals.hydration_glasses + 1
    );

    const nowTime = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    this.state.activity_timeline.unshift({
      id: `tl_${Date.now()}`,
      timestamp: nowTime,
      type: 'MED_LOGGED',
      actor: 'Eleanor Vance',
      summary: `Logged +1 glass of water (${this.state.patient.vitals.hydration_glasses}/${this.state.patient.vitals.hydration_goal} target).`,
    });

    this.notifyStateChange();
  }

  /**
   * Master Conversational Agent: Handles voice & text utterances
   */
  public async handleAgentUtterance(userUtterance: string): Promise<void> {
    const textLower = userUtterance.toLowerCase();

    // Eleanor's user message in feed
    this.addChatMessage({
      sender: 'user',
      text: userUtterance,
    });

    soundEngine.playWakeWordChime();
    this.setVoiceState('THINKING');
    await new Promise((r) => setTimeout(r, 400));

    let responseText = '';
    let toolCallInfo: { name: string; latency_ms: number; status: 'SUCCESS' | 'ERROR'; details?: string } | undefined;

    if (textLower.includes('eliquis') || textLower.includes('afternoon pill') || (textLower.includes('took') && textLower.includes('med'))) {
      const res = await this.logMedicationTaken('med_2', 'Taken with full glass of water confirmed via voice', 'Alexa+ Voice');
      responseText = `Wonderful, Eleanor! I have recorded your 2:00 PM Eliquis as taken and notified Maya in Seattle so she knows you are all set. Adherence is now up to ${this.state.patient.adherence_Rate}%. Great job!`;
      toolCallInfo = { name: 'log_medication_taken', latency_ms: 14, status: 'SUCCESS', details: 'med_2 (Eliquis 5mg)' };
    } else if (textLower.includes('lisinopril')) {
      const res = await this.logMedicationTaken('med_1', 'Morning dose confirmed', 'Alexa+ Voice');
      responseText = `I've checked off your Lisinopril for the morning. Maya's dashboard has been updated.`;
      toolCallInfo = { name: 'log_medication_taken', latency_ms: 12, status: 'SUCCESS', details: 'med_1 (Lisinopril 10mg)' };
    } else if (textLower.includes('metformin')) {
      const res = await this.logMedicationTaken('med_3', 'Evening dose confirmed', 'Alexa+ Voice');
      responseText = `Recorded your Metformin 500mg dose. Keep up the great routine!`;
      toolCallInfo = { name: 'log_medication_taken', latency_ms: 15, status: 'SUCCESS', details: 'med_3 (Metformin 500mg)' };
    } else if (textLower.includes('atorvastatin')) {
      const res = await this.logMedicationTaken('med_4', 'Bedtime dose confirmed', 'Alexa+ Voice');
      responseText = `Logged your Atorvastatin 20mg. Sleep well, Eleanor!`;
      toolCallInfo = { name: 'log_medication_taken', latency_ms: 13, status: 'SUCCESS', details: 'med_4 (Atorvastatin 20mg)' };
    } else if (textLower.includes('schedule') || textLower.includes('today') || textLower.includes('what med') || textLower.includes('plan')) {
      const sched = await this.getTodaySchedule();
      const remainingText = sched.remainingMeds.length > 0 ? `You still have ${sched.remainingMeds.join(', ')} scheduled.` : `All your medications for today are taken!`;
      responseText = `Here is your care schedule: Your adherence today is ${this.state.patient.adherence_Rate}%. ${remainingText} Plus your cardiology appointment with Dr. Lin tomorrow at 10:30 AM.`;
      toolCallInfo = { name: 'get_today_schedule', latency_ms: 9, status: 'SUCCESS', details: '4 medications, 1 appointment' };
    } else if (textLower.includes('appointment') || textLower.includes('patel') || textLower.includes('eye exam') || textLower.includes('doctor')) {
      await this.addAppointment('Dr. Priya Patel (Ophthalmology)', 'Comprehensive Vision & Retinal Exam', 'Tomorrow, Oct 24', '2:00 PM', 'Eye Health Clinic • Suite 400', 'Annual diabetic & hypertension eye exam');
      responseText = `I've booked your eye exam with Dr. Priya Patel for tomorrow at 2:00 PM and added it to both your calendar and Maya’s caregiver bridge.`;
      toolCallInfo = { name: 'add_appointment', latency_ms: 16, status: 'SUCCESS', details: 'Dr. Priya Patel @ 2:00 PM' };
    } else if (textLower.includes('help') || textLower.includes('fall') || textLower.includes('emergency') || textLower.includes('pain') || textLower.includes('not responding') || textLower.includes('unresponsive')) {
      await this.checkInStatus('HIGH', 'Emergency check-in triggered via Alexa+ living room acoustic sensor.');
      responseText = `Eleanor, I am alerting Maya in Seattle immediately and activating your caregiver escalation bridge. Please stay comfortable and seated.`;
      toolCallInfo = { name: 'check_in_status', latency_ms: 18, status: 'ERROR', details: 'CRITICAL Escalation Triggered' };
    } else if (textLower.includes('okay') || textLower.includes('fine') || textLower.includes('fresh air') || textLower.includes('better')) {
      await this.checkInStatus('NONE', 'Eleanor checked in verbally confirming she is okay.');
      responseText = `I'm so glad you're feeling well, Eleanor! I have reset your status to Healthy and let Maya know you are safe.`;
      toolCallInfo = { name: 'check_in_status', latency_ms: 11, status: 'SUCCESS', details: 'Patient Safe' };
    } else if (textLower.includes('water') || textLower.includes('drink') || textLower.includes('hydrate')) {
      this.addHydrationGlass();
      responseText = `Great job staying hydrated, Eleanor! You have logged ${this.state.patient.vitals.hydration_glasses} of your ${this.state.patient.vitals.hydration_goal} target glasses today.`;
    } else {
      responseText = `I'm here with you, Eleanor. Your vitals look steady today with blood pressure at ${this.state.patient.vitals.blood_pressure} and heart rate at ${this.state.patient.vitals.heart_rate} BPM. Let me know if you need to log a dose or check your doctor's schedule!`;
    }

    // Alexa+ voice synthesis response
    this.addChatMessage({
      sender: 'alexa',
      text: responseText,
      toolCall: toolCallInfo,
    });

    this.setVoiceState('SPEAKING');
    soundEngine.speak(responseText, {
      onEnd: () => {
        this.setVoiceState('IDLE');
      },
    });
  }

  /**
   * Reset Entire Demo State back to 2:45 PM Seed
   */
  public async resetDemo(): Promise<void> {
    soundEngine.stopSpeaking();
    this.state = JSON.parse(JSON.stringify(INITIAL_DEMO_STATE));
    this.chatMessages = [
      {
        id: `msg_init_${Date.now()}`,
        sender: 'alexa',
        text: 'Good afternoon, Eleanor. I noticed it is 2:45 PM and your 2:00 PM Eliquis dose hasn’t been checked off yet. Whenever you’re ready, let me know once you take it!',
        timestamp: '2:45 PM',
      },
    ];
    this.setVoiceState('IDLE');
    this.setActiveTool(null);
    this.notifyStateChange();
    this.chatHistoryListeners.forEach((l) => l([...this.chatMessages]));

    if (this.isLiveBackend) {
      try {
        await fetch(`${BACKEND_URL}/api/state/reset`, { method: 'POST' });
      } catch {
        // Ignored
      }
    }
  }

  /**
   * Acknowledge Alert
   */
  public acknowledgeAlert(alertId: string): void {
    const alert = this.state.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.notifyStateChange();
    }
  }
}

export const careService = new CareService();
