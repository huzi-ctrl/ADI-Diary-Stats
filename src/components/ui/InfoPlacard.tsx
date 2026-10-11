import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, Calculator, Lightbulb } from 'lucide-react';

export interface InfoPlacardProps {
  /** The headline of the placard (e.g. "Weekly Revenue") */
  title: string;
  /** Primary description explaining the metric/widget */
  description: string;
  /** Optional mathematical formula or data calculation breakdown */
  calculation?: string;
  /** Optional practical business tip for driving instructors */
  tip?: string;
  /** Optional badge pill in header (e.g. "Net Profit", "Real-Time") */
  badge?: string;
  /** Size of the trigger "i" icon in pixels (default 12) */
  iconSize?: number;
  /** Additional custom classes */
  className?: string;
  /** Inline style for the trigger button container */
  style?: React.CSSProperties;
}

/**
 * InfoPlacard Component:
 * Renders an intuitive clickable "i" icon that opens a rich informational placard
 * detailing what the metric measures, how it is calculated, and instructor tips.
 * Uses a React portal to render cleanly above all cards without overflow clipping.
 */
export const InfoPlacard: React.FC<InfoPlacardProps> = ({
  title,
  description,
  calculation,
  tip,
  badge,
  iconSize = 12,
  className = '',
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const placardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; placement: 'bottom' | 'top' | 'mobile' }>({
    top: 0,
    left: 0,
    placement: 'bottom'
  });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;

    if (isMobile) {
      setPosition({ top: 0, left: 0, placement: 'mobile' });
      return;
    }

    const placardWidth = 320;
    const placardEstimatedHeight = 240;
    const spacing = 8;

    // Determine vertical placement: prefer bottom, flip to top if near bottom edge
    let top = rect.bottom + spacing;
    let placement: 'bottom' | 'top' = 'bottom';
    if (rect.bottom + placardEstimatedHeight > window.innerHeight - 16 && rect.top > placardEstimatedHeight + 16) {
      top = rect.top - placardEstimatedHeight - spacing;
      placement = 'top';
    }

    // Determine horizontal alignment: align with right edge of trigger, clamp to viewport
    let left = rect.right - placardWidth + 24;
    if (left < 16) {
      left = 16;
    } else if (left + placardWidth > window.innerWidth - 16) {
      left = window.innerWidth - placardWidth - 16;
    }

    setPosition({ top, left, placement });
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      if (window.innerWidth < 640) {
        // Keep mobile centered
        return;
      }
      updatePosition();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(prev => !prev);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
  };

  return (
    <>
      {/* Clickable "i" Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Info: ${title}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleToggle}
        className={`info-placard-trigger ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '18px',
          height: '18px',
          minWidth: '18px',
          minHeight: '18px',
          borderRadius: '50%',
          border: '1px solid var(--sfd-border-hairline, rgba(148, 163, 184, 0.28))',
          background: isOpen 
            ? 'var(--sfd-primary-soft, rgba(37, 99, 235, 0.14))' 
            : 'var(--sfd-surface-nested, rgba(148, 163, 184, 0.12))',
          color: isOpen 
            ? 'var(--sfd-primary, #2563eb)' 
            : 'var(--sfd-ink-muted, #94a3b8)',
          cursor: 'pointer',
          padding: 0,
          transition: 'all 0.18s ease-in-out',
          flexShrink: 0,
          boxShadow: isOpen ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none',
          ...style
        }}
        title={`Click for info on ${title}`}
      >
        <Info size={iconSize} strokeWidth={2.4} />
      </button>

      {/* Placard Portal: renders outside normal DOM to eliminate clipping */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          className="info-placard-portal"
          onClick={handleBackdropClick}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: position.placement === 'mobile' ? 'flex' : 'block',
            alignItems: position.placement === 'mobile' ? 'center' : 'initial',
            justifyContent: position.placement === 'mobile' ? 'center' : 'initial',
            padding: position.placement === 'mobile' ? '16px' : '0',
            background: position.placement === 'mobile' ? 'rgba(15, 23, 42, 0.45)' : 'transparent',
            backdropFilter: position.placement === 'mobile' ? 'blur(4px)' : 'none',
            WebkitBackdropFilter: position.placement === 'mobile' ? 'blur(4px)' : 'none',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Placard Content Card */}
          <div
            ref={placardRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: position.placement === 'mobile' ? 'relative' : 'fixed',
              top: position.placement === 'mobile' ? 'auto' : `${position.top}px`,
              left: position.placement === 'mobile' ? 'auto' : `${position.left}px`,
              width: position.placement === 'mobile' ? '100%' : '320px',
              maxWidth: '340px',
              background: 'var(--sfd-surface-card, #ffffff)',
              color: 'var(--sfd-ink-primary, #0f172a)',
              border: '1px solid var(--sfd-border-subtle, rgba(226, 232, 240, 0.9))',
              borderRadius: '16px',
              padding: '16px 18px',
              boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.24), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              animation: 'placardPop 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box'
            }}
          >
            {/* Header: Title + optional badge + Close Button */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    background: 'var(--sfd-primary-soft, rgba(37, 99, 235, 0.12))',
                    color: 'var(--sfd-primary, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Info size={12} strokeWidth={2.5} />
                  </div>
                  <h4 style={{ 
                    fontSize: '13.5px', 
                    fontWeight: 700, 
                    margin: 0, 
                    color: 'var(--sfd-ink-primary, #0f172a)',
                    letterSpacing: '-0.01em'
                  }}>
                    {title}
                  </h4>
                </div>
                {badge && (
                  <span style={{ 
                    fontSize: '10.5px', 
                    fontWeight: 700, 
                    color: 'var(--sfd-primary, #2563eb)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.04em',
                    paddingLeft: '26px'
                  }}>
                    {badge}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close information"
                style={{
                  background: 'var(--sfd-surface-nested, rgba(148, 163, 184, 0.12))',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--sfd-ink-muted, #64748b)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background 0.15s, color 0.15s'
                }}
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>

            {/* Description Body */}
            <p style={{
              margin: 0,
              fontSize: '12px',
              lineHeight: '1.5',
              color: 'var(--sfd-ink-secondary, #475569)'
            }}>
              {description}
            </p>

            {/* Optional Calculation / Formula Card */}
            {calculation && (
              <div style={{
                background: 'var(--sfd-surface-nested, rgba(148, 163, 184, 0.08))',
                border: '1px solid var(--sfd-border-hairline, rgba(148, 163, 184, 0.18))',
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: 'var(--sfd-ink-muted, #64748b)' }}>
                  <Calculator size={11} />
                  <span>How it's calculated:</span>
                </div>
                <div style={{ 
                  fontSize: '11.5px', 
                  fontFamily: 'var(--sfd-font-mono, monospace)', 
                  color: 'var(--sfd-ink-primary, #0f172a)',
                  lineHeight: '1.4'
                }}>
                  {calculation}
                </div>
              </div>
            )}

            {/* Optional Instructor Tip */}
            {tip && (
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                borderRadius: '10px',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px'
              }}>
                <Lightbulb size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '11.5px', color: 'var(--sfd-ink-secondary, #475569)', lineHeight: '1.4' }}>
                  <strong style={{ color: '#b45309' }}>Instructor Tip:</strong> {tip}
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
