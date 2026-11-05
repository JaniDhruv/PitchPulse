import React from 'react';
import { ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

export default function ComposureGauge({ score = 78, isHrvLocked = false, breakdown = {} }) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color mapping based on nervous system equilibrium
  let colorClass = 'text-emerald-400 stroke-emerald-400';
  let bgGradient = 'from-emerald-500/20 to-transparent';
  let label = 'Steady & Poised';

  if (normalizedScore < 55) {
    colorClass = 'text-red-400 stroke-red-400';
    bgGradient = 'from-red-500/20 to-transparent';
    label = 'Elevated Tension';
  } else if (normalizedScore < 75) {
    colorClass = 'text-amber-400 stroke-amber-400';
    bgGradient = 'from-amber-500/20 to-transparent';
    label = 'Mild Restlessness';
  }

  // Circular progress calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  return (
    <div className={`relative flex flex-col items-center justify-between p-4 bg-slate-900/90 rounded-xl border border-slate-800 shadow-md bg-gradient-to-b ${bgGradient}`}>
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          Composure
        </span>
        {isHrvLocked ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm animate-pulse">
            <Sparkles className="w-2.5 h-2.5" />
            Deep HRV Lock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400">
            Rapid Pulse Model
          </span>
        )}
      </div>

      <div className="relative w-28 h-28 flex items-center justify-center my-1">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-500 ease-out`}
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold font-mono text-slate-100">
            {normalizedScore}
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            / 100
          </span>
        </div>
      </div>

      <div className="text-center mt-1">
        <div className="text-xs font-semibold text-slate-200">{label}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {isHrvLocked
            ? `HRV Autonomic Coherence: ${breakdown?.hrvScore || Math.round(score)}%`
            : 'Evaluating pulse stability & facial tension'}
        </div>
      </div>
    </div>
  );
}

