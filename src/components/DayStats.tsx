import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Car,
  Coffee,
  AlignLeft,
  BarChart2
} from 'lucide-react';
import { MagneticPill } from './ui/MagneticPill';
import { isEventNonPaying } from '../utils/capacityCalculations';
import { 
  type VehicleCostSettings, 
  calculateVehicleCosts, 
  DEFAULT_VEHICLE_SETTINGS 
} from '../utils/costEstimator';

interface DayStatsProps {
  allInstructorEvents?: CalendarEvent[];
  weekInstructorEvents: CalendarEvent[];
  weekStart: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  hourlyRate: number;
  testRate?: number;
  nonPayingList: string[];
  vehicleCostSettings?: VehicleCostSettings;
  enableAiInsights?: boolean;
}

interface TimelineSegment {
  type: 'lesson' | 'buffer' | 'gap' | 'free' | 'test';
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  label: string;
  sublabel?: string;
  event?: CalendarEvent;
  isSimulated?: boolean;
}

export const DayStats: React.FC<DayStatsProps> = ({
  weekInstructorEvents,
  weekStart,
  selectedDate,
  onSelectDate,
  hourlyRate,
  testRate = 0,
  nonPayingList,
  vehicleCostSettings = DEFAULT_VEHICLE_SETTINGS,
  enableAiInsights = true,
}) => {
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const dayStatsDropdownRef = useRef<HTMLDivElement>(null);
  const [isShiftSimulated, setIsShiftSimulated] = useState(false);
  const [timelineView, setTimelineView] = useState<'vertical' | 'horizontal'>('vertical');

  // Click outside to close day dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dayStatsDropdownRef.current && !dayStatsDropdownRef.current.contains(e.target as Node)) {
        setDayDropdownOpen(false);
      }
    };
    if (dayDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dayDropdownOpen]);

  // Generate 7 days of the active week
  const weekDays = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map(i => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const selectedDateStr = useMemo(() => {
    return selectedDate.toISOString().split('T')[0];
  }, [selectedDate]);

  // Lessons on this selected day
  const dayEvents = useMemo(() => {
    return weekInstructorEvents.filter(e => {
      const eDateStr = e.start.toISOString().split('T')[0];
      return eDateStr === selectedDateStr && !e.isAllDay;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [weekInstructorEvents, selectedDateStr]);

  // Separate lessons, tests, non-paying
  const dayLessons = useMemo(() => {
    return dayEvents.filter(e => 
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests')
    );
  }, [dayEvents]);

  const dayTests = useMemo(() => {
    return dayEvents.filter(e => 
      e.summary.toLowerCase().includes('test') ||
      e.summary.toLowerCase().includes('mock') ||
      e.categories.includes('Tests')
    );
  }, [dayEvents]);

  const billableLessons = useMemo(() => {
    return dayLessons.filter(l => !isEventNonPaying(l.summary, nonPayingList));
  }, [dayLessons, nonPayingList]);

  const nonPayingLessons = useMemo(() => {
    return dayLessons.filter(l => isEventNonPaying(l.summary, nonPayingList));
  }, [dayLessons, nonPayingList]);

  // Daily teaching hours & revenue
  const teachingHours = useMemo(() => {
    const mins = billableLessons.reduce((sum, e) => sum + e.durationMinutes, 0);
    return mins / 60;
  }, [billableLessons]);

  const lessonEarnings = teachingHours * hourlyRate;
  const testEarnings = dayTests.length * (testRate > 0 ? testRate : (hourlyRate * 2));
  const rawTotalEarnings = lessonEarnings + testEarnings;

  // Day window span (defaulting to 08:00 - 18:00 or extended if events fall outside)
  const { spanStartMin, spanEndMin, totalSpanMin } = useMemo(() => {
    let minStart = 8 * 60; // 08:00 default
    let maxEnd = 18 * 60;   // 18:00 default

    dayEvents.forEach(e => {
      const s = e.start.getHours() * 60 + e.start.getMinutes();
      const endM = e.end.getHours() * 60 + e.end.getMinutes();
      if (s < minStart) minStart = Math.floor(s / 60) * 60;
      if (endM > maxEnd) maxEnd = Math.ceil(endM / 60) * 60;
    });

    return {
      spanStartMin: minStart,
      spanEndMin: maxEnd,
      totalSpanMin: Math.max(60, maxEnd - minStart)
    };
  }, [dayEvents]);

  // Build timeline segments including lessons, 15m travel buffers, and unusable/usable gaps
  const { segments, totalDeadGapMins, totalBufferMins, recoverableGapSegment } = useMemo(() => {
    const segs: TimelineSegment[] = [];
    let deadGaps = 0;
    let buffers = 0;
    let recoverable: TimelineSegment | null = null;

    if (dayEvents.length === 0) {
      segs.push({
        type: 'free',
        startMinutes: spanStartMin,
        endMinutes: spanEndMin,
        durationMinutes: totalSpanMin,
        label: 'No appointments booked'
      });
      return { segments: segs, totalDeadGapMins: 0, totalBufferMins: 0, recoverableGapSegment: null };
    }

    // Lead gap before first appointment
    const firstStart = dayEvents[0].start.getHours() * 60 + dayEvents[0].start.getMinutes();
    if (firstStart > spanStartMin) {
      const leadGap = firstStart - spanStartMin;
      if (leadGap >= 15) {
        // Buffer right before first lesson
        segs.push({
          type: 'free',
          startMinutes: spanStartMin,
          endMinutes: firstStart - 15,
          durationMinutes: leadGap - 15,
          label: 'Free Morning'
        });
        segs.push({
          type: 'buffer',
          startMinutes: firstStart - 15,
          endMinutes: firstStart,
          durationMinutes: 15,
          label: '15m Transit'
        });
        buffers += 15;
      } else {
        segs.push({
          type: 'buffer',
          startMinutes: spanStartMin,
          endMinutes: firstStart,
          durationMinutes: leadGap,
          label: `${leadGap}m Transit`
        });
        buffers += leadGap;
      }
    }

    for (let i = 0; i < dayEvents.length; i++) {
      const e = dayEvents[i];
      const sMin = e.start.getHours() * 60 + e.start.getMinutes();
      const eMin = e.end.getHours() * 60 + e.end.getMinutes();
      const dur = e.durationMinutes;

      const isTest = e.summary.toLowerCase().includes('test') || e.summary.toLowerCase().includes('mock') || e.categories.includes('Tests');

      segs.push({
        type: isTest ? 'test' : 'lesson',
        startMinutes: sMin,
        endMinutes: eMin,
        durationMinutes: dur,
        label: e.summary,
        sublabel: `${(dur / 60).toFixed(1)}h`,
        event: e
      });

      if (i < dayEvents.length - 1) {
        const nextE = dayEvents[i + 1];
        const nextStart = nextE.start.getHours() * 60 + nextE.start.getMinutes();
        const gapMins = nextStart - eMin;

        if (gapMins > 0) {
          if (gapMins < 90) {
            // Gap is unusable dead gap (too short for 1h lesson + 2x15m transit)
            deadGaps += gapMins;
            const gapSeg: TimelineSegment = {
              type: 'gap',
              startMinutes: eMin,
              endMinutes: nextStart,
              durationMinutes: gapMins,
              label: `Unusable Gap (${gapMins}m)`,
              sublabel: 'Too short for pupil'
            };
            segs.push(gapSeg);
            if (!recoverable && gapMins >= 45) {
              recoverable = gapSeg;
            }
          } else {
            // Usable gap: 15m buffer after current, free window, 15m buffer before next
            segs.push({
              type: 'buffer',
              startMinutes: eMin,
              endMinutes: eMin + 15,
              durationMinutes: 15,
              label: '15m Transit'
            });
            buffers += 15;

            segs.push({
              type: 'free',
              startMinutes: eMin + 15,
              endMinutes: nextStart - 15,
              durationMinutes: gapMins - 30,
              label: `Open Slot (${Math.round((gapMins - 30) / 60 * 10) / 10}h)`
            });

            segs.push({
              type: 'buffer',
              startMinutes: nextStart - 15,
              endMinutes: nextStart,
              durationMinutes: 15,
              label: '15m Transit'
            });
            buffers += 15;
          }
        }
      }
    }

    // Trailing gap after last appointment
    const lastEnd = dayEvents[dayEvents.length - 1].end.getHours() * 60 + dayEvents[dayEvents.length - 1].end.getMinutes();
    if (lastEnd < spanEndMin) {
      segs.push({
        type: 'buffer',
        startMinutes: lastEnd,
        endMinutes: Math.min(lastEnd + 15, spanEndMin),
        durationMinutes: Math.min(15, spanEndMin - lastEnd),
        label: '15m Transit'
      });
      buffers += 15;

      if (lastEnd + 15 < spanEndMin) {
        segs.push({
          type: 'free',
          startMinutes: lastEnd + 15,
          endMinutes: spanEndMin,
          durationMinutes: spanEndMin - (lastEnd + 15),
          label: 'Free Evening'
        });
      }
    }

    return {
      segments: segs,
      totalDeadGapMins: deadGaps,
      totalBufferMins: buffers,
      recoverableGapSegment: recoverable
    };
  }, [dayEvents, spanStartMin, spanEndMin, totalSpanMin]);

  // Simulation calculations
  const simulatedEarnings = isShiftSimulated ? rawTotalEarnings + (hourlyRate * 1.5) : rawTotalEarnings;
  const simulatedTeachingHours = isShiftSimulated ? teachingHours + 1.5 : teachingHours;
  const simulatedDeadGaps = isShiftSimulated ? 0 : totalDeadGapMins;

  const dayVehicleCosts = useMemo(() => {
    return calculateVehicleCosts(simulatedTeachingHours, simulatedEarnings, vehicleCostSettings);
  }, [simulatedTeachingHours, simulatedEarnings, vehicleCostSettings]);

  // Scheduling efficiency ratio: billable minutes / (billable minutes + dead gap minutes + travel buffers)
  const scheduledMinutes = (teachingHours * 60) + (dayTests.length * 90);
  const totalOccupiedMinutes = scheduledMinutes + (isShiftSimulated ? 0 : totalDeadGapMins) + totalBufferMins;
  const efficiencyPct = totalOccupiedMinutes > 0 
    ? Math.min(100, Math.round((scheduledMinutes / totalOccupiedMinutes) * 100))
    : 100;

  // Helper formatting
  const formatMinToTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const selectedDayName = selectedDate.toLocaleDateString(undefined, { weekday: 'long' });
  const selectedDateFormatted = selectedDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="sfd-day-tab-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Day Selector Pill & Header Bar */}
      <div className="sfd-card-container" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--sfd-ink-primary)', letterSpacing: '-0.02em' }}>
                  {selectedDayName} Schedule Deep Dive
                </h1>
                <span className="sfd-card-tag" style={{ borderRadius: '9999px', padding: '3px 10px' }}>
                  {selectedDateFormatted}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--sfd-ink-muted)' }}>
                Granular timeline pacing, inter-lesson travel buffers, dead gap detection & slot optimization.
              </p>
            </div>
          </div>

          {/* Liquid Glass Floating Day Picker Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MagneticPill
              type="button"
              className="sfd-chip-btn"
              onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(prev.getDate() - 1);
                onSelectDate(prev);
              }}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </MagneticPill>

            <div ref={dayStatsDropdownRef} style={{ position: 'relative', zIndex: 1000 }}>
              <button
                type="button"
                onClick={() => setDayDropdownOpen(!dayDropdownOpen)}
                className="sfd-strip-btn active"
                style={{
                  padding: '7px 16px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px'
                }}
              >
                <span>{selectedDayName}</span>
                <ChevronDown size={14} style={{ transform: dayDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {dayDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    minWidth: '220px',
                    backgroundColor: 'var(--sfd-surface-ground, #ffffff)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid var(--sfd-border-subtle, rgba(15, 23, 42, 0.16))',
                    borderRadius: '16px',
                    padding: '6px',
                    boxShadow: '0 20px 45px -4px rgba(15, 23, 42, 0.25), 0 8px 16px -2px rgba(15, 23, 42, 0.1)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  {weekDays.map(day => {
                    const isSelected = day.toDateString() === selectedDate.toDateString();
                    const dName = day.toLocaleDateString(undefined, { weekday: 'short' });
                    const dDate = day.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
                    const isToday = new Date().toDateString() === day.toDateString();

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => {
                          onSelectDate(day);
                          setDayDropdownOpen(false);
                        }}
                        style={{
                          padding: '8px 12px',
                          fontSize: '13px',
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-main)',
                          background: isSelected ? 'var(--accent-blue-soft)' : 'transparent',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        <span>{dName}, {dDate}</span>
                        {isToday && (
                          <span style={{ fontSize: '11px', background: 'var(--sfd-primary-soft)', color: 'var(--sfd-primary)', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            Today
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <MagneticPill
              type="button"
              className="sfd-chip-btn"
              onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(next.getDate() + 1);
                onSelectDate(next);
              }}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </MagneticPill>
          </div>

        </div>
      </div>

      {/* Clean Modern KPI Cards */}
      <section className="sfd-kpi-grid">
        {/* Metric 1: Day Revenue */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Day Revenue</span>
            <span 
              className="sfd-kpi-badge emerald"
              title={`Net take-home profit: £${dayVehicleCosts.netRevenue.toFixed(2)} (${dayVehicleCosts.profitMargin.toFixed(0)}% margin after £${dayVehicleCosts.totalCost.toFixed(2)} running expenses)`}
            >
              Net £{Math.round(dayVehicleCosts.netRevenue)}
            </span>
          </div>
          <div className="sfd-kpi-value">
            £{simulatedEarnings.toFixed(2)}
          </div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub">
              {simulatedTeachingHours > 0
                ? `Net: £${dayVehicleCosts.netRevenue.toFixed(2)} • -£${dayVehicleCosts.totalCost.toFixed(2)} vehicle costs (~${Math.round(dayVehicleCosts.estimatedMiles)} mi)`
                : `£${hourlyRate}/hr rate ${testRate > 0 ? `• £${testRate}/test` : ''}`}
            </span>
          </div>
        </div>

        {/* Metric 2: Billable Hours */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Teaching Hours</span>
            <span className="sfd-kpi-badge neutral">Billable</span>
          </div>
          <div className="sfd-kpi-value">
            {simulatedTeachingHours.toFixed(1)}<span style={{ fontSize: '0.65em', fontWeight: 600, color: 'var(--sfd-ink-muted)', marginLeft: '2px' }}>h</span>
          </div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub">
              {billableLessons.length} paid lessons {dayTests.length > 0 ? `+ ${dayTests.length} tests` : ''}
            </span>
          </div>
        </div>

        {/* Metric 3: Travel Buffers */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Transit Windows</span>
            <span className="sfd-kpi-badge amber">15m Buffer</span>
          </div>
          <div className="sfd-kpi-value">
            {(totalBufferMins / 60).toFixed(1)}<span style={{ fontSize: '0.65em', fontWeight: 600, color: 'var(--sfd-ink-muted)', marginLeft: '2px' }}>h</span>
          </div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub">
              Automated transit windows reserved
            </span>
          </div>
        </div>

        {/* Metric 4: Scheduling Efficiency & Dead Gaps */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Scheduling Flow</span>
            <span className={`sfd-kpi-badge ${efficiencyPct >= 80 ? 'emerald' : efficiencyPct >= 65 ? 'amber' : 'coral'}`}>
              {efficiencyPct}% Score
            </span>
          </div>
          <div className="sfd-kpi-value" style={{ color: simulatedDeadGaps > 0 ? 'var(--sfd-coral)' : 'var(--sfd-emerald)' }}>
            {simulatedDeadGaps > 0 ? `${(simulatedDeadGaps / 60).toFixed(1)}h` : 'Optimal'}
          </div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub">
              {simulatedDeadGaps > 0 ? `${simulatedDeadGaps}m fragmented dead gaps` : 'Zero fragmented dead time'}
            </span>
          </div>
        </div>
      </section>

      {/* Main 7:3 Split Cockpit Layout */}
      <main className="sfd-cockpit-split">
        {/* Left Column: Visual Timeline Track + AI Optimization Diagnostic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="sfd-card-container">
            <div className="sfd-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <Clock size={18} />
                </div>
                <h2 className="sfd-card-heading">{selectedDayName} Schedule Flow</h2>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="sfd-card-tag">{formatMinToTime(spanStartMin)} &ndash; {formatMinToTime(spanEndMin)} Span</span>
                
                {/* View Mode Toggle: Vertical Timeline vs Horizontal Bar */}
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--sfd-surface-nested)', padding: '2px', borderRadius: '9999px', border: '1px solid var(--sfd-border-hairline)' }}>
                  <button
                    type="button"
                    onClick={() => setTimelineView('vertical')}
                    style={{
                      border: 'none',
                      background: timelineView === 'vertical' ? 'var(--sfd-surface-card)' : 'transparent',
                      color: timelineView === 'vertical' ? 'var(--sfd-ink-primary)' : 'var(--sfd-ink-muted)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: timelineView === 'vertical' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <AlignLeft size={13} />
                    <span>Vertical</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineView('horizontal')}
                    style={{
                      border: 'none',
                      background: timelineView === 'horizontal' ? 'var(--sfd-surface-card)' : 'transparent',
                      color: timelineView === 'horizontal' ? 'var(--sfd-ink-primary)' : 'var(--sfd-ink-muted)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: timelineView === 'horizontal' ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <BarChart2 size={13} />
                    <span>Strip</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="sfd-card-description">
              Continuous chronological representation of driving lessons, automated 15-minute inter-lesson transit allowances, and fragmented unbookable dead gaps.
            </p>

            {/* Mini Bird's-Eye Overview Bar */}
            <div className="sfd-v-mini-bar" title="Day pacing overview at a glance">
              {segments.map((seg, idx) => {
                const pct = Math.max(1, (seg.durationMinutes / totalSpanMin) * 100);
                const bg = seg.type === 'lesson' 
                  ? 'var(--sfd-emerald)' 
                  : seg.type === 'test' 
                    ? '#d97706' 
                    : seg.type === 'buffer' 
                      ? 'var(--sfd-amber)' 
                      : seg.type === 'gap' 
                        ? (isShiftSimulated && recoverableGapSegment === seg ? 'var(--sfd-emerald)' : 'var(--sfd-coral)') 
                        : 'rgba(148, 163, 184, 0.2)';
                return (
                  <div 
                    key={idx} 
                    className="sfd-v-mini-seg" 
                    style={{ width: `${pct}%`, background: bg }}
                    title={`${formatMinToTime(seg.startMinutes)} – ${formatMinToTime(seg.endMinutes)}: ${seg.label}`}
                  />
                );
              })}
            </div>

            {/* View Mode 1: Expanded Vertical Schedule (Primary) */}
            {timelineView === 'vertical' ? (
              <div className="sfd-v-schedule-list">
                {dayEvents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--sfd-surface-nested)', borderRadius: '18px', border: '1px dashed var(--sfd-border-hairline)' }}>
                    <Coffee size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5, color: 'var(--sfd-ink-muted)' }} />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--sfd-ink-primary)' }}>No Lessons Booked for {selectedDayName}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--sfd-ink-muted)' }}>
                      Your schedule is completely clear across the {formatMinToTime(spanStartMin)} &ndash; {formatMinToTime(spanEndMin)} span.
                    </p>
                  </div>
                ) : (
                  segments.map((seg, idx) => {
                    if (seg.type === 'lesson') {
                      const isNonPaying = seg.event ? isEventNonPaying(seg.event.summary, nonPayingList) : false;
                      const lessonPrice = isNonPaying ? '£0.00' : `£${((seg.durationMinutes / 60) * hourlyRate).toFixed(2)}`;
                      return (
                        <div key={idx} className="sfd-v-item sfd-v-lesson">
                          <div className="sfd-v-time-col">
                            <span className="sfd-v-time-range">{formatMinToTime(seg.startMinutes)} &ndash; {formatMinToTime(seg.endMinutes)}</span>
                            <span className="sfd-v-duration">{(seg.durationMinutes / 60).toFixed(1)} hrs</span>
                          </div>
                          <div className="sfd-v-card">
                            <div className="sfd-v-card-header">
                              <div className="sfd-v-title-wrap">
                                <span className="sfd-v-type-badge emerald">Lesson</span>
                                {isNonPaying && <span className="sfd-v-type-badge neutral">Non-Paying</span>}
                                <h4 className="sfd-v-pupil-name">{seg.label}</h4>
                              </div>
                              <span className={`sfd-v-price ${isNonPaying ? 'muted' : ''}`}>{lessonPrice}</span>
                            </div>
                            {seg.event?.location && (
                              <div style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>📍</span>
                                <span>{seg.event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (seg.type === 'test') {
                      const tPrice = testRate > 0 ? `£${testRate.toFixed(2)}` : `£${((seg.durationMinutes / 60) * hourlyRate).toFixed(2)}`;
                      return (
                        <div key={idx} className="sfd-v-item sfd-v-test">
                          <div className="sfd-v-time-col">
                            <span className="sfd-v-time-range">{formatMinToTime(seg.startMinutes)} &ndash; {formatMinToTime(seg.endMinutes)}</span>
                            <span className="sfd-v-duration">{(seg.durationMinutes / 60).toFixed(1)} hrs</span>
                          </div>
                          <div className="sfd-v-card">
                            <div className="sfd-v-card-header">
                              <div className="sfd-v-title-wrap">
                                <span className="sfd-v-type-badge amber">
                                  <Car size={12} />
                                  Driving Test
                                </span>
                                <h4 className="sfd-v-pupil-name">{seg.label}</h4>
                              </div>
                              <span className="sfd-v-price amber">{tPrice}</span>
                            </div>
                            {seg.event?.location && (
                              <div style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>📍</span>
                                <span>{seg.event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (seg.type === 'buffer') {
                      return (
                        <div key={idx} className="sfd-v-connector">
                          <div className="sfd-v-connector-rail" />
                          <div className="sfd-v-buffer-badge">
                            <Car size={13} />
                            <span>{seg.durationMinutes}m Travel Buffer &bull; {formatMinToTime(seg.startMinutes)} &ndash; {formatMinToTime(seg.endMinutes)}</span>
                          </div>
                        </div>
                      );
                    }

                    if (seg.type === 'gap') {
                      const isRecovered = isShiftSimulated && recoverableGapSegment === seg;
                      return (
                        <div key={idx} className="sfd-v-connector">
                          <div className="sfd-v-connector-rail" />
                          <div className="sfd-v-gap-card" style={isRecovered ? { background: 'var(--sfd-emerald-soft)', borderColor: 'var(--sfd-emerald-border)' } : undefined}>
                            <div className="sfd-v-gap-header">
                              <span className={`sfd-v-type-badge ${isRecovered ? 'emerald' : 'coral'}`}>
                                {isRecovered ? '✨ Slot Recovered' : '⚠️ Unusable Dead Gap'}
                              </span>
                              <span className="sfd-v-gap-time" style={isRecovered ? { color: '#065f46' } : undefined}>
                                {formatMinToTime(seg.startMinutes)} &ndash; {formatMinToTime(seg.endMinutes)} ({seg.durationMinutes} mins)
                              </span>
                            </div>
                            <p className="sfd-v-gap-note" style={isRecovered ? { color: '#065f46' } : undefined}>
                              {isRecovered 
                                ? `Shift simulation active: recovered a continuous 1.5-hour lesson window (+£${(hourlyRate * 1.5).toFixed(2)}) by sliding adjacent bookings.`
                                : `Too short for a standard 1.5h lesson + 15m transit buffer. Shifting appointments by 30–45m can convert this fragmented dead time into paid teaching.`
                              }
                            </p>
                          </div>
                        </div>
                      );
                    }

                    if (seg.type === 'free') {
                      if (seg.durationMinutes < 60) return null;
                      const isSlotBookable = seg.durationMinutes >= 90;
                      return (
                        <div key={idx} className="sfd-v-connector">
                          <div className="sfd-v-connector-rail" />
                          <div className="sfd-v-free-card">
                            <div className="sfd-v-gap-header">
                              <span className="sfd-v-type-badge neutral">
                                {isSlotBookable ? '🟢 Open Teaching Window' : 'Free Time'}
                              </span>
                              <span className="sfd-v-free-time">
                                {formatMinToTime(seg.startMinutes)} &ndash; {formatMinToTime(seg.endMinutes)} ({(seg.durationMinutes / 60).toFixed(1)}h)
                              </span>
                            </div>
                            <span className="sfd-v-free-sub">
                              {isSlotBookable 
                                ? 'Sufficient time for a full driving lesson or mock test (15m transit buffers already accommodated).'
                                : 'Scheduled rest or downtime.'
                              }
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })
                )}
              </div>
            ) : (
              /* View Mode 2: Compact Horizontal Strip */
              <div className="sfd-timeline-box" style={{ marginTop: '10px' }}>
                <div className="sfd-timeline-scale">
                  <span>{formatMinToTime(spanStartMin)}</span>
                  <span>{formatMinToTime(Math.round(spanStartMin + totalSpanMin * 0.25))}</span>
                  <span>{formatMinToTime(Math.round(spanStartMin + totalSpanMin * 0.5))}</span>
                  <span>{formatMinToTime(Math.round(spanStartMin + totalSpanMin * 0.75))}</span>
                  <span>{formatMinToTime(spanEndMin)}</span>
                </div>

                <div 
                  className="sfd-timeline-track" 
                  title="Hover blocks to inspect appointment times and buffer allowances"
                  style={{ height: '56px', padding: '4px' }}
                >
                  {segments.map((seg, idx) => {
                    const widthPct = Math.max(3, (seg.durationMinutes / totalSpanMin) * 100);

                    if (seg.type === 'lesson') {
                      return (
                        <div
                          key={idx}
                          className="sfd-time-block sfd-time-lesson"
                          style={{ width: `${widthPct}%` }}
                          title={`${formatMinToTime(seg.startMinutes)} – ${formatMinToTime(seg.endMinutes)}: ${seg.label} (${seg.sublabel})`}
                        >
                          {seg.label} ({seg.sublabel})
                        </div>
                      );
                    }

                    if (seg.type === 'test') {
                      return (
                        <div
                          key={idx}
                          className="sfd-time-block"
                          style={{ 
                            width: `${widthPct}%`, 
                            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', 
                            color: '#ffffff',
                            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)'
                          }}
                          title={`${formatMinToTime(seg.startMinutes)} – ${formatMinToTime(seg.endMinutes)}: Practical Driving Test (${seg.label})`}
                        >
                          <Car size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                          {seg.label}
                        </div>
                      );
                    }

                    if (seg.type === 'buffer') {
                      return (
                        <div
                          key={idx}
                          className="sfd-time-block sfd-time-buffer"
                          style={{ width: `${widthPct}%` }}
                          title={`${formatMinToTime(seg.startMinutes)} – ${formatMinToTime(seg.endMinutes)}: ${seg.label}`}
                        >
                          {seg.durationMinutes}m
                        </div>
                      );
                    }

                    if (seg.type === 'gap') {
                      if (isShiftSimulated && recoverableGapSegment === seg) {
                        return (
                          <div
                            key={idx}
                            className="sfd-time-block sfd-time-lesson"
                            style={{ 
                              width: `${widthPct}%`,
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
                              animation: 'pulse 2s infinite'
                            }}
                            title={`Simulated Optimization: Recovered 1.5h lesson slot (+£${(hourlyRate * 1.5).toFixed(2)})`}
                          >
                            +Slot Filled (1.5h)
                          </div>
                        );
                      }

                      return (
                        <div
                          key={idx}
                          className="sfd-time-block sfd-time-deadgap"
                          style={{ width: `${widthPct}%` }}
                          title={`${formatMinToTime(seg.startMinutes)} – ${formatMinToTime(seg.endMinutes)}: ${seg.label} (Too short to book standard lesson)`}
                        >
                          Gap {seg.durationMinutes}m
                        </div>
                      );
                    }

                    // Free time
                    return (
                      <div
                        key={idx}
                        className="sfd-time-block"
                        style={{ 
                          width: `${widthPct}%`, 
                          background: 'rgba(148, 163, 184, 0.1)', 
                          color: 'var(--sfd-ink-faint)', 
                          border: '1px dashed var(--sfd-border-hairline)' 
                        }}
                        title={`${formatMinToTime(seg.startMinutes)} – ${formatMinToTime(seg.endMinutes)}: Available Open Time`}
                      >
                        {widthPct > 8 ? seg.label : ''}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timeline Legend */}
            <div className="sfd-timeline-legend" style={{ marginTop: '12px' }}>
              <div className="sfd-legend-item">
                <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-emerald)' }} />
                <span>Booked Lessons</span>
              </div>
              <div className="sfd-legend-item">
                <span className="sfd-legend-swatch" style={{ background: '#d97706' }} />
                <span>Driving Tests / Mocks</span>
              </div>
              <div className="sfd-legend-item">
                <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-amber-soft)', border: '1px dashed var(--sfd-amber)' }} />
                <span>15m Travel Buffers</span>
              </div>
              <div className="sfd-legend-item">
                <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-coral-soft)', border: '1px dashed var(--sfd-coral)' }} />
                <span>Unusable Dead Gaps (&lt; 90m)</span>
              </div>
            </div>

            {/* In-Column Diagnostic & Schedule Shift Optimization */}
            {enableAiInsights && (
              <div className="sfd-ai-badge" style={{ marginTop: '18px' }}>
                <div className="sfd-ai-badge-top">
                  <span className="sfd-ai-badge-title">
                    <Sparkles size={14} style={{ color: 'var(--sfd-primary)' }} />
                    Day Schedule Optimization & Efficiency Diagnostic
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--sfd-ink-muted)', fontWeight: 600 }}>
                    DriveStats Intelligence
                  </span>
                </div>

                <p className="sfd-ai-badge-body">
                  {totalDeadGapMins > 0 ? (
                    isShiftSimulated ? (
                      <span>
                        <strong style={{ color: 'var(--sfd-emerald)' }}>Optimization Simulated:</strong> By sliding your appointments by 30&ndash;45 minutes, you recovered a continuous <strong>1.5-hour lesson window</strong>. Billable revenue increased by <strong>+£{(hourlyRate * 1.5).toFixed(2)}</strong> with dead time eliminated.
                      </span>
                    ) : (
                      <span>
                        {selectedDayName} carries <strong>{totalDeadGapMins} minutes of fragmented dead gap</strong>. Because driving lessons require 1.5 to 2 hours plus travel buffer, this time is unbookable. Shifting your appointments opens up a continuous teaching window.
                      </span>
                    )
                  ) : dayEvents.length === 0 ? (
                    <span>
                      No lessons booked on {selectedDayName}. You have a clean slate to schedule 2&ndash;4 compact back-to-back lessons with 15-minute travel buffers.
                    </span>
                  ) : (
                    <span>
                      {selectedDayName} exhibits high scheduling compactness. Lessons are grouped with clean 15-minute transit buffers, leaving no unbookable fragmented gaps.
                    </span>
                  )}
                </p>

                {totalDeadGapMins > 0 && (
                  <div className="sfd-ai-badge-action-bar">
                    <button
                      type="button"
                      className="sfd-ai-badge-action-btn"
                      onClick={() => setIsShiftSimulated(prev => !prev)}
                    >
                      {isShiftSimulated ? 'Reset Schedule to Original' : `Simulate Schedule Shift (+£${(hourlyRate * 1.5).toFixed(2)})`}
                    </button>
                    <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>
                      {isShiftSimulated ? 'Revenue recalculated dynamically' : 'Zero diary changes made to remote calendar'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Slots Booked Breakdown Card */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <TrendingUp size={18} />
                </div>
                <h3 className="sfd-card-heading">Day Slots Distribution</h3>
              </div>
              <span className="sfd-card-tag">{dayEvents.length} Slots Booked</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
              <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '16px', border: '1px solid var(--sfd-border-hairline)', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', fontWeight: 600 }}>Standard Lessons</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sfd-ink-primary)', marginTop: '4px' }}>{billableLessons.length}</div>
                <span style={{ fontSize: '12px', color: 'var(--sfd-emerald)', fontWeight: 600 }}>£{lessonEarnings.toFixed(0)} est.</span>
              </div>

              <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '16px', border: '1px solid var(--sfd-border-hairline)', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', fontWeight: 600 }}>Driving Tests</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>{dayTests.length}</div>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>{testRate > 0 ? `£${testRate}/test` : 'Hourly rate'}</span>
              </div>

              <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '16px', border: '1px solid var(--sfd-border-hairline)', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', fontWeight: 600 }}>Transit Windows</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sfd-ink-secondary)', marginTop: '4px' }}>{Math.round(totalBufferMins / 15)}</div>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>{totalBufferMins}m buffer time</span>
              </div>

              {nonPayingLessons.length > 0 && (
                <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '16px', border: '1px solid var(--sfd-border-hairline)', textAlign: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', fontWeight: 600 }}>Non-Paying</span>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sfd-ink-secondary)', marginTop: '4px' }}>{nonPayingLessons.length}</div>
                  <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>Excluded £0.00</span>
                </div>
              )}

              <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '16px', border: '1px solid var(--sfd-border-hairline)', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', fontWeight: 600 }}>Efficiency Ratio</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: efficiencyPct >= 80 ? 'var(--sfd-emerald)' : 'var(--sfd-amber)', marginTop: '4px' }}>{efficiencyPct}%</div>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>Workload density</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Daily Agenda & Appointments List */}
        <div className="sfd-sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-surface-nested)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-ink-primary)' }}>
                  <Calendar size={18} />
                </div>
                <h3 className="sfd-card-heading">{selectedDayName} Agenda</h3>
              </div>
              <span className="sfd-card-tag">{dayEvents.length} Appointments</span>
            </div>

            {dayEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--sfd-ink-muted)' }}>
                <Coffee size={32} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>No bookings scheduled for this day.</p>
                <span style={{ fontSize: '12.5px' }}>Enjoy your rest day or open slots for new pupils.</span>
              </div>
            ) : (
              <div className="sfd-agenda-list">
                {dayEvents.map(e => {
                  const sTime = e.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const eTime = e.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isTest = e.summary.toLowerCase().includes('test') || e.summary.toLowerCase().includes('mock') || e.categories.includes('Tests');
                  const isNonPaying = isEventNonPaying(e.summary, nonPayingList);
                  const price = isNonPaying 
                    ? '£0.00' 
                    : isTest && testRate > 0 
                      ? `£${testRate.toFixed(2)}` 
                      : `£${((e.durationMinutes / 60) * hourlyRate).toFixed(2)}`;

                  return (
                    <div 
                      key={e.id} 
                      className="sfd-agenda-item"
                      style={{
                        borderLeft: isTest ? '3px solid #d97706' : isNonPaying ? '3px solid var(--sfd-ink-muted)' : '3px solid var(--sfd-emerald)'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                        <span className="sfd-agenda-time">
                          {sTime} &ndash; {eTime} ({(e.durationMinutes / 60).toFixed(1)}h)
                        </span>
                        <span className="sfd-agenda-desc" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {e.summary}
                        </span>
                      </div>
                      <span className="sfd-agenda-price" style={{ color: isNonPaying ? 'var(--sfd-ink-muted)' : isTest ? '#d97706' : 'var(--sfd-emerald)', flexShrink: 0 }}>
                        {price}
                      </span>
                    </div>
                  );
                })}

                {isShiftSimulated && (
                  <div 
                    className="sfd-agenda-item" 
                    style={{ 
                      background: 'var(--sfd-emerald-soft)', 
                      border: '1px solid var(--sfd-emerald-border)',
                      borderLeft: '3px solid var(--sfd-emerald)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="sfd-agenda-time" style={{ color: 'var(--sfd-emerald)', fontWeight: 700 }}>
                        Optimized Slot Filled
                      </span>
                      <span className="sfd-agenda-desc" style={{ color: '#065f46' }}>
                        New Pupil Slot (1.5h recovered)
                      </span>
                    </div>
                    <span className="sfd-agenda-price" style={{ color: 'var(--sfd-emerald)' }}>
                      +£{(hourlyRate * 1.5).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Privacy Invariant Card */}
          <div className="sfd-card-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--sfd-emerald)' }} />
              <span>Browser-Native Calculation</span>
            </div>
            <p style={{ fontSize: '12.5px', color: 'var(--sfd-ink-muted)', margin: '4px 0 0 0', lineHeight: 1.45 }}>
              All transit buffers, dead gap detection, and shift calculations run 100% inside your browser memory without altering your live Google or Outlook calendar.
            </p>
          </div>

        </div>
      </main>

    </div>
  );
};
