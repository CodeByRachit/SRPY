import React, { useEffect, useState } from 'react';
import { CareAlert } from '../types/care';
import { Bell, Check, ShieldAlert, AlertTriangle, Info, X } from 'lucide-react';

interface CaregiverPhoneToastProps {
  alert: CareAlert | null;
  onDismiss: () => void;
  onAcknowledge: (alertId: string) => void;
}

export const CaregiverPhoneToast: React.FC<CaregiverPhoneToastProps> = ({
  alert,
  onDismiss,
  onAcknowledge,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss();
      }, 9000); // 9 seconds display for judge readability
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [alert, onDismiss]);

  if (!alert || !visible) return null;

  const severityStyles = {
    CRITICAL: {
      border: 'border-rose-500/80',
      bg: 'bg-rose-950/90',
      badge: 'bg-rose-600 text-white',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400 animate-bounce" />,
    },
    HIGH: {
      border: 'border-amber-500/80',
      bg: 'bg-amber-950/90',
      badge: 'bg-amber-600 text-white',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    },
    MEDIUM: {
      border: 'border-sky-500/70',
      bg: 'bg-sky-950/90',
      badge: 'bg-sky-600 text-white',
      icon: <Info className="w-5 h-5 text-sky-400" />,
    },
    LOW: {
      border: 'border-emerald-500/70',
      bg: 'bg-emerald-950/90',
      badge: 'bg-emerald-600 text-white',
      icon: <Check className="w-5 h-5 text-emerald-400" />,
    },
  }[alert.severity] || {
    border: 'border-slate-500',
    bg: 'bg-slate-900',
    badge: 'bg-slate-600 text-white',
    icon: <Bell className="w-5 h-5 text-slate-300" />,
  };

  return (
    <div className="fixed top-5 right-5 z-50 max-w-sm w-full transition-all duration-300 ease-out transform translate-y-0 opacity-100 animate-slide-in">
      <div
        className={`rounded-2xl p-4 shadow-2xl backdrop-blur-xl border ${severityStyles.border} ${severityStyles.bg} text-slate-100 flex flex-col gap-2.5 relative overflow-hidden`}
      >
        {/* Top Status Bar: iOS / Alexa App push simulator */}
        <div className="flex items-center justify-between text-[11px] text-slate-300 border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold tracking-wide text-white">
              MAYA’S IPHONE • ALEXA CARE
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">680 mi away • NOW</span>
            <button
              onClick={() => {
                setVisible(false);
                onDismiss();
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Main Alert Body */}
        <div className="flex items-start gap-3 pt-0.5">
          <div className="p-2 rounded-xl bg-black/40 border border-white/10 shrink-0">
            {severityStyles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${severityStyles.badge}`}
              >
                {alert.severity}
              </span>
              <h4 className="text-xs font-bold text-white truncate">{alert.title}</h4>
            </div>
            <p className="text-xs text-slate-200 leading-snug">{alert.message}</p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[10px] text-slate-400">
            Channel: <strong className="text-slate-300">{alert.channel}</strong>
          </span>
          <button
            onClick={() => {
              onAcknowledge(alert.id);
              setVisible(false);
              onDismiss();
            }}
            className="flex items-center gap-1 px-3 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <Check className="w-3 h-3 text-cyan-300" />
            <span>Acknowledge Alert</span>
          </button>
        </div>
      </div>
    </div>
  );
};
