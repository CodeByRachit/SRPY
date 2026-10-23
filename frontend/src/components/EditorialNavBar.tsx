import React from 'react';
import { Sparkles, Activity, ShieldCheck, Terminal, Columns, Pill, AlertTriangle } from 'lucide-react';

export type NavView = 'SPATIAL_HUB' | 'CAREGIVER_BRIDGE' | 'MCP_LAB' | 'DUAL_STAGE';

interface EditorialNavBarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  hasOverdueMed: boolean;
  mcpFrameCount: number;
}

export const EditorialNavBar: React.FC<EditorialNavBarProps> = ({
  currentView,
  onSelectView,
  hasOverdueMed,
  mcpFrameCount,
}) => {
  const navItems: { id: NavView; num: string; label: string; icon: React.ReactNode; badge?: string; badgeColor?: string }[] = [
    {
      id: 'SPATIAL_HUB',
      num: '01',
      label: 'Spatial Living Hub',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      badge: hasOverdueMed ? 'Action Req' : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'CAREGIVER_BRIDGE',
      num: '02',
      label: 'Caregiver Command',
      icon: <Activity className="w-3.5 h-3.5" />,
      badge: '680 mi sync',
      badgeColor: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30',
    },
    {
      id: 'MCP_LAB',
      num: '03',
      label: 'MCP Protocol Lab',
      icon: <Terminal className="w-3.5 h-3.5" />,
      badge: `${mcpFrameCount} Frames`,
      badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30',
    },
    {
      id: 'DUAL_STAGE',
      num: '04',
      label: 'Split Stage',
      icon: <Columns className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <nav className="w-full flex justify-center py-2 px-4 select-none">
      <div className="inline-flex items-center gap-1 p-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-xl shadow-lg shadow-black/5 transition-all">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-cyan-500/20 dark:text-cyan-200 dark:border dark:border-cyan-500/40 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="text-[10px] font-mono opacity-50">{item.num}</span>
              <span className="hidden sm:inline-block font-semibold tracking-tight">{item.label}</span>
              <span className="sm:hidden">{item.icon}</span>

              {item.badge && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
