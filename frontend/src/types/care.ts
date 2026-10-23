export type PatientStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';
export type MedStatus = 'TAKEN' | 'OVERDUE' | 'UPCOMING';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AgentVoiceState = 'IDLE' | 'LISTENING' | 'THINKING' | 'CALLING_MCP_TOOL' | 'SPEAKING' | 'ALERT';

export interface PatientVitals {
  heart_rate: number;
  blood_pressure: string;
  blood_oxygen: number;
  hydration_glasses: number;
  hydration_goal: number;
  mood: string;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  condition_summary: string;
  status: PatientStatus;
  adherence_Rate: number;
  last_check_in: string;
  vitals: PatientVitals;
}

export interface CaregiverProfile {
  name: string;
  relation: string;
  location: string;
  phone: string;
  notification_status: string;
}

export interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  scheduled_time: string;
  purpose: string;
  instructions: string;
  criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: MedStatus;
  taken_at: string | null;
  pill_color: string;
  secondary_color: string;
  shape: 'capsule' | 'oval' | 'round';
}

export interface AppointmentItem {
  id: string;
  title: string;
  specialty: string;
  date: string;
  time: string;
  location: string;
  notes: string;
  status: string;
}

export interface CareAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  channel: string;
  acknowledged: boolean;
  recommended_action?: string;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: 'MED_LOGGED' | 'MISSED_DOSE_FLAG' | 'APPOINTMENT_ADDED' | 'CHECKIN_ESCALATION' | 'CAREGIVER_NOTIFIED';
  actor: string;
  summary: string;
}

export interface McpTelemetryFrame {
  id: string;
  timestamp: string;
  protocol_version: string; // "2025-11-25"
  transport: string;        // "Streamable HTTP (POST /mcp)"
  session_id: string;
  tool_name: string;
  jsonrpc_request: Record<string, unknown>;
  jsonrpc_response: Record<string, unknown>;
  latency_ms: number;
  status: 'SUCCESS' | 'ERROR';
}

export interface CareSystemState {
  patient: PatientProfile;
  caregiver: CaregiverProfile;
  medications: MedicationItem[];
  appointments: AppointmentItem[];
  alerts: CareAlert[];
  activity_timeline: TimelineEvent[];
  mcp_telemetry_log: McpTelemetryFrame[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'alexa' | 'system';
  text: string;
  timestamp: string;
  toolCall?: {
    name: string;
    latency_ms: number;
    status: 'SUCCESS' | 'ERROR';
    details?: string;
  };
}
