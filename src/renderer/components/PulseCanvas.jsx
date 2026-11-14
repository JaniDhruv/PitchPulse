import React, { useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { useAnimatedValue } from '../hooks/useAnimatedValue';

/**
 * High-performance 60 FPS HTML5 Canvas for real-time PPG / arterial pulse waveforms.
 * Features dynamic cardiovascular gradient fills, lead ripple animations,
 * and rhythm-synchronized pulse dynamics.
 */
export default function PulseCanvas({
  bufferRef,
  ghostBufferRef = null,
  ghostAvgBpm = null,
  isRecording = false,
  liveBpm = 72,
  pressureMoment = null,
  restingBaselineBpm = null,
}) {
  const canvasRef = useRef(null);
  const animatedBpm = useAnimatedValue(liveBpm, { speed: 0.12 });
  const pulseBeatRef = useRef(0);

  // Compute beat duration in seconds for CSS pulsing
  const beatDuration = Math.max(0.35, Math.min(1.5, 60 / (animatedBpm || 72)));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      pulseBeatRef.current = (pulseBeatRef.current + 0.05) % (Math.PI * 2);

      // Deep dark sleek background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      // Sleek subtle grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 22) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 1. Draw Ghost Take trace (if active) in translucent violet
      const ghostBuffer = ghostBufferRef?.current || [];
      if (ghostBuffer.length > 1) {
        let gMin = Infinity;
        let gMax = -Infinity;
        for (let i = 0; i < ghostBuffer.length; i++) {
          const val = ghostBuffer[i];
          if (val < gMin) gMin = val;
          if (val > gMax) gMax = val;
        }
        const gRange = gMax - gMin || 1;

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        const gStep = width / (ghostBuffer.length - 1);
        for (let i = 0; i < ghostBuffer.length; i++) {
          const x = i * gStep;
          const normY = (ghostBuffer[i] - gMin) / gRange;
          const y = height - (normY * (height * 0.68) + height * 0.16);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Draw Live Waveform
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

        const step = width / (buffer.length - 1);

        // Path for gradient fill below curve
        ctx.beginPath();
        for (let i = 0; i < buffer.length; i++) {
          const x = i * step;
          const normY = (buffer[i] - min) / range;
          const y = height - (normY * (height * 0.68) + height * 0.16);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();

        const areaGrad = ctx.createLinearGradient(0, height * 0.15, 0, height);
        areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
        areaGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Main waveform stroke with neon bloom
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        for (let i = 0; i < buffer.length; i++) {
          const x = i * step;
          const normY = (buffer[i] - min) / range;
          const y = height - (normY * (height * 0.68) + height * 0.16);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Pulsing lead dot & expanding halo
        const lastX = width - 2;
        const lastNormY = (buffer[buffer.length - 1] - min) / range;
        const lastY = height - (lastNormY * (height * 0.68) + height * 0.16);

        // Halo ripple
        const haloRadius = 4 + Math.sin(pulseBeatRef.current) * 3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.beginPath();
        ctx.arc(lastX, lastY, Math.max(2, haloRadius + 3), 0, Math.PI * 2);
        ctx.fill();

        // Bright nucleus
        ctx.fillStyle = '#f0f9ff';
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Idle heartbeat trace
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [bufferRef, ghostBufferRef]);

  // Rhythm qualitative description
  let rhythmLabel = 'Calm Resting';
  let rhythmColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
  if (animatedBpm > 95) {
    rhythmLabel = 'Elevated Cadence';
    rhythmColor = 'text-red-400 bg-red-950/60 border-red-500/30';
  } else if (animatedBpm > 85) {
    rhythmLabel = 'Alert / Active';
    rhythmColor = 'text-amber-400 bg-amber-950/60 border-amber-500/30';
  }

  return (
    <div className="relative w-full h-full bg-slate-900/90 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg backdrop-blur-sm transition-all duration-300">
      {/* Top Header */}
      <div className="absolute top-2.5 left-3.5 z-10 flex items-center space-x-2">
        <div
          className="flex items-center justify-center w-5 h-5 rounded-full bg-sky-500/10 border border-sky-400/40 text-sky-400"
          style={{ animation: `pulse ${beatDuration}s infinite ease-in-out` }}
        >
          <Heart className="w-3 h-3 fill-sky-400/80 text-sky-300" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
          Pulse & Recovery
        </span>
        {pressureMoment ? (
          pressureMoment.status === 'steady' ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-950/80 border-sky-500/50 text-sky-300 shadow-sm">
              Baseline Steady ({pressureMoment.baselineBpm} BPM)
            </span>
          ) : pressureMoment.status === 'recovered' ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-sm animate-pulse">
              ✅ Restabilized in {pressureMoment.recoverySec}s
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-950/80 border-amber-500/50 text-amber-300 shadow-sm animate-pulse">
              ⚡ Tracking Response
              {pressureMoment.peakBpm > pressureMoment.baselineBpm
                ? ` (+${pressureMoment.peakBpm - pressureMoment.baselineBpm} BPM)`
                : ''}
            </span>
          )
        ) : (
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rhythmColor}`}
          >
            {rhythmLabel}
            {restingBaselineBpm ? ` • Base: ${restingBaselineBpm}` : ''}
          </span>
        )}
      </div>

      {/* Top Right Live Telemetry */}
      <div className="absolute top-2.5 right-3.5 z-10 flex items-center gap-3">
        {ghostAvgBpm && (
          <div className="hidden sm:flex items-baseline space-x-1 px-2.5 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[11px] shadow-sm">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Ghost:
            </span>
            <span className="font-bold font-mono text-purple-200">
              {ghostAvgBpm}
            </span>
            <span className="text-[10px] text-purple-400">BPM</span>
          </div>
        )}
        <div className="flex items-baseline space-x-1.5">
          <span
            className="text-2xl font-black font-mono text-sky-400 tracking-tight transition-transform duration-150"
            style={{
              display: 'inline-block',
              transform: `scale(${1.0 + (isRecording ? 0.05 : 0)})`,
            }}
          >
            {animatedBpm || '--'}
          </span>
          <span className="text-xs text-slate-400 font-semibold uppercase">
            BPM
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={135}
        className="w-full h-full block"
      />
    </div>
  );
}
