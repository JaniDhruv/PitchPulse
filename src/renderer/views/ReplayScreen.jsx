import React, { useState } from 'react';
import { Play, RotateCcw, Award, CheckCircle2, AlertCircle, ArrowLeft, Download, Eye, Heart, Wind, Mic, Smile, Activity } from 'lucide-react';
import { EMOTIONS } from '../lib/constants';

export default function ReplayScreen({ sessionData, onBackToStudio }) {
  const { summary, pulseSamples = [], breathingSamples = [], eyeContactScores = [], speakingEvents = [], expressionHistory = [] } = sessionData || {};
  const [scrubberSec, setScrubberSec] = useState(0);

  const duration = summary?.durationSec || 60;
  const currentFraction = duration > 0 ? scrubberSec / duration : 0;

  // Get metric values at the scrubber timestamp
  const sampleIndex = Math.min(
    pulseSamples.length - 1,
    Math.max(0, Math.floor(currentFraction * (pulseSamples.length || 1)))
  );
  const currentPulse = pulseSamples[sampleIndex]?.value || summary?.avgPulse || 72;
  const currentEye = eyeContactScores[sampleIndex] || 85;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Top Navigation & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStudio}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>New Pitch Session</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Recorded Session ({duration}s duration)
          </span>
        </div>
      </div>

      {/* Hero Score Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border-2 border-sky-400/40 flex flex-col items-center justify-center shadow-lg shadow-sky-500/10">
            <span className="text-3xl font-black font-mono text-sky-400">
              {summary?.overallScore || 82}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              SCORE
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-slate-100">Presentation Telemetry Report</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                Grade: {summary?.grade || 'A'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md">
              Full physiological and behavioral telemetry synchronized across the duration of your pitch.
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Avg Pulse</span>
            <span className="text-base font-bold font-mono text-sky-400">{summary?.avgPulse || 72} BPM</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Audience Focus</span>
            <span className="text-base font-bold font-mono text-indigo-400">{summary?.subScores?.eyeContact || 85}%</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800/80 px-4 py-2.5 rounded-xl text-center">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Talk Ratio</span>
            <span className="text-base font-bold font-mono text-emerald-400">{summary?.talkRatio || 70}%</span>
          </div>
        </div>
      </div>

      {/* Multi-Track Replay Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              6-Signal Synchronized Replay Timeline
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-sky-400 bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
            <span>Scrubber: {scrubberSec}s / {duration}s</span>
          </div>
        </div>

        {/* Interactive Scrubber Slider */}
        <div className="relative pt-2 pb-1">
          <input
            type="range"
            min={0}
            max={duration}
            value={scrubberSec}
            onChange={(e) => setScrubberSec(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-950 rounded-lg appearance-none"
          />
        </div>

        {/* Synchronized Tracks */}
        <div className="space-y-2.5 text-xs font-mono">
          {/* Track 1: Pulse */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="w-24 text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
              <Heart className="w-3.5 h-3.5 text-red-400" /> Heart Rate
            </span>
            <div className="flex-1 h-5 bg-slate-900 rounded overflow-hidden flex items-center px-2">
              <div
                className="h-2 rounded-full bg-red-500/80 transition-all"
                style={{ width: `${Math.min(100, (currentPulse / 130) * 100)}%` }}
              ></div>
            </div>
            <span className="w-14 text-right text-red-400 font-bold">{currentPulse} BPM</span>
          </div>

          {/* Track 2: Eye Contact */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="w-24 text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
              <Eye className="w-3.5 h-3.5 text-indigo-400" /> Eye Focus
            </span>
            <div className="flex-1 h-5 bg-slate-900 rounded overflow-hidden flex items-center px-2">
              <div
                className="h-2 rounded-full bg-indigo-500/80 transition-all"
                style={{ width: `${currentEye}%` }}
              ></div>
            </div>
            <span className="w-14 text-right text-indigo-400 font-bold">{currentEye}%</span>
          </div>

          {/* Track 3: Speaking Cadence */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="w-24 text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
              <Mic className="w-3.5 h-3.5 text-sky-400" /> Speech
            </span>
            <div className="flex-1 h-5 bg-slate-900 rounded overflow-hidden flex">
              {speakingEvents.slice(0, 40).map((ev, i) => (
                <div
                  key={i}
                  className={`h-full flex-1 ${ev.talking ? 'bg-sky-500' : 'bg-slate-800'}`}
                />
              ))}
            </div>
            <span className="w-14 text-right text-sky-400 font-bold">{summary?.talkRatio || 70}%</span>
          </div>

          {/* Track 4: Breathing */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <span className="w-24 text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0">
              <Wind className="w-3.5 h-3.5 text-emerald-400" /> Breathing
            </span>
            <div className="flex-1 h-5 bg-slate-900 rounded overflow-hidden flex items-center px-2">
              <div
                className="h-2 rounded-full bg-emerald-500/80 transition-all"
                style={{ width: `${Math.min(100, ((summary?.avgBreath || 15) / 25) * 100)}%` }}
              ></div>
            </div>
            <span className="w-14 text-right text-emerald-400 font-bold">{summary?.avgBreath || 15} br</span>
          </div>
        </div>
      </div>

      {/* Sub-Score Breakdown & AI / Biometric Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sub-Scores */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-400" />
            Weighted Performance Breakdown
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Eye Contact', weight: '25%', score: summary?.subScores?.eyeContact || 85, color: 'bg-indigo-500' },
              { label: 'Composure', weight: '25%', score: summary?.subScores?.composure || 80, color: 'bg-sky-500' },
              { label: 'Speaking Pace', weight: '20%', score: summary?.subScores?.speakingPace || 85, color: 'bg-cyan-500' },
              { label: 'Breath Control', weight: '15%', score: summary?.subScores?.breathControl || 78, color: 'bg-emerald-500' },
              { label: 'Expression Dynamics', weight: '10%', score: summary?.subScores?.expression || 88, color: 'bg-amber-500' },
              { label: 'Blink Naturalness', weight: '5%', score: summary?.subScores?.blinkNaturalness || 90, color: 'bg-purple-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.label} <span className="text-slate-500 text-[10px]">({item.weight})</span></span>
                  <span className="font-mono font-bold text-slate-100">{item.score}/100</span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.score}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Tips */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Coaching Feedback & Action Items
          </h3>

          <div className="space-y-2.5">
            {summary?.tips && summary.tips.length > 0 ? (
              summary.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{tip}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">No warnings triggered — balanced pitch delivery!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

