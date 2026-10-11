import React, { forwardRef, useCallback } from 'react';
import { useMagnetic } from '../../hooks/useMagnetic';
import type { MagneticOptions } from '../../hooks/useMagnetic';

export interface MagneticPillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  className?: string;
  pullFactor?: number;
  maxDistance?: number;
}

/**
 * MagneticPill:
 * Interactive button with Hyperplexed-style magnetic physics pulling toward the cursor.
 */
export const MagneticPill = forwardRef<HTMLButtonElement, MagneticPillProps>(({
  children,
  className = '',
  pullFactor = 0.28,
  maxDistance = 14,
  style,
  ...props
}, externalRef) => {
  const options: MagneticOptions = { pullFactor, maxDistance, enabled: true };
  const internalRef = useMagnetic<HTMLButtonElement>(options);

  const setCombinedRef = useCallback((node: HTMLButtonElement | null) => {
    internalRef.current = node;
    if (typeof externalRef === 'function') {
      externalRef(node);
    } else if (externalRef && 'current' in externalRef) {
      (externalRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    }
  }, [externalRef, internalRef]);

  return (
    <button
      ref={setCombinedRef}
      className={`magnetic-pill ${className}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
});

MagneticPill.displayName = 'MagneticPill';
