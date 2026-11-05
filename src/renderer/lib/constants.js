// PitchPulse Constants & Metric Thresholds

export const METRIC_WEIGHTS = {
  eyeContact: 0.25,
  composure: 0.25,
  speakingPace: 0.20,
  breathControl: 0.15,
  expression: 0.10,
  blinkNaturalness: 0.05,
};

export const NORMAL_RANGES = {
  pulseRate: { min: 60, max: 100, idealMin: 65, idealMax: 85 },
  breathingRate: { min: 10, max: 24, idealMin: 12, idealMax: 18 },
  blinkRatePerMin: { min: 10, max: 24, lowStiffThreshold: 6, highAnxietyThreshold: 28 },
  talkRatio: { idealMin: 0.60, idealMax: 0.80 },
  maxSilentPauseSec: 4.5,
  maxBreathHoldSec: 7.0,
};

export const EMOTIONS = {
  neutral: { label: 'Composed', color: '#38bdf8', icon: '😐' },
  happiness: { label: 'Warm & Confident', color: '#4ade80', icon: '😊' },
  surprise: { label: 'Animated', color: '#facc15', icon: '😲' },
  anger: { label: 'Tense / Stern', color: '#f87171', icon: '😠' },
  sadness: { label: 'Subdued', color: '#94a3b8', icon: '😔' },
  fear: { label: 'Anxious', color: '#fb923c', icon: '😨' },
  disgust: { label: 'Strained', color: '#e879f9', icon: '😣' },
  contempt: { label: 'Skeptical', color: '#a78bfa', icon: '😏' },
};

export const CONSENT_POLICY = {
  cameraUsage: 'Local camera frames are processed entirely on-device by SmartSpectra native runtime. No video or raw imagery is ever saved or transmitted.',
  dataRetention: 'Only numerical telemetry (heart rate, breathing tempo, gaze vectors) is stored locally on your machine for session replay. You may delete past sessions at any time.',
  aiUsage: 'No external third-party AI or cloud LLM receives biometric data.',
  disclaimer: 'PitchPulse is an educational practice and wellness tool for presentation coaching. It does not provide medical diagnosis, treatment, or clinical assessment.',
};

