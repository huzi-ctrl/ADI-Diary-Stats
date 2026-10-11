import React, { forwardRef, useImperativeHandle } from 'react';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';
import type { LiquidGlassOptions } from '../../hooks/useLiquidGlass';

export interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  tilt?: boolean;
  maxTilt?: number;
  scale?: number;
  glare?: boolean;
}

/**
 * LiquidGlassCard:
 * Dynamic Apple visionOS liquid glass card with live cursor spotlight and 3D parallax tilt.
 */
export const LiquidGlassCard = forwardRef<HTMLDivElement, LiquidGlassCardProps>(({
  children,
  className = '',
  tilt = true,
  maxTilt = 4.5,
  scale = 1.012,
  glare = true,
  style,
  ...props
}, externalRef) => {
  const options: LiquidGlassOptions = { tilt, maxTilt, scale, glare };
  const internalRef = useLiquidGlass<HTMLDivElement>(options);

  useImperativeHandle(externalRef, () => internalRef.current as HTMLDivElement);

  return (
    <div
      ref={internalRef}
      className={`liquid-glass-card vision-rim ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
});

LiquidGlassCard.displayName = 'LiquidGlassCard';
