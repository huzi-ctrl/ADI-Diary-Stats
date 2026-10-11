import { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from 'react';
import './design-system-mockup.css';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  Clock, 
  TrendingUp, 
  LayoutDashboard, 
  BarChart3, 
  FolderKanban, 
  Settings, 
  ArrowUpRight,
  RefreshCw,
  ShieldCheck,
  Activity,
  CheckCircle2
} from 'lucide-react';
import type { CalendarEvent } from '../../utils/icsParser';
import { useWeeklyCapacity } from '../../hooks/useWeeklyCapacity';

interface DesignSystemMockupProps {
  onDismissMockup?: () => void;
  isEmbeddedView?: boolean;
  instructorEvents?: CalendarEvent[];
  filteredOutEvents?: CalendarEvent[];
  allInstructorEvents?: CalendarEvent[];
  weekStart?: Date;
  weekEnd?: Date;
  hourlyRate?: number;
  nonPayingList?: string[];
  capacityMode?: 'historical' | 'custom';
  customIdealHours?: Record<number, number>;
}

export function DesignSystemMockup({ 
  onDismissMockup, 
  isEmbeddedView = false,
  instructorEvents = [],
  filteredOutEvents = [],
  allInstructorEvents = [],
  weekStart,
  weekEnd,
  hourlyRate = 45,
  nonPayingList = [],
  capacityMode = 'historical',
  customIdealHours,
}: DesignSystemMockupProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'yearly' | 'explorer' | 'settings'>('weekly');
  const [enableAi, setEnableAi] = useState(true);
  const [weekIndex, setWeekIndex] = useState(41);

  const fallbackNow = useMemo(() => new Date(), []);
  const safeWeekStart = weekStart || fallbackNow;
  const safeWeekEnd = weekEnd || fallbackNow;

  // Real capacity and schedule calculations from user calendar
  const {
    now,
    totalTeachHours,
    lessonsOnly,
    nonPayingLessons,
    nonPayingTeachHours,
    weeklyEarnings,
    testBookings,
    completedWeeklyLessons,
    upcomingWeeklyLessons,
    weeklyLessonsCompletionPct,
    allFutureLessons,
    allFutureTests,
    thisWeekStats,
    nextWeekStats,
    twoWeeksOutStats,
    nextWeekStart,
    twoWeeksOutStart,
    dayOfWeekHours,
    maxDayHours,
    dayIndices,
    dayOfWeekNames,
    timeOfDay: {
      morningCount,
      afternoonCount,
      eveningCount,
      nightCount,
      morningPct,
      afternoonPct,
      eveningPct,
      nightPct,
    },
    formatRemainingThisWeek,
    formatDateShort,
  } = useWeeklyCapacity({
    instructorEvents,
    allInstructorEvents,
    weekStart: safeWeekStart,
    weekEnd: safeWeekEnd,
    hourlyRate,
    nonPayingList,
    capacityMode,
    customIdealHours,
  });

  const dockRef = useRef<HTMLElement>(null);
  const dockTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dockSliderPos, setDockSliderPos] = useState({ left: 0, width: 0, ready: false });

  const headerNavRef = useRef<HTMLElement>(null);
  const headerTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [headerSliderPos, setHeaderSliderPos] = useState({ left: 0, width: 0, ready: false });

  const updateSliders = useCallback(() => {
    const dockBtn = dockTabRefs.current[activeTab];
    if (dockBtn && dockRef.current) {
      setDockSliderPos({
        left: dockBtn.offsetLeft,
        width: dockBtn.offsetWidth,
        ready: true,
      });
    }
    const headerBtn = headerTabRefs.current[activeTab];
    if (headerBtn && headerNavRef.current) {
      setHeaderSliderPos({
        left: headerBtn.offsetLeft,
        width: headerBtn.offsetWidth,
        ready: true,
      });
    }
  }, [activeTab]);

  useLayoutEffect(() => {
    updateSliders();
    const rafId = requestAnimationFrame(updateSliders);
    return () => cancelAnimationFrame(rafId);
  }, [updateSliders]);

  useEffect(() => {
    window.addEventListener('resize', updateSliders);
    return () => window.removeEventListener('resize', updateSliders);
  }, [updateSliders]);

  return (
    <div className="sfd-mockup-root">
      {/* Prototype Pill Banner */}
      <div className="sfd-prototype-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="sfd-prototype-badge">
            <Sparkles size={13} />
            COCKPIT STUDIO
          </span>
          <span className="sfd-prototype-text">
            Schedule & Capacity Intelligence • Real weekly pacing, fill percentages & workload distribution.
          </span>
          {filteredOutEvents.length > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--sfd-primary)', background: 'var(--sfd-primary-soft)', padding: '2px 8px', borderRadius: '9999px', border: '1px solid rgba(29, 78, 216, 0.15)' }}>
              Hidden {filteredOutEvents.length} personal/rest events
            </span>
          )}
        </div>
        {onDismissMockup && (
          <button 
            type="button" 
            className="sfd-prototype-btn-return"
            onClick={onDismissMockup}
            title="Switch back to Weekly View"
          >
            Weekly Dashboard
          </button>
        )}
      </div>

      {/* Fluid Header Card (standalone preview only) */}
      {!isEmbeddedView && (
        <header className="sfd-header">
          <div className="sfd-brand">
            <div className="sfd-brand-symbol">ADI</div>
            <div className="sfd-brand-text">
              <span className="sfd-brand-title hover-serif-switch">DriveStats</span>
              <span className="sfd-brand-sub font-editorial">Effortless Schedule & Capacity Intelligence</span>
            </div>
          </div>

          <div className="sfd-header-controls">
            {/* Kota Liquid Glass Navigation Strip with Animated Toggle Slider */}
            <nav ref={headerNavRef} className="sfd-liquid-glass-strip" aria-label="Header Navigation">
              <div 
                className="sfd-nav-toggle-indicator"
                style={{
                  transform: `translateX(${headerSliderPos.left}px)`,
                  width: `${headerSliderPos.width}px`,
                  opacity: headerSliderPos.ready ? 1 : 0,
                }}
                aria-hidden="true"
              />
              <button
                ref={(el) => { headerTabRefs.current['weekly'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${activeTab === 'weekly' ? 'active' : ''}`}
                onClick={() => setActiveTab('weekly')}
              >
                <span className="sfd-char-wave">
                  {'Weekly'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </button>
              <button
                ref={(el) => { headerTabRefs.current['yearly'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${activeTab === 'yearly' ? 'active' : ''}`}
                onClick={() => setActiveTab('yearly')}
              >
                <span className="sfd-char-wave">
                  {'Yearly'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </button>
              <button
                ref={(el) => { headerTabRefs.current['explorer'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${activeTab === 'explorer' ? 'active' : ''}`}
                onClick={() => setActiveTab('explorer')}
              >
                <span className="sfd-char-wave">
                  {'Explorer'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </button>
              <button
                ref={(el) => { headerTabRefs.current['settings'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${activeTab === 'settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <span className="sfd-char-wave">
                  {'Settings'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </button>
            </nav>

          {/* Week Selector Pill */}
          <div className="sfd-week-chip">
            <button 
              type="button" 
              className="sfd-chip-btn" 
              onClick={() => setWeekIndex(w => Math.max(1, w - 1))}
              title="Previous Week"
              aria-label="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="sfd-week-label">
              Week {weekIndex} • 06 – 12 Oct
            </span>
            <button 
              type="button" 
              className="sfd-chip-btn" 
              onClick={() => setWeekIndex(w => w + 1)}
              title="Next Week"
              aria-label="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* AI Copilot Toggle Pill */}
          <button
            type="button"
            className={`sfd-ai-toggle ${enableAi ? 'active' : ''}`}
            onClick={() => setEnableAi(prev => !prev)}
            title="Toggle contextual AI recommendations"
          >
            <Sparkles size={14} />
            <span>AI Copilot: {enableAi ? 'Active' : 'Off'}</span>
          </button>

          {/* Primary Action Pill */}
          <button 
            type="button" 
            className="sfd-btn-primary sfd-char-hover"
            onClick={() => alert("Syncing Google & Outlook calendars locally...")}
          >
            <RefreshCw size={14} />
            <span className="sfd-char-wave">
              {'Sync Diary'.split('').map((c, i) => (
                <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c === ' ' ? '\u00A0' : c}</span>
              ))}
            </span>
          </button>
        </div>
      </header>
      )}

      {/* Soft Sculpted KPI Cards - Real Weekly Metrics */}
      <section className="sfd-kpi-grid">
        {/* Metric 1: Weekly Lessons */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Weekly Lessons</span>
            <span className="sfd-kpi-badge emerald">
              {lessonsOnly.length > 0 ? `${lessonsOnly.length} booked` : '0 booked'}
            </span>
          </div>
          <div className="sfd-kpi-value">{lessonsOnly.length}</div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub font-editorial">
              {lessonsOnly.length} paid &bull; {nonPayingLessons.length} free
            </span>
          </div>
        </div>

        {/* Metric 2: Billable Teaching Hours */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Teaching Hours</span>
            <span className="sfd-kpi-badge neutral">{totalTeachHours} hrs</span>
          </div>
          <div className="sfd-kpi-value">{totalTeachHours}<span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--sfd-ink-muted)' }}>h</span></div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub font-editorial">
              {totalTeachHours}h paid &bull; {nonPayingTeachHours}h free
            </span>
          </div>
        </div>

        {/* Metric 3: Estimated Revenue */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Weekly Revenue</span>
            <span className="sfd-kpi-badge emerald">£{hourlyRate}/hr</span>
          </div>
          <div className="sfd-kpi-value">£{weeklyEarnings.toLocaleString()}</div>
          <div className="sfd-kpi-meta">
            <ArrowUpRight size={14} style={{ color: 'var(--sfd-emerald)' }} />
            <span className="sfd-kpi-sub font-editorial">
              {totalTeachHours}h @ £{hourlyRate}/hr
            </span>
          </div>
        </div>

        {/* Metric 4: Capacity Fill Rate */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Capacity Fill</span>
            <span className={`sfd-kpi-badge ${thisWeekStats.fillPct >= 75 ? 'emerald' : thisWeekStats.fillPct >= 50 ? 'amber' : 'coral'}`}>
              {thisWeekStats.fillPct}% Utilization
            </span>
          </div>
          <div className="sfd-kpi-value">{thisWeekStats.fillPct}%</div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub font-editorial">
              {thisWeekStats.freeHours.toFixed(1)}h free bandwidth remaining
            </span>
          </div>
        </div>
      </section>

      {/* Main Split: Real Weekly Capacity, Pacing & Pacing Analytics */}
      <main className="sfd-cockpit-split">
        {/* Left Column: Real Weekly Overview Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Upcoming Capacity & Fill Rates */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <TrendingUp size={18} />
                </div>
                <h2 className="sfd-card-heading">Upcoming Capacity & Booking Flow</h2>
              </div>
              <span className="sfd-card-tag">3-Week Capacity Pulse</span>
            </div>

            <p className="sfd-card-description">
              Real-time booking fill percentages and available bandwidth across the active and upcoming weeks.
            </p>

            {/* Active Week Lesson Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--sfd-surface-nested)', padding: '14px 18px', borderRadius: '18px', border: '1px solid var(--sfd-border-hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)', fontWeight: 500 }}>Active Week Lesson Completion</span>
                <span style={{ fontWeight: 700, color: 'var(--sfd-ink-primary)' }}>
                  {completedWeeklyLessons} / {lessonsOnly.length} Completed ({weeklyLessonsCompletionPct}%)
                </span>
              </div>
              <div style={{ height: '12px', background: 'rgba(15, 23, 42, 0.06)', borderRadius: '9999px', overflow: 'hidden', padding: '2px', border: '1px solid var(--sfd-border-hairline)' }}>
                <div style={{ 
                  width: `${weeklyLessonsCompletionPct}%`, 
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669 0%, #2563eb 100%)', 
                  borderRadius: '9999px',
                  transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--sfd-ink-faint)' }}>
                <span>Completed: {completedWeeklyLessons} lessons</span>
                <span>Remaining: {upcomingWeeklyLessons} lessons</span>
              </div>
            </div>

            {/* 3-Week Fill Rate Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
              {/* This Week */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                    This Week ({formatRemainingThisWeek()})
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sfd-emerald)' }}>
                    {thisWeekStats.fillPct}% filled &bull; {thisWeekStats.freeHours.toFixed(1)}h free
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--sfd-surface-nested)', height: '10px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ width: `${Math.min(thisWeekStats.fillPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)', borderRadius: '9999px', transition: 'width 0.8s var(--sfd-ease-fluid)' }} />
                </div>
              </div>

              {/* Next Week */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                    Next Week ({nextWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sfd-primary)' }}>
                    {nextWeekStats.fillPct}% filled &bull; {nextWeekStats.freeHours.toFixed(1)}h free
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--sfd-surface-nested)', height: '10px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ width: `${Math.min(nextWeekStats.fillPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)', borderRadius: '9999px', transition: 'width 0.8s var(--sfd-ease-fluid)' }} />
                </div>
              </div>

              {/* Week After Next */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                    Week after Next ({twoWeeksOutStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#6366f1' }}>
                    {twoWeeksOutStats.fillPct}% filled &bull; {twoWeeksOutStats.freeHours.toFixed(1)}h free
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--sfd-surface-nested)', height: '10px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ width: `${Math.min(twoWeeksOutStats.fillPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)', borderRadius: '9999px', transition: 'width 0.8s var(--sfd-ease-fluid)' }} />
                </div>
              </div>
            </div>

            {/* Future Lesson & Test Pill Counter Badges */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--sfd-surface-nested)', padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--sfd-border-subtle)' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sfd-primary)' }}>{allFutureLessons.length}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sfd-ink-secondary)' }}>All Future Lessons</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--sfd-emerald-soft)', padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--sfd-emerald-border)' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sfd-emerald)' }}>{allFutureTests.length}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sfd-ink-secondary)' }}>Future Practical Tests</span>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Teaching Workload (Monday – Sunday) */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <BarChart3 size={18} />
                </div>
                <h2 className="sfd-card-heading">Weekly Teaching Workload</h2>
              </div>
              <span className="sfd-card-tag">Mon &ndash; Sun Pacing</span>
            </div>

            <p className="sfd-card-description">
              Daily distribution of booked driving lessons throughout the current week.
            </p>

            <div className="sfd-workload-chart">
              {dayIndices.map((dayIdx, i) => {
                const hours = dayOfWeekHours[dayIdx];
                const heightPct = maxDayHours > 0 ? (hours / maxDayHours) * 100 : 0;
                return (
                  <div key={dayIdx} className="sfd-workload-col">
                    <span className="sfd-workload-val">
                      {hours > 0 ? `${hours.toFixed(1)}h` : ''}
                    </span>
                    <div className="sfd-workload-bar-track">
                      <div 
                        className={`sfd-workload-bar ${hours === 0 ? 'empty' : ''}`}
                        style={{ height: hours > 0 ? `${Math.max(heightPct, 8)}%` : '6px' }}
                        title={`${dayOfWeekNames[i]}: ${hours.toFixed(1)} lesson hours`}
                      />
                    </div>
                    <span className="sfd-workload-day">{dayOfWeekNames[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Lesson Time-of-Day Slots */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <Activity size={18} />
                </div>
                <h2 className="sfd-card-heading">Lesson Time-of-Day Slots</h2>
              </div>
              <span className="sfd-card-tag">Slot Distribution</span>
            </div>

            <div className="sfd-timeofday-grid">
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Morning (6am &ndash; 12pm)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-primary)' }}>{morningPct}%</span>
                <span className="sfd-timeofday-sub">{morningCount} slots</span>
              </div>
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Afternoon (12pm &ndash; 6pm)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-ink-primary)' }}>{afternoonPct}%</span>
                <span className="sfd-timeofday-sub">{afternoonCount} slots</span>
              </div>
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Evening (6pm &ndash; 12am)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-emerald)' }}>{eveningPct}%</span>
                <span className="sfd-timeofday-sub">{eveningCount} slots</span>
              </div>
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Night (12am &ndash; 6am)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-amber)' }}>{nightPct}%</span>
                <span className="sfd-timeofday-sub">{nightCount} slots</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Executive Summary & Details */}
        <div className="sfd-sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Active Week Summary */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-surface-nested)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-ink-primary)' }}>
                  <Clock size={18} />
                </div>
                <h3 className="sfd-card-heading">Schedule Summary</h3>
              </div>
              <span className="sfd-card-tag">Active Week</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Week Span</span>
                <strong style={{ color: 'var(--sfd-ink-primary)' }}>{formatDateShort(safeWeekStart)} &ndash; {formatDateShort(safeWeekEnd)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Status As Of</span>
                <span style={{ color: 'var(--sfd-ink-secondary)' }}>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Hourly Rate</span>
                <strong style={{ color: 'var(--sfd-ink-primary)' }}>£{hourlyRate}/hr</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Booked Lessons</span>
                <strong style={{ color: 'var(--sfd-ink-primary)' }}>{lessonsOnly.length} lessons ({totalTeachHours}h)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Free Bandwidth</span>
                <strong style={{ color: 'var(--sfd-emerald)' }}>{thisWeekStats.freeHours.toFixed(1)}h available</strong>
              </div>
              {nonPayingLessons.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--sfd-ink-muted)' }}>Non-Paying</span>
                  <span style={{ color: 'var(--sfd-ink-secondary)' }}>{nonPayingLessons.length} lessons ({nonPayingTeachHours}h)</span>
                </div>
              )}
            </div>

            {/* Health Badge */}
            <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px 16px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--sfd-emerald)' }} />
              <div style={{ fontSize: '13px', color: 'var(--sfd-ink-secondary)', lineHeight: 1.4 }}>
                <strong>Pacing Status:</strong> {thisWeekStats.fillPct >= 80 ? 'High booking capacity week.' : thisWeekStats.fillPct >= 50 ? 'Well-balanced teaching schedule.' : 'Open lesson slots available for new students.'}
              </div>
            </div>
          </div>

          {/* Card: Tests & Practical Exams */}
          {testBookings.length > 0 && (
            <div className="sfd-card-container">
              <div className="sfd-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e' }}>
                    <Calendar size={18} />
                  </div>
                  <h3 className="sfd-card-heading">Practical Driving Tests</h3>
                </div>
                <span className="sfd-card-tag" style={{ color: '#92400e' }}>{testBookings.length} This Week</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--sfd-ink-muted)', margin: 0, lineHeight: 1.5 }}>
                You have {testBookings.length} driving test appointments scheduled this week ({allFutureTests.length} total across calendar).
              </p>
            </div>
          )}

          {/* Local-First Privacy Card */}
          <div className="sfd-card-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
              <ShieldCheck size={16} style={{ color: 'var(--sfd-emerald)' }} />
              <span>100% Client-Side Privacy</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--sfd-ink-muted)', margin: 0, lineHeight: 1.5 }}>
              All parsing, buffer calculations, and capacity analytics run locally in your browser. No student data ever touches external servers.
            </p>
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigation Dock with Smooth Glass Frosting (standalone preview only) */}
      {!isEmbeddedView && (
        <footer className="sfd-dock-container">
          <nav ref={dockRef} className="sfd-dock" aria-label="Navigation Dock">
            <div 
              className="sfd-dock-slider"
              style={{
                transform: `translateX(${dockSliderPos.left}px)`,
                width: `${dockSliderPos.width}px`,
                opacity: dockSliderPos.ready ? 1 : 0,
              }}
              aria-hidden="true"
            />
            <button 
              ref={(el) => { dockTabRefs.current['weekly'] = el; }}
              type="button" 
              className={`sfd-dock-btn sfd-char-hover ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              <LayoutDashboard size={16} />
              <span className="sfd-char-wave">
                {'Weekly'.split('').map((c, i) => (
                  <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                ))}
              </span>
            </button>

            <button 
              ref={(el) => { dockTabRefs.current['yearly'] = el; }}
              type="button" 
              className={`sfd-dock-btn sfd-char-hover ${activeTab === 'yearly' ? 'active' : ''}`}
              onClick={() => setActiveTab('yearly')}
            >
              <BarChart3 size={16} />
              <span className="sfd-char-wave">
                {'Yearly'.split('').map((c, i) => (
                  <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                ))}
              </span>
            </button>

            <button 
              ref={(el) => { dockTabRefs.current['explorer'] = el; }}
              type="button" 
              className={`sfd-dock-btn sfd-char-hover ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              <FolderKanban size={16} />
              <span className="sfd-char-wave">
                {'Explorer'.split('').map((c, i) => (
                  <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                ))}
              </span>
            </button>

            <button 
              ref={(el) => { dockTabRefs.current['settings'] = el; }}
              type="button" 
              className={`sfd-dock-btn sfd-char-hover ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span className="sfd-char-wave">
                {'Settings'.split('').map((c, i) => (
                  <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                ))}
              </span>
            </button>
          </nav>
        </footer>
      )}
    </div>
  );
}
