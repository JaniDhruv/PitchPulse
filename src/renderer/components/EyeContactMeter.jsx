import React from 'react';
import { Eye, Crosshair } from 'lucide-react';

export default function EyeContactMeter({ score = 85, isCentered = true, gazeOffset = { x: 0, y: 0 } }) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Target coordinates bounded between -28px and +28px
  const targetX = Math.max(-28, Math.min(28, (gazeOffset.x || 0) * 1.4));
  const targetY = Math.max(-28, Math.min(28, (gazeOffset.y || 0) * 1.4));

  return (
    <div className="flex flex-col items-center justify-between p-4 bg-slate-900/90 rounded-xl border border-slate-800 shadow-md">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          Eye Contact
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
          isCentered
            ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300'
            : 'bg-amber-950/80 border-amber-500/50 text-amber-300'
        }`}>
          {isCentered ? 'Focused on Lens' : 'Gaze Drifting'}
        </span>
      </div>

      {/* Target Reticle */}
      <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden my-1 shadow-inner">
        {/* Crosshair lines */}
        <div className="absolute w-full h-[1px] bg-slate-800"></div>
        <div className="absolute h-full w-[1px] bg-slate-800"></div>

        {/* Center sweet spot */}
        <div className="w-10 h-10 rounded-full border border-indigo-500/40 bg-indigo-500/10 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60"></div>
        </div>

        {/* Floating pupil/gaze indicator */}
        <div
          className={`absolute w-5 h-5 rounded-full border-2 transition-transform duration-200 ease-out shadow-lg flex items-center justify-center ${
            isCentered
              ? 'border-indigo-400 bg-indigo-500 shadow-indigo-500/50'
              : 'border-amber-400 bg-amber-500 shadow-amber-500/50'
          }`}
          style={{
            transform: `translate(${targetX}px, ${targetY}px)`,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
      </div>

      <div className="text-center mt-1">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-bold font-mono text-slate-100">{normalizedScore}%</span>
          <span className="text-xs text-slate-400 font-medium">Audience Focus</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {isCentered ? 'Holding direct gaze connection' : 'Looking away or checking notes'}
        </div>
      </div>
    </div>
  );
}

