import React from 'react';
import { Sun, Moon, Sparkles } from 'lucide-react';
import { soundEngine } from '../utils/soundEngine';

interface CuteThemeToggleProps {
  theme: 'dark' | 'light';
  onToggle: () => void;
}

export const CuteThemeToggle: React.FC<CuteThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  const handleClick = () => {
    soundEngine.playToolBlip();
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      type="button"
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode (or press 'T')`}
      className={`relative inline-flex items-center h-8 w-16 shrink-0 rounded-full cursor-pointer transition-all duration-500 ease-out p-1 select-none focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 shadow-inner shadow-indigo-950/50'
          : 'bg-gradient-to-r from-amber-100 via-sky-100 to-amber-50 border border-amber-300/80 shadow-md shadow-amber-200/40'
      }`}
    >
      {/* Background Decorative Cosmic Details */}
      <span className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
        {isDark ? (
          /* Midnight Stars */
          <>
            <span className="absolute top-1.5 left-2 w-1 h-1 bg-indigo-200 rounded-full animate-ping opacity-60" />
            <span className="absolute bottom-2 left-4 w-0.5 h-0.5 bg-cyan-200 rounded-full" />
            <span className="absolute top-3 left-6 w-1 h-1 bg-white/70 rounded-full" />
            <span className="absolute bottom-1.5 left-8 w-0.5 h-0.5 bg-purple-300 rounded-full" />
          </>
        ) : (
          /* Sunny Day Clouds */
          <>
            <span className="absolute top-1.5 right-2 w-2 h-1 bg-white/90 rounded-full shadow-sm" />
            <span className="absolute bottom-1.5 right-4 w-3 h-1.5 bg-white/80 rounded-full shadow-sm" />
            <span className="absolute top-2.5 right-7 w-1.5 h-1 bg-white/70 rounded-full" />
          </>
        )}
      </span>

      {/* Sliding Knob */}
      <span
        className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ease-out transform shadow-md ${
          isDark
            ? 'translate-x-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/50 rotate-0'
            : 'translate-x-0 bg-gradient-to-br from-amber-400 to-orange-400 text-amber-950 shadow-amber-500/40 rotate-180'
        }`}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-indigo-100 animate-bounce-subtle" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-950 animate-spin-slow" />
        )}
      </span>

      {/* Subtle Mini Glow Indicator */}
      <span
        className={`absolute inset-0 rounded-full transition-opacity duration-500 pointer-events-none ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </button>
  );
};
