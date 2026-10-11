import { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';

interface DesignSystemMockupProps {
  onDismissMockup?: () => void;
}

export function DesignSystemMockup({ onDismissMockup }: DesignSystemMockupProps) {
  const [activeTab, setActiveTab] = useState<'weekly' | 'yearly' | 'explorer' | 'settings'>('weekly');
  const [enableAi, setEnableAi] = useState(true);
  const [weekIndex, setWeekIndex] = useState(41);
  const [isShiftSimulated, setIsShiftSimulated] = useState(false);

  // Dynamic values that update when simulating AI recommendation
  const billableHours = isShiftSimulated ? '35.0h' : '33.0h';
  const billableRevenue = isShiftSimulated ? '£1,575.00' : '£1,485.00';
  const deadGapHours = isShiftSimulated ? '0.75h' : '2.50h';
  const fillRate = isShiftSimulated ? '92.1%' : '86.8%';

  return (
    <div className="sfd-mockup-root">
      {/* Prototype Pill Banner */}
      <div className="sfd-prototype-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="sfd-prototype-badge">
            <Sparkles size={13} />
            UNSEEN.CO SMOOTH CRAFT
          </span>
          <span className="sfd-prototype-text">
            Sculpted organic curves, soft ambient light, fluid pill controls & serene editorial clarity.
          </span>
        </div>
        {onDismissMockup && (
          <button 
            type="button" 
            className="sfd-prototype-btn-return"
            onClick={onDismissMockup}
            title="Switch back to classic view"
          >
            Classic View
          </button>
        )}
      </div>

      {/* Fluid Header Card */}
      <header className="sfd-header">
        <div className="sfd-brand">
          <div className="sfd-brand-symbol">ADI</div>
          <div className="sfd-brand-text">
            <span className="sfd-brand-title">DriveStats</span>
            <span className="sfd-brand-sub">Effortless Schedule & Capacity Intelligence</span>
          </div>
        </div>

        <div className="sfd-header-controls">
          {/* Kota Liquid Glass Navigation Strip */}
          <nav className="sfd-liquid-glass-strip" aria-label="Header Navigation">
            <button
              type="button"
              className={`sfd-strip-btn ${activeTab === 'weekly' ? 'active' : ''}`}
              onClick={() => setActiveTab('weekly')}
            >
              Weekly
            </button>
            <button
              type="button"
              className={`sfd-strip-btn ${activeTab === 'yearly' ? 'active' : ''}`}
              onClick={() => setActiveTab('yearly')}
            >
              Yearly
            </button>
            <button
              type="button"
              className={`sfd-strip-btn ${activeTab === 'explorer' ? 'active' : ''}`}
              onClick={() => setActiveTab('explorer')}
            >
              Explorer
            </button>
            <button
              type="button"
              className={`sfd-strip-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
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
            className="sfd-btn-primary"
            onClick={() => alert("Syncing Google & Outlook calendars locally...")}
          >
            <RefreshCw size={14} />
            <span>Sync Diary</span>
          </button>
        </div>
      </header>

      {/* Soft Sculpted KPI Cards */}
      <section className="sfd-kpi-grid">
        {/* Metric 1: Billable Revenue */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Weekly Revenue</span>
            <span className="sfd-kpi-badge emerald">
              {isShiftSimulated ? '+14.8% YoY' : '+8.4% YoY'}
            </span>
          </div>
          <div className="sfd-kpi-value">{billableRevenue}</div>
          <div className="sfd-kpi-meta">
            <ArrowUpRight size={14} style={{ color: 'var(--sfd-emerald)' }} />
            <span>{isShiftSimulated ? '16 appointments • £45/hr' : '15 appointments • £45/hr'}</span>
          </div>
        </div>

        {/* Metric 2: Billable Hours */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Billable Hours</span>
            <span className="sfd-kpi-badge emerald">{fillRate} Capacity</span>
          </div>
          <div className="sfd-kpi-value">{billableHours}</div>
          <div className="sfd-kpi-meta">
            <span>Goal: 38.0h ideal target</span>
          </div>
        </div>

        {/* Metric 3: Travel Buffers */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Transit Windows</span>
            <span className="sfd-kpi-badge amber">15m Standard</span>
          </div>
          <div className="sfd-kpi-value">3.75h</div>
          <div className="sfd-kpi-meta">
            <span>Automated travel buffers</span>
          </div>
        </div>

        {/* Metric 4: Dead Gaps */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Unusable Gaps</span>
            <span className={`sfd-kpi-badge ${isShiftSimulated ? 'emerald' : 'coral'}`}>
              {isShiftSimulated ? 'Optimal' : 'Recoverable'}
            </span>
          </div>
          <div className="sfd-kpi-value" style={{ color: isShiftSimulated ? 'var(--sfd-emerald)' : 'var(--sfd-coral)' }}>
            {deadGapHours}
          </div>
          <div className="sfd-kpi-meta">
            <span>{isShiftSimulated ? 'Schedule fully smoothed' : 'Gaps under 90 minutes'}</span>
          </div>
        </div>
      </section>

      {/* Main Split: Smooth Visualizer + Agenda */}
      <main className="sfd-cockpit-split">
        {/* Left Column: Schedule Capacity Timeline Visualizer */}
        <div className="sfd-card-container">
          <div className="sfd-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                <Calendar size={18} />
              </div>
              <h2 className="sfd-card-heading">Friday Schedule & Capacity Flow</h2>
            </div>
            <span className="sfd-card-tag">08:00 – 18:00 Span</span>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--sfd-ink-secondary)', margin: 0 }}>
            Real-time visualization of booked appointments, injected 15-minute transit buffers, and unbookable calendar gaps.
          </p>

          {/* Fluid Capsule Timeline Track */}
          <div className="sfd-timeline-box">
            <div className="sfd-timeline-scale">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
            </div>

            <div className="sfd-timeline-track" title="Hover capsules to inspect lesson details">
              {/* 08:30 - 10:30 Lesson Sarah M. */}
              <div 
                className="sfd-time-block sfd-time-lesson" 
                style={{ width: '22%' }}
                title="08:30 - 10:30: Sarah M. (2h Lesson • £90.00)"
              >
                Sarah M. (2h)
              </div>

              {/* 10:30 - 10:45 Buffer */}
              <div 
                className="sfd-time-block sfd-time-buffer" 
                style={{ width: '4%' }}
                title="10:30 - 10:45: 15m Transit Window"
              >
                15m
              </div>

              {/* 10:45 - 12:45 Lesson James B. */}
              <div 
                className="sfd-time-block sfd-time-lesson" 
                style={{ width: '22%' }}
                title="10:45 - 12:45: James B. (2h Lesson • £90.00)"
              >
                James B. (2h)
              </div>

              {/* 12:45 - 13:00 Buffer */}
              <div 
                className="sfd-time-block sfd-time-buffer" 
                style={{ width: '4%' }}
                title="12:45 - 13:00: 15m Transit Window"
              >
                15m
              </div>

              {/* Fragmented Dead Gap vs Shifted Slot */}
              {isShiftSimulated ? (
                <>
                  {/* Recovered lesson slot! */}
                  <div 
                    className="sfd-time-block sfd-time-lesson" 
                    style={{ width: '20%' }}
                    title="13:00 - 14:45: Recovered Lesson Slot (+£78.75)"
                  >
                    +Slot Booked (1.75h)
                  </div>
                  <div 
                    className="sfd-time-block sfd-time-buffer" 
                    style={{ width: '4%' }}
                    title="14:45 - 15:00: Transit Window"
                  >
                    15m
                  </div>
                  <div 
                    className="sfd-time-block sfd-time-lesson" 
                    style={{ width: '24%' }}
                    title="15:00 - 17:00: David K. (2h Mock Test • £90.00)"
                  >
                    David K. (2h Mock)
                  </div>
                </>
              ) : (
                <>
                  {/* Unusable Dead Gap: 13:00 - 14:15 */}
                  <div 
                    className="sfd-time-block sfd-time-deadgap" 
                    style={{ width: '15%' }}
                    title="13:00 - 14:15: Unusable Gap (1h 15m) • Too short for standard lesson"
                  >
                    Unusable Gap (1h 15m)
                  </div>

                  {/* 14:15 - 16:15 Lesson David K. */}
                  <div 
                    className="sfd-time-block sfd-time-lesson" 
                    style={{ width: '22%' }}
                    title="14:15 - 16:15: David K. (2h Mock Test • £90.00)"
                  >
                    David K. (2h Mock)
                  </div>

                  {/* Buffer */}
                  <div 
                    className="sfd-time-block sfd-time-buffer" 
                    style={{ width: '4%' }}
                    title="16:15 - 16:30: Transit Window"
                  >
                    15m
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Timeline Legend */}
          <div className="sfd-timeline-legend">
            <div className="sfd-legend-item">
              <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-emerald)' }} />
              <span>Billable Lessons</span>
            </div>
            <div className="sfd-legend-item">
              <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-amber-soft)', border: '1px dashed var(--sfd-amber)' }} />
              <span>15m Travel Buffers</span>
            </div>
            <div className="sfd-legend-item">
              <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-coral-soft)', border: '1px dashed var(--sfd-coral)' }} />
              <span>Unusable Gaps (&lt; 90m)</span>
            </div>
          </div>

          {/* Editorial AI Insight Card */}
          {enableAi && (
            <div className="sfd-ai-badge">
              <div className="sfd-ai-badge-top">
                <span className="sfd-ai-badge-title">
                  <Sparkles size={15} />
                  Contextual Schedule Opportunity
                </span>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>
                  Executive Copilot
                </span>
              </div>

              <p className="sfd-ai-badge-body">
                {isShiftSimulated ? (
                  <>
                    <strong style={{ color: 'var(--sfd-emerald)' }}>Optimization Active:</strong> By shifting David K., you unlocked a continuous 1 hour 45 minute lesson opening at 13:00. Weekly billable earnings increased by £90.00.
                  </>
                ) : (
                  <>
                    You have an unbookable <strong>1h 15m gap</strong> between 13:00 and 14:15 on Friday. Moving David K. back by 45 minutes joins this fragmented time into a bookable 1h 45m lesson opening.
                  </>
                )}
              </p>

              <div className="sfd-ai-badge-action-bar">
                <button
                  type="button"
                  className="sfd-ai-badge-action-btn"
                  onClick={() => setIsShiftSimulated(prev => !prev)}
                >
                  {isShiftSimulated ? 'Reset to Original Schedule' : 'Simulate Schedule Shift (+£90.00)'}
                </button>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>
                  {isShiftSimulated ? 'Revenue recalculated dynamically' : 'Pure simulation • No calendar changes made'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Daily Agenda */}
        <div className="sfd-sidebar-col">
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-surface-nested)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-ink-primary)' }}>
                  <Clock size={18} />
                </div>
                <h3 className="sfd-card-heading">Friday Agenda</h3>
              </div>
              <span className="sfd-card-tag">{isShiftSimulated ? '4 Lessons' : '3 Lessons'}</span>
            </div>

            <div className="sfd-agenda-list">
              <div className="sfd-agenda-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="sfd-agenda-time">08:30 – 10:30</span>
                  <span className="sfd-agenda-desc">Sarah M. (Standard 2h)</span>
                </div>
                <span className="sfd-agenda-price">£90</span>
              </div>

              <div className="sfd-agenda-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="sfd-agenda-time">10:45 – 12:45</span>
                  <span className="sfd-agenda-desc">James B. (Manoeuvres)</span>
                </div>
                <span className="sfd-agenda-price">£90</span>
              </div>

              {isShiftSimulated && (
                <div className="sfd-agenda-item" style={{ background: 'var(--sfd-emerald-soft)', border: '1px solid var(--sfd-emerald-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="sfd-agenda-time" style={{ color: 'var(--sfd-emerald)' }}>13:00 – 14:45</span>
                    <span className="sfd-agenda-desc">New Pupil (Slot Filled)</span>
                  </div>
                  <span className="sfd-agenda-price" style={{ color: 'var(--sfd-emerald)' }}>+£90</span>
                </div>
              )}

              <div className="sfd-agenda-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="sfd-agenda-time">{isShiftSimulated ? '15:00 – 17:00' : '14:15 – 16:15'}</span>
                  <span className="sfd-agenda-desc">David K. (DVSA Mock Test)</span>
                </div>
                <span className="sfd-agenda-price">£90</span>
              </div>
            </div>

            {/* Subtle Bottleneck Callout */}
            <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px 16px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={16} style={{ color: 'var(--sfd-primary)' }} />
              <div style={{ fontSize: '13px', color: 'var(--sfd-ink-secondary)', lineHeight: 1.4 }}>
                <strong>Bottleneck Day:</strong> Friday accounts for 42% of your weekly unbookable gaps.
              </div>
            </div>
          </div>

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

      {/* Floating Bottom Navigation Dock with Smooth Glass Frosting */}
      <footer className="sfd-dock-container">
        <nav className="sfd-dock" aria-label="Navigation Dock">
          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <LayoutDashboard size={16} />
            <span>Weekly</span>
          </button>

          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'yearly' ? 'active' : ''}`}
            onClick={() => setActiveTab('yearly')}
          >
            <BarChart3 size={16} />
            <span>Yearly</span>
          </button>

          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            <FolderKanban size={16} />
            <span>Explorer</span>
          </button>

          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={16} />
            <span>Settings</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
