import React, { useEffect, useRef } from 'react';
import { Wind, Mic } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

/**
 * High-performance 60 FPS HTML5 Canvas for real-time respiratory movement traces.
 * Features DPI-aware high-fidelity rendering, optimal breathing zone corridor,
 * dynamic slope tracking, and speech-gated baseline indicators.
 */
export default function BreathingCanvas({
  bufferRef,
  isBreathHolding = false,
  liveRate = 14,
  isSpeaking = false,
}) {
  const canvasRef = useRef(null);
  const animatedRate = useAnimatedValue(liveRate, { speed: 0.12 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.clientWidth || 400;
      const height = canvas.clientHeight || 120;

      const targetW = Math.round(width * dpr);
      const targetH = Math.round(height * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep dark background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal baseline & optimal breathing corridor
      ctx.fillStyle = 'rgba(52, 211, 153, 0.04)';
      ctx.fillRect(0, height * 0.25, width, height * 0.5);

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      const buffer = bufferRef?.current || [];
      if (buffer.length > 1) {
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < buffer.length; i++) {
          const val = buffer[i];
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const range = max - min || 1;

        // Detect current breathing slope
        let slopeText = '● STEADY';
        let slopeColor = '#34d399';
        if (buffer.length >= 6) {
          const recentDelta = buffer[buffer.length - 1] - buffer[buffer.length - 6];
          if (recentDelta > 0.04) {
            slopeText = '▲ INHALE';
            slopeColor = '#38bdf8';
          } else if (recentDelta < -0.04) {
            slopeText = '▼ EXHALE';
            slopeColor = '#34d399';
          }
        }

        const strokeColor = isBreathHolding
          ? '#f87171'
          : isSpeaking
          ? '#38bdf8'
          : '#34d399';
        const step = width / (buffer.length - 1);

        // Fill area under curve
        ctx.beginPath();
        for (let i = 0; i < buffer.length; i++) {
          const x = i * step;
          const normY = (buffer[i] - min) / range;
          const y = height - (normY * (height * 0.68) + height * 0.16);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, height * 0.2, 0, height);
        if (isBreathHolding) {
          grad.addColorStop(0, 'rgba(248, 113, 113, 0.22)');
          grad.addColorStop(1, 'rgba(248, 113, 113, 0.0)');
        } else if (isSpeaking) {
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.2)');
          grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
        } else {
          grad.addColorStop(0, 'rgba(52, 211, 153, 0.22)');
          grad.addColorStop(1, 'rgba(52, 211, 153, 0.0)');
        }
        ctx.fillStyle = grad;
        ctx.fill();

        // Waveform stroke
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isSpeaking ? 2.0 : 2.4;
        if (isSpeaking) {
          ctx.setLineDash([5, 4]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        for (let i = 0; i < buffer.length; i++) {
          const x = i * step;
          const normY = (buffer[i] - min) / range;
          const y = height - (normY * (height * 0.68) + height * 0.16);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Lead indicator dot
        const lastX = width - 3;
        const lastNormY = (buffer[buffer.length - 1] - min) / range;
        const lastY = height - (lastNormY * (height * 0.68) + height * 0.16);

        ctx.fillStyle = isBreathHolding
          ? '#f87171'
          : isSpeaking
          ? '#38bdf8'
          : '#34d399';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Inhale/Exhale phase badge directly in the canvas corner
        if (!isSpeaking && !isBreathHolding) {
          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = slopeColor;
          ctx.fillText(slopeText, 14, height - 10);
        }
      } else {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [bufferRef, isBreathHolding, isSpeaking]);

  return (
    <div
      className={`relative w-full h-full bg-slate-900/90 rounded-2xl border ${
        isBreathHolding
          ? 'border-red-500/80 shadow-red-500/20 shadow-lg'
          : 'border-slate-800/80'
      } overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300`}
    >
      {/* Top Header */}
      <div className="absolute top-2.5 left-3.5 z-10 flex items-center space-x-2">
        <div
          className={`flex items-center justify-center w-5 h-5 rounded-full border ${
            isBreathHolding
              ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-ping'
              : isSpeaking
              ? 'bg-sky-500/20 border-sky-500/40 text-sky-400'
              : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse'
          }`}
        >
          <Wind className="w-3 h-3" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Respiratory Waveform
        </span>

        {isSpeaking ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/40 text-sky-300 font-medium flex items-center gap-1">
            <Mic className="w-2.5 h-2.5" /> Speech Gated
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-medium">
            Active rPPG Trace
          </span>
        )}
      </div>

      {/* Top Right Live Telemetry */}
      <div className="absolute top-2.5 right-3.5 z-10 flex items-baseline space-x-1.5">
        <span
          className={`text-2xl font-black font-mono tracking-tight ${
            isBreathHolding ? 'text-red-400' : 'text-emerald-400'
          }`}
        >
          {animatedRate || '--'}
        </span>
        <span className="text-xs text-slate-400 font-semibold uppercase">
          br/min
        </span>
      </div>

      {/* Alert Banner if breath holding */}
      {isBreathHolding && (
        <div className="absolute bottom-2.5 left-3.5 z-10 bg-red-950/90 border border-red-500/70 px-2.5 py-1 rounded-lg text-xs font-bold text-red-200 flex items-center gap-1.5 shadow-lg animate-bounce">
          <span>⚠️</span> Breath Holding Detected — Relax & Inhale
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
