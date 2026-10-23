import React from 'react';
import {
  CareSystemState,
  MedicationItem,
  AppointmentItem,
} from '../types/care';
import {
  Home,
  Calendar,
  Activity,
  Bell,
  Settings,
  SlidersHorizontal,
  Check,
  AlertTriangle,
  Heart,
} from 'lucide-react';
import { Tactile3DPillCanvas, Tactile3DHouseCanvas } from './Alexa3DCanvas';

interface CaregiverDashboardProps {
  state: CareSystemState;
  activeTool?: string | null;
  onLogMedication?: (medId: string) => void;
  onAddHydration?: () => void;
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  state,
  activeTool = null,
  onLogMedication,
}) => {
  const { patient, medications, appointments } = state;

  // Find morning & afternoon meds
  const morningMed = medications.find((m) => m.scheduled_time.includes('08:00') || m.id === 'med_01') || medications[0];
  const afternoonMed = medications.find((m) => m.scheduled_time.includes('02:00') || m.id === 'med_02') || medications[1];

  const isMorningDone = morningMed?.status === 'TAKEN';
  const isAfternoonDone = afternoonMed?.status === 'TAKEN';

  // Reactive spotlight rings based on active MCP tool
  const isMedicationActive = activeTool === 'log_medication_taken';
  const isScheduleActive = activeTool === 'get_today_schedule' || activeTool === 'add_appointment';
  const isAlertActive = activeTool === 'check_in_status' || activeTool === 'notify_caregiver';

  return (
    <div className="flex w-full h-full text-slate-800 dark:text-slate-100 select-none">
      {/* 1. Slim Vertical Navigation Rail (Far Left) */}
      <aside className="w-14 sm:w-16 flex flex-col items-center justify-between py-6 px-1.5 border-r border-white/60 dark:border-slate-800/80 shrink-0">
        {/* Top Sphere / Brand Icon */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E8DEC8] via-[#F5EFE0] to-[#FFFFFF] shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_4px_8px_rgba(100,80,50,0.12)] border border-white/90 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full border border-amber-800/20 bg-amber-600/10" />
          </div>

          {/* Navigation Icon Stack */}
          <nav className="flex flex-col items-center gap-3.5">
            {/* Home (Active 3D Pill) */}
            <button
              className="w-10 h-10 rounded-2xl bg-white/95 dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 dark:border-slate-700 flex items-center justify-center text-amber-700 dark:text-amber-400 transition-transform active:scale-95"
              title="Dashboard Home"
            >
              <Home className="w-4 h-4 fill-amber-700/20" />
            </button>

            {/* Calendar */}
            <button
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 transition-all flex items-center justify-center"
              title="Schedule"
            >
              <Calendar className="w-4 h-4" />
            </button>

            {/* Vitals */}
            <button
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 transition-all flex items-center justify-center"
              title="Health Vitals"
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* Alerts */}
            <button
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 transition-all flex items-center justify-center relative"
              title="Alerts"
            >
              <Bell className="w-4 h-4" />
              {patient.status !== 'HEALTHY' && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-1.5 animate-ping" />
              )}
            </button>

            {/* Settings */}
            <button
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 transition-all flex items-center justify-center"
              title="Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Bottom Gear / System */}
        <div className="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <Settings className="w-4 h-4" />
        </div>
      </aside>

      {/* 2. Main Caregiver Dashboard Body */}
      <div className="flex-1 flex flex-col gap-4 p-5 sm:p-6 overflow-y-auto">
        {/* Header: Title + Connected Pill + Patient Profile */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Caregiver Dashboard
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {/* Patient Avatar (Elderly portrait badge) */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-200 to-rose-200 border border-white shadow-sm flex items-center justify-center text-xs overflow-hidden shrink-0">
                👵🏻
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Patient: <span className="text-slate-900 dark:text-white font-bold">{patient.name || 'Evelyn Carter'}</span>{' '}
                <span className="text-slate-500 font-normal">(Age {patient.age || 82})</span>
              </span>
            </div>
          </div>

          {/* Green Connected Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F9F0] dark:bg-emerald-950/80 border border-[#A7F3D0] dark:border-emerald-600/50 text-[#059669] dark:text-emerald-300 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Connected</span>
          </div>
        </header>

        {/* Card 1: Medication Logs (Large soft frosted bento card) */}
        <section
          className={`glass-card rounded-3xl p-4 sm:p-5 relative transition-all duration-300 ${
            isMedicationActive ? 'mcp-ring-medication' : ''
          }`}
        >
          {/* Card Subheader */}
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Medication Logs
            </h3>
            <button
              onClick={() => onLogMedication?.(afternoonMed?.id || 'med_02')}
              className="tactile-pill px-3 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              <span>Connection</span>
            </button>
          </div>

          {/* Card Content Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left: 3D Tactile Pill Tile */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white via-[#FAF8F5] to-[#EAE6DF] shadow-[0_8px_20px_-4px_rgba(60,50,40,0.1),inset_0_2px_4px_rgba(255,255,255,1)] border border-white/95 flex items-center justify-center shrink-0 relative overflow-hidden">
                <Tactile3DPillCanvas className="w-18 h-18" />
              </div>

              {/* Center: Morning & Afternoon Med Status Checklist */}
              <div className="space-y-2 text-xs">
                {/* Morning Meds */}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Morning Meds — 8:00 AM
                  </span>
                  <span className="font-bold text-[#10B981] dark:text-emerald-400">
                    [Done]
                  </span>
                </div>

                {/* Afternoon Meds */}
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    Afternoon Meds — 2:00 PM
                  </span>
                  <span
                    className={`font-bold ${
                      isAfternoonDone
                        ? 'text-[#10B981] dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isAfternoonDone ? '[Done]' : '[Scheduled]'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Tactile Action Buttons */}
            <div className="flex items-center gap-2.5 self-end sm:self-center">
              <button
                onClick={() => onLogMedication?.(afternoonMed?.id || 'med_02')}
                className="tactile-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900"
              >
                [ Log Info ]
              </button>
              <button
                onClick={() => onLogMedication?.(afternoonMed?.id || 'med_02')}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E6F9F0] hover:bg-[#D1F5E4] dark:bg-emerald-950/80 border border-[#A7F3D0] dark:border-emerald-600/50 text-[#059669] dark:text-emerald-300 transition-all shadow-sm active:scale-95"
              >
                [ Connected ]
              </button>
            </div>
          </div>
        </section>

        {/* Bento Grid Row 2: Check-In Status & Daily Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bento Card A: Check-In Status with 3D House & LED meter */}
          <section
            className={`glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ${
              isAlertActive ? 'mcp-ring-alert' : ''
            }`}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2.5">
                Check-In Status
              </h3>

              {/* 3D House Icon + Safe & Active Text */}
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-[#F2EFE9] shadow-[0_6px_14px_-2px_rgba(60,50,40,0.08),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white flex items-center justify-center shrink-0 overflow-hidden">
                  <Tactile3DHouseCanvas className="w-14 h-14" />
                </div>
                <div>
                  <div className="font-extrabold text-[#10B981] dark:text-emerald-400 text-sm tracking-tight flex items-center gap-1.5">
                    <span>Safe &amp; Active</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Living Room sensor activity normal
                  </div>
                </div>
              </div>
            </div>

            {/* Vitals: Heart Rate + Glowing LED Segmented Meter */}
            <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1.5 font-medium">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                  Vitals: Heart Rate
                </span>
                <span className="font-bold text-slate-800 dark:text-white font-mono">
                  {patient.vitals.heart_rate || 74} bpm
                </span>
              </div>

              {/* Glowing Segmented LED Bar (~14 pill segments) */}
              <div className="flex items-center gap-1 h-3.5 px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-900 border border-slate-300/40 dark:border-slate-800">
                {[...Array(14)].map((_, i) => (
                  <span
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      i < 9
                        ? 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                        : 'bg-slate-300/70 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>
          </section>

          {/* Bento Card B: Daily Schedule with 3D Calendar nodes and connector trail */}
          <section
            className={`glass-card rounded-3xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ${
              isScheduleActive ? 'mcp-ring-schedule' : ''
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Daily Schedule
                </h3>
                {isScheduleActive && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold animate-pulse">
                    Live Sync
                  </span>
                )}
              </div>

              {/* Visual Schedule Trail */}
              <div className="relative pl-1 py-1 space-y-3.5 text-xs">
                {/* Appointment 1 */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm flex items-center justify-center text-white shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    <span className="font-bold">10:30 AM</span> - Doctor Appointment
                  </div>
                </div>

                {/* Dotted Connector Trail */}
                <div className="ml-3.5 w-0.5 h-3 border-l-2 border-dotted border-slate-300 dark:border-slate-700" />

                {/* Appointment 2 */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm flex items-center justify-center text-white shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    <span className="font-bold">4:00 PM</span> - Daily Walk
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-note */}
            <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
              <span>Synced with Amazon Alexa Schedule</span>
              <span className="font-mono text-[10px]">MCP 2025-11-25</span>
            </div>
          </section>
        </div>

        {/* Bento Card 3: Family Alerts (Warm Peach / Amber Card) */}
        <section
          className={`rounded-3xl p-4 bg-gradient-to-br from-[#FEF7EB] via-[#FDF3E2] to-[#FCECD0] border border-[#FDE68A] text-[#92400E] shadow-[0_10px_25px_-5px_rgba(217,119,6,0.08)] flex items-center justify-between gap-4 transition-all duration-300 ${
            isAlertActive ? 'ring-2 ring-amber-500 shadow-amber-500/20' : ''
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FEF3C7] border border-[#FCD34D] flex items-center justify-center text-amber-600 shadow-sm shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 fill-amber-500/30" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-950 mb-0.5">
                Family Alerts
              </h4>
              <p className="text-xs font-bold text-amber-900">
                Family Alert: Sarah notified
              </p>
              <p className="text-[11px] text-amber-800/80">
                Front Door movement (12:30 PM)
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-900 font-bold">
              Proactive Ping
            </span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CaregiverDashboard;
