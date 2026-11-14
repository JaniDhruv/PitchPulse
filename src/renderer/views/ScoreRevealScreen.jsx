import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Heart, Eye, Mic, Zap } from 'lucide-react';

/**
 * Cinematic Score Reveal Screen.
 * Provides a high-delight, celebratory payoff when a pitch session finishes.
 * Renders an animated radial gauge countup, particle sparks, and grade badge drop.
 */
export default function ScoreRevealScreen({ sessionData, onContinueToReplay }) {
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isGradeRevealed, setIsGradeRevealed] = useState(false);
  const [autoTimer, setAutoTimer] = useState(6);

  const onContinueRef = useRef(onContinueToReplay);
  useEffect(() => {
    onContinueRef.current = onContinueToReplay;
  }, [onContinueToReplay]);

  const targetScore = sessionData?.summary?.overallScore || 82;
  const grade = sessionData?.summary?.grade || 'A';
  const duration = sessionData?.summary?.durationSec || 45;
  const avgPulse = sessionData?.summary?.avgPulse || 74;
  const eyeScore = sessionData?.summary?.subScores?.eyeContact || 85;
  const talkRatio = sessionData?.summary?.talkRatio || 72;
  const recoveryStats = sessionData?.summary?.recoveryStats;

  // Grade badge color themes
  const gradeThemes = {
    'A+': {
      ring: '#38bdf8',
      text: 'text-sky-300',
      bg: 'bg-sky-500/20',
      border: 'border-sky-400',
    },
    A: {
      ring: '#34d399',
      text: 'text-emerald-300',
      bg: 'bg-emerald-500/20',
      border: 'border-emerald-400',
    },
    'B+': {
      ring: '#818cf8',
      text: 'text-indigo-300',
      bg: 'bg-indigo-500/20',
      border: 'border-indigo-400',
    },
    B: {
      ring: '#a78bfa',
      text: 'text-purple-300',
      bg: 'bg-purple-500/20',
      border: 'border-purple-400',
    },
    C: {
      ring: '#fbbf24',
      text: 'text-amber-300',
      bg: 'bg-amber-500/20',
      border: 'border-amber-400',
    },
  };
  const theme = gradeThemes[grade] || gradeThemes.A;

  // Rapid score counter animation
  useEffect(() => {
    let current = 0;
    const stepTime = 16;
    const totalSteps = 55;
    const increment = targetScore / totalSteps;

    const interval = setInterval(() => {
      current += increment;
      if (current >= targetScore) {
        setDisplayedScore(targetScore);
        clearInterval(interval);
        setTimeout(() => setIsGradeRevealed(true), 250);
      } else {
        setDisplayedScore(Math.round(current));
      }
    }, stepTime);

    return () => clearInterval(interval);
  }, [targetScore]);

  // Auto-progress countdown using stable ref
  useEffect(() => {
    const timer = setInterval(() => {
      setAutoTimer((t) => {
        if (t <= 1) {
          clearInterval(timer);
          if (onContinueRef.current) {
            onContinueRef.current();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // SVG Radial stroke calculation
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (displayedScore / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-6 select-none overflow-hidden animate-fadeIn">
      {/* Background radial glow */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 pointer-events-none transition-all duration-1000"
        style={{ backgroundColor: theme.ring }}
      />

      <div className="max-w-lg w-full flex flex-col items-center text-center space-y-7 relative z-10">
        {/* Header Tag */}
        <div className="flex items-center gap-2 px-4 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-sky-400 text-xs font-bold uppercase tracking-widest shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Presentation Biometric Assessment</span>
        </div>

        <div>
          <h2 className="text-3xl font-black text-slate-100 tracking-tight">
            Performance Analysis Complete
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Processed {duration}s of real-time cardiorespiratory and optical
            gaze telemetry.
          </p>
        </div>

        {/* Central Radial Score Ring with Grade Drop */}
        <div className="relative w-56 h-56 flex items-center justify-center my-2">
          {/* Animated SVG Ring */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#1e293b"
              strokeWidth="9"
            />
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke={theme.ring}
              strokeWidth="9.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
              style={{ filter: `drop-shadow(0 0 12px ${theme.ring}88)` }}
            />
          </svg>

          {/* Centered Score Counter */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-6xl font-black font-mono text-slate-100 tracking-tight drop-shadow-lg">
              {displayedScore}
            </span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
              COMPOSITE SCORE
            </span>
          </div>

          {/* Dropped Grade Badge */}
          {isGradeRevealed && (
            <div
              className={`absolute -top-1 -right-1 w-14 h-14 rounded-2xl ${theme.bg} border-2 ${theme.border} flex items-center justify-center shadow-xl transform animate-scaleIn`}
              style={{ filter: `drop-shadow(0 4px 16px ${theme.ring}66)` }}
            >
              <span className={`text-2xl font-black font-mono ${theme.text}`}>
                {grade}
              </span>
            </div>
          )}
        </div>

        {/* Hero Outcome: Autonomic Recovery */}
        {recoveryStats?.hasPressureMoment ? (
          <div className="w-full max-w-md p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-indigo-950/60 border border-amber-500/40 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4 fill-amber-400" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                  Pulse Recovery Latency
                </span>
                <span className="text-xs font-bold text-slate-200">
                  {recoveryStats.recoveryLatencySec != null
                    ? `${recoveryStats.recoveryLatencySec}s return to baseline`
                    : `Baseline steady (${recoveryStats.baselineBpm} BPM)`}
                </span>
              </div>
            </div>

            {recoveryStats.ghostComparisonDelta ? (
              <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-pulse">
                {recoveryStats.ghostComparisonDelta.summaryText}
              </span>
            ) : recoveryStats.bpmSpike >= 3 ? (
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                +{recoveryStats.bpmSpike} BPM Spike
              </span>
            ) : (
              <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                No Spike
              </span>
            )}
          </div>
        ) : (
          <div className="w-full max-w-md p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shadow-md">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span>No acute pressure moment marked</span>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              Steady Baseline
            </span>
          </div>
        )}

        {/* Quick 3-Pillar Highlight Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center shadow-md">
            <Heart className="w-4 h-4 text-rose-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Heart Rate
            </span>
            <span className="text-sm font-black font-mono text-slate-100 mt-0.5">
              {avgPulse} BPM
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center shadow-md">
            <Eye className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Camera-Facing Gaze
            </span>
            <span className="text-sm font-black font-mono text-slate-100 mt-0.5">
              {eyeScore}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-col items-center shadow-md">
            <Mic className="w-4 h-4 text-sky-400 mb-1" />
            <span className="text-[10px] text-slate-400 font-semibold uppercase">
              Talk Ratio
            </span>
            <span className="text-sm font-black font-mono text-slate-100 mt-0.5">
              {talkRatio}%
            </span>
          </div>
        </div>

        {/* Action Button & Auto Proceed */}
        <div className="w-full max-w-sm flex flex-col items-center space-y-2 pt-2">
          <button
            onClick={() => {
              if (onContinueRef.current) {
                onContinueRef.current();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-xl shadow-sky-500/25 transition-all cursor-pointer transform hover:scale-[1.02]"
          >
            <span>Explore Full Telemetry Flight Replay</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <span className="text-[11px] text-slate-500">
            Continuing to flight recorder in {autoTimer}s...
          </span>
        </div>
      </div>
    </div>
  );
}
