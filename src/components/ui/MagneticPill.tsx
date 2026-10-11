import React, { forwardRef, useImperativeHandle } from 'react';
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
  const options: MagneticOptions = { pullFactor, maxDistance };
  const internalRef = useMagnetic<HTMLButtonElement>(options);

  useImperativeHandle(externalRef, () => internalRef.current as HTMLButtonElement);

  return (
    <button
      ref={internalRef}
      className={`magnetic-pill ${className}`}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
});

MagneticPill.displayName = 'MagneticPill';
