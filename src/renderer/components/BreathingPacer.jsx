import React, { useState, useEffect, useRef } from 'react';
import { Wind, Play, FastForward } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

/**
 * Zen Pre-Pitch Breathing Pacer & Baseline Calibration.
 * Guides the speaker through deep physiological centering, lowers sympathetic nervous arousal,
 * and allows SmartSpectra rPPG sensors to acquire clean signal lock before the pitch starts.
 */
export default function BreathingPacer({ liveBpm = 74, onComplete, onSkip }) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const targetSeconds = 28; // 2 complete box cycles (14s each)

  const animatedBpm = useAnimatedValue(liveBpm, { speed: 0.1 });
  const onCompleteRef = useRef(onComplete);
  const onSkipRef = useRef(onSkip);
  const latestBpmRef = useRef(animatedBpm || 72);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onSkipRef.current = onSkip;
    latestBpmRef.current = animatedBpm || 72;
  }, [onComplete, onSkip, animatedBpm]);

  const PHASES = [
    {
      label: 'Inhale Slowly',
      instruction: 'Breathe in deeply through your nose',
      duration: 4,
      scale: 'scale-125',
      color: 'from-sky-400 to-indigo-500',
    },
    {
      label: 'Hold Gently',
      instruction: 'Maintain quiet composure',
      duration: 4,
      scale: 'scale-125',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      label: 'Exhale Smoothly',
      instruction: 'Release all tension through your mouth',
      duration: 4,
      scale: 'scale-75',
      color: 'from-emerald-400 to-teal-500',
    },
    {
      label: 'Rest & Center',
      instruction: 'Notice your heart rate settling',
      duration: 2,
      scale: 'scale-90',
      color: 'from-teal-400 to-sky-400',
    },
  ];

  // Mathematical phase calculation derived directly from elapsed seconds
  const cycleSec = elapsedSec % 14;
  let phaseIndex = 0;
  let countdown = 4;

  if (cycleSec < 4) {
    phaseIndex = 0;
    countdown = 4 - cycleSec;
  } else if (cycleSec < 8) {
    phaseIndex = 1;
    countdown = 8 - cycleSec;
  } else if (cycleSec < 12) {
    phaseIndex = 2;
    countdown = 12 - cycleSec;
  } else {
    phaseIndex = 3;
    countdown = 14 - cycleSec;
  }

  const currentPhase = PHASES[phaseIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec((prev) => {
        const next = prev + 1;
        if (next >= targetSeconds) {
          clearInterval(timer);
          setTimeout(() => {
            if (onCompleteRef.current) {
              onCompleteRef.current({ baselineBpm: latestBpmRef.current });
            }
          }, 400);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetSeconds]);

  const progressPct = Math.min(
    100,
    Math.round((elapsedSec / targetSeconds) * 100),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-6 select-none animate-fadeIn">
      <div className="max-w-xl w-full flex flex-col items-center text-center space-y-6">
        {/* Header Badge */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-sky-400 text-xs font-bold uppercase tracking-wider shadow-inner">
          <Wind className="w-4 h-4 text-sky-400 animate-pulse" />
          <span>Pre-Pitch Physiological Calibration</span>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Center Your Breath & Pulse
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            Taking 2 deep breaths calms stage nervousness and allows
            SmartSpectra sensors to establish your resting baseline.
          </p>
        </div>

        {/* Dynamic Expanding/Contracting Breathing Orb */}
        <div className="relative w-64 h-64 flex items-center justify-center my-4">
          {/* Ambient Glow */}
          <div
            className={`absolute w-52 h-52 rounded-full bg-gradient-to-tr ${currentPhase.color} opacity-20 blur-3xl transition-all duration-1000 ease-in-out`}
          />

          {/* Concentric Guide Rings */}
          <div className="absolute w-56 h-56 rounded-full border border-slate-800/80 pointer-events-none" />
          <div className="absolute w-40 h-40 rounded-full border border-slate-800/50 pointer-events-none" />

          {/* Animated Pacer Orb */}
          <div
            className={`w-36 h-36 rounded-full bg-gradient-to-tr ${currentPhase.color} opacity-90 shadow-2xl flex flex-col items-center justify-center text-white transition-all duration-1000 ease-in-out transform ${currentPhase.scale}`}
            style={{
              boxShadow: '0 0 50px rgba(56, 189, 248, 0.35)',
            }}
          >
            <span className="text-4xl font-black font-mono tracking-tight drop-shadow">
              {countdown}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 drop-shadow">
              {currentPhase.label.split(' ')[0]}
            </span>
          </div>
        </div>

        {/* Phase instructions */}
        <div className="h-12 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-slate-100 transition-all duration-300">
            {currentPhase.label}
          </h3>
          <p className="text-xs text-slate-400">{currentPhase.instruction}</p>
        </div>

        {/* Real-time Baseline Telemetry Pill */}
        <div className="flex items-center gap-6 px-6 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs font-mono shadow-md">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-slate-400 font-sans">Live Pulse:</span>
            <span className="font-bold text-slate-100 font-mono text-sm">
              {animatedBpm} BPM
            </span>
          </div>
          <div className="h-4 w-[1px] bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400 font-sans">Signal Lock:</span>
            <span className="font-bold text-emerald-300 font-mono text-xs">
              Acquired
            </span>
          </div>
        </div>

        {/* Bottom Progress Bar & Skip Button */}
        <div className="w-full max-w-sm space-y-3">
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                if (onSkipRef.current) {
                  onSkipRef.current({ baselineBpm: latestBpmRef.current });
                }
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip Calibration</span>
            </button>

            <button
              onClick={() => {
                if (onCompleteRef.current) {
                  onCompleteRef.current({ baselineBpm: latestBpmRef.current });
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Ready — Start Pitch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
