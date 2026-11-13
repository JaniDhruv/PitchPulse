import React, { useEffect, useRef } from 'react';

/**
 * High-performance 60 FPS HTML5 Canvas for real-time PPG / arterial pulse waveforms.
 * Reads directly from a mutable ring buffer ref without triggering React re-renders.
 */
export default function PulseCanvas({
  bufferRef,
  ghostBufferRef = null,
  ghostAvgBpm = null,
  isRecording = false,
  liveBpm = 72,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark background with subtle grid
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 20) {
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

        ctx.strokeStyle = 'rgba(168, 85, 247, 0.45)'; // Soft purple
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 4]); // Dashed ghost line

        ctx.beginPath();
        const gStep = width / (ghostBuffer.length - 1);
        for (let i = 0; i < ghostBuffer.length; i++) {
          const x = i * gStep;
          const normY = (ghostBuffer[i] - gMin) / gRange;
          const y = height - (normY * (height * 0.7) + height * 0.15);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset to solid line for live wave
      }

      const buffer = bufferRef?.current || [];
      if (buffer.length > 1) {
        // Find min and max for auto-scaling
        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < buffer.length; i++) {
          const val = buffer[i];
          if (val < min) min = val;
          if (val > max) max = val;
        }
        const range = max - min || 1;

        // Waveform glow
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        const step = width / (buffer.length - 1);
        for (let i = 0; i < buffer.length; i++) {
          const x = i * step;
          // Normalize to canvas height with 15% margin
          const normY = (buffer[i] - min) / range;
          const y = height - (normY * (height * 0.7) + height * 0.15);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Pulsing lead dot
        const lastX = width;
        const lastNormY = (buffer[buffer.length - 1] - min) / range;
        const lastY = height - (lastNormY * (height * 0.7) + height * 0.15);
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#38bdf8';
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Idle heartbeat simulation if buffer is empty
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
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

  return (
    <div className="relative w-full h-full bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
      <div className="absolute top-2.5 left-3 z-10 flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Pulse Plethysmogram
        </span>
      </div>

      <div className="absolute top-2.5 right-3 z-10 flex items-center gap-3">
        {ghostAvgBpm && (
          <div className="hidden sm:flex items-baseline space-x-1 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-[11px]">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Ghost:</span>
            <span className="font-bold font-mono text-purple-300">{ghostAvgBpm}</span>
            <span className="text-[10px] text-purple-400">BPM</span>
          </div>
        )}
        <div className="flex items-baseline space-x-1">
          <span className="text-xl font-bold font-mono text-sky-400">{liveBpm || '--'}</span>
          <span className="text-xs text-slate-400 font-medium">BPM</span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={130}
        className="w-full h-full block"
      />
    </div>
  );
}

