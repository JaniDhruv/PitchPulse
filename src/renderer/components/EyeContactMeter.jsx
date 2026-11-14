import React, { useRef, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

export default function EyeContactMeter({
  score = 85,
  isCentered = true,
  gazeOffset = { x: 0, y: 0 },
}) {
  const animatedScore = useAnimatedValue(score, { speed: 0.15 });
  const normalizedScore = Math.max(0, Math.min(100, Math.round(animatedScore)));

  // Bounded coordinates between -28px and +28px
  const targetX = Math.max(-28, Math.min(28, (gazeOffset?.x || 0) * 1.3));
  const targetY = Math.max(-28, Math.min(28, (gazeOffset?.y || 0) * 1.3));

  // Trailing dot history stored in ref to render motion trail
  const trailRef = useRef([]);
  useEffect(() => {
    trailRef.current.push({ x: targetX, y: targetY });
    if (trailRef.current.length > 4) {
      trailRef.current.shift();
    }
  }, [targetX, targetY]);

  return (
    <div className="relative flex flex-col items-center justify-between p-4 bg-slate-900/90 rounded-2xl border border-slate-800/80 shadow-lg backdrop-blur-sm transition-all duration-300">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          Eye Contact
        </span>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors duration-300 ${
            isCentered
              ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 shadow-sm shadow-indigo-500/20'
              : 'bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20 animate-pulse'
          }`}
        >
          {isCentered ? 'Focused on Lens' : 'Gaze Drifting'}
        </span>
      </div>

      {/* Target Reticle */}
      <div className="relative w-28 h-28 rounded-full border border-slate-700/80 bg-slate-950 flex items-center justify-center overflow-hidden my-1 shadow-inner">
        {/* Radar concentric target circles */}
        <div className="absolute w-20 h-20 rounded-full border border-slate-800/80 pointer-events-none" />
        <div className="absolute w-12 h-12 rounded-full border border-slate-800/60 pointer-events-none" />

        {/* Crosshair axes */}
        <div className="absolute w-full h-[1px] bg-slate-800/90" />
        <div className="absolute h-full w-[1px] bg-slate-800/90" />

        {/* Center Target Sweet Spot */}
        <div
          className={`w-10 h-10 rounded-full border transition-all duration-300 flex items-center justify-center ${
            isCentered
              ? 'border-indigo-400/60 bg-indigo-500/15 shadow-md shadow-indigo-500/30'
              : 'border-slate-700/40 bg-slate-800/20'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isCentered ? 'bg-indigo-400' : 'bg-slate-600'
            }`}
          />
        </div>

        {/* Trailing Gaze Dots */}
        {trailRef.current.slice(0, -1).map((dot, idx) => (
          <div
            key={idx}
            className="absolute rounded-full pointer-events-none transition-transform duration-300"
            style={{
              width: `${6 + idx * 2}px`,
              height: `${6 + idx * 2}px`,
              backgroundColor: isCentered
                ? 'rgba(129, 140, 248, 0.25)'
                : 'rgba(251, 191, 36, 0.25)',
              transform: `translate(${dot.x}px, ${dot.y}px)`,
              opacity: (idx + 1) / trailRef.current.length,
            }}
          />
        ))}

        {/* Floating Active Gaze Pupil */}
        <div
          className={`absolute w-5 h-5 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform duration-200 ease-out ${
            isCentered
              ? 'border-indigo-300 bg-indigo-500 shadow-indigo-500/60'
              : 'border-amber-300 bg-amber-500 shadow-amber-500/60'
          }`}
          style={{
            transform: `translate(${targetX}px, ${targetY}px)`,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow" />
        </div>
      </div>

      {/* Bottom Readout */}
      <div className="text-center w-full mt-1">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-black font-mono text-slate-100">
            {normalizedScore}%
          </span>
          <span className="text-xs text-slate-400 font-semibold uppercase">
            Focus
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate px-1">
          {isCentered
            ? 'Direct audience engagement'
            : 'Checking notes or looking away'}
        </div>
      </div>
    </div>
  );
}
