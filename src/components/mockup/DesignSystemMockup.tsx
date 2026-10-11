import { useState } from 'react';
import './design-system-mockup.css';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertCircle, 
  TrendingUp, 
  LayoutDashboard, 
  BarChart3, 
  FolderKanban, 
  Settings, 
  ArrowUpRight,
  RefreshCw,
  CheckCircle2
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
      {/* Prototype Context Banner */}
      <div className="sfd-prototype-banner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span className="sfd-prototype-badge">
            <Sparkles size={12} />
            DESIGN PROTOTYPE
          </span>
          <span className="sfd-prototype-text">
            <strong>Swiss Flight Deck Mockup:</strong> 1px hairlines, Swiss Grotesque typography, tabular numerals, daylight contrast & in-column AI.
          </span>
        </div>
        {onDismissMockup && (
          <button 
            type="button" 
            className="sfd-prototype-btn-return"
            onClick={onDismissMockup}
            title="Switch back to current app view"
          >
            Switch to Classic View
          </button>
        )}
      </div>

      {/* Cockpit Master Header */}
      <header className="sfd-header">
        <div className="sfd-brand">
          <div className="sfd-brand-symbol">ADI</div>
          <div className="sfd-brand-text">
            <span className="sfd-brand-title">DriveStats ADI</span>
            <span className="sfd-brand-sub">Approved Driving Instructor Schedule Analytics</span>
          </div>
        </div>

        <div className="sfd-header-controls">
          {/* Week Selector Chip */}
          <div className="sfd-week-chip">
            <button 
              type="button" 
              className="sfd-chip-btn" 
              onClick={() => setWeekIndex(w => Math.max(1, w - 1))}
              title="Previous Week"
              aria-label="Previous Week"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="sfd-week-label">
              Week {weekIndex}: 06 Oct – 12 Oct
            </span>
            <button 
              type="button" 
              className="sfd-chip-btn" 
              onClick={() => setWeekIndex(w => w + 1)}
              title="Next Week"
              aria-label="Next Week"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* AI Copilot Master Toggle */}
          <button
            type="button"
            className={`sfd-ai-toggle ${enableAi ? 'active' : ''}`}
            onClick={() => setEnableAi(prev => !prev)}
            title="Toggle embedded AI copilot callouts across all columns"
          >
            <Sparkles size={13} />
            <span>AI Copilot: {enableAi ? 'ON' : 'OFF'}</span>
          </button>

          {/* Primary Action Button */}
          <button 
            type="button" 
            className="sfd-btn-primary"
            onClick={() => alert("Syncing Google & Outlook calendar diaries locally...")}
          >
            <RefreshCw size={13} />
            <span>Sync Live</span>
          </button>
        </div>
      </header>

      {/* 4-Column High-Glare KPI Summary Cards */}
      <section className="sfd-kpi-grid">
        {/* Metric 1: Billable Revenue */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Billable Revenue</span>
            <span className="sfd-kpi-badge emerald">
              {isShiftSimulated ? '+14.8% YoY' : '+8.4% YoY'}
            </span>
          </div>
          <div className="sfd-kpi-value">{billableRevenue}</div>
          <div className="sfd-kpi-meta">
            <ArrowUpRight size={13} style={{ color: 'var(--sfd-emerald)' }} />
            <span>{isShiftSimulated ? '16 lessons booked • £45/hr' : '15 lessons booked • £45/hr'}</span>
          </div>
        </div>

        {/* Metric 2: Billable Hours */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Billable Hours</span>
            <span className="sfd-kpi-badge emerald">{fillRate} Fill</span>
          </div>
          <div className="sfd-kpi-value">{billableHours}</div>
          <div className="sfd-kpi-meta">
            <span>Target: 38.0h weekly capacity</span>
          </div>
        </div>

        {/* Metric 3: Travel Buffers */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Transit Buffers</span>
            <span className="sfd-kpi-badge amber">15m Standard</span>
          </div>
          <div className="sfd-kpi-value">3.75h</div>
          <div className="sfd-kpi-meta">
            <span>15 buffer windows injected</span>
          </div>
        </div>

        {/* Metric 4: Dead Gaps */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Unusable Dead Gaps</span>
            <span className={`sfd-kpi-badge ${isShiftSimulated ? 'emerald' : 'crimson'}`}>
              {isShiftSimulated ? 'Optimized' : 'High Friction'}
            </span>
          </div>
          <div className="sfd-kpi-value" style={{ color: isShiftSimulated ? 'var(--sfd-emerald)' : 'var(--sfd-crimson)' }}>
            {deadGapHours}
          </div>
          <div className="sfd-kpi-meta">
            <AlertCircle size={13} style={{ color: isShiftSimulated ? 'var(--sfd-emerald)' : 'var(--sfd-crimson)' }} />
            <span>{isShiftSimulated ? 'Gaps reduced below threshold' : 'Gaps < 90m unbookable'}</span>
          </div>
        </div>
      </section>

      {/* Main Cockpit Split: Left Workday Visualizer + Right Daily Agenda */}
      <main className="sfd-cockpit-split">
        {/* Left Column: Schedule Capacity Timeline Visualizer */}
        <div className="sfd-card-container">
          <div className="sfd-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} style={{ color: 'var(--sfd-primary)' }} />
              <h2 className="sfd-card-heading">Friday Cockpit Capacity Visualizer</h2>
            </div>
            <span className="sfd-card-tag">08:00 – 18:00 Span</span>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--sfd-ink-secondary)', margin: 0 }}>
            Visual representation of lessons, required 15-minute inter-lesson travel windows, and fragmented unbookable dead gaps.
          </p>

          {/* Timeline Visualizer Track */}
          <div className="sfd-timeline-box">
            <div className="sfd-timeline-scale">
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
              <span>18:00</span>
            </div>

            <div className="sfd-timeline-track" title="Hover blocks to inspect schedule allocation">
              {/* 08:30 - 10:30 Lesson Sarah M. (20%) */}
              <div 
                className="sfd-time-block sfd-time-lesson" 
                style={{ width: '22%' }}
                title="08:30 - 10:30: Sarah M. (2h Lesson - £90.00)"
              >
                Sarah M. (2h)
              </div>

              {/* 10:30 - 10:45 Buffer (3%) */}
              <div 
                className="sfd-time-block sfd-time-buffer" 
                style={{ width: '4%' }}
                title="10:30 - 10:45: 15m Travel Buffer"
              >
                15m
              </div>

              {/* 10:45 - 12:45 Lesson James B. (22%) */}
              <div 
                className="sfd-time-block sfd-time-lesson" 
                style={{ width: '22%' }}
                title="10:45 - 12:45: James B. (2h Lesson - £90.00)"
              >
                James B. (2h)
              </div>

              {/* 12:45 - 13:00 Buffer (3%) */}
              <div 
                className="sfd-time-block sfd-time-buffer" 
                style={{ width: '4%' }}
                title="12:45 - 13:00: 15m Travel Buffer"
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
                    title="13:00 - 14:45: Recovered Bookable Slot (+£78.75)"
                  >
                    +New Pupil (1.75h)
                  </div>
                  <div 
                    className="sfd-time-block sfd-time-buffer" 
                    style={{ width: '4%' }}
                    title="14:45 - 15:00: Travel Buffer"
                  >
                    15m
                  </div>
                  <div 
                    className="sfd-time-block sfd-time-lesson" 
                    style={{ width: '24%' }}
                    title="15:00 - 17:00: David K. (2h Mock Test - £90.00)"
                  >
                    David K. (2h Mock)
                  </div>
                </>
              ) : (
                <>
                  {/* Unusable Dead Gap: 13:00 - 14:15 (14%) */}
                  <div 
                    className="sfd-time-block sfd-time-deadgap" 
                    style={{ width: '15%' }}
                    title="13:00 - 14:15: Unusable Dead Gap (1h 15m) - Too short for 2h lesson"
                  >
                    Dead Gap (1h 15m)
                  </div>

                  {/* 14:15 - 16:15 Lesson David K. (22%) */}
                  <div 
                    className="sfd-time-block sfd-time-lesson" 
                    style={{ width: '22%' }}
                    title="14:15 - 16:15: David K. (2h Mock Test - £90.00)"
                  >
                    David K. (2h Mock)
                  </div>

                  {/* Buffer (4%) */}
                  <div 
                    className="sfd-time-block sfd-time-buffer" 
                    style={{ width: '4%' }}
                    title="16:15 - 16:30: Travel Buffer"
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
              <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-amber)', border: '1px dashed var(--sfd-amber)' }} />
              <span>15m Travel Buffers</span>
            </div>
            <div className="sfd-legend-item">
              <span className="sfd-legend-swatch" style={{ background: 'var(--sfd-crimson)', border: '1px dashed var(--sfd-crimson)' }} />
              <span>Unusable Dead Gaps (&lt; 90m)</span>
            </div>
          </div>

          {/* In-Column Diagnostic AI Badge (embedded directly within this column) */}
          {enableAi && (
            <div className="sfd-ai-badge">
              <div className="sfd-ai-badge-top">
                <span className="sfd-ai-badge-title">
                  <Sparkles size={13} />
                  In-Column Capacity Diagnostic
                </span>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', fontFamily: 'var(--sfd-font-mono)' }}>
                  Client-side Gemini 2.5 Flash
                </span>
              </div>

              <p className="sfd-ai-badge-body">
                {isShiftSimulated ? (
                  <>
                    <strong style={{ color: 'var(--sfd-emerald)' }}>Optimization Applied:</strong> Shifting David K. recovered a 1h 45m lesson window at 13:00. Weekly billable revenue increased by £90.00 with dead gaps eliminated.
                  </>
                ) : (
                  <>
                    Friday carries <strong>1 hour 15 minutes of dead gap</strong> between 13:00 and 14:15. Because driving lessons require 1.5 to 2 hours plus transit, this time cannot be booked. Shifting David K. 45 min later or 30 min earlier opens a continuous 1h 45m pupil slot.
                  </>
                )}
              </p>

              <div className="sfd-ai-badge-action-bar">
                <button
                  type="button"
                  className="sfd-ai-badge-action-btn"
                  onClick={() => setIsShiftSimulated(prev => !prev)}
                >
                  {isShiftSimulated ? 'Reset Schedule to Original' : 'Simulate Schedule Shift (+£90.00)'}
                </button>
                <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)' }}>
                  {isShiftSimulated ? 'Revenue recalculated in real-time' : 'Zero diary changes made to remote calendar'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Daily Agenda & Quick Metrics */}
        <div className="sfd-sidebar-col">
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} style={{ color: 'var(--sfd-primary)' }} />
                <h3 className="sfd-card-heading">Friday Lessons</h3>
              </div>
              <span className="sfd-card-tag">{isShiftSimulated ? '4 Appointments' : '3 Appointments'}</span>
            </div>

            <div className="sfd-agenda-list">
              <div className="sfd-agenda-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="sfd-agenda-time">08:30 – 10:30</span>
                  <span className="sfd-agenda-desc">Sarah M. (Standard 2h)</span>
                </div>
                <span className="sfd-agenda-price">£90.00</span>
              </div>

              <div className="sfd-agenda-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="sfd-agenda-time">10:45 – 12:45</span>
                  <span className="sfd-agenda-desc">James B. (Manoeuvres)</span>
                </div>
                <span className="sfd-agenda-price">£90.00</span>
              </div>

              {isShiftSimulated && (
                <div className="sfd-agenda-item" style={{ background: 'var(--sfd-emerald-bg)', borderColor: 'var(--sfd-emerald-border)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="sfd-agenda-time" style={{ color: 'var(--sfd-emerald)' }}>13:00 – 14:45</span>
                    <span className="sfd-agenda-desc">New Pupil (Slot Filled)</span>
                  </div>
                  <span className="sfd-agenda-price">+£90.00</span>
                </div>
              )}

              <div className="sfd-agenda-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="sfd-agenda-time">{isShiftSimulated ? '15:00 – 17:00' : '14:15 – 16:15'}</span>
                  <span className="sfd-agenda-desc">David K. (DVSA Mock Test)</span>
                </div>
                <span className="sfd-agenda-price">£90.00</span>
              </div>
            </div>

            {/* Quick Bottleneck summary badge */}
            <div style={{ background: 'var(--sfd-surface-nested)', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--sfd-border-hairline)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={15} style={{ color: 'var(--sfd-primary)' }} />
              <div style={{ fontSize: '12px', color: 'var(--sfd-ink-secondary)' }}>
                <strong>Bottleneck Day:</strong> Friday accounts for 42% of your weekly unbookable gaps.
              </div>
            </div>
          </div>

          {/* Privacy & Engine Invariant Card */}
          <div className="sfd-card-container" style={{ background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
              <CheckCircle2 size={14} style={{ color: 'var(--sfd-emerald)' }} />
              <span>Strict Privacy Invariant</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', margin: 0, lineHeight: 1.4 }}>
              All parsing, buffer calculations, and financial analytics occur strictly in your browser memory. No calendar data ever touches remote servers.
            </p>
          </div>
        </div>
      </main>

      {/* Mobile Floating Bottom Dock with Morphing Spring Pill Indicator */}
      <footer className="sfd-dock-container">
        <nav className="sfd-dock" aria-label="Navigation Dock">
          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveTab('weekly')}
          >
            <LayoutDashboard size={15} />
            <span>Weekly</span>
          </button>

          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'yearly' ? 'active' : ''}`}
            onClick={() => setActiveTab('yearly')}
          >
            <BarChart3 size={15} />
            <span>Yearly</span>
          </button>

          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            <FolderKanban size={15} />
            <span>Explorer</span>
          </button>

          <button 
            type="button" 
            className={`sfd-dock-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>
        </nav>
      </footer>
    </div>
  );
}
