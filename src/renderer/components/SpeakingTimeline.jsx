import React from 'react';
import { Mic, AlertCircle, Sparkles } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

export default function SpeakingTimeline({
  speakingHistory = [],
  talkRatio = 65,
  isCurrentlySpeaking = false,
  pauseWarning = false,
}) {
  const animatedTalkRatio = useAnimatedValue(talkRatio, { speed: 0.15 });

  // Dynamically compute wave heights for speaking segments without stale memoization
  const segments = (speakingHistory || []).slice(-54).map((item, idx) => {
    const pseudoHeight = 45 + ((idx * 19) % 55);
    return {
      ...item,
      heightPct: item.talking ? `${pseudoHeight}%` : '20%',
    };
  });

  return (
    <div className="w-full bg-slate-900/90 rounded-2xl border border-slate-800/80 p-3.5 shadow-lg backdrop-blur-sm transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              isCurrentlySpeaking
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 block">
              Speaking Cadence & Pacing
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {pauseWarning && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-500/50 animate-pulse">
              <AlertCircle className="w-3 h-3" />
              Prolonged Pause (&gt;4.5s)
            </span>
          )}

          {isCurrentlySpeaking && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-sky-300 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-500/40">
              <Sparkles className="w-2.5 h-2.5" /> Voice Engaged
            </span>
          )}

          <div className="flex items-baseline gap-1 text-xs">
            <span className="text-slate-400 font-medium">Talk Ratio:</span>
            <span className="font-mono font-black text-sky-400 text-sm">
              {animatedTalkRatio}%
            </span>
          </div>
        </div>
      </div>

      {/* Segmented dynamic cadence timeline bar */}
      <div className="relative h-7 w-full bg-slate-950/90 rounded-xl overflow-hidden border border-slate-800/90 flex items-center px-1.5 gap-[2px]">
        {segments.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500 font-mono">
            Awaiting speech activity...
          </div>
        ) : (
          segments.map((item, idx) => (
            <div
              key={idx}
              className="flex-1 flex items-center justify-center h-full"
            >
              <div
                className={`w-full rounded-sm transition-all duration-150 ${
                  item.talking
                    ? 'bg-sky-400 shadow-sm shadow-sky-500/40'
                    : item.pauseSec > 4
                    ? 'bg-amber-500'
                    : 'bg-slate-800'
                }`}
                style={{
                  height: item.heightPct,
                }}
                title={
                  item.talking ? 'Speaking' : `Pause: ${item.pauseSec || 0}s`
                }
              />
            </div>
          ))
        )}
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1 font-medium">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-sky-400"></span> Active Speech
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-slate-800"></span> Natural Pause
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-amber-500"></span> Hesitation (&gt;4.5s)
          </span>
        </div>
        <span className="text-slate-500">Target Range: 60% – 80%</span>
      </div>
    </div>
  );
}
