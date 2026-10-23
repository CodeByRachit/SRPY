import React from 'react';
import {
  CareSystemState,
  MedicationItem,
  AppointmentItem,
  TimelineEvent,
  PatientStatus,
} from '../types/care';
import {
  Heart,
  Activity,
  Droplets,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  MapPin,
  Phone,
  Plus,
  Zap,
} from 'lucide-react';

interface CaregiverDashboardProps {
  state: CareSystemState;
  onLogMedication: (medId: string) => void;
  onAddHydration: () => void;
}

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  state,
  onLogMedication,
  onAddHydration,
}) => {
  const { patient, caregiver, medications, appointments, activity_timeline } = state;

  // Status Badge Config
  const statusConfig: Record<
    PatientStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    HEALTHY: {
      label: 'HEALTHY • ALL DOSES ON TRACK',
      bg: 'bg-emerald-50 dark:bg-emerald-950/80',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-500/60',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
    },
    WARNING: {
      label: 'WARNING • 1 DOSE OVERDUE',
      bg: 'bg-amber-50 dark:bg-amber-950/80',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-500/60',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />,
    },
    CRITICAL: {
      label: 'CRITICAL • WELLNESS ESCALATION',
      bg: 'bg-rose-50 dark:bg-rose-950/90',
      text: 'text-rose-800 dark:text-rose-200',
      border: 'border-rose-300 dark:border-rose-500/80',
      icon: <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 animate-bounce" />,
    },
  };

  const currentStatus = statusConfig[patient.status] || statusConfig.HEALTHY;

  // SVG Radial Adherence Calculation (Supports both adherence_rate and adherence_Rate)
  const adherenceRate = patient.adherence_rate ?? patient.adherence_Rate ?? 50;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (adherenceRate / 100) * circumference;

  return (
    <div className="flex flex-col gap-4 text-slate-800 dark:text-slate-200 transition-colors duration-400">
      {/* Caregiver Bridge Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-2xl backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-cyan-600/20 text-xs">
            MV
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                Maya Vance&apos;s Remote Caregiver Hub
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300">
                Synchronized &lt;10ms
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                {caregiver.location}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                {caregiver.notification_status}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Patient Location</div>
          <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">{patient.location}</div>
        </div>
      </div>

      {/* Patient Hero Card with Radial Adherence & Vitals */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white/90 dark:bg-[#0e172a]/90 border border-slate-200/90 dark:border-slate-700/60 shadow-xl backdrop-blur-lg">
        {/* Glow ambient background element */}
        <div className="absolute top-0 right-0 w-64 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {patient.name}, <span className="text-slate-500 dark:text-slate-400 font-normal">Age {patient.age}</span>
              </h3>
              <div
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentStatus.bg} ${currentStatus.text} ${currentStatus.border}`}
              >
                {currentStatus.icon}
                <span>{currentStatus.label}</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md">
              {patient.condition_summary}
            </p>
          </div>

          {/* Radial Adherence Gauge */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shrink-0 shadow-sm">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 80 80">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  className={`transition-all duration-700 ease-out ${
                    adherenceRate >= 75
                      ? 'stroke-emerald-500'
                      : adherenceRate >= 50
                      ? 'stroke-amber-500'
                      : 'stroke-rose-500'
                  }`}
                  strokeWidth="7"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-sm font-extrabold text-slate-900 dark:text-white leading-none">
                  {adherenceRate}%
                </span>
                <span className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Adherence
                </span>
              </div>
            </div>
            <div className="text-xs">
              <div className="font-semibold text-slate-900 dark:text-slate-200">Daily Goal</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {medications.filter((m) => m.status === 'TAKEN').length} of {medications.length} Doses Taken
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Vitals Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5">
          {/* Heart Rate */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Heart
                  className={`w-3.5 h-3.5 ${
                    patient.status === 'CRITICAL'
                      ? 'text-rose-500 animate-ping'
                      : 'text-rose-500 dark:text-rose-400 animate-pulse'
                  }`}
                />
                Heart Rate
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Normal</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {patient.vitals.heart_rate} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">BPM</span>
            </div>
          </div>

          {/* Blood Pressure */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Blood Pressure
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Resting</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {patient.vitals.blood_pressure} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">mmHg</span>
            </div>
          </div>

          {/* Hydration Tracker with +1 Button */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
                <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Hydration
              </div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                {patient.vitals.hydration_glasses}
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  /{patient.vitals.hydration_goal} glasses
                </span>
              </div>
            </div>
            <button
              onClick={onAddHydration}
              className="p-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 dark:bg-sky-950 dark:hover:bg-sky-900 border border-sky-300 dark:border-sky-500/40 text-sky-700 dark:text-sky-300 transition-colors shadow-sm"
              title="Add 1 glass of water"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Last Check-in & Mood */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 shadow-sm">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-[11px] mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              Last Check-In
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {patient.last_check_in}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              Mood: <span className="text-cyan-600 dark:text-cyan-300 font-medium">{patient.vitals.mood}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Medication Adherence Matrix */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <h4 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>Medication Adherence Matrix</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              4 Formulations
            </span>
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Click &ldquo;Log Dose via MCP&rdquo; to trigger tool directly
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {medications.map((med) => {
            const isTaken = med.status === 'TAKEN';
            const isOverdue = med.status === 'OVERDUE';

            return (
              <div
                key={med.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isOverdue
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/60 shadow-lg shadow-rose-950/20'
                    : isTaken
                    ? 'bg-white/80 dark:bg-slate-900/60 border-emerald-300 dark:border-emerald-500/40 shadow-sm'
                    : 'bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: med.pill_color }}
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{med.name}</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {med.dosage}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{med.purpose}</div>
                      </div>
                    </div>

                    <div
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        isTaken
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : isOverdue
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {isTaken ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>TAKEN ({med.taken_at})</span>
                        </>
                      ) : isOverdue ? (
                        <>
                          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>OVERDUE (2:00 PM)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          <span>UPCOMING ({med.scheduled_time})</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mb-3">
                    {med.instructions}
                  </p>
                </div>

                {!isTaken && (
                  <button
                    onClick={() => onLogMedication(med.id)}
                    className="w-full py-1.5 px-3 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/70 dark:hover:bg-cyan-900/90 border border-cyan-300 dark:border-cyan-500/50 hover:border-cyan-400 text-cyan-800 dark:text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Zap className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>Log Dose via MCP</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointments & Activity Timeline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Appointments Section */}
        <div className="p-3.5 bg-white/80 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>Upcoming Appointments</span>
            </h5>
            <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">Auto-Sync</span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{apt.title}</div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-100 dark:bg-emerald-950/70 px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800">
                    {apt.status}
                  </span>
                </div>
                <div className="text-[11px] text-cyan-700 dark:text-cyan-300 mb-0.5">
                  {apt.date} • {apt.time}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{apt.location}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline Audit Trail */}
        <div className="p-3.5 bg-white/80 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2.5 pb-1.5 border-b border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Activity &amp; MCP Audit Trail</span>
            </h5>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Live Feed</span>
          </div>

          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {activity_timeline.map((event) => (
              <div
                key={event.id}
                className="text-xs p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-start gap-2"
              >
                <span className="text-[9px] font-mono text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5 bg-cyan-100 dark:bg-cyan-950/60 px-1 py-0.2 rounded">
                  {event.timestamp}
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] text-slate-800 dark:text-slate-300 font-medium truncate">
                    {event.summary}
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono truncate">
                    {event.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
