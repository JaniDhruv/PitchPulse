import React from 'react';
import { ShieldCheck, Sparkles, Award } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

export default function ComposureGauge({
  score = 78,
  isHrvLocked = false,
  breakdown = {},
}) {
  const animatedScore = useAnimatedValue(score, { speed: 0.12 });
  const normalizedScore = Math.max(0, Math.min(100, Math.round(animatedScore)));

  // Color mapping based on nervous system equilibrium
  let strokeColor = '#34d399'; // Emerald
  let bgGradient = 'from-emerald-500/15 via-slate-900/40 to-transparent';
  let label = 'Steady & Poised';
  let glowColor = 'rgba(52, 211, 153, 0.25)';

  if (normalizedScore < 55) {
    strokeColor = '#f87171'; // Red
    bgGradient = 'from-red-500/15 via-slate-900/40 to-transparent';
    label = 'Elevated Tension';
    glowColor = 'rgba(248, 113, 113, 0.25)';
  } else if (normalizedScore < 75) {
    strokeColor = '#fbbf24'; // Amber
    bgGradient = 'from-amber-500/15 via-slate-900/40 to-transparent';
    label = 'Mild Restlessness';
    glowColor = 'rgba(251, 191, 36, 0.25)';
  }

  // Circular progress calculations
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (normalizedScore / 100) * circumference;

  return (
    <div
      className={`relative flex flex-col items-center justify-between p-4 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-lg bg-gradient-to-b ${bgGradient} backdrop-blur-sm transition-all duration-500`}
      style={{ boxShadow: `0 8px 32px -8px ${glowColor}` }}
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
          Composure
        </span>
        {isHrvLocked ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 shadow-sm animate-pulse">
            <Sparkles className="w-2.5 h-2.5" />
            Deep HRV Lock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400">
            Rapid Pulse Model
          </span>
        )}
      </div>

      {/* Circular Progress Gauge */}
      <div className="relative w-28 h-28 flex items-center justify-center my-1">
        {/* Subtle radial ambient bloom behind ring */}
        <div
          className="absolute inset-2 rounded-full blur-xl opacity-30 transition-all duration-700 pointer-events-none"
          style={{ backgroundColor: strokeColor }}
        />

        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background track circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#1e293b"
            strokeWidth="7"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="7.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Center score readout */}
        <div className="absolute flex flex-col items-center justify-center select-none">
          <div className="flex items-center gap-0.5">
            <span className="text-3xl font-black font-mono text-slate-100 tracking-tight">
              {normalizedScore}
            </span>
            {normalizedScore >= 85 && (
              <span className="text-xs text-amber-400 animate-bounce -mt-3">
                ✨
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">
            / 100
          </span>
        </div>
      </div>

      {/* Bottom Status text */}
      <div className="text-center w-full mt-1">
        <div className="text-xs font-bold text-slate-100 flex items-center justify-center gap-1">
          {normalizedScore >= 85 && (
            <Award className="w-3 h-3 text-amber-400 inline" />
          )}
          <span>{label}</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate px-1">
          {isHrvLocked
            ? `HRV Coherence: ${breakdown?.hrvScore || normalizedScore}%`
            : 'Live cardiac & autonomic stability'}
        </div>
      </div>
    </div>
  );
}
