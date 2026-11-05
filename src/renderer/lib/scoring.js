import { METRIC_WEIGHTS, NORMAL_RANGES } from './constants';

/**
 * Calculate instantaneous composure score with HRV warm-up fallback.
 * Prevents 0/null scores on practice pitches under 60 seconds.
 */
export function calculateLiveComposure({
  pulseRate = 75,
  pulseHistory = [],
  breathingRate = 15,
  breathingHistory = [],
  expressions = {},
  rmssd = 0,
  hrvConfidence = 0,
  durationSec = 0,
}) {
  // 1. Pulse Stability (lower variance = calmer heart rate)
  let pulseStability = 80;
  if (pulseHistory.length >= 5) {
    const recent = pulseHistory.slice(-15);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / recent.length;
    const stdDev = Math.sqrt(variance);
    // stdDev of 0-2 bpm is extremely calm (95-100), >10 bpm is nervous (40-60)
    pulseStability = Math.max(30, Math.min(100, 100 - stdDev * 6));
  }

  // 2. Breathing Cadence Stability
  let breathStability = 75;
  if (breathingRate >= NORMAL_RANGES.breathingRate.idealMin && breathingRate <= NORMAL_RANGES.breathingRate.idealMax) {
    breathStability = 90;
  } else if (breathingRate > 24 || breathingRate < 8) {
    breathStability = 45;
  } else {
    breathStability = 70;
  }

  // 3. Facial Calm (1 - negative tension emotions)
  const fear = expressions.fear || 0;
  const anger = expressions.anger || 0;
  const disgust = expressions.disgust || 0;
  const tension = Math.max(fear, anger, disgust);
  const facialCalm = Math.max(20, Math.min(100, Math.round((1 - tension) * 100)));

  // Hybrid Composite for t < 60s
  const preHrvComposure = Math.round(
    pulseStability * 0.40 +
    breathStability * 0.30 +
    facialCalm * 0.30
  );

  // If HRV confidence is valid (typically after 60s window)
  const isHrvLocked = Boolean(hrvConfidence >= 40 && durationSec >= 50 && rmssd > 0);

  if (!isHrvLocked) {
    return {
      score: preHrvComposure,
      isHrvLocked: false,
      breakdown: { pulseStability, breathStability, facialCalm, hrvScore: null }
    };
  }

  // Map RMSSD to 0-100 (normal resting RMSSD is 25-70ms)
  const hrvScore = Math.max(20, Math.min(100, Math.round(((rmssd - 15) / 55) * 100)));

  // Blend transition over 5 seconds
  const blendFactor = Math.min(1, (durationSec - 50) / 10);
  const finalComposure = Math.round(preHrvComposure * (1 - blendFactor) + hrvScore * blendFactor);

  return {
    score: Math.max(0, Math.min(100, finalComposure)),
    isHrvLocked: true,
    breakdown: { pulseStability, breathStability, facialCalm, hrvScore }
  };
}

/**
 * Calculate eye contact score from iris and face landmarks.
 * Landmarks contain 478 points. We estimate gaze vector centering.
 */
export function calculateEyeContactScore(landmarks) {
  if (!landmarks || landmarks.length === 0) {
    return { score: 70, isCentered: true, gazeOffset: { x: 0, y: 0 } };
  }

  try {
    // Left eye center ~ point 468, Right eye center ~ point 473 (Iris centers in Mediapipe/SmartSpectra mesh)
    // Nose tip ~ point 4, Forehead ~ 10, Chin ~ 152
    const pts = landmarks[0]?.landmark || landmarks;
    if (!pts || pts.length < 10) return { score: 75, isCentered: true, gazeOffset: { x: 0, y: 0 } };

    const nose = pts[4] || pts[1];
    const leftCheek = pts[234] || pts[0];
    const rightCheek = pts[454] || pts[pts.length - 1];

    if (nose && leftCheek && rightCheek) {
      const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
      const faceMidX = (leftCheek.x + rightCheek.x) / 2;
      const yawOffset = (nose.x - faceMidX) / (faceWidth || 1); // 0 = looking straight

      const isCentered = Math.abs(yawOffset) < 0.12;
      const penalty = Math.min(1, Math.abs(yawOffset) / 0.35);
      const score = Math.round(100 - penalty * 60);

      return {
        score: Math.max(20, Math.min(100, score)),
        isCentered,
        gazeOffset: { x: Math.round(yawOffset * 100), y: 0 },
      };
    }
  } catch {
    // Fallback if landmark parsing encounters alternate schema
  }

  return { score: 80, isCentered: true, gazeOffset: { x: 0, y: 0 } };
}

/**
 * Generate comprehensive post-session evaluation & recommendations
 */
export function calculateSessionSummary(sessionMetrics) {
  const {
    durationSec = 0,
    pulseSamples = [],
    breathingSamples = [],
    hrvSamples = [],
    speakingEvents = [],
    blinkEvents = [],
    expressionHistory = [],
    eyeContactScores = [],
  } = sessionMetrics;

  // 1. Eye Contact
  const avgEyeContact = eyeContactScores.length > 0
    ? Math.round(eyeContactScores.reduce((a, b) => a + b, 0) / eyeContactScores.length)
    : 80;

  // 2. Composure
  const finalHrv = hrvSamples.length > 0 ? hrvSamples[hrvSamples.length - 1] : 0;
  const pulseVals = pulseSamples.map(p => p.value || p);
  const avgPulse = pulseVals.length > 0 ? Math.round(pulseVals.reduce((a, b) => a + b, 0) / pulseVals.length) : 72;

  const liveComp = calculateLiveComposure({
    pulseRate: avgPulse,
    pulseHistory: pulseVals,
    breathingRate: 15,
    rmssd: finalHrv,
    hrvConfidence: finalHrv > 0 ? 55 : 0,
    durationSec,
  });
  const composureScore = liveComp.score;

  // 3. Speaking Pace
  let totalSpeakingSec = 0;
  let pauseCount = 0;
  speakingEvents.forEach(e => {
    if (e.talking) totalSpeakingSec += (e.durationMs || 100) / 1000;
    if (e.pauseSec && e.pauseSec > NORMAL_RANGES.maxSilentPauseSec) pauseCount++;
  });
  const talkRatio = durationSec > 0 ? totalSpeakingSec / durationSec : 0.7;
  let speakingScore = 85;
  if (talkRatio >= NORMAL_RANGES.talkRatio.idealMin && talkRatio <= NORMAL_RANGES.talkRatio.idealMax) {
    speakingScore = 95;
  } else if (talkRatio < 0.45) {
    speakingScore = 60; // Too hesitant
  } else if (talkRatio > 0.90) {
    speakingScore = 65; // Rushing with no breath pauses
  }
  speakingScore = Math.max(30, speakingScore - pauseCount * 6);

  // 4. Breath Control
  const breathVals = breathingSamples.map(b => b.value || b);
  const avgBreath = breathVals.length > 0 ? Math.round(breathVals.reduce((a, b) => a + b, 0) / breathVals.length) : 15;
  let breathScore = 80;
  if (avgBreath >= NORMAL_RANGES.breathingRate.idealMin && avgBreath <= NORMAL_RANGES.breathingRate.idealMax) {
    breathScore = 90;
  } else {
    breathScore = 70;
  }

  // 5. Expression Score
  let confidenceTime = 0;
  let tenseTime = 0;
  expressionHistory.forEach(exp => {
    if (exp.category === 'happiness' || exp.category === 'neutral') confidenceTime++;
    if (exp.category === 'fear' || exp.category === 'anger' || exp.category === 'disgust') tenseTime++;
  });
  const totalExp = expressionHistory.length || 1;
  const expressionScore = Math.round(Math.max(30, Math.min(100, (confidenceTime / totalExp) * 100 - (tenseTime / totalExp) * 40)));

  // 6. Blink Naturalness
  const totalBlinks = blinkEvents.filter(b => b.detected).length;
  const blinksPerMin = durationSec > 0 ? (totalBlinks / (durationSec / 60)) : 14;
  let blinkScore = 85;
  if (blinksPerMin >= NORMAL_RANGES.blinkRatePerMin.min && blinksPerMin <= NORMAL_RANGES.blinkRatePerMin.max) {
    blinkScore = 95;
  } else if (blinksPerMin < NORMAL_RANGES.blinkRatePerMin.lowStiffThreshold) {
    blinkScore = 65; // Staring/stiff
  } else if (blinksPerMin > NORMAL_RANGES.blinkRatePerMin.highAnxietyThreshold) {
    blinkScore = 60; // Fluttering/anxious
  }

  // Overall Weighted Score
  const overallScore = Math.round(
    avgEyeContact * METRIC_WEIGHTS.eyeContact +
    composureScore * METRIC_WEIGHTS.composure +
    speakingScore * METRIC_WEIGHTS.speakingPace +
    breathScore * METRIC_WEIGHTS.breathControl +
    expressionScore * METRIC_WEIGHTS.expression +
    blinkScore * METRIC_WEIGHTS.blinkNaturalness
  );

  let grade = 'B';
  if (overallScore >= 92) grade = 'A+';
  else if (overallScore >= 85) grade = 'A';
  else if (overallScore >= 78) grade = 'B+';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 60) grade = 'C';
  else grade = 'Needs Practice';

  // Actionable Personalized Tips
  const tips = [];
  if (avgEyeContact < 75) {
    tips.push('Maintain direct eye contact with the lens rather than looking down at presentation notes.');
  }
  if (pauseCount > 0) {
    tips.push(`Detected ${pauseCount} awkward pauses longer than 4.5 seconds. Practice linking thoughts smoothly.`);
  }
  if (talkRatio > 0.88) {
    tips.push('Speaking speed was slightly rushed. Build in 1-second strategic pauses after key points.');
  }
  if (blinksPerMin < 8) {
    tips.push('Low blink rate detected — you may be freezing or staring stiffly. Keep facial muscles relaxed.');
  }
  if (avgPulse > 95) {
    tips.push(`Elevated heart rate (~${avgPulse} BPM). Try taking two deep abdominal breaths before launching into your pitch.`);
  }
  if (tips.length === 0) {
    tips.push('Excellent delivery! Strong eye contact, steady physiological control, and natural cadence throughout.');
  }

  return {
    overallScore,
    grade,
    durationSec,
    avgPulse,
    avgBreath,
    blinksPerMin: Math.round(blinksPerMin),
    talkRatio: Math.round(talkRatio * 100),
    isHrvLocked: liveComp.isHrvLocked,
    subScores: {
      eyeContact: avgEyeContact,
      composure: composureScore,
      speakingPace: speakingScore,
      breathControl: breathScore,
      expression: expressionScore,
      blinkNaturalness: blinkScore,
    },
    tips,
  };
}

