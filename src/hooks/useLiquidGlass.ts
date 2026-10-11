import { useEffect, useRef } from 'react';

export interface LiquidGlassOptions {
  tilt?: boolean;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
}

/**
 * Hook to apply Apple visionOS-inspired 3D parallax tilt & Hyperplexed mouse-following
 * specular reflection / caustic spotlight CSS variables (--mouse-x, --mouse-y, --glare-opacity).
 */
export function useLiquidGlass<T extends HTMLElement = HTMLDivElement>(
  options: LiquidGlassOptions = {}
) {
  const ref = useRef<T | null>(null);
  const {
    tilt = true,
    maxTilt = 5,
    scale = 1.012,
    glare = true
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let isHovered = false;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Update CSS variables for radial spotlight and specular glare
      el.style.setProperty('--mouse-x', `${x}px`);
      el.style.setProperty('--mouse-y', `${y}px`);

      if (glare && !isHovered) {
        isHovered = true;
        el.style.setProperty('--glare-opacity', '1');
      }

      if (tilt) {
        // Safe normalized tilt computation
        const rotateX = ((y - centerY) / centerY) * -maxTilt;
        const rotateY = ((x - centerX) / centerX) * maxTilt;
        el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;
      }
    };

    const handleMouseLeave = () => {
      isHovered = false;
      if (tilt) {
        el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }
      if (glare) {
        el.style.setProperty('--glare-opacity', '0');
      }
    };

    el.addEventListener('mousemove', handleMouseMove, { passive: true });
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (tilt) {
        el.style.transform = '';
      }
    };
  }, [tilt, maxTilt, scale, glare]);

  return ref;
}
