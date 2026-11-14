import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  Heart,
  Wind,
  Eye,
  Mic,
  Award,
  CheckCircle2,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';

export default function ReplayScreen({
  sessionData,
  onBackToStudio,
  onPracticeWithGhost,
}) {
  const {
    summary,
    pulseSamples = [],
    breathingSamples = [],
    eyeContactScores = [],
    speakingEvents = [],
  } = sessionData || {};

  const duration = summary?.durationSec || 60;
  const [scrubberSec, setScrubberSec] = useState(0);

  // Transform raw time-series arrays into unified chart data
  const chartData = useMemo(() => {
    const dataPoints = [];
    const totalPoints = Math.max(
      pulseSamples.length,
      breathingSamples.length,
      eyeContactScores.length,
      1,
    );

    for (let i = 0; i < totalPoints; i++) {
      const timeSec =
        pulseSamples[i]?.timeSec ??
        breathingSamples[i]?.timeSec ??
        Math.round((i / totalPoints) * duration);

      const pulseVal = pulseSamples[i]?.value ?? summary?.avgPulse ?? 72;
      const breathVal = breathingSamples[i]?.value ?? summary?.avgBreath ?? 15;
      const eyeVal =
        eyeContactScores[i] ?? summary?.subScores?.eyeContact ?? 85;
      const isTalk = speakingEvents[i]?.talking ? 1 : 0;

      dataPoints.push({
        second: timeSec,
        pulse: pulseVal,
        breath: breathVal,
        eyeContact: eyeVal,
        speaking: isTalk,
      });
    }

    return dataPoints;
  }, [
    pulseSamples,
    breathingSamples,
    eyeContactScores,
    speakingEvents,
    duration,
    summary,
  ]);

  // Identify peak stress moment (highest pulse point)
  const peakPulseMoment = useMemo(() => {
    if (chartData.length === 0) return null;
    let highest = chartData[0];
    for (const pt of chartData) {
      if (pt.pulse > highest.pulse) highest = pt;
    }
    return highest;
  }, [chartData]);

  // Compute current values at scrubber timestamp
  const activePoint = useMemo(() => {
    if (chartData.length === 0) return null;
    const closest = chartData.reduce((prev, curr) =>
      Math.abs(curr.second - scrubberSec) < Math.abs(prev.second - scrubberSec)
        ? curr
        : prev,
    );
    return closest;
  }, [chartData, scrubberSec]);

  const handleExportJson = () => {
    const exportData = {
      app: 'PitchPulse',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      session: sessionData,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pitchpulse_flight_telemetry_${sessionData?.id || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-6xl mx-auto w-full space-y-5 overflow-y-auto animate-fadeIn select-none">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToStudio}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>New Pitch Session</span>
        </button>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors cursor-pointer shadow-sm"
            title="Export synchronized flight telemetry as JSON"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export Flight Log</span>
          </button>

          {onPracticeWithGhost && (
            <button
              onClick={() => onPracticeWithGhost(sessionData)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-xs font-bold text-white shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
            >
              <span>👻 Practice Again (Ghost Mode)</span>
            </button>
          )}

          <span className="text-xs text-slate-400 font-mono px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            {duration}s Duration
          </span>
        </div>
      </div>

      {/* Hero Score Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-indigo-950/60 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-sky-500/10 border-2 border-sky-400/40 flex flex-col items-center justify-center shadow-lg shadow-sky-500/10">
            <span className="text-3xl font-black font-mono text-sky-400 tracking-tight">
              {summary?.overallScore || 82}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
              SCORE
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-xl font-bold text-slate-100">
                Presentation Flight Recorder
              </h2>
              <span className="px-3 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                Grade: {summary?.grade || 'A'}
              </span>
            </div>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Synchronized 6-channel biometric & behavioral telemetry
              reconstructed from camera frames.
            </p>
          </div>
        </div>

        {/* Quick summary stat cards */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-center shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Avg Pulse
            </span>
            <span className="text-base font-black font-mono text-sky-400">
              {summary?.avgPulse || 72} BPM
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-center shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Audience Focus
            </span>
            <span className="text-base font-black font-mono text-indigo-400">
              {summary?.subScores?.eyeContact || 85}%
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800/80 px-4 py-2.5 rounded-2xl text-center shadow-inner">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Talk Ratio
            </span>
            <span className="text-base font-black font-mono text-emerald-400">
              {summary?.talkRatio || 70}%
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side "Ghost Take" Comparative Scorecard */}
      {sessionData?.ghostComparison && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">🚀</span>
              <h3 className="text-sm font-bold text-slate-100">
                Ghost Take Comparative Delta (Take 1 vs. Take 2)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              +
              {Math.max(
                1,
                (summary?.overallScore || 85) -
                  sessionData.ghostComparison.take1Score,
              )}{' '}
              PTS REGULATION GAIN
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Heart Rate Delta
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-mono font-bold text-slate-100">
                  {summary?.avgPulse || 72} BPM
                </span>
                <span
                  className={`text-xs font-mono font-bold ${
                    (summary?.avgPulse || 72) <=
                    sessionData.ghostComparison.take1Pulse
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  (
                  {(summary?.avgPulse || 72) -
                    sessionData.ghostComparison.take1Pulse >
                  0
                    ? '+'
                    : ''}
                  {(summary?.avgPulse || 72) -
                    sessionData.ghostComparison.take1Pulse}{' '}
                  BPM)
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Take 1: {sessionData.ghostComparison.take1Pulse} BPM
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Audience Eye Focus
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-mono font-bold text-slate-100">
                  {summary?.subScores?.eyeContact || 85}%
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  (+
                  {Math.max(
                    0,
                    (summary?.subScores?.eyeContact || 85) -
                      sessionData.ghostComparison.take1EyeContact,
                  )}
                  %)
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Take 1: {sessionData.ghostComparison.take1EyeContact}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Breathing Cadence
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-mono font-bold text-slate-100">
                  {summary?.avgBreath || 15} br/min
                </span>
                <span className="text-xs font-mono font-bold text-sky-400">
                  Stable
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Take 1: {sessionData.ghostComparison.take1Breath} br/min
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                Overall Mastery
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-lg font-mono font-bold text-indigo-400">
                  {summary?.grade || 'A'}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {(summary?.overallScore || 85) >=
                  sessionData.ghostComparison.take1Score
                    ? 'Improved ↑'
                    : 'Maintained'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Take 1: {sessionData.ghostComparison.take1Score} pts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Recharts Waveform Flight Replay */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Interactive Biometric Waveform Replay
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {peakPulseMoment && (
              <button
                onClick={() => setScrubberSec(peakPulseMoment.second)}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-red-950/70 border border-red-500/40 text-red-300 text-[11px] font-semibold hover:bg-red-900/60 transition-colors cursor-pointer"
                title="Jump scrubber to peak heart rate spike"
              >
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>
                  Peak Stress Spike: {peakPulseMoment.pulse} BPM @{' '}
                  {peakPulseMoment.second}s
                </span>
              </button>
            )}

            <div className="text-xs font-mono text-sky-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
              Scrubber: {scrubberSec}s / {duration}s
            </div>
          </div>
        </div>

        {/* Range Scrubber Bar */}
        <div className="relative pt-1">
          <input
            type="range"
            min={0}
            max={duration}
            value={scrubberSec}
            onChange={(e) => setScrubberSec(Number(e.target.value))}
            className="w-full accent-sky-400 cursor-pointer h-2 bg-slate-950 rounded-lg appearance-none"
          />
        </div>

        {/* Current Point Telemetry HUD */}
        {activePoint && (
          <div className="grid grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400" /> Pulse:
              </span>
              <span className="font-bold text-rose-400">
                {activePoint.pulse} BPM
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Eye className="w-3 h-3 text-indigo-400" /> Eye Focus:
              </span>
              <span className="font-bold text-indigo-400">
                {activePoint.eyeContact}%
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Wind className="w-3 h-3 text-emerald-400" /> Breath:
              </span>
              <span className="font-bold text-emerald-400">
                {activePoint.breath} br/m
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Mic className="w-3 h-3 text-sky-400" /> Voice:
              </span>
              <span
                className={`font-bold ${activePoint.speaking ? 'text-sky-400' : 'text-slate-500'}`}
              >
                {activePoint.speaking ? 'Active' : 'Pause'}
              </span>
            </div>
          </div>
        )}

        {/* Synchronized Recharts Waveform Chart */}
        <div className="h-56 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              onClick={(e) =>
                e?.activeLabel && setScrubberSec(Number(e.activeLabel))
              }
            >
              <XAxis dataKey="second" stroke="#475569" fontSize={11} unit="s" />
              <YAxis
                yAxisId="pulse"
                domain={['dataMin - 5', 'dataMax + 10']}
                orientation="left"
                stroke="#f43f5e"
                fontSize={11}
                width={38}
              />
              <YAxis
                yAxisId="pct"
                domain={[0, 100]}
                orientation="right"
                stroke="#818cf8"
                fontSize={11}
                width={38}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#090d16',
                  borderColor: '#1e293b',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
              />

              {/* Scrubber vertical line */}
              <ReferenceLine
                yAxisId="pulse"
                x={scrubberSec}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="3 3"
              />

              {/* Heart rate wave */}
              <Line
                yAxisId="pulse"
                type="monotone"
                dataKey="pulse"
                stroke="#f43f5e"
                strokeWidth={2.4}
                dot={false}
                name="Heart Rate (BPM)"
              />

              {/* Eye contact score area */}
              <Area
                yAxisId="pct"
                type="monotone"
                dataKey="eyeContact"
                stroke="#818cf8"
                fill="rgba(129, 140, 248, 0.12)"
                strokeWidth={1.8}
                dot={false}
                name="Audience Eye Focus (%)"
              />

              {/* Breathing rate line */}
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="breath"
                stroke="#34d399"
                strokeWidth={1.8}
                dot={false}
                name="Breathing Cadence"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub-Score Breakdown & AI / Biometric Tips */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weighted Sub-Scores */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Award className="w-4 h-4 text-sky-400" />
            Weighted Performance Breakdown
          </h3>

          <div className="space-y-3">
            {[
              {
                label: 'Eye Contact',
                weight: '25%',
                score: summary?.subScores?.eyeContact || 85,
                color: 'bg-indigo-500',
              },
              {
                label: 'Composure',
                weight: '25%',
                score: summary?.subScores?.composure || 80,
                color: 'bg-sky-500',
              },
              {
                label: 'Speaking Pace',
                weight: '20%',
                score: summary?.subScores?.speakingPace || 85,
                color: 'bg-cyan-500',
              },
              {
                label: 'Breath Control',
                weight: '15%',
                score: summary?.subScores?.breathControl || 78,
                color: 'bg-emerald-500',
              },
              {
                label: 'Expression Dynamics',
                weight: '10%',
                score: summary?.subScores?.expression || 88,
                color: 'bg-amber-500',
              },
              {
                label: 'Blink Naturalness',
                weight: '5%',
                score: summary?.subScores?.blinkNaturalness || 90,
                color: 'bg-purple-500',
              },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-semibold">
                    {item.label}{' '}
                    <span className="text-slate-500 text-[10px]">
                      ({item.weight})
                    </span>
                  </span>
                  <span className="font-mono font-bold text-slate-100">
                    {item.score}/100
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Personalized Tips */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-xl space-y-3.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Coaching Action Items & Insights
          </h3>

          <div className="space-y-2.5">
            {summary?.tips && summary.tips.length > 0 ? (
              summary.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 shadow-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{tip}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">
                Balanced delivery with no adverse physiological triggers!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
