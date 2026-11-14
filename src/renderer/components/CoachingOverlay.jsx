import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Live contextual coaching overlay rendered directly over the camera feed.
 * Provides real-time physiological & presentation nudges (breath, eye contact, pace, tension).
 */
export default function CoachingOverlay({ activeNudge = null }) {
  if (!activeNudge) return null;

  const styleConfigs = {
    breath: {
      border: 'border-emerald-500/50',
      bg: 'bg-emerald-950/85',
      text: 'text-emerald-200',
      glow: 'shadow-emerald-500/25',
    },
    gaze: {
      border: 'border-indigo-500/50',
      bg: 'bg-indigo-950/85',
      text: 'text-indigo-200',
      glow: 'shadow-indigo-500/25',
    },
    pulse: {
      border: 'border-rose-500/50',
      bg: 'bg-rose-950/85',
      text: 'text-rose-200',
      glow: 'shadow-rose-500/25',
    },
    flow: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-950/85',
      text: 'text-amber-200',
      glow: 'shadow-amber-500/25',
    },
    positive: {
      border: 'border-sky-500/50',
      bg: 'bg-sky-950/85',
      text: 'text-sky-200',
      glow: 'shadow-sky-500/25',
    },
    expression: {
      border: 'border-purple-500/50',
      bg: 'bg-purple-950/85',
      text: 'text-purple-200',
      glow: 'shadow-purple-500/25',
    },
  };

  const currentStyle =
    styleConfigs[activeNudge.category] || styleConfigs.positive;

  return (
    <div className="absolute bottom-6 inset-x-0 z-30 flex items-center justify-center px-4 pointer-events-none transition-all duration-300">
      <div
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl backdrop-blur-md border ${currentStyle.border} ${currentStyle.bg} ${currentStyle.glow} shadow-xl max-w-md animate-fadeInUp`}
      >
        <span className="text-xl shrink-0 select-none">{activeNudge.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
              Live Coach
            </span>
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
          </div>
          <p
            className={`text-xs font-semibold leading-snug ${currentStyle.text}`}
          >
            {activeNudge.text}
          </p>
        </div>
      </div>
    </div>
  );
}
