import { useState, useEffect, useRef } from 'react';

/**
 * Hook to smoothly animate numeric values over time using requestAnimationFrame.
 * Creates continuous fluid transitions instead of jarring number jumps.
 *
 * @param {number} targetValue - The latest incoming target numeric value.
 * @param {Object} options
 * @param {number} [options.speed=0.15] - Interpolation speed factor (0.05 to 0.3). Higher = faster catch-up.
 * @param {boolean} [options.round=true] - Whether to round the output to integer.
 * @param {number} [options.precision=0] - Decimal places if not rounding to integer.
 * @returns {number} The animated display value.
 */
export function useAnimatedValue(
  targetValue,
  { speed = 0.15, round = true, precision = 0 } = {},
) {
  const [displayValue, setDisplayValue] = useState(targetValue ?? 0);
  const currentRef = useRef(targetValue ?? 0);
  const targetRef = useRef(targetValue ?? 0);
  const rafIdRef = useRef(null);

  useEffect(() => {
    targetRef.current =
      typeof targetValue === 'number' && !isNaN(targetValue) ? targetValue : 0;

    const animate = () => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 0.05) {
        currentRef.current = targetRef.current;
        const finalVal = round
          ? Math.round(currentRef.current)
          : Number(currentRef.current.toFixed(precision));
        setDisplayValue(finalVal);
        return;
      }

      currentRef.current += diff * speed;
      const nextVal = round
        ? Math.round(currentRef.current)
        : Number(currentRef.current.toFixed(precision));
      setDisplayValue(nextVal);
      rafIdRef.current = requestAnimationFrame(animate);
    };

    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [targetValue, speed, round, precision]);

  return displayValue;
}
