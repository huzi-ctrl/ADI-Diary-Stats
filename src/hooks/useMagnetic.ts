import { useEffect, useRef } from 'react';

export interface MagneticOptions {
  enabled?: boolean;
  pullFactor?: number;
  maxDistance?: number;
}

/**
 * Hook for subtle magnetic feel.
 * Default enabled is false or ultra-micro distance so small buttons do not jump out of place.
 */
export function useMagnetic<T extends HTMLElement = HTMLElement>(
  options: MagneticOptions = {}
) {
  const ref = useRef<T | null>(null);
  const { enabled = false, pullFactor = 0.12, maxDistance = 4 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let deltaX = (e.clientX - centerX) * pullFactor;
      let deltaY = (e.clientY - centerY) * pullFactor;

      const distance = Math.hypot(deltaX, deltaY);
      if (distance > maxDistance) {
        const ratio = maxDistance / distance;
        deltaX *= ratio;
        deltaY *= ratio;
      }

      el.style.transform = `translate(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px)`;
    };

    const handleMouseLeave = () => {
      el.style.transform = '';
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      el.style.transform = '';
    };
  }, [enabled, pullFactor, maxDistance]);

  return ref;
}
