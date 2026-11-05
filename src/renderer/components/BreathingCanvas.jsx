import React, { useEffect, useRef } from 'react';

/**
 * High-performance 60 FPS HTML5 Canvas for real-time respiratory movement traces.
 * Alerts visually if user holds their breath during speaking segments.
 */
export default function BreathingCanvas({ bufferRef, isBreathHolding = false, liveRate = 14 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal baseline
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
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

        const color = isBreathHolding ? '#f87171' : '#34d399';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        ctx.beginPath();
        const step = width / (buffer.length - 1);
        for (let i = 0; i < buffer.length; i++) {
          const x = i * step;
          const normY = (buffer[i] - min) / range;
          const y = height - (normY * (height * 0.7) + height * 0.15);
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // Lead indicator
        const lastX = width;
        const lastNormY = (buffer[buffer.length - 1] - min) / range;
        const lastY = height - (lastNormY * (height * 0.7) + height * 0.15);
        ctx.fillStyle = isBreathHolding ? '#fee2e2' : '#ecfdf5';
        ctx.beginPath();
        ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.4)';
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
  }, [bufferRef, isBreathHolding]);

  return (
    <div className={`relative w-full h-full bg-slate-900/90 rounded-xl border ${isBreathHolding ? 'border-red-500/80 shadow-red-500/20' : 'border-slate-800'} overflow-hidden shadow-inner transition-colors duration-300`}>
      <div className="absolute top-2.5 left-3 z-10 flex items-center space-x-2">
        <span className={`w-2.5 h-2.5 rounded-full ${isBreathHolding ? 'bg-red-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Respiratory Waveform
        </span>
      </div>
      <div className="absolute top-2.5 right-3 z-10 flex items-baseline space-x-1">
        <span className={`text-xl font-bold font-mono ${isBreathHolding ? 'text-red-400' : 'text-emerald-400'}`}>{liveRate || '--'}</span>
        <span className="text-xs text-slate-400 font-medium">br/min</span>
      </div>

      {isBreathHolding && (
        <div className="absolute bottom-2 left-3 z-10 bg-red-950/90 border border-red-500/60 px-2 py-0.5 rounded text-[11px] font-semibold text-red-200">
          ⚠️ Breath Holding Detected
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={400}
        height={130}
        className="w-full h-full block"
      />
    </div>
  );
}

