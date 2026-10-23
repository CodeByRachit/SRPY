import React, { useState } from 'react';
import {
  CareSystemState,
  MedicationItem,
  AppointmentItem,
  CareAlert,
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
  Droplets,
  Plus,
  Clock,
  ShieldCheck,
  MapPin,
  Phone,
  Video,
  Send,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { Tactile3DPillCanvas, Tactile3DHouseCanvas } from './Alexa3DCanvas';
import { careService } from '../services/careService';

interface CaregiverDashboardProps {
  state: CareSystemState;
  activeTool?: string | null;
  onLogMedication?: (medId: string) => void;
  onAddHydration?: () => void;
}

type DashboardTab = 'HOME' | 'CALENDAR' | 'VITALS' | 'ALERTS' | 'SETTINGS';

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  state,
  activeTool = null,
  onLogMedication,
  onAddHydration,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('HOME');
  const [isAddApptModalOpen, setIsAddApptModalOpen] = useState(false);
  const [newApptTitle, setNewApptTitle] = useState('');
  const [newApptDate, setNewApptDate] = useState('Tomorrow, Oct 24');
  const [newApptTime, setNewApptTime] = useState('02:00 PM');
  const [newApptSpecialty, setNewApptSpecialty] = useState('Ophthalmology');

  const { patient, caregiver, medications, appointments, alerts, activity_timeline } = state;

  // Find morning & afternoon meds
  const morningMed =
    medications.find((m) => m.scheduled_time.includes('08:00') || m.id === 'med_01') || medications[0];
  const afternoonMed =
    medications.find((m) => m.scheduled_time.includes('02:00') || m.id === 'med_02') || medications[1];

  const isMorningDone = morningMed?.status === 'TAKEN';
  const isAfternoonDone = afternoonMed?.status === 'TAKEN';
  const isAfternoonOverdue = afternoonMed?.status === 'OVERDUE';

  // Reactive spotlight rings based on active MCP tool
  const isMedicationActive = activeTool === 'log_medication_taken';
  const isScheduleActive = activeTool === 'get_today_schedule' || activeTool === 'add_appointment';
  const isAlertActive = activeTool === 'check_in_status' || activeTool === 'notify_caregiver';

  const unacknowledgedAlertsCount = (alerts || []).filter((a) => !a.acknowledged).length;
  const latestAlert = alerts && alerts.length > 0 ? alerts[0] : null;

  // Radial adherence calculation (Supports both adherence_rate and adherence_Rate)
  const adherenceRate = patient.adherence_rate ?? patient.adherence_Rate ?? 50;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (adherenceRate / 100) * circumference;

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApptTitle.trim()) return;
    await careService.addAppointment(
      newApptTitle.trim(),
      newApptSpecialty,
      newApptDate,
      newApptTime,
      'Seattle Medical Pavilion'
    );
    setNewApptTitle('');
    setIsAddApptModalOpen(false);
  };

  const handleAcknowledgeAlert = (alertId: string) => {
    careService.acknowledgeAlert(alertId);
  };

  const handleSendCaregiverPing = async () => {
    await careService.notifyCaregiver(
      'ALEXA_APP_AND_SMS',
      'LOW',
      'Maya sent a quick love & wellness ping from San Francisco!'
    );
  };

  return (
    <div className="flex w-full h-full text-slate-800 dark:text-slate-100 select-none relative">
      {/* 1. Interactive Vertical Navigation Rail (Far Left) */}
      <aside className="w-14 sm:w-16 flex flex-col items-center justify-between py-6 px-1.5 border-r border-white/60 dark:border-slate-800/80 shrink-0">
        {/* Top Sphere / Brand Icon */}
        <div className="flex flex-col items-center gap-6">
          <div
            onClick={() => setActiveTab('HOME')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E8DEC8] via-[#F5EFE0] to-[#FFFFFF] shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_4px_8px_rgba(100,80,50,0.12)] border border-white/90 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
            title="AuraCare Home"
          >
            <div className="w-3.5 h-3.5 rounded-full border border-amber-800/20 bg-amber-600/10" />
          </div>

          {/* Navigation Icon Stack */}
          <nav className="flex flex-col items-center gap-3">
            {/* Home Tab */}
            <button
              onClick={() => setActiveTab('HOME')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                activeTab === 'HOME'
                  ? 'bg-white/95 dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 dark:border-slate-700 text-amber-700 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50'
              }`}
              title="Dashboard Overview"
            >
              <Home className={`w-4 h-4 ${activeTab === 'HOME' ? 'fill-amber-700/20' : ''}`} />
            </button>

            {/* Calendar Tab */}
            <button
              onClick={() => setActiveTab('CALENDAR')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                activeTab === 'CALENDAR'
                  ? 'bg-white/95 dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 dark:border-slate-700 text-cyan-700 dark:text-cyan-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50'
              }`}
              title="Doctor Schedule & Appointments"
            >
              <Calendar className="w-4 h-4" />
            </button>

            {/* Vitals Tab */}
            <button
              onClick={() => setActiveTab('VITALS')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                activeTab === 'VITALS'
                  ? 'bg-white/95 dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 dark:border-slate-700 text-rose-600 dark:text-rose-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50'
              }`}
              title="Biometrics & Adherence Deep-Dive"
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* Alerts & Notifications Tab */}
            <button
              onClick={() => setActiveTab('ALERTS')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 relative ${
                activeTab === 'ALERTS'
                  ? 'bg-white/95 dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 dark:border-slate-700 text-amber-600 dark:text-amber-400'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50'
              }`}
              title="Care Alerts & Notifications"
            >
              <Bell className="w-4 h-4" />
              {unacknowledgedAlertsCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-1.5 right-1.5 border-2 border-white dark:border-slate-900 animate-ping" />
              )}
            </button>

            {/* Settings Tab */}
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                activeTab === 'SETTINGS'
                  ? 'bg-white/95 dark:bg-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50'
              }`}
              title="System & Caregiver Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </nav>
        </div>

        {/* Bottom Gear */}
        <div
          onClick={() => setActiveTab('SETTINGS')}
          className="text-slate-400 hover:text-slate-600 cursor-pointer transition-colors p-1"
          title="Configuration"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </div>
      </aside>

      {/* 2. Main Dashboard Container */}
      <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
        {/* Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-white/60 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {activeTab === 'HOME' && 'Caregiver Dashboard'}
                {activeTab === 'CALENDAR' && 'Care Calendar & Appointments'}
                {activeTab === 'VITALS' && 'Vitals & Adherence Telemetry'}
                {activeTab === 'ALERTS' && 'Care Alerts & Notifications Hub'}
                {activeTab === 'SETTINGS' && 'Caregiver Bridge Configuration'}
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-200 to-rose-200 border border-white shadow-sm flex items-center justify-center text-xs overflow-hidden shrink-0">
                👵🏻
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Patient: <span className="text-slate-900 dark:text-white font-bold">{patient.name || 'Eleanor Vance'}</span>{' '}
                <span className="text-slate-500 font-normal">(Age {patient.age || 78} • {patient.location || 'Seattle, WA'})</span>
              </span>
            </div>
          </div>

          {/* Green Connected Status Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F9F0] dark:bg-emerald-950/80 border border-[#A7F3D0] dark:border-emerald-600/50 text-[#059669] dark:text-emerald-300 text-xs font-bold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Maya Vance Connected (680 mi)</span>
          </div>
        </header>

        {/* ============================================================ */}
        {/* VIEW 1: HOME (Dashboard Overview) */}
        {/* ============================================================ */}
        {activeTab === 'HOME' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Card 1: Medication Logs */}
            <section
              className={`glass-card rounded-3xl p-4 sm:p-5 relative transition-all duration-300 ${
                isMedicationActive ? 'mcp-ring-medication' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Medication Regimen</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {adherenceRate}% Adherence
                  </span>
                </h3>
                <button
                  onClick={() => onLogMedication?.(afternoonMed?.id || 'med_02')}
                  className="tactile-pill px-3 py-1 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                >
                  <SlidersHorizontal className="w-3 h-3 text-slate-500" />
                  <span>Log via MCP</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => onLogMedication?.(afternoonMed?.id || 'med_02')}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-white via-[#FAF8F5] to-[#EAE6DF] shadow-[0_8px_20px_-4px_rgba(60,50,40,0.1),inset_0_2px_4px_rgba(255,255,255,1)] border border-white/95 flex items-center justify-center shrink-0 relative overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                    title="Click 3D Pill to Log Dose via MCP"
                  >
                    <Tactile3DPillCanvas className="w-18 h-18" />
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Morning Med */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isMorningDone
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {morningMed?.name || 'Morning Lisinopril'} — {morningMed?.scheduled_time || '8:00 AM'}
                      </span>
                      <span
                        className={`font-bold ${
                          isMorningDone
                            ? 'text-[#10B981] dark:text-emerald-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isMorningDone ? '[Done]' : '[Scheduled]'}
                      </span>
                    </div>

                    {/* Afternoon Med */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isAfternoonDone
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                            : isAfternoonOverdue
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 animate-pulse'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {afternoonMed?.name || 'Afternoon Eliquis 5mg'} — {afternoonMed?.scheduled_time || '2:00 PM'}
                      </span>
                      <span
                        className={`font-bold ${
                          isAfternoonDone
                            ? 'text-[#10B981] dark:text-emerald-400'
                            : isAfternoonOverdue
                            ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {isAfternoonDone
                          ? '[Done]'
                          : isAfternoonOverdue
                          ? '[Overdue]'
                          : '[Scheduled]'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Tactile Action Buttons */}
                <div className="flex items-center gap-2.5 self-end sm:self-center">
                  <button
                    onClick={() => setActiveTab('VITALS')}
                    className="tactile-pill px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900"
                  >
                    [ Vitals Deep-Dive ]
                  </button>
                  <button
                    onClick={() => onLogMedication?.(afternoonMed?.id || 'med_02')}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#E6F9F0] hover:bg-[#D1F5E4] dark:bg-emerald-950/80 border border-[#A7F3D0] dark:border-emerald-600/50 text-[#059669] dark:text-emerald-300 transition-all shadow-sm active:scale-95"
                  >
                    [ {isAfternoonDone ? 'Dose Logged' : 'Log via MCP'} ]
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

                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white to-[#F2EFE9] shadow-[0_6px_14px_-2px_rgba(60,50,40,0.08),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white flex items-center justify-center shrink-0 overflow-hidden">
                      <Tactile3DHouseCanvas className="w-14 h-14" />
                    </div>
                    <div>
                      <div
                        className={`font-extrabold text-sm tracking-tight flex items-center gap-1.5 ${
                          patient.status === 'CRITICAL'
                            ? 'text-rose-600 dark:text-rose-400 animate-pulse'
                            : patient.status === 'WARNING'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#10B981] dark:text-emerald-400'
                        }`}
                      >
                        <span>
                          {patient.status === 'CRITICAL'
                            ? '🚨 Critical Attention Required'
                            : patient.status === 'WARNING'
                            ? '⚠️ Overdue Dose Pending'
                            : 'Safe & Active'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {patient.status === 'CRITICAL'
                          ? 'No voice reply detected; caregiver alerted'
                          : patient.vitals?.mood || 'Living Room sensor activity normal'}
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
                      {patient.vitals?.heart_rate || 76} bpm
                    </span>
                  </div>

                  <div className="flex items-center gap-1 h-3.5 px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-900 border border-slate-300/40 dark:border-slate-800">
                    {[...Array(14)].map((_, i) => (
                      <span
                        key={i}
                        className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                          i < (patient.status === 'CRITICAL' ? 13 : 9)
                            ? patient.status === 'CRITICAL'
                              ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]'
                              : 'bg-[#10B981] shadow-[0_0_6px_rgba(16,185,129,0.7)]'
                            : 'bg-slate-300/70 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </section>

              {/* Bento Card B: Daily Schedule quick view */}
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
                    <button
                      onClick={() => setActiveTab('CALENDAR')}
                      className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
                    >
                      View All ({appointments.length})
                    </button>
                  </div>

                  <div className="relative pl-1 py-1 space-y-3 text-xs">
                    {appointments && appointments.length > 0 ? (
                      appointments.slice(0, 2).map((apt, idx) => (
                        <div key={apt.id || idx} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 shadow-sm flex items-center justify-center text-white shrink-0">
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            <span className="font-bold">{apt.time}</span> - {apt.title}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400 text-xs">No appointments scheduled today.</div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                  <span>Synced with Amazon Alexa Schedule</span>
                  <span className="font-mono text-[10px]">MCP 2025-11-25</span>
                </div>
              </section>
            </div>

            {/* Bento Card 3: Family Alerts */}
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
                    {latestAlert ? latestAlert.title : 'Family Alert: Maya Vance connected'}
                  </p>
                  <p className="text-[11px] text-amber-800/80">
                    {latestAlert
                      ? `${latestAlert.message} (${latestAlert.timestamp})`
                      : 'Living Room Watchdog: Senior Safe & Connected'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setActiveTab('ALERTS')}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  View Alerts Hub
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: CALENDAR & APPOINTMENTS HUB */}
        {/* ============================================================ */}
        {activeTab === 'CALENDAR' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Care Schedule &amp; Medical Appointments
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Synchronized with Eleanor&apos;s Echo Show 15 and Amazon Care Calendar via MCP.
                </p>
              </div>
              <button
                onClick={() => setIsAddApptModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Appointment</span>
              </button>
            </div>

            {/* List of Real Appointments from Backend */}
            <div className="space-y-3">
              {appointments && appointments.length > 0 ? (
                appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 rounded-2xl glass-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {apt.title}
                          </h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-semibold border border-cyan-300 dark:border-cyan-800">
                            {apt.specialty}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                            <Clock className="w-3.5 h-3.5 text-cyan-600" />
                            {apt.date} at {apt.time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            {apt.location}
                          </span>
                        </div>
                        {apt.notes && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                            &ldquo;{apt.notes}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        {apt.status || 'CONFIRMED'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs glass-card rounded-2xl">
                  No appointments scheduled. Click &ldquo;+ Add Appointment&rdquo; to add one.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: VITALS & BIOMETRICS DEEP-DIVE */}
        {/* ============================================================ */}
        {activeTab === 'VITALS' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Live Vitals &amp; Medication Adherence
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Telemetry stream from living room Echo Show sensors and wearable bridge.
                </p>
              </div>
              <button
                onClick={onAddHydration}
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>+ Log Water Glass</span>
              </button>
            </div>

            {/* Vitals Bento Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Heart Rate */}
              <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
                    Heart Rate
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono">Resting</span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {patient.vitals?.heart_rate || 76}
                    <span className="text-xs font-normal text-slate-400 ml-1">BPM</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Target: 60–100 BPM</div>
                </div>
              </div>

              {/* Blood Pressure */}
              <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    Blood Pressure
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Normal</span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {patient.vitals?.blood_pressure || '128/82'}
                    <span className="text-xs font-normal text-slate-400 ml-1">mmHg</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Under Lisinopril 10mg</div>
                </div>
              </div>

              {/* Blood Oxygen */}
              <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    SpO2 Oxygen
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono">Optimal</span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {patient.vitals?.blood_oxygen || 98}
                    <span className="text-xs font-normal text-slate-400 ml-1">%</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Target: &gt;95%</div>
                </div>
              </div>

              {/* Hydration */}
              <div className="p-4 rounded-2xl glass-card flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span className="flex items-center gap-1 font-semibold">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    Hydration
                  </span>
                  <span className="text-[10px] text-sky-600 font-mono">Daily</span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">
                    {patient.vitals?.hydration_glasses || 3}
                    <span className="text-xs font-normal text-slate-400 ml-1">
                      /{patient.vitals?.hydration_goal || 6} glasses
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Click + to add glass</div>
                </div>
              </div>
            </div>

            {/* Adherence Gauge Section */}
            <div className="p-5 rounded-3xl glass-card flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                  <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 70 70">
                    <circle
                      cx="35"
                      cy="35"
                      r={radius}
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeWidth="6"
                      fill="transparent"
                    />
                    <circle
                      cx="35"
                      cy="35"
                      r={radius}
                      className="stroke-emerald-500 transition-all duration-700 ease-out"
                      strokeWidth="6"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                      {adherenceRate}%
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Overall Medication Adherence
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-0.5">
                    Calculated in real time across Eleanor&apos;s 4 scheduled medications: Lisinopril, Eliquis, Metformin, and Atorvastatin.
                  </p>
                </div>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Taken: {medications.filter((m) => m.status === 'TAKEN').length} of {medications.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Overdue: {medications.filter((m) => m.status === 'OVERDUE').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: ALERTS & NOTIFICATIONS HUB */}
        {/* ============================================================ */}
        {activeTab === 'ALERTS' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Care Alerts &amp; Family Notification Hub
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Instant push notifications dispatched to Maya&apos;s iPhone (680 miles away).
                </p>
              </div>
              <button
                onClick={handleSendCaregiverPing}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>+ Send Caregiver Ping</span>
              </button>
            </div>

            {/* List of Real Alerts */}
            <div className="space-y-3">
              {alerts && alerts.length > 0 ? (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      alt.severity === 'CRITICAL'
                        ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-600'
                        : alt.severity === 'HIGH'
                        ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-600'
                        : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            alt.severity === 'CRITICAL'
                              ? 'text-rose-600 dark:text-rose-400 animate-bounce'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              alt.severity === 'CRITICAL'
                                ? 'bg-rose-600 text-white'
                                : alt.severity === 'HIGH'
                                ? 'bg-amber-600 text-white'
                                : 'bg-cyan-600 text-white'
                            }`}
                          >
                            {alt.severity}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {alt.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {alt.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {alt.message}
                        </p>
                        {alt.recommended_action && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Action: <span className="font-semibold">{alt.recommended_action}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {alt.acknowledged ? (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Acknowledged</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAcknowledgeAlert(alt.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold shadow-sm transition-all"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs glass-card rounded-2xl">
                  No active alerts. All senior health metrics and check-in watchdogs are clear.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: SETTINGS & REMOTE CONFIGURATION */}
        {/* ============================================================ */}
        {activeTab === 'SETTINGS' && (
          <div className="flex flex-col gap-4 animate-fade-in text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AuraCare Device &amp; Family Bridge Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl glass-card space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Senior Echo Show 15 Device
                </h4>
                <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div>Device: <strong>Amazon Echo Show 15 (Living Room)</strong></div>
                  <div>Location: <strong>Seattle, WA • Pacific Time</strong></div>
                  <div>Voice Engine: <strong>Alexa+ Ambient Listener Active</strong></div>
                  <div>MCP Connection: <strong>Streamable HTTP :8000/mcp</strong></div>
                  <div>Protocol: <strong>Model Context Protocol Spec 2025-11-25</strong></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl glass-card space-y-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">
                  Remote Caregiver Profile
                </h4>
                <div className="space-y-1.5 text-slate-600 dark:text-slate-400">
                  <div>Name: <strong>{caregiver.name || 'Maya Vance'}</strong></div>
                  <div>Relation: <strong>{caregiver.relation || 'Daughter'}</strong></div>
                  <div>Distance: <strong>{caregiver.location || 'San Francisco, CA (680 miles away)'}</strong></div>
                  <div>Phone: <strong>{caregiver.phone || '+1 (415) 890-4321'}</strong></div>
                  <div>Alert Channels: <strong>Alexa App Push &amp; SMS Live</strong></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Appointment directly via MCP */}
      {isAddApptModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl glass-slab p-6 shadow-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              Schedule New Medical Visit via MCP
            </h3>
            <form onSubmit={handleCreateAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Appointment Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Patel — Eye Exam"
                  value={newApptTitle}
                  onChange={(e) => setNewApptTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Date</label>
                  <input
                    type="text"
                    value={newApptDate}
                    onChange={(e) => setNewApptDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Time</label>
                  <input
                    type="text"
                    value={newApptTime}
                    onChange={(e) => setNewApptTime(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Specialty</label>
                <input
                  type="text"
                  value={newApptSpecialty}
                  onChange={(e) => setNewApptSpecialty(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddApptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-md"
                >
                  Confirm via MCP
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaregiverDashboard;
