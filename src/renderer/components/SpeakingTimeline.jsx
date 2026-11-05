import React from 'react';
import { Mic, Volume2, AlertCircle } from 'lucide-react';

export default function SpeakingTimeline({
  speakingHistory = [],
  talkRatio = 65,
  isCurrentlySpeaking = false,
  pauseWarning = false,
}) {
  return (
    <div className="w-full bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Mic className={`w-4 h-4 ${isCurrentlySpeaking ? 'text-sky-400' : 'text-slate-500'}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Speaking Pacing & Cadence
          </span>
        </div>

        <div className="flex items-center gap-3">
          {pauseWarning && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-500/40">
              <AlertCircle className="w-3 h-3" />
              Prolonged Pause (&gt;4.5s)
            </span>
          )}
          <div className="text-xs">
            <span className="text-slate-400">Talk Ratio: </span>
            <span className="font-mono font-bold text-sky-400">{talkRatio}%</span>
          </div>
        </div>
      </div>

      {/* Segmented cadence timeline bar */}
      <div className="relative h-4 w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 flex">
        {speakingHistory.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">
            Listening for speech bursts...
          </div>
        ) : (
          speakingHistory.slice(-50).map((item, idx) => (
            <div
              key={idx}
              className={`h-full flex-1 transition-all duration-100 ${
                item.talking
                  ? 'bg-sky-500 shadow-sm shadow-sky-500/50'
                  : item.pauseSec > 4
                  ? 'bg-amber-500/80'
                  : 'bg-slate-800'
              }`}
              title={item.talking ? 'Speaking' : `Pause: ${item.pauseSec || 0}s`}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5 px-0.5">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-sky-500"></span> Active Speech
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-slate-800"></span> Natural Pause
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-amber-500"></span> Hesitation (&gt;4.5s)
          </span>
        </div>
        <span>Target: 60-80% talk ratio</span>
      </div>
    </div>
  );
}

