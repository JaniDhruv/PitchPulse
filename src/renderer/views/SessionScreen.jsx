import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, History, Wind } from 'lucide-react';
import CameraPreview from '../components/CameraPreview';
import PulseCanvas from '../components/PulseCanvas';
import BreathingCanvas from '../components/BreathingCanvas';
import ComposureGauge from '../components/ComposureGauge';
import EyeContactMeter from '../components/EyeContactMeter';
import SpeakingTimeline from '../components/SpeakingTimeline';
import BreathingPacer from '../components/BreathingPacer';
import {
  calculateLiveComposure,
  calculateEyeContactScore,
  calculateSessionSummary,
} from '../lib/scoring';

// Dynamic module cache to avoid blocking top-level module evaluation
let sdkModulesCache = null;

async function getSdkModules() {
  if (sdkModulesCache) return sdkModulesCache;
  try {
    const [sdkModule, msgModule] = await Promise.all([
      import('@smartspectra/node-sdk/renderer'),
      import('@smartspectra/node-sdk/messages'),
    ]);
    sdkModulesCache = {
      SmartSpectraSDK: sdkModule.SmartSpectraSDK,
      cardioMetrics: sdkModule.cardioMetrics || [],
      breathingMetrics: sdkModule.breathingMetrics || [],
      faceMetrics: sdkModule.faceMetrics || [],
      decodeMetrics: msgModule.decodeMetrics,
    };
    return sdkModulesCache;
  } catch (err) {
    console.warn('SmartSpectra SDK modules unavailable in renderer:', err);
    return null;
  }
}

export default function SessionScreen({
  apiKey,
  enableTelemetry = false,
  ghostTake = null,
  onClearGhost = null,
  onFinishSession,
  onOpenHistory,
  onOpenSettings,
}) {
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationSec, setRecordDurationSec] = useState(0);
  const [validationHint, setValidationHint] = useState('');
  const [showPacer, setShowPacer] = useState(false);

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
  const [activeNudge, setActiveNudge] = useState(null);

  // Fast mutable ring buffers for 60fps canvas drawing (0% React re-render lag)
  const pulseBufferRef = useRef(Array.from({ length: 120 }, () => 0));
  const breathingBufferRef = useRef(Array.from({ length: 120 }, () => 0));
  const ghostPulseBufferRef = useRef(Array.from({ length: 120 }, () => 0));

  // Recorded session data accumulator
  const sessionDataRef = useRef({
    pulseSamples: [],
    breathingSamples: [],
    hrvSamples: [],
    speakingEvents: [],
    blinkEvents: [],
    expressionHistory: [],
    eyeContactScores: [],
    coachingMoments: [],
    startTime: null,
  });

  const sdkInstanceRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const breathHoldTimerRef = useRef(0);
  const nudgeCooldownRef = useRef(0);
  const durationCounterRef = useRef(0);

  // Mutable ref to current metrics to avoid interval tearing & stale closures
  const latestMetricsRef = useRef({
    liveBpm: 74,
    liveBreathRate: 15,
    liveComposure: 82,
    eyeContactScore: 88,
    isSpeaking: false,
    currentExpression: 'neutral',
    rmssd: 0,
    hrvConfidence: 0,
  });

  // Initialize SmartSpectra SDK or Fallback Simulation
  useEffect(() => {
    let isCancelled = false;

    async function initSdk() {
      if (apiKey) {
        const modules = await getSdkModules();
        if (modules && modules.SmartSpectraSDK && !isCancelled) {
          try {
            const {
              SmartSpectraSDK,
              cardioMetrics,
              breathingMetrics,
              faceMetrics,
              decodeMetrics,
            } = modules;
            const sdk = new SmartSpectraSDK({
              apiKey,
              enableTelemetry: Boolean(enableTelemetry),
              requestedMetrics: [
                ...cardioMetrics,
                ...breathingMetrics,
                ...faceMetrics,
              ],
            });
            sdkInstanceRef.current = sdk;

            sdk.on('streamAvailable', (mediaStream) => {
              if (!isCancelled) setStream(mediaStream);
            });

            sdk.on('validationStatus', (_code, _ts, hint) => {
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
            return;
          } catch (err) {
            console.warn(
              'SmartSpectra direct acquisition failed or offline. Starting simulator mode:',
              err,
            );
          }
        }
      }

      // If SDK direct start failed or no key yet, activate high-fidelity synthetic telemetry
      startSimulator();
    }

    initSdk();

    return () => {
      isCancelled = true;
      if (sdkInstanceRef.current) {
        try {
          sdkInstanceRef.current.destroy();
        } catch {}
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [apiKey]);

  // High-fidelity fallback / test simulator for automated demos
  const startSimulator = async () => {
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
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
      if (breathingBufferRef.current.length > 120)
        breathingBufferRef.current.shift();

      // Ghost Take pulse wave simulation if active
      if (ghostTake) {
        const ghostFreq = ((ghostTake.summary?.avgPulse || 88) / 60) * 4;
        const ghostPpg =
          Math.sin(phase * ghostFreq) * 0.6 +
          Math.sin(phase * ghostFreq * 2) * 0.25;
        ghostPulseBufferRef.current.push(ghostPpg);
        if (ghostPulseBufferRef.current.length > 120)
          ghostPulseBufferRef.current.shift();
      }

      const simBpm = Math.round(72 + Math.sin(phase * 0.3) * 6);
      setLiveBpm(simBpm);
      setLiveBreathRate(15);
      setLiveComposure(82);
      setEyeContactScore(88);
      setIsGazeCentered(true);

      latestMetricsRef.current.liveBpm = simBpm;
      latestMetricsRef.current.liveBreathRate = 15;
      latestMetricsRef.current.eyeContactScore = 88;
    }, 33);
  };

  // Process live metrics decoded from SmartSpectra
  const processIncomingMetrics = (metrics) => {
    // 1. Cardio
    if (metrics.cardio) {
      if (metrics.cardio.pulseRate?.length > 0) {
        const last =
          metrics.cardio.pulseRate[metrics.cardio.pulseRate.length - 1];
        if (last?.value) {
          const bpm = Math.round(last.value);
          setLiveBpm(bpm);
          latestMetricsRef.current.liveBpm = bpm;
        }
      }
      if (metrics.cardio.arterialPressureTrace?.length > 0) {
        metrics.cardio.arterialPressureTrace.forEach((pt) => {
          if (pt?.value != null) {
            pulseBufferRef.current.push(pt.value);
            if (pulseBufferRef.current.length > 120)
              pulseBufferRef.current.shift();
          }
        });
      }
      if (metrics.cardio.hrv?.length > 0) {
        const lastHrv = metrics.cardio.hrv[metrics.cardio.hrv.length - 1];
        if (lastHrv?.value) {
          latestMetricsRef.current.rmssd = lastHrv.value;
          latestMetricsRef.current.hrvConfidence = lastHrv.confidence || 50;
          setIsHrvLocked(true);
        }
      }
    }

    // 2. Breathing (Talking-gated to respect optical rPPG model card constraints)
    if (metrics.breathing) {
      if (
        metrics.breathing.rate?.length > 0 &&
        !latestMetricsRef.current.isSpeaking
      ) {
        const lastB =
          metrics.breathing.rate[metrics.breathing.rate.length - 1];
        if (
          lastB?.value &&
          (lastB.confidence == null || lastB.confidence >= 35)
        ) {
          const br = Math.round(lastB.value);
          setLiveBreathRate(br);
          latestMetricsRef.current.liveBreathRate = br;
        }
      }
      if (metrics.breathing.upperTrace?.length > 0) {
        metrics.breathing.upperTrace.forEach((bt) => {
          if (bt?.value != null) {
            breathingBufferRef.current.push(bt.value);
            if (breathingBufferRef.current.length > 120)
              breathingBufferRef.current.shift();
          }
        });
      }
    }

    // 3. Face
    if (metrics.face) {
      if (metrics.face.talking?.length > 0) {
        const isTalk = Boolean(
          metrics.face.talking[metrics.face.talking.length - 1]?.detected,
        );
        setIsSpeaking(isTalk);
        latestMetricsRef.current.isSpeaking = isTalk;
      }
      if (metrics.face.expression?.length > 0) {
        const exp =
          metrics.face.expression[metrics.face.expression.length - 1];
        if (exp?.category) {
          setCurrentExpression(exp.category);
          latestMetricsRef.current.currentExpression = exp.category;
        }
      }
      if (metrics.face.blink?.length > 0) {
        const blink = metrics.face.blink[metrics.face.blink.length - 1];
        if (blink?.detected) {
          sessionDataRef.current.blinkEvents.push({
            detected: true,
            timeSec: durationCounterRef.current,
          });
        }
      }
      if (metrics.face.landmarks?.length > 0) {
        const eyeRes = calculateEyeContactScore(metrics.face.landmarks);
        setEyeContactScore(eyeRes.score);
        latestMetricsRef.current.eyeContactScore = eyeRes.score;
        setIsGazeCentered(eyeRes.isCentered);
        setGazeOffset(eyeRes.gazeOffset);
      }
    }
  };

  // Dedicated function to safely trigger coaching nudges with automatic fade-out
  const triggerCoachingNudge = (nudge, timeSec) => {
    setActiveNudge(nudge);
    sessionDataRef.current.coachingMoments.push({ ...nudge, timeSec });
    nudgeCooldownRef.current = 6;
    setTimeout(() => {
      setActiveNudge(null);
    }, 4200);
  };

  // Recording timer: clean side-effect execution inside timer callback
  useEffect(() => {
    let timer = null;
    if (isRecording) {
      timer = setInterval(() => {
        durationCounterRef.current += 1;
        const newSec = durationCounterRef.current;
        const current = latestMetricsRef.current;

        // 1. Record samples into session accumulator
        sessionDataRef.current.pulseSamples.push({
          value: current.liveBpm,
          timeSec: newSec,
        });
        sessionDataRef.current.breathingSamples.push({
          value: current.liveBreathRate,
          timeSec: newSec,
        });
        sessionDataRef.current.eyeContactScores.push(current.eyeContactScore);
        sessionDataRef.current.speakingEvents.push({
          talking: current.isSpeaking,
          timeSec: newSec,
        });
        sessionDataRef.current.expressionHistory.push({
          category: current.currentExpression,
          timeSec: newSec,
        });
        if (current.rmssd > 0) {
          sessionDataRef.current.hrvSamples.push(current.rmssd);
        }

        // 2. Dynamic talk ratio calculation
        const events = sessionDataRef.current.speakingEvents;
        const talkCount = events.filter((e) => e.talking).length;
        const newTalkRatio =
          events.length > 0 ? Math.round((talkCount / events.length) * 100) : 70;
        setTalkRatio(newTalkRatio);

        // 3. Breath holding detection
        const bBuffer = breathingBufferRef.current;
        if (bBuffer.length >= 30 && !current.isSpeaking) {
          const recent = bBuffer.slice(-30);
          const min = Math.min(...recent);
          const max = Math.max(...recent);
          if (max - min < 0.08) {
            breathHoldTimerRef.current += 1;
            if (breathHoldTimerRef.current >= 4) {
              setIsBreathHolding(true);
            }
          } else {
            breathHoldTimerRef.current = 0;
            setIsBreathHolding(false);
          }
        } else {
          breathHoldTimerRef.current = 0;
          setIsBreathHolding(false);
        }

        // 4. Dynamic Live Composure calculation with HRV warm-up fallback
        const pulseHistory = sessionDataRef.current.pulseSamples.map(
          (p) => p.value,
        );
        const compResult = calculateLiveComposure({
          pulseRate: current.liveBpm,
          pulseHistory,
          breathingRate: current.liveBreathRate,
          expressions: { [current.currentExpression]: 1 },
          rmssd: current.rmssd,
          hrvConfidence: current.hrvConfidence,
          durationSec: newSec,
        });
        setLiveComposure(compResult.score);
        if (compResult.isHrvLocked) {
          setIsHrvLocked(true);
        }

        // 5. Contextual Coaching Nudge triggers
        if (nudgeCooldownRef.current > 0) {
          nudgeCooldownRef.current -= 1;
        } else {
          if (breathHoldTimerRef.current >= 4) {
            triggerCoachingNudge(
              {
                category: 'breath',
                icon: '💨',
                text: 'Breathe smoothly — inhale deeply through your nose.',
              },
              newSec,
            );
          } else if (current.eyeContactScore < 55) {
            triggerCoachingNudge(
              {
                category: 'gaze',
                icon: '👀',
                text: 'Look at the camera lens — establish direct connection.',
              },
              newSec,
            );
          } else if (current.liveBpm > 98) {
            triggerCoachingNudge(
              {
                category: 'pulse',
                icon: '🫀',
                text: 'Elevated heart rate — pause 1 second and ground your feet.',
              },
              newSec,
            );
          } else if (
            current.currentExpression === 'fear' ||
            current.currentExpression === 'anger'
          ) {
            triggerCoachingNudge(
              {
                category: 'expression',
                icon: '😌',
                text: 'Soften your jaw and brow — let warm confidence show.',
              },
              newSec,
            );
          } else if (
            newSec > 15 &&
            compResult.score >= 86 &&
            current.eyeContactScore >= 80 &&
            newSec % 25 === 0
          ) {
            triggerCoachingNudge(
              {
                category: 'positive',
                icon: '✨',
                text: 'Terrific composure and gaze lock! Maintain this rhythm.',
              },
              newSec,
            );
          }
        }

        // 6. Update UI duration display
        setRecordDurationSec(newSec);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startActualRecording = () => {
    durationCounterRef.current = 0;
    sessionDataRef.current = {
      pulseSamples: [],
      breathingSamples: [],
      hrvSamples: [],
      speakingEvents: [],
      blinkEvents: [],
      expressionHistory: [],
      eyeContactScores: [],
      coachingMoments: [],
      startTime: Date.now(),
    };
    setRecordDurationSec(0);
    setIsRecording(true);
    setShowPacer(false);
  };

  const handleStartPitchClick = () => {
    setShowPacer(true);
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    const summary = calculateSessionSummary({
      ...sessionDataRef.current,
      durationSec: durationCounterRef.current || 15,
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
    <div className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full space-y-4 overflow-hidden select-none">
      {/* Zen Pre-Pitch Calibration Overlay */}
      {showPacer && (
        <BreathingPacer
          liveBpm={liveBpm}
          onComplete={startActualRecording}
          onSkip={startActualRecording}
        />
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-sky-500/25 font-black text-lg">
            P
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
              PitchPulse
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 border border-sky-500/40 text-sky-400">
                Presage SmartSpectra SDK
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Contactless Biometric Presentation Coach
            </p>
          </div>
        </div>

        {ghostTake && (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 text-xs font-semibold shadow-lg">
            <span>
              👻 Ghost Mode Active: Comparing with Take 1 (
              {ghostTake.summary?.avgPulse || 88} BPM)
            </span>
            {onClearGhost && (
              <button
                onClick={onClearGhost}
                className="text-purple-400 hover:text-purple-200 text-[10px] uppercase font-bold ml-1 cursor-pointer"
                title="Exit Ghost Mode"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPacer(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-sky-400 font-semibold transition-colors cursor-pointer"
            title="Open Breathing Calibration Pacer"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Pacer</span>
          </button>
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 font-semibold transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
          <div className="flex-1 relative rounded-3xl overflow-hidden min-h-[280px]">
            <CameraPreview
              stream={stream}
              validationHint={validationHint}
              currentExpression={currentExpression}
              isSpeaking={isSpeaking}
              isRecording={isRecording}
              activeNudge={activeNudge}
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
            <div className="flex-1 min-h-[110px]">
              <PulseCanvas
                bufferRef={pulseBufferRef}
                ghostBufferRef={ghostTake ? ghostPulseBufferRef : null}
                ghostAvgBpm={ghostTake?.summary?.avgPulse}
                liveBpm={liveBpm}
                isRecording={isRecording}
              />
            </div>
            <div className="flex-1 min-h-[110px]">
              <BreathingCanvas
                bufferRef={breathingBufferRef}
                liveRate={liveBreathRate}
                isBreathHolding={isBreathHolding}
                isSpeaking={isSpeaking}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Bar */}
      <div
        className={`flex items-center justify-between p-3.5 bg-slate-900 border ${
          isRecording
            ? 'border-red-500/50 shadow-red-500/10'
            : 'border-slate-800'
        } rounded-2xl shadow-xl transition-all duration-300`}
      >
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping"></span>
              <span className="font-mono text-base font-bold text-slate-100">
                {String(Math.floor(recordDurationSec / 60)).padStart(2, '0')}:
                {String(recordDurationSec % 60).padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-400">
                Capturing Biometric Telemetry
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span>All Sensors Initialized & Ready</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!isRecording ? (
            <button
              onClick={handleStartPitchClick}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition-all cursor-pointer transform hover:scale-[1.02]"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Record Practice Pitch</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-red-500/25 transition-all cursor-pointer transform hover:scale-[1.02]"
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
