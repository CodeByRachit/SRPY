import React, { useState } from 'react';
import { IntroThreeHero } from './IntroThreeHero';
import { CareSystemState } from '../types/care';
import {
  Mic,
  Cpu,
  Heart,
  Shield,
  ArrowRight,
  Play,
  Layers,
  Sparkles,
  PhoneCall,
  Calendar,
  Pill,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface IntroPageProps {
  state: CareSystemState;
  onLaunchConsole: () => void;
  onRunJudgeDemo: () => void;
}

export const IntroPage: React.FC<IntroPageProps> = ({
  state,
  onLaunchConsole,
  onRunJudgeDemo,
}) => {
  const [selectedToolTab, setSelectedToolTab] = useState<string>('log_medication_taken');

  const mcpTools = [
    {
      name: 'log_medication_taken',
      description: 'Records senior pill ingestion, verifies dosage, and dynamically updates adherence rate.',
      spec: 'MCP Spec 2025-11-25',
      params: '{"medication_name": "Eliquis", "taken_time": "02:15 PM", "notes": "Taken with water"}',
      output: '{"status": "TAKEN", "adherence_rate": 75, "patient_status": "HEALTHY"}',
    },
    {
      name: 'get_today_schedule',
      description: 'Fetches today\'s scheduled medication times, clinician telehealth visits, and adherence summaries.',
      spec: 'MCP Spec 2025-11-25',
      params: '{"filter_status": "ALL"}',
      output: '{"medications": 4, "appointments": 2, "hydration": "5/6", "adherence_rate": 75}',
    },
    {
      name: 'notify_caregiver',
      description: 'Dispatches priority alerts and SMS push notifications to Maya Vance across 680 miles.',
      spec: 'MCP Spec 2025-11-25',
      params: '{"urgency": "CRITICAL", "subject": "🚨 Missed Eliquis Dose", "channel": "ALEXA_APP_AND_SMS"}',
      output: '{"alert_id": "alt_care_202810", "recipient": "Maya Vance", "status": "SENT"}',
    },
    {
      name: 'check_in_status',
      description: 'Executes proactive check-in verification via Echo Show 15 living room chimes.',
      spec: 'MCP Spec 2025-11-25',
      params: '{"check_in_type": "MISSED_DOSE_VERIFICATION", "patient_response": "NO_RESPONSE"}',
      output: '{"escalation_required": true, "patient_status": "CRITICAL"}',
    },
    {
      name: 'add_appointment',
      description: 'Books new clinician appointments or outpatient screenings directly via voice interaction.',
      spec: 'MCP Spec 2025-11-25',
      params: '{"title": "Dr. Priya Patel", "specialty": "Ophthalmology", "date": "Tomorrow, Oct 24"}',
      output: '{"appointment_id": "apt_1024_0200", "status": "CONFIRMED"}',
    },
  ];

  return (
    <div className="w-full max-w-[1340px] flex flex-col gap-8 pb-16 animate-in fade-in duration-500">
      {/* ------------------------------------------------------------- */}
      {/* 1. HERO SECTION WITH 3D THREE.JS CANVAS                       */}
      {/* ------------------------------------------------------------- */}
      <section className="glass-slab p-6 sm:p-8 md:p-10 flex flex-col items-center text-center relative overflow-hidden">
        {/* Subtle decorative glowing background shapes */}
        <div className="absolute top-0 -left-16 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-0 -right-16 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-mono font-bold tracking-wide mb-5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />
          <span>AWS BEDROCK × ALEXA+ ELDERCARE • MCP SPEC 2025-11-25</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.12] mb-4">
          Ambient Caregiving, Reimagined for Independent Seniors Distant Families.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed mb-6 font-normal">
          Transforming the Echo Show 15 into a proactive ambient lifeline for 78-year-old Eleanor Vance in Seattle,
          bridging her daily medication regimen, doctor visits, and emergency alerts to her daughter Maya in San Francisco
          via streamable Model Context Protocol tooling.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-8 z-10">
          <button
            onClick={onLaunchConsole}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base flex items-center gap-2.5 shadow-lg shadow-cyan-600/25 hover:shadow-cyan-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>Launch Live Care Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onRunJudgeDemo}
            className="tactile-pill px-5 py-3.5 rounded-2xl text-slate-800 dark:text-slate-100 font-bold text-sm sm:text-base flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 text-cyan-600 fill-cyan-600" />
            <span>Play 90s Judge Demo</span>
          </button>
        </div>

        {/* 3D Interactive Three.js Hero Scene */}
        <div className="w-full max-w-4xl rounded-3xl border border-white/60 dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-2xl p-1 relative">
          <IntroThreeHero />
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-mono tracking-widest backdrop-blur-md border border-white/20">
            3D SPATIAL ECOSYSTEM (INTERACTIVE)
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. REAL-TIME SYSTEM TELEMETRY STRIP                          */}
      {/* ------------------------------------------------------------- */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Independent Senior</span>
            <Mic className="w-4 h-4 text-cyan-500" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">Eleanor Vance (78)</div>
            <div className="text-xs text-slate-500 font-medium">Living Room Echo Show 15 • Seattle</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Remote Caregiver</span>
            <PhoneCall className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">Maya Vance</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected (680 mi away, San Francisco)
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Medication Adherence</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">
              {state.patient?.adherence_rate ?? state.patient?.adherence_Rate ?? 75}% Adherence
            </div>
            <div className="text-xs text-slate-500 font-medium">4 Scheduled Daily Doses (Eliquis 5mg)</div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Tool Protocol</span>
            <Layers className="w-4 h-4 text-purple-500" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 dark:text-white">MCP Spec 2025-11-25</div>
            <div className="text-xs text-slate-500 font-mono">Streamable HTTP • Port 8000</div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. FOUR CORE SYSTEM PILLARS (BENTO GRID)                     */}
      {/* ------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 px-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Designed for Dignity, Safety &amp; Family Peace of Mind
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Four cohesive architectural breakthroughs working harmoniously to bridge ambient voice with clinical rigor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Ambient Alexa+ Voice Sensing */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                <Mic className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 text-[10px] font-mono font-bold">
                AMBIENT SENSING
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Continuous Voice Companionship Without Wearables
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Older adults frequently forget to wear smartwatches or charge pendants. AuraCare runs on the living room
                Echo Show 15, listening for natural phrases like <em>&ldquo;Alexa, I just took my afternoon pill&rdquo;</em> and
                holding multi-turn conversations through AWS Bedrock.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-cyan-700 dark:text-cyan-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-cyan-500" />
              <span>Zero buttons required • Natural conversational confirmation</span>
            </div>
          </div>

          {/* Card 2: Model Context Protocol (MCP) Standard */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-800 dark:text-indigo-300 text-[10px] font-mono font-bold">
                MCP SPEC 2025-11-25
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Standardized Model Context Protocol Tooling
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Every agent action is executed via strict JSON-RPC 2.0 over Streamable HTTP at <code className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">/mcp</code>.
                Tools like <code className="text-indigo-600 font-mono text-[11px]">log_medication_taken</code> and <code className="text-indigo-600 font-mono text-[11px]">add_appointment</code> guarantee
                atomic state updates with verifiable latency badges.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-indigo-700 dark:text-indigo-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              <span>Full compliance with Model Context Protocol 2025-11-25 standard</span>
            </div>
          </div>

          {/* Card 3: 680-Mile Family Caregiver Bridge */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Heart className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-[10px] font-mono font-bold">
                680-MILE TELE-BRIDGE
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Autonomous Remote Family Bridge
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                Daughter Maya lives in San Francisco, 680 miles away from Eleanor in Seattle. AuraCare streams live
                bi-directional state via WebSocket, instantly notifying Maya if a critical dose is overdue or dispatching
                reassuring confirmations when Eleanor drinks water or takes her medicine.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Instant push alerts • One-tap Echo Show Drop-In video bridge</span>
            </div>
          </div>

          {/* Card 4: Proactive Escalation & Adherence Watchdog */}
          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-800 dark:text-rose-300 text-[10px] font-mono font-bold">
                PROACTIVE WATCHDOG
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Proactive Escalation &amp; Non-Response Watchdog
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                If Eleanor does not respond to the gentle check-in chime within 15 minutes of a scheduled critical
                dose (like Eliquis 5mg for stroke prevention), the system executes <code className="text-rose-600 font-mono text-[11px]">check_in_status</code>,
                escalates to CRITICAL, and sounds siren telemetry for immediate intervention.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-rose-700 dark:text-rose-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-rose-500" />
              <span>Tiered emergency escalation: Gentle chime ➔ Voice prompt ➔ Maya alert</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. ARCHITECTURE PIPELINE FLOW                                */}
      {/* ------------------------------------------------------------- */}
      <section className="glass-slab p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-bold">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            END-TO-END DATAFLOW PIPELINE
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Spoken Senior Utterances Become Verifiable Clinical Actions
          </h2>
        </div>

        {/* Pipeline Flow Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 relative">
          <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative">
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">01 • INPUT</span>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Mic className="w-4 h-4 text-cyan-500" />
              Senior Voice
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Eleanor speaks naturally to living room Echo Show 15.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative">
            <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">02 • REASONING</span>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-500" />
              AWS Bedrock
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Claude 3.5 Sonnet / Nova Pro interprets intent &amp; selects tool.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative">
            <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold">03 • DISPATCH</span>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-purple-500" />
              MCP Server
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              JSON-RPC 2.0 Streamable HTTP POST at <code className="text-[11px] font-mono">/mcp</code>.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative">
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">04 • STATE</span>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-500" />
              Single Source Store
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Recalculates adherence rate and updates patient status.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4 flex flex-col gap-2 relative">
            <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-bold">05 • BROADCAST</span>
            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-rose-500" />
              Maya Dashboard
            </div>
            <p className="text-xs text-slate-500 leading-snug">
              Instant WebSocket push to Maya’s phone and Caregiver screen.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 5. INTERACTIVE MCP TOOL EXPLORER                             */}
      {/* ------------------------------------------------------------- */}
      <section className="glass-slab p-6 sm:p-8 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Live Model Context Protocol Tool Registry
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Interactive schema and live test payload for the 5 eldercare tools.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
            Spec 2025-11-25 Active
          </span>
        </div>

        {/* Tool Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {mcpTools.map((t) => (
            <button
              key={t.name}
              onClick={() => setSelectedToolTab(t.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${selectedToolTab === t.name
                  ? 'bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-md'
                  : 'bg-white/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                }`}
            >
              {t.name}()
            </button>
          ))}
        </div>

        {/* Selected Tool Details Card */}
        {(() => {
          const tool = mcpTools.find((t) => t.name === selectedToolTab) || mcpTools[0];
          return (
            <div className="glass-card rounded-2xl p-5 flex flex-col md:flex-row gap-5">
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
                      {tool.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {tool.spec}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {tool.description}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onLaunchConsole}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <span>Execute in Live Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Code JSON Box */}
              <div className="w-full md:w-1/2 flex flex-col gap-2">
                <div className="rounded-xl bg-slate-900 text-slate-100 p-3.5 text-xs font-mono space-y-2 border border-slate-800 shadow-inner">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">// Input Arguments</span>
                    <pre className="text-emerald-400 overflow-x-auto text-[11px] mt-0.5">{tool.params}</pre>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">// Response structuredContent</span>
                    <pre className="text-cyan-300 overflow-x-auto text-[11px] mt-0.5">{tool.output}</pre>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 6. CALL TO ACTION FOOTER BANNER                              */}
      {/* ------------------------------------------------------------- */}
      <section className="glass-slab p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left relative overflow-hidden">
        <div className="flex flex-col gap-1.5 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Ready to explore the ambient console?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-normal">
            Interact with the 3D Tactile Pill, test voice recognition with Alexa+, review Eleanor’s calendar,
            and observe live MCP telemetry streaming in real time.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onLaunchConsole}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-cyan-600/30 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <span>Enter Live Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
