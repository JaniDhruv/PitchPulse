import React, { useEffect, useRef } from 'react';
import { Camera, Sparkles, AlertTriangle } from 'lucide-react';
import { EMOTIONS } from '../lib/constants';

export default function CameraPreview({
  stream = null,
  validationHint = '',
  currentExpression = 'neutral',
  isSpeaking = false,
  isRecording = false,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const emotionInfo = EMOTIONS[currentExpression] || EMOTIONS.neutral;

  return (
    <div className="relative w-full h-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
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
          <h3 className="text-sm font-semibold text-slate-200">Waiting for Camera Stream...</h3>
          <p className="text-xs text-slate-400 max-w-xs mt-1">
            SmartSpectra will initialize your front webcam and extract real-time physiological vitals.
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

      {/* Recording status indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/60 text-red-300 backdrop-blur-md shadow-lg text-xs font-bold">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
          RECORDING SESSION
        </div>
      )}

      {/* Bottom positioning hint if SDK reports issues */}
      {validationHint && (
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

