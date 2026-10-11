import { useEffect, useRef } from 'react';

export interface MagneticOptions {
  pullFactor?: number;
  maxDistance?: number;
}

/**
 * Hook to apply Hyperplexed-style magnetic cursor attraction physics to buttons & pills.
 * Gently pulls the element toward the cursor on hover and springs back smoothly on leave.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(
  options: MagneticOptions = {}
) {
  const ref = useRef<T | null>(null);
  const { pullFactor = 0.28, maxDistance = 16 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let deltaX = (e.clientX - centerX) * pullFactor;
      let deltaY = (e.clientY - centerY) * pullFactor;

      // Clamp distance
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        deltaX *= ratio;
        deltaY *= ratio;
      }

      el.style.transform = `translate(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = 'translate(0px, 0px)';
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.style.transform = '';
    };
  }, [pullFactor, maxDistance]);

  return ref;
}
