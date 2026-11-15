import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Settings, History, Wind } from 'lucide-react';
import CameraPreview from '../components/CameraPreview';
import PulseCanvas from '../components/PulseCanvas';
import BreathingCanvas from '../components/BreathingCanvas';
import EyeContactMeter from '../components/EyeContactMeter';
import BreathingPacer from '../components/BreathingPacer';
import {
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
    const sdkClass =
      sdkModule.SmartSpectraSDK ||
      sdkModule.default?.SmartSpectraSDK ||
      sdkModule.default;
    const cardio = sdkModule.cardioMetrics ||
      sdkModule.default?.cardioMetrics || [15, 16, 17];
    const breathing = sdkModule.breathingMetrics ||
      sdkModule.default?.breathingMetrics || [0, 1, 2, 3, 4, 5, 6, 7];
    const face = sdkModule.faceMetrics ||
      sdkModule.default?.faceMetrics || [11, 12, 13, 14];
    const decode =
      msgModule.decodeMetrics ||
      msgModule.default?.decodeMetrics ||
      msgModule.default;

    sdkModulesCache = {
      SmartSpectraSDK: sdkClass,
      cardioMetrics: cardio,
      breathingMetrics: breathing,
      faceMetrics: face,
      decodeMetrics: decode,
    };
    return sdkModulesCache;
  } catch (err) {
    console.error('SmartSpectra SDK modules unavailable in renderer:', err);
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

  // Sensing Mode & Hardware Integrity State
  const [sensingMode, setSensingMode] = useState('initializing'); // 'initializing' | 'live' | 'calibrating' | 'demo'
  const [cardioConfidence, setCardioConfidence] = useState(0);
  const [calibrationSec, setCalibrationSec] = useState(0);

  // Hero Outcome: Pressure Moment & Recovery
  const [pressureMoment, setPressureMoment] = useState(null);
  const [baselinePulse, setBaselinePulse] = useState(72);

  // Live 3-Signal Telemetry States
  const [liveBpm, setLiveBpm] = useState(72);
  const [liveBreathRate, setLiveBreathRate] = useState(15);
  const [eyeContactScore, setEyeContactScore] = useState(88);
  const [isGazeCentered, setIsGazeCentered] = useState(true);
  const [gazeOffset, setGazeOffset] = useState({ x: 0, y: 0 });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentExpression, setCurrentExpression] = useState('neutral');
  const [isBreathHolding, setIsBreathHolding] = useState(false);
  const [activeNudge, setActiveNudge] = useState(null);
  const [ghostLiveBpm, setGhostLiveBpm] = useState(
    ghostTake?.summary?.avgPulse || null,
  );
  const lastGhostBpmRef = useRef(null);

  // Fast mutable ring buffers for 60fps canvas drawing (0% React re-render lag)
  const pulseBufferRef = useRef(Array.from({ length: 120 }, () => 0));
  const breathingBufferRef = useRef(Array.from({ length: 120 }, () => 0));
  const ghostPulseBufferRef = useRef(Array.from({ length: 120 }, () => 0));

  // Audio speech detection refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioLoopActiveRef = useRef(false);

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
    pressureMoments: [],
    startTime: null,
  });

  const sdkInstanceRef = useRef(null);
  const simulationIntervalRef = useRef(null);
  const breathHoldTimerRef = useRef(0);
  const nudgeCooldownRef = useRef(0);
  const durationCounterRef = useRef(0);
  const stressSurgeRef = useRef(0);

  // Mutable ref to current metrics to avoid interval tearing & stale closures
  const latestMetricsRef = useRef({
    liveBpm: 72,
    liveBreathRate: 15,
    eyeContactScore: 88,
    isSpeaking: false,
    currentExpression: 'neutral',
    rmssd: 0,
    hrvConfidence: 0,
  });

  // Attach Web Audio API to detect real microphone speech bursts
  const setupAudioDetection = (mediaStream) => {
    try {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(mediaStream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      audioLoopActiveRef.current = true;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudio = () => {
        if (!audioLoopActiveRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const isAudible = avg > 14;

        if (isAudible !== latestMetricsRef.current.isSpeaking) {
          setIsSpeaking(isAudible);
          latestMetricsRef.current.isSpeaking = isAudible;
        }

        requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.warn('Microphone audio cadence monitoring unavailable:', err);
    }
  };

  // Initialize SmartSpectra SDK or Fallback Simulation
  useEffect(() => {
    let isCancelled = false;

    async function initSdk() {
      // First, acquire camera + microphone stream
      let userStream = null;
      try {
        userStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
        if (!isCancelled) {
          setStream(userStream);
          setupAudioDetection(userStream);
        }
      } catch {
        try {
          userStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          if (!isCancelled) setStream(userStream);
        } catch (camErr) {
          console.warn('Camera access error:', camErr);
        }
      }

      console.log(
        '[PitchPulse] Initializing sensing pipeline. apiKey present:',
        Boolean(apiKey && apiKey.trim().length > 5),
      );

      if (apiKey && apiKey.trim().length > 5) {
        const modules = await getSdkModules();
        if (modules && modules.SmartSpectraSDK && !isCancelled) {
          try {
            setSensingMode('calibrating');
            const {
              SmartSpectraSDK,
              cardioMetrics,
              breathingMetrics,
              faceMetrics,
              decodeMetrics,
            } = modules;

            const sdk = new SmartSpectraSDK({
              apiKey: apiKey.trim(),
              enableTelemetry: Boolean(enableTelemetry),
              requestedMetrics: [
                ...cardioMetrics,
                ...breathingMetrics,
                ...faceMetrics,
              ],
            });
            sdkInstanceRef.current = sdk;

            if (userStream) {
              sdk.useMediaStream(userStream);
            } else {
              sdk.on('streamAvailable', (mediaStream) => {
                if (!isCancelled) {
                  setStream(mediaStream);
                  setupAudioDetection(mediaStream);
                }
              });
            }

            sdk.on('validationStatus', (_code, _ts, hint) => {
              if (!isCancelled) setValidationHint(hint || '');
            });

            let calibCount = 0;
            const calibInterval = setInterval(() => {
              calibCount += 1;
              if (calibCount <= 20) {
                setCalibrationSec(calibCount);
              } else {
                clearInterval(calibInterval);
              }
            }, 1000);

            sdk.on('metrics', (buf) => {
              if (!decodeMetrics || isCancelled) return;
              try {
                const metrics = decodeMetrics(buf);
                processIncomingMetrics(metrics);
              } catch (err) {
                console.error(
                  'Error decoding SmartSpectra metrics buffer:',
                  err,
                );
              }
            });

            await sdk.start();
            console.log('SmartSpectra native FFI pipeline locked & streaming!');
            return;
          } catch (err) {
            console.warn(
              'SmartSpectra direct acquisition failed or offline. Starting organic simulator mode:',
              err,
            );
          }
        } else {
          console.warn(
            '[PitchPulse] SmartSpectraSDK class not found in loaded modules:',
            modules,
          );
        }
      } else {
        console.warn(
          '[PitchPulse] No valid apiKey provided to SessionScreen. Received:',
          apiKey,
        );
      }

      // If SDK direct start failed or no key provided, activate demo simulation mode
      setSensingMode('demo');
      startSimulator();
    }

    initSdk();

    return () => {
      isCancelled = true;
      audioLoopActiveRef.current = false;
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {}
      }
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

  // Ghost Take time-aligned historical replay loop (replays actual Take 1 pulseSamples in Live & Demo modes)
  useEffect(() => {
    if (!ghostTake) return;

    let ghostPhase = 0;
    let animId;
    let lastTime = performance.now();

    const updateGhostWave = (now) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Current elapsed second in Take 2 (or 0 before recording starts)
      const currentSec = durationCounterRef.current;
      const pulseSamples = ghostTake.pulseSamples || [];

      let historicalBpm = ghostTake.summary?.avgPulse || 72;
      if (pulseSamples.length > 0) {
        // Look up Take 1 sample aligned to current elapsed time
        const targetIdx = Math.min(
          Math.max(0, currentSec),
          pulseSamples.length - 1,
        );
        const sample = pulseSamples[targetIdx];
        if (sample != null) {
          historicalBpm = Math.round(
            typeof sample === 'object'
              ? (sample.value ?? sample.bpm ?? 72)
              : sample,
          );
        }
      }

      if (lastGhostBpmRef.current !== historicalBpm) {
        lastGhostBpmRef.current = historicalBpm;
        setGhostLiveBpm(historicalBpm);
      }

      // Physiological frequency matching Take 1's actual recorded heart rate at this second
      const freq = (historicalBpm / 60) * 4.2;
      ghostPhase += dt * freq * (Math.PI * 2);

      // Dual-harmonic arterial pulse waveform matching live oscilloscope styling
      const ghostPpg =
        Math.sin(ghostPhase) * 0.7 +
        Math.sin(ghostPhase * 2) * 0.28 +
        Math.sin(ghostPhase * 3) * 0.1;

      ghostPulseBufferRef.current.push(ghostPpg);
      if (ghostPulseBufferRef.current.length > 120) {
        ghostPulseBufferRef.current.shift();
      }

      animId = requestAnimationFrame(updateGhostWave);
    };

    animId = requestAnimationFrame(updateGhostWave);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [ghostTake]);

  // High-fidelity dynamic organic simulation for live biofeedback
  const startSimulator = () => {
    let phase = 0;
    let tickCount = 0;

    simulationIntervalRef.current = setInterval(() => {
      phase += 0.08;
      tickCount += 1;

      // 1. Dynamic cardiac PPG waveform (60fps canvas feed)
      const ppg = Math.sin(phase * 4.2) * 0.7 + Math.sin(phase * 8.4) * 0.3;
      pulseBufferRef.current.push(ppg);
      if (pulseBufferRef.current.length > 120) pulseBufferRef.current.shift();

      // 2. Dynamic respiratory waveform (60fps canvas feed)
      // Talking-gated: hold current baseline trace during vocalization to reject speech motion
      if (latestMetricsRef.current.isSpeaking) {
        const lastResp =
          breathingBufferRef.current[breathingBufferRef.current.length - 1] ??
          0;
        breathingBufferRef.current.push(lastResp);
      } else {
        const resp = Math.sin(phase * 0.85);
        breathingBufferRef.current.push(resp);
      }
      if (breathingBufferRef.current.length > 120)
        breathingBufferRef.current.shift();

      // Update React state at comfortable 500ms intervals (every 15 ticks) to avoid React render thrashing
      if (tickCount % 15 === 0) {
        // Natural respiratory sinus arrhythmia + stress surge decay
        const surge = stressSurgeRef.current;
        if (stressSurgeRef.current > 0) {
          stressSurgeRef.current = Math.max(0, stressSurgeRef.current - 1.2);
        }

        const simBpm = Math.round(
          72 +
            Math.sin(phase * 0.35) * 3 +
            (latestMetricsRef.current.isSpeaking ? 3 : 0) +
            surge,
        );
        const simBreath = Math.round(15 + Math.sin(phase * 0.2) * 2);

        // Modulating gaze drift
        const gazeDrift = Math.sin(phase * 0.18) * 5;
        const simEyeScore = Math.max(
          72,
          Math.min(96, Math.round(87 + gazeDrift)),
        );
        const simGazeCentered = Math.abs(gazeDrift) < 3.8;
        const simGazeOffset = {
          x: Math.round(gazeDrift * 2.2),
          y: Math.round(Math.cos(phase * 0.14) * 3),
        };

        setLiveBpm(simBpm);
        setLiveBreathRate(simBreath);
        setEyeContactScore(simEyeScore);
        setIsGazeCentered(simGazeCentered);
        setGazeOffset(simGazeOffset);

        latestMetricsRef.current.liveBpm = simBpm;
        latestMetricsRef.current.liveBreathRate = simBreath;
        latestMetricsRef.current.eyeContactScore = simEyeScore;
      }
    }, 33);
  };

  // Process live metrics decoded from SmartSpectra Protobuf
  const processIncomingMetrics = (metrics) => {
    // 1. Cardio (Pulse Rate, Arterial Pressure Trace, HRV)
    if (metrics.cardio) {
      if (metrics.cardio.pulseRate?.length > 0) {
        const last =
          metrics.cardio.pulseRate[metrics.cardio.pulseRate.length - 1];
        if (last?.value) {
          const bpm = Math.round(last.value);
          setLiveBpm(bpm);
          latestMetricsRef.current.liveBpm = bpm;
          if (last.confidence != null) {
            setCardioConfidence(Math.round(last.confidence));
          }
          setSensingMode('live');
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
        }
      }
    }

    // 2. Breathing (Talking-gated to respect optical rPPG model card constraints)
    if (metrics.breathing) {
      if (
        metrics.breathing.rate?.length > 0 &&
        !latestMetricsRef.current.isSpeaking
      ) {
        const lastB = metrics.breathing.rate[metrics.breathing.rate.length - 1];
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
        if (latestMetricsRef.current.isSpeaking) {
          // Model card constraint: hold baseline trace steady during vocalization to reject speech motion
          const lastVal =
            breathingBufferRef.current[breathingBufferRef.current.length - 1] ??
            0;
          for (let i = 0; i < metrics.breathing.upperTrace.length; i++) {
            breathingBufferRef.current.push(lastVal);
            if (breathingBufferRef.current.length > 120)
              breathingBufferRef.current.shift();
          }
        } else {
          metrics.breathing.upperTrace.forEach((bt) => {
            if (bt?.value != null) {
              breathingBufferRef.current.push(bt.value);
              if (breathingBufferRef.current.length > 120)
                breathingBufferRef.current.shift();
            }
          });
        }
      }
    }

    // 3. Face (Talking, Blinking, Expression, Landmarks)
    if (metrics.face) {
      if (metrics.face.talking?.length > 0) {
        const lastTalk = metrics.face.talking[metrics.face.talking.length - 1];
        const isTalk = Boolean(lastTalk?.detected);
        setIsSpeaking(isTalk);
        latestMetricsRef.current.isSpeaking = isTalk;
      }

      // Robust expression mapping from protobuf scores
      if (metrics.face.expression?.length > 0) {
        const exp = metrics.face.expression[metrics.face.expression.length - 1];
        if (exp?.scores?.length > 0) {
          let maxScore = exp.scores[0];
          for (const s of exp.scores) {
            if ((s.confidence || 0) > (maxScore.confidence || 0)) {
              maxScore = s;
            }
          }
          const EMOTION_MAP = {
            1: 'anger',
            2: 'contempt',
            3: 'disgust',
            4: 'fear',
            5: 'happiness',
            6: 'neutral',
            7: 'sadness',
            8: 'surprise',
          };
          const mapped = EMOTION_MAP[maxScore.type] || 'neutral';
          setCurrentExpression(mapped);
          latestMetricsRef.current.currentExpression = mapped;
        }
      }

      // Blinking detection
      const blinkingList = metrics.face.blinking || metrics.face.blink;
      if (blinkingList?.length > 0) {
        const lastBlink = blinkingList[blinkingList.length - 1];
        if (lastBlink?.detected) {
          sessionDataRef.current.blinkEvents.push({
            detected: true,
            timeSec: durationCounterRef.current,
          });
        }
      }

      // 468-point mesh landmarks for eye contact reticle
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

  // Mark Pressure Moment (Spacebar or Button)
  const markPressureMoment = () => {
    if (!isRecording || pressureMoment) return;
    const currentSec = durationCounterRef.current;
    const currentPulse = latestMetricsRef.current.liveBpm;

    // Calculate baseline from preceding samples
    const samples = sessionDataRef.current.pulseSamples;
    let base = currentPulse - 3;
    if (samples.length >= 3) {
      const recent = samples.slice(-10);
      base = Math.round(
        recent.reduce((a, b) => a + (b.value || b), 0) / recent.length,
      );
    }
    setBaselinePulse(base);

    const momentObj = {
      timeSec: currentSec,
      baselineBpm: base,
      peakBpm: currentPulse,
      recoverySec: null,
      status: 'active',
    };

    setPressureMoment(momentObj);
    sessionDataRef.current.pressureMoments.push(momentObj);

    // In demo mode, trigger simulated physiological stress response (+16 BPM surge)
    if (sensingMode === 'demo') {
      stressSurgeRef.current = 16;
    }

    triggerCoachingNudge(
      {
        category: 'pulse',
        icon: '⚡',
        text: 'Pressure Moment marked — tracking live heart rate response.',
      },
      currentSec,
    );
  };

  // Spacebar hotkey listener for instantaneous pressure moment marking
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && isRecording && !pressureMoment) {
        e.preventDefault();
        markPressureMoment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, pressureMoment]);

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

        // 2. Breath holding detection
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

        // 3. Track Pressure Moment Recovery Latency
        if (pressureMoment && pressureMoment.status === 'active') {
          const elapsed = newSec - pressureMoment.timeSec;
          const currentBpm = current.liveBpm;

          if (currentBpm > pressureMoment.peakBpm) {
            setPressureMoment((prev) =>
              prev ? { ...prev, peakBpm: currentBpm } : prev,
            );
          }

          // A true acute surge requires pulse to rise at least 3 BPM over baseline
          const hasSurged =
            pressureMoment.peakBpm >= pressureMoment.baselineBpm + 3;

          if (
            hasSurged &&
            elapsed >= 3 &&
            currentBpm <= pressureMoment.baselineBpm + 2
          ) {
            const recSec = elapsed;
            setPressureMoment((prev) =>
              prev
                ? { ...prev, recoverySec: recSec, status: 'recovered' }
                : prev,
            );
            if (sessionDataRef.current.pressureMoments.length > 0) {
              sessionDataRef.current.pressureMoments[0].recoverySec = recSec;
              sessionDataRef.current.pressureMoments[0].peakBpm =
                pressureMoment.peakBpm;
            }
            triggerCoachingNudge(
              {
                category: 'positive',
                icon: '✅',
                text: `Heart rate returned to baseline in ${recSec}s.`,
              },
              newSec,
            );
          } else if (!hasSurged && elapsed >= 8) {
            // Pulse remained steady at baseline throughout the pressure window
            setPressureMoment((prev) =>
              prev ? { ...prev, recoverySec: null, status: 'steady' } : prev,
            );
            if (sessionDataRef.current.pressureMoments.length > 0) {
              sessionDataRef.current.pressureMoments[0].status = 'steady';
              sessionDataRef.current.pressureMoments[0].recoverySec = null;
            }
          }
        }

        // 4. Contextual Coaching Nudge triggers
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
          } else if (
            current.liveBpm > 98 &&
            (!pressureMoment || pressureMoment.status !== 'active')
          ) {
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
          }
        }

        // 5. Update UI duration display
        setRecordDurationSec(newSec);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording, pressureMoment]);

  const startActualRecording = () => {
    durationCounterRef.current = 0;
    stressSurgeRef.current = 0;
    setPressureMoment(null);
    setBaselinePulse(latestMetricsRef.current.liveBpm || 72);
    sessionDataRef.current = {
      pulseSamples: [],
      breathingSamples: [],
      hrvSamples: [],
      speakingEvents: [],
      blinkEvents: [],
      expressionHistory: [],
      eyeContactScores: [],
      coachingMoments: [],
      pressureMoments: [],
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
    const summary = calculateSessionSummary(
      {
        ...sessionDataRef.current,
        durationSec: durationCounterRef.current || 15,
      },
      ghostTake,
    );

    const fullSession = {
      id: Date.now(),
      timestamp: Date.now(),
      isDemoMode: sensingMode === 'demo',
      sensingMode,
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
              {sensingMode === 'live' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                  ● Presage SmartSpectra SDK
                </span>
              )}
              {sensingMode === 'calibrating' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 border border-sky-500/40 text-sky-400">
                  ⏳ Calibrating SDK Baseline
                </span>
              )}
              {sensingMode === 'demo' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-400">
                  ⚠️ Demo Mode (No Live Key)
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">
              Contactless Biometric Presentation Coach
            </p>
          </div>
        </div>

        {ghostTake && (
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 text-xs font-semibold shadow-lg">
            <span>
              👻 Ghost Take: Comparing vs Take 1 (
              {ghostTake.isDemoMode ? 'Demo Run' : 'Live SDK'} •{' '}
              {ghostLiveBpm || ghostTake.summary?.avgPulse || 72} BPM)
            </span>
            {ghostTake.isDemoMode && sensingMode === 'live' && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-500/40 text-amber-300">
                Mixed Demo Comparison
              </span>
            )}
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

      {/* Main Studio Grid: Narrowed, Readable 3-Signal Cockpit */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Area: Camera Preview & Tactical Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-[380px]">
          <div className="flex-1 relative rounded-3xl overflow-hidden min-h-[360px]">
            <CameraPreview
              stream={stream}
              validationHint={validationHint}
              currentExpression={currentExpression}
              isSpeaking={isSpeaking}
              isRecording={isRecording}
              activeNudge={activeNudge}
              sensingMode={sensingMode}
              cardioConfidence={cardioConfidence}
              calibrationSec={calibrationSec}
              pressureMoment={pressureMoment}
              onMarkPressureMoment={markPressureMoment}
            />
          </div>
        </div>

        {/* Right Area: The 3 Readable Signals (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-3 min-h-0 justify-between">
          {/* Signal 1: Cardiac & Autonomic Recovery */}
          <div className="flex-1 min-h-[145px]">
            <PulseCanvas
              bufferRef={pulseBufferRef}
              ghostBufferRef={ghostTake ? ghostPulseBufferRef : null}
              ghostAvgBpm={ghostLiveBpm || ghostTake?.summary?.avgPulse}
              liveBpm={liveBpm}
              isRecording={isRecording}
              pressureMoment={pressureMoment}
              restingBaselineBpm={baselinePulse}
            />
          </div>

          {/* Signal 2: Audience Gaze Focus */}
          <div className="min-h-[155px]">
            <EyeContactMeter
              score={eyeContactScore}
              isCentered={isGazeCentered}
              gazeOffset={gazeOffset}
            />
          </div>

          {/* Signal 3: Breath Pacing & Rhythm */}
          <div className="flex-1 min-h-[145px]">
            <BreathingCanvas
              bufferRef={breathingBufferRef}
              liveRate={liveBreathRate}
              isBreathHolding={isBreathHolding}
              isSpeaking={isSpeaking}
            />
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
                {pressureMoment
                  ? '⚡ Tracking Recovery'
                  : 'Capturing Biometric Telemetry'}
              </span>
            </div>
          ) : (
            <div className="text-xs flex items-center gap-2">
              {sensingMode === 'live' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300 font-medium">
                    SmartSpectra SDK Active — Contactless Camera Vitals Ready
                  </span>
                </>
              )}
              {sensingMode === 'calibrating' && (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sky-300 font-medium">
                    Calibrating Physiological Baseline ({calibrationSec}s / 20s)
                  </span>
                </>
              )}
              {sensingMode === 'demo' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-amber-300 font-medium">
                    Demo Mode Active — Enter SmartSpectra API Key in Settings
                    for Live Sensing
                  </span>
                </>
              )}
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
