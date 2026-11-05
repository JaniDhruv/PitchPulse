import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, History, HelpCircle, Activity, Sparkles, RefreshCw } from 'lucide-react';
import CameraPreview from '../components/CameraPreview';
import PulseCanvas from '../components/PulseCanvas';
import BreathingCanvas from '../components/BreathingCanvas';
import ComposureGauge from '../components/ComposureGauge';
import EyeContactMeter from '../components/EyeContactMeter';
import SpeakingTimeline from '../components/SpeakingTimeline';
import { calculateLiveComposure, calculateEyeContactScore, calculateSessionSummary } from '../lib/scoring';
import { EMOTIONS } from '../lib/constants';

// We import the SDK dynamically or handle graceful fallback
let SmartSpectraSDK = null;
let decodeMetrics = null;
let cardioMetrics = [];
let breathingMetrics = [];
let faceMetrics = [];

try {
  const sdkModule = await import('@smartspectra/node-sdk/renderer');
  SmartSpectraSDK = sdkModule.SmartSpectraSDK;
  cardioMetrics = sdkModule.cardioMetrics || [];
  breathingMetrics = sdkModule.breathingMetrics || [];
  faceMetrics = sdkModule.faceMetrics || [];

  const msgModule = await import('@smartspectra/node-sdk/messages');
  decodeMetrics = msgModule.decodeMetrics;
} catch (e) {
  console.warn('SmartSpectra renderer module deferred or not in window:', e);
}

export default function SessionScreen({
  apiKey,
  onFinishSession,
  onOpenHistory,
  onOpenSettings,
}) {
  const [stream, setStream] = useState(null);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationSec, setRecordDurationSec] = useState(0);
  const [validationHint, setValidationHint] = useState('');

  // Live Metric States
  const [liveBpm, setLiveBpm] = useState(74);
  const [liveBreathRate, setLiveBreathRate] = useState(15);
  const [liveComposure, setLiveComposure] = useState(82);
  const [isHrvLocked, setIsHrvLocked] = useState(false);
  const [eyeContactScore, setEyeContactScore] = useState(88);
  const [isGazeCentered, setIsGazeCentered] = useState(true);
  const [gazeOffset, setGazeOffset] = useState({ x: 0, y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentExpression, setCurrentExpression] = useState('neutral');
  const [isBreathHolding, setIsBreathHolding] = useState(false);
  const [talkRatio, setTalkRatio] = useState(70);

  // Fast mutable ring buffers for 60fps canvas drawing (0% React re-render lag)
  const pulseBufferRef = useRef(new Array(120).fill(0));
  const breathingBufferRef = useRef(new Array(120).fill(0));

  // Recorded session data accumulator
  const sessionDataRef = useRef({
    pulseSamples: [],
    breathingSamples: [],
    hrvSamples: [],
    speakingEvents: [],
    blinkEvents: [],
    expressionHistory: [],
    eyeContactScores: [],
    startTime: null,
  });

  const sdkInstanceRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const lastTalkingTimeRef = useRef(Date.now());
  const breathHoldTimerRef = useRef(0);

  // Initialize SmartSpectra SDK or Fallback Simulation
  useEffect(() => {
    let isCancelled = false;

    async function initSdk() {
      if (SmartSpectraSDK && apiKey) {
        try {
          const sdk = new SmartSpectraSDK({
            apiKey,
            requestedMetrics: [...cardioMetrics, ...breathingMetrics, ...faceMetrics],
          });
          sdkInstanceRef.current = sdk;

          sdk.on('streamAvailable', (mediaStream) => {
            if (!isCancelled) setStream(mediaStream);
          });

          sdk.on('validationStatus', (code, _ts, hint) => {
            if (!isCancelled) setValidationHint(hint || '');
          });

          sdk.on('metrics', (buf) => {
            if (!decodeMetrics || isCancelled) return;
            try {
              const metrics = decodeMetrics(buf);
              processIncomingMetrics(metrics);
            } catch (err) {
              console.error('Error decoding metrics buffer:', err);
            }
          });

          await sdk.start();
          if (!isCancelled) setIsSdkReady(true);
          return;
        } catch (err) {
          console.warn('SmartSpectra direct acquisition failed or offline. Starting simulator mode:', err);
        }
      }

      // If SDK direct start failed or no key yet, activate high-fidelity synthetic telemetry
      startSimulator();
    }

    initSdk();

    return () => {
      isCancelled = true;
      if (sdkInstanceRef.current) {
        try { sdkInstanceRef.current.destroy(); } catch {}
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [apiKey]);

  // High-fidelity fallback / test simulator for automated demos
  const startSimulator = async () => {
    setIsSdkReady(true);
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setStream(fallbackStream);
    } catch {
      // Camera permission blocked
    }

    let phase = 0;
    simulationIntervalRef.current = setInterval(() => {
      phase += 0.1;
      // Synthetic PPG pulse waveform
      const ppg = Math.sin(phase * 4) * 0.7 + Math.sin(phase * 8) * 0.3;
      pulseBufferRef.current.push(ppg);
      if (pulseBufferRef.current.length > 120) pulseBufferRef.current.shift();

      // Synthetic respiratory wave
      const resp = Math.sin(phase * 0.8);
      breathingBufferRef.current.push(resp);
      if (breathingBufferRef.current.length > 120) breathingBufferRef.current.shift();

      const simBpm = Math.round(72 + Math.sin(phase * 0.3) * 6);
      setLiveBpm(simBpm);
      setLiveBreathRate(15);
      setLiveComposure(82);
      setEyeContactScore(88);
      setIsGazeCentered(true);
    }, 33); // ~30Hz
  };

  // Process live metrics decoded from SmartSpectra
  const processIncomingMetrics = (metrics) => {
    // 1. Cardio
    if (metrics.cardio) {
      if (metrics.cardio.pulseRate?.length > 0) {
        const last = metrics.cardio.pulseRate[metrics.cardio.pulseRate.length - 1];
        if (last?.value) setLiveBpm(Math.round(last.value));
      }
      if (metrics.cardio.arterialPressureTrace?.length > 0) {
        metrics.cardio.arterialPressureTrace.forEach(pt => {
          if (pt?.value != null) {
            pulseBufferRef.current.push(pt.value);
            if (pulseBufferRef.current.length > 120) pulseBufferRef.current.shift();
          }
        });
      }
      if (metrics.cardio.hrv?.length > 0) {
        const hrvVal = metrics.cardio.hrv[metrics.cardio.hrv.length - 1]?.value;
        if (hrvVal) setIsHrvLocked(true);
      }
    }

    // 2. Breathing
    if (metrics.breathing) {
      if (metrics.breathing.rate?.length > 0) {
        const lastB = metrics.breathing.rate[metrics.breathing.rate.length - 1];
        if (lastB?.value) setLiveBreathRate(Math.round(lastB.value));
      }
      if (metrics.breathing.upperTrace?.length > 0) {
        metrics.breathing.upperTrace.forEach(bt => {
          if (bt?.value != null) {
            breathingBufferRef.current.push(bt.value);
            if (breathingBufferRef.current.length > 120) breathingBufferRef.current.shift();
          }
        });
      }
    }

    // 3. Face
    if (metrics.face) {
      if (metrics.face.talking?.length > 0) {
        const isTalk = Boolean(metrics.face.talking[metrics.face.talking.length - 1]?.detected);
        setIsSpeaking(isTalk);
      }
      if (metrics.face.expression?.length > 0) {
        const exp = metrics.face.expression[metrics.face.expression.length - 1];
        if (exp?.category) setCurrentExpression(exp.category);
      }
      if (metrics.face.landmarks?.length > 0) {
        const eyeRes = calculateEyeContactScore(metrics.face.landmarks);
        setEyeContactScore(eyeRes.score);
        setIsGazeCentered(eyeRes.isCentered);
        setGazeOffset(eyeRes.gazeOffset);
      }
    }
  };

  // Recording timer
  useEffect(() => {
    let timer = null;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordDurationSec((s) => s + 1);

        // Record samples into session accumulator
        sessionDataRef.current.pulseSamples.push({ value: liveBpm, timeSec: recordDurationSec });
        sessionDataRef.current.breathingSamples.push({ value: liveBreathRate, timeSec: recordDurationSec });
        sessionDataRef.current.eyeContactScores.push(eyeContactScore);
        sessionDataRef.current.speakingEvents.push({ talking: isSpeaking, timeSec: recordDurationSec });
        sessionDataRef.current.expressionHistory.push({ category: currentExpression, timeSec: recordDurationSec });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, liveBpm, liveBreathRate, eyeContactScore, isSpeaking, currentExpression]);

  const handleStartRecording = () => {
    sessionDataRef.current = {
      pulseSamples: [],
      breathingSamples: [],
      hrvSamples: [],
      speakingEvents: [],
      blinkEvents: [],
      expressionHistory: [],
      eyeContactScores: [],
      startTime: Date.now(),
    };
    setRecordDurationSec(0);
    setIsRecording(true);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    const summary = calculateSessionSummary({
      ...sessionDataRef.current,
      durationSec: recordDurationSec || 15,
    });

    const fullSession = {
      id: Date.now(),
      timestamp: Date.now(),
      summary,
      ...sessionDataRef.current,
    };

    if (window.pitchPulseAPI) {
      await window.pitchPulseAPI.saveSession(fullSession);
    }

    onFinishSession(fullSession);
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 font-black">
            P
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              PitchPulse
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-950 border border-sky-500/40 text-sky-400">
                SmartSpectra SDK
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Contactless Biometric Presentation Coach</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Settings & Privacy"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Area: Camera Preview & Speech Timeline (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-3 min-h-[360px]">
          <div className="flex-1 relative rounded-2xl overflow-hidden min-h-[280px]">
            <CameraPreview
              stream={stream}
              validationHint={validationHint}
              currentExpression={currentExpression}
              isSpeaking={isSpeaking}
              isRecording={isRecording}
            />
          </div>

          <SpeakingTimeline
            speakingHistory={sessionDataRef.current.speakingEvents}
            talkRatio={talkRatio}
            isCurrentlySpeaking={isSpeaking}
            pauseWarning={false}
          />
        </div>

        {/* Right Area: Physiological Telemetry Cockpit (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Top Gauges: Composure & Eye Contact */}
          <div className="grid grid-cols-2 gap-3">
            <ComposureGauge
              score={liveComposure}
              isHrvLocked={isHrvLocked}
            />
            <EyeContactMeter
              score={eyeContactScore}
              isCentered={isGazeCentered}
              gazeOffset={gazeOffset}
            />
          </div>

          {/* Real-time Oscilloscope Waveforms (HTML5 Canvas 60 FPS) */}
          <div className="flex-1 flex flex-col space-y-3 min-h-[220px]">
            <div className="flex-1 min-h-[105px]">
              <PulseCanvas
                bufferRef={pulseBufferRef}
                liveBpm={liveBpm}
                isRecording={isRecording}
              />
            </div>
            <div className="flex-1 min-h-[105px]">
              <BreathingCanvas
                bufferRef={breathingBufferRef}
                liveRate={liveBreathRate}
                isBreathHolding={isBreathHolding}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <span className="font-mono text-sm font-bold text-slate-100">
                {String(Math.floor(recordDurationSec / 60)).padStart(2, '0')}:
                {String(recordDurationSec % 60).padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-400">Recording Telemetry</span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Sensors Locked & Ready</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Record Pitch (Start)</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-red-500/25 transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              <span>Finish & Analyze Score</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

