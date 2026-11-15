import React, { useEffect, useRef } from 'react';
import { Camera, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { EMOTIONS } from '../lib/constants';
import CoachingOverlay from './CoachingOverlay';

export default function CameraPreview({
  stream = null,
  validationHint = '',
  currentExpression = 'neutral',
  isSpeaking = false,
  isRecording = false,
  activeNudge = null,
  sensingMode = 'demo', // 'live' | 'calibrating' | 'demo'
  cardioConfidence = 0,
  calibrationSec = 0,
  sdkError = null,
  onOpenSettings = null,
  pressureMoment = null,
  onMarkPressureMoment = null,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const emotionInfo = EMOTIONS[currentExpression] || EMOTIONS.neutral;

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100"
      />

      {/* When no camera stream yet */}
      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-6 text-center">
          <Camera className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
          <h3 className="text-sm font-semibold text-slate-200">
            Waiting for Camera Stream...
          </h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            SmartSpectra will initialize your front webcam and extract real-time
            physiological vitals.
          </p>
        </div>
      )}

      {/* Subtle face centering guide box */}
      <div className="absolute inset-8 md:inset-12 border-2 border-dashed border-white/20 rounded-3xl pointer-events-none flex flex-col justify-between p-3">
        <div className="flex justify-between">
          <div className="w-3 h-3 border-t-2 border-l-2 border-sky-400"></div>
          <div className="w-3 h-3 border-t-2 border-r-2 border-sky-400"></div>
        </div>
        <div className="flex justify-between">
          <div className="w-3 h-3 border-b-2 border-l-2 border-sky-400"></div>
          <div className="w-3 h-3 border-b-2 border-r-2 border-sky-400"></div>
        </div>
      </div>

      {/* Top badges: Live expression & Speaking activity */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        {/* Emotion Pill */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md bg-slate-900/80 border border-slate-700/60 shadow-lg text-xs font-semibold"
          style={{ borderColor: emotionInfo.color }}
        >
          <span>{emotionInfo.icon}</span>
          <span className="text-slate-200">{emotionInfo.label}</span>
        </div>

        {/* Talking Detection Badge */}
        {isSpeaking && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md bg-sky-950/80 border border-sky-500/60 text-sky-300 shadow-lg text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            Speaking
          </div>
        )}
      </div>

      {/* Top Right: Sensing Mode & Hardware Status Badge */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
        {sensingMode === 'live' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 backdrop-blur-md shadow-lg text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>● LIVE SMARTSPECTRA SDK</span>
            {cardioConfidence > 0 && (
              <span className="text-[10px] text-emerald-400/80 font-mono">
                ({cardioConfidence}% signal)
              </span>
            )}
          </div>
        )}

        {sensingMode === 'calibrating' && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/90 border border-sky-500/60 text-sky-300 backdrop-blur-md shadow-lg text-xs font-bold animate-pulse">
            <div className="w-2.5 h-2.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span>CALIBRATING BASELINE ({calibrationSec}s / 20s)</span>
          </div>
        )}

        {sensingMode === 'demo' && (
          <div
            onClick={onOpenSettings}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/90 border border-amber-500/60 text-amber-300 backdrop-blur-md shadow-lg text-xs font-bold ${onOpenSettings ? 'cursor-pointer hover:bg-amber-900/90' : ''}`}
            title={
              onOpenSettings
                ? 'Open Settings to enter SmartSpectra API Key'
                : ''
            }
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>
              ⚠️ DEMO DATA —{' '}
              {sdkError ? sdkError.toUpperCase() : 'NO LIVE SENSING'}
            </span>
            {onOpenSettings && (
              <span className="text-[10px] text-amber-400 underline ml-0.5">
                Settings ⚙
              </span>
            )}
          </div>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/60 text-red-300 backdrop-blur-md shadow-lg text-xs font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            RECORDING SESSION
          </div>
        )}
      </div>

      {/* Real-time coaching overlay */}
      <CoachingOverlay activeNudge={activeNudge} />

      {/* Pressure Moment Marking & Recovery HUD */}
      {isRecording && (
        <div className="absolute bottom-5 inset-x-4 z-30 flex flex-col items-center justify-center gap-2">
          {pressureMoment ? (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-xl border shadow-2xl transition-all duration-300 ${
                pressureMoment.status === 'recovered'
                  ? 'bg-emerald-950/90 border-emerald-500/70 text-emerald-200 shadow-emerald-500/20'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-200 shadow-amber-500/20 animate-pulse'
              }`}
            >
              {pressureMoment.status === 'steady' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold tracking-wide text-sky-200">
                    Baseline Steady ({pressureMoment.baselineBpm} BPM) — No
                    Acute Cardiac Spike
                  </span>
                </>
              ) : pressureMoment.status === 'recovered' ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black tracking-wide">
                    Baseline Restored in {pressureMoment.recoverySec}s (
                    {pressureMoment.baselineBpm} BPM)
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span className="text-xs font-black tracking-wide">
                    ⚡ PRESSURE MOMENT ACTIVE — Tracking Live Response...
                  </span>
                  {pressureMoment.peakBpm > pressureMoment.baselineBpm && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40 text-amber-300">
                      +{pressureMoment.peakBpm - pressureMoment.baselineBpm} BPM
                      Spike
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            onMarkPressureMoment && (
              <button
                onClick={onMarkPressureMoment}
                className="group flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-2xl shadow-amber-500/30 transition-all cursor-pointer transform hover:scale-105 active:scale-95"
                title="Mark the moment you encounter high pressure (stumble, complex question) to measure physiological recovery"
              >
                <Zap className="w-4 h-4 fill-slate-950 group-hover:animate-bounce" />
                <span>Mark Pressure Moment</span>
                <span className="ml-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/20 text-slate-900 border border-slate-900/30">
                  Space
                </span>
              </button>
            )
          )}
        </div>
      )}

      {/* Bottom positioning hint if SDK reports issues */}
      {validationHint && !activeNudge && !isRecording && (
        <div className="absolute bottom-4 inset-x-4 z-20 flex items-center justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-amber-500/60 text-amber-300 backdrop-blur-md text-xs font-medium shadow-xl">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>{validationHint}</span>
          </div>
        </div>
      )}
    </div>
  );
}
