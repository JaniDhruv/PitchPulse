import { METRIC_WEIGHTS, NORMAL_RANGES } from './constants';

/**
 * Calculate instantaneous composure score with HRV warm-up fallback.
 * Prevents 0/null scores on practice pitches under 60 seconds.
 */
export function calculateLiveComposure({
  _pulseRate = 75,
  pulseHistory = [],
  breathingRate = 15,
  _breathingHistory = [],
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
    const variance =
      recent.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      recent.length;
    const stdDev = Math.sqrt(variance);
    // stdDev of 0-2 bpm is extremely calm (95-100), >10 bpm is nervous (40-60)
    pulseStability = Math.max(30, Math.min(100, 100 - stdDev * 6));
  }

  // 2. Breathing Cadence Stability
  let breathStability = 75;
  if (
    breathingRate >= NORMAL_RANGES.breathingRate.idealMin &&
    breathingRate <= NORMAL_RANGES.breathingRate.idealMax
  ) {
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
  const facialCalm = Math.max(
    20,
    Math.min(100, Math.round((1 - tension) * 100)),
  );

  // Hybrid Composite for t < 60s
  const preHrvComposure = Math.round(
    pulseStability * 0.4 + breathStability * 0.3 + facialCalm * 0.3,
  );

  // If HRV confidence is valid (typically after 60s window)
  const isHrvLocked = Boolean(
    hrvConfidence >= 40 && durationSec >= 50 && rmssd > 0,
  );

  if (!isHrvLocked) {
    return {
      score: preHrvComposure,
      isHrvLocked: false,
      breakdown: {
        pulseStability,
        breathStability,
        facialCalm,
        hrvScore: null,
      },
    };
  }

  // Map RMSSD to 0-100 (normal resting RMSSD is 25-70ms)
  const hrvScore = Math.max(
    20,
    Math.min(100, Math.round(((rmssd - 15) / 55) * 100)),
  );

  // Blend transition over 5 seconds
  const blendFactor = Math.min(1, (durationSec - 50) / 10);
  const finalComposure = Math.round(
    preHrvComposure * (1 - blendFactor) + hrvScore * blendFactor,
  );

  return {
    score: Math.max(0, Math.min(100, finalComposure)),
    isHrvLocked: true,
    breakdown: { pulseStability, breathStability, facialCalm, hrvScore },
  };
}

/**
 * Calculate eye contact score from iris and face landmarks.
 * Landmarks contain 478 points. We estimate gaze vector centering.
 */
export function calculateEyeContactScore(landmarks) {
  if (!landmarks || landmarks.length === 0) {
    return { score: 85, isCentered: true, gazeOffset: { x: 0, y: 0 } };
  }

  try {
    // SmartSpectra ILandmarks has `value?: IPoint2dFloat[]`
    const lastItem = landmarks[landmarks.length - 1] || landmarks[0];
    const pts =
      lastItem?.value ||
      lastItem?.landmark ||
      (Array.isArray(landmarks[0]) ? landmarks[0] : landmarks);
    if (!pts || !Array.isArray(pts) || pts.length < 10) {
      return { score: 85, isCentered: true, gazeOffset: { x: 0, y: 0 } };
    }

    // MediaPipe / SmartSpectra 468-point mesh:
    // Nose tip ~ 4, Forehead ~ 10, Chin ~ 152, Left cheek ~ 234, Right cheek ~ 454
    const nose = pts[4] || pts[1] || pts[0];
    const leftCheek = pts[234] || pts[0];
    const rightCheek = pts[454] || pts[pts.length - 1];
    const forehead = pts[10];
    const chin = pts[152];

    if (nose && leftCheek && rightCheek) {
      const faceWidth = Math.abs((rightCheek.x || 0) - (leftCheek.x || 0)) || 1;
      const faceMidX = ((leftCheek.x || 0) + (rightCheek.x || 0)) / 2;
      const yawOffset = ((nose.x || 0) - faceMidX) / faceWidth; // 0 = centered

      let pitchOffset = 0;
      if (forehead && chin) {
        const faceHeight = Math.abs((chin.y || 0) - (forehead.y || 0)) || 1;
        const faceMidY = ((chin.y || 0) + (forehead.y || 0)) / 2;
        pitchOffset = ((nose.y || 0) - faceMidY) / faceHeight;
      }

      const isCentered =
        Math.abs(yawOffset) < 0.12 && Math.abs(pitchOffset) < 0.15;
      const penalty = Math.min(
        1,
        Math.hypot(yawOffset / 0.35, pitchOffset / 0.35),
      );
      const score = Math.round(100 - penalty * 65);

      return {
        score: Math.max(20, Math.min(100, score)),
        isCentered,
        gazeOffset: {
          x: Math.round(yawOffset * 85),
          y: Math.round(pitchOffset * 85),
        },
      };
    }
  } catch {
    // Fallback if landmark schema varies
  }

  return { score: 85, isCentered: true, gazeOffset: { x: 0, y: 0 } };
}

/**
 * Generate comprehensive post-session evaluation & recommendations
 */
export function calculateSessionSummary(sessionMetrics, ghostTake = null) {
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
  const avgEyeContact =
    eyeContactScores.length > 0
      ? Math.round(
          eyeContactScores.reduce((a, b) => a + b, 0) / eyeContactScores.length,
        )
      : 80;

  // 2. Composure
  const finalHrv =
    hrvSamples.length > 0 ? hrvSamples[hrvSamples.length - 1] : 0;
  const pulseVals = pulseSamples.map((p) => p.value || p);
  const avgPulse =
    pulseVals.length > 0
      ? Math.round(pulseVals.reduce((a, b) => a + b, 0) / pulseVals.length)
      : 72;

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
  speakingEvents.forEach((e) => {
    if (e.talking) totalSpeakingSec += (e.durationMs || 100) / 1000;
    if (e.pauseSec && e.pauseSec > NORMAL_RANGES.maxSilentPauseSec)
      pauseCount++;
  });
  const talkRatio = durationSec > 0 ? totalSpeakingSec / durationSec : 0.7;
  let speakingScore = 85;
  if (
    talkRatio >= NORMAL_RANGES.talkRatio.idealMin &&
    talkRatio <= NORMAL_RANGES.talkRatio.idealMax
  ) {
    speakingScore = 95;
  } else if (talkRatio < 0.45) {
    speakingScore = 60; // Too hesitant
  } else if (talkRatio > 0.9) {
    speakingScore = 65; // Rushing with no breath pauses
  }
  speakingScore = Math.max(30, speakingScore - pauseCount * 6);

  // 4. Breath Control
  const breathVals = breathingSamples.map((b) => b.value || b);
  const avgBreath =
    breathVals.length > 0
      ? Math.round(breathVals.reduce((a, b) => a + b, 0) / breathVals.length)
      : 15;
  let breathScore = 80;
  if (
    avgBreath >= NORMAL_RANGES.breathingRate.idealMin &&
    avgBreath <= NORMAL_RANGES.breathingRate.idealMax
  ) {
    breathScore = 90;
  } else {
    breathScore = 70;
  }

  // 5. Expression Score
  let confidenceTime = 0;
  let tenseTime = 0;
  expressionHistory.forEach((exp) => {
    if (exp.category === 'happiness' || exp.category === 'neutral')
      confidenceTime++;
    if (
      exp.category === 'fear' ||
      exp.category === 'anger' ||
      exp.category === 'disgust'
    )
      tenseTime++;
  });
  const totalExp = expressionHistory.length || 1;
  const expressionScore = Math.round(
    Math.max(
      30,
      Math.min(
        100,
        (confidenceTime / totalExp) * 100 - (tenseTime / totalExp) * 40,
      ),
    ),
  );

  // 6. Blink Naturalness
  const totalBlinks = blinkEvents.filter((b) => b.detected).length;
  const blinksPerMin = durationSec > 0 ? totalBlinks / (durationSec / 60) : 14;
  let blinkScore = 85;
  if (
    blinksPerMin >= NORMAL_RANGES.blinkRatePerMin.min &&
    blinksPerMin <= NORMAL_RANGES.blinkRatePerMin.max
  ) {
    blinkScore = 95;
  } else if (blinksPerMin < NORMAL_RANGES.blinkRatePerMin.lowStiffThreshold) {
    blinkScore = 65; // Staring/stiff
  } else if (
    blinksPerMin > NORMAL_RANGES.blinkRatePerMin.highAnxietyThreshold
  ) {
    blinkScore = 60; // Fluttering/anxious
  }

  // Overall Weighted Score
  const overallScore = Math.round(
    avgEyeContact * METRIC_WEIGHTS.eyeContact +
      composureScore * METRIC_WEIGHTS.composure +
      speakingScore * METRIC_WEIGHTS.speakingPace +
      breathScore * METRIC_WEIGHTS.breathControl +
      expressionScore * METRIC_WEIGHTS.expression +
      blinkScore * METRIC_WEIGHTS.blinkNaturalness,
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
    tips.push(
      'Keep head and gaze oriented toward the camera lens to maintain audience connection rather than looking down.',
    );
  }
  if (pauseCount > 0) {
    tips.push(
      `Detected ${pauseCount} extended pauses longer than 4.5 seconds. Practice bridging key transitions smoothly.`,
    );
  }
  if (talkRatio > 0.88) {
    tips.push(
      'Speaking pace was somewhat continuous. Consider building in 1-second deliberate pauses after key assertions.',
    );
  }
  if (blinksPerMin < 8) {
    tips.push(
      'Lower estimated blink cadence. Maintain natural blinking to prevent visual strain and facial stiffness.',
    );
  }
  if (avgPulse > 95) {
    tips.push(
      `Elevated heart rate (~${avgPulse} BPM). Taking two slow diaphragmatic breaths before speaking can help steady initial pulse.`,
    );
  }
  if (tips.length === 0) {
    tips.push(
      'Consistent pacing, camera-oriented gaze, and steady pulse stability observed throughout session.',
    );
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
    recoveryStats: calculateRecoveryStats(sessionMetrics, ghostTake),
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

/**
 * Calculate physiological recovery statistics around the "Pressure Moment".
 * Answers the competition hero question: "Did your recovery after the hard part improve?"
 * Never fabricates defaults when no real event occurred.
 */
export function calculateRecoveryStats(sessionMetrics = {}, ghostTake = null) {
  const {
    pulseSamples = [],
    pressureMoments = [],
    _durationSec = 60,
    eyeContactScores = [],
    isDemoMode = false,
  } = sessionMetrics;

  // 1. Identify primary pressure moment (user marked or acute pulse surge)
  let moment =
    pressureMoments && pressureMoments.length > 0 ? pressureMoments[0] : null;

  if (!moment && pulseSamples.length >= 8) {
    // Auto-detect acute pulse surge (minimum +5 BPM acceleration)
    let maxJump = 0;
    let maxIdx = 0;
    for (let i = 4; i < pulseSamples.length; i++) {
      const prev = pulseSamples[i - 4]?.value ?? pulseSamples[i - 4];
      const curr = pulseSamples[i]?.value ?? pulseSamples[i];
      const jump = curr - prev;
      if (jump > maxJump) {
        maxJump = jump;
        maxIdx = i;
      }
    }
    if (maxJump >= 5) {
      const timeSec = pulseSamples[maxIdx]?.timeSec ?? maxIdx;
      const baselineBpm = pulseSamples[Math.max(0, maxIdx - 4)]?.value ?? 72;
      moment = {
        timeSec,
        baselineBpm: Math.round(baselineBpm),
        peakBpm: pulseSamples[maxIdx]?.value ?? Math.round(baselineBpm),
        isAutoDetected: true,
      };
    }
  }

  // If no moment was marked and no acute surge occurred: NEVER invent defaults!
  if (!moment) {
    const avg =
      pulseSamples.length > 0
        ? Math.round(
            pulseSamples.reduce((a, b) => a + (b.value || b), 0) /
              pulseSamples.length,
          )
        : 74;
    return {
      hasPressureMoment: false,
      isAutoDetected: false,
      timeSec: null,
      baselineBpm: avg,
      peakBpm: avg,
      bpmSpike: 0,
      recoveryLatencySec: null,
      gazeRetentionPct: null,
      recoveryVerdict:
        'No measurable pressure moment captured. Mark difficult slides or Q&A moments with the spacebar during recording to evaluate recovery latency.',
      ghostComparisonDelta: null,
    };
  }

  const markSec = moment.timeSec;
  const baselineBpm = moment.baselineBpm || 72;
  // Start peak at the actual pulse at the mark second, never fabricate +6 BPM!
  let peakBpm = moment.peakBpm || baselineBpm;
  let recoveryLatencySec = moment.recoverySec || null;

  let gazeSum = 0;
  let gazeCount = 0;

  for (let i = 0; i < pulseSamples.length; i++) {
    const s = pulseSamples[i];
    const t = s.timeSec ?? i;
    const val = s.value ?? s;

    if (t >= markSec) {
      if (val > peakBpm) peakBpm = val;
      // Only compute recovery latency if an actual spike (at least +3 BPM over baseline) occurred
      if (
        !recoveryLatencySec &&
        t >= markSec + 3 &&
        peakBpm >= baselineBpm + 3 &&
        val <= baselineBpm + 2
      ) {
        recoveryLatencySec = t - markSec;
      }
      // Gaze during acute recovery window (10s post-moment)
      if (t <= markSec + 10 && eyeContactScores[i] != null) {
        gazeSum += eyeContactScores[i];
        gazeCount++;
      }
    }
  }

  const bpmSpike = Math.max(0, peakBpm - baselineBpm);
  const gazeRetentionPct =
    gazeCount > 0 ? Math.round(gazeSum / gazeCount) : null;

  let verdict = '';
  if (bpmSpike < 3) {
    // Pulse stayed steady at baseline
    recoveryLatencySec = null;
    verdict = `Heart rate remained steady at baseline (${baselineBpm} BPM)—no acute cardiac surge detected.`;
  } else if (recoveryLatencySec && recoveryLatencySec <= 10) {
    verdict = `Prompt return to baseline pulse (${recoveryLatencySec}s) after +${bpmSpike} BPM surge.`;
  } else if (recoveryLatencySec && recoveryLatencySec <= 18) {
    verdict = `Moderate return to baseline (${recoveryLatencySec}s) after +${bpmSpike} BPM surge.`;
  } else if (recoveryLatencySec) {
    verdict = `Extended recovery latency (${recoveryLatencySec}s) following acute pulse elevation (+${bpmSpike} BPM).`;
  } else {
    verdict = `Pulse elevated (+${bpmSpike} BPM) during pressure moment; pitch concluded before return to baseline.`;
  }

  // Ghost comparison delta and provenance tracking
  let ghostComparisonDelta = null;
  const ghostStats = ghostTake?.summary?.recoveryStats;
  if (ghostStats && ghostStats.hasPressureMoment) {
    const ghostRecSec = ghostStats.recoveryLatencySec;
    const take1IsDemo = Boolean(ghostTake?.isDemoMode);
    const take2IsDemo = Boolean(isDemoMode);
    const isMixedProvenance = take1IsDemo !== take2IsDemo;
    const isSyntheticProvenance = take1IsDemo || take2IsDemo;

    let provenanceLabel = 'Live Hardware Verified';
    if (isMixedProvenance) {
      provenanceLabel = `Mixed Provenance (Take 1: ${take1IsDemo ? 'Demo' : 'Live'}, Take 2: ${take2IsDemo ? 'Demo' : 'Live'})`;
    } else if (isSyntheticProvenance) {
      provenanceLabel = 'Synthetic Demo Comparison';
    }

    if (ghostRecSec != null && recoveryLatencySec != null) {
      const deltaSec = ghostRecSec - recoveryLatencySec;
      const ghostSpike = ghostStats.bpmSpike || 0;
      const deltaSpike = ghostSpike - bpmSpike;

      ghostComparisonDelta = {
        take1RecoverySec: ghostRecSec,
        take2RecoverySec: recoveryLatencySec,
        recoveryDeltaSec: deltaSec,
        improved: deltaSec > 0,
        take1Spike: ghostSpike,
        take2Spike: bpmSpike,
        spikeDelta: deltaSpike,
        isSyntheticProvenance,
        isMixedProvenance,
        provenanceLabel,
        summaryText:
          deltaSec > 0
            ? `${deltaSec}s faster return to baseline than Take 1`
            : `Recovery latency was comparable to Take 1 (${recoveryLatencySec}s)`,
      };
    } else {
      ghostComparisonDelta = {
        take1RecoverySec: ghostRecSec,
        take2RecoverySec: recoveryLatencySec,
        recoveryDeltaSec: null,
        improved: false,
        take1Spike: ghostStats.bpmSpike || 0,
        take2Spike: bpmSpike,
        spikeDelta: 0,
        isSyntheticProvenance,
        isMixedProvenance,
        provenanceLabel,
        summaryText:
          bpmSpike < 3
            ? 'Pulse remained steady without acute surge.'
            : 'Cardiac surge observed during pressure moment.',
      };
    }
  }

  return {
    hasPressureMoment: Boolean(
      moment && (bpmSpike >= 3 || !moment.isAutoDetected),
    ),
    isAutoDetected: Boolean(moment.isAutoDetected),
    timeSec: markSec,
    baselineBpm,
    peakBpm,
    bpmSpike,
    recoveryLatencySec,
    gazeRetentionPct,
    recoveryVerdict: verdict,
    ghostComparisonDelta,
  };
}
