import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { OnboardingWizard } from './components/OnboardingWizard';
import { StatsDashboard } from './components/StatsDashboard';
import { EventList } from './components/EventList';
import { YearlyStats } from './components/YearlyStats';
import { AIInsights } from './components/AIInsights';
import { LegalModal } from './components/LegalModal';
import { LayoutDashboard, List, LogOut, ChevronLeft, ChevronRight, RefreshCw, TrendingUp, Settings, Sun, Moon, Sparkles } from 'lucide-react';
import { useUserSettings } from './hooks/useUserSettings';
import { useCalendarData } from './hooks/useCalendarData';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { MagneticPill } from './components/ui/MagneticPill';

import './components/mockup/design-system-mockup.css';

type ViewMode = 'dashboard' | 'yearly' | 'events' | 'ai' | 'settings';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [legalModal, setLegalModal] = useState<'privacy' | 'tos' | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('policy') === 'privacy') return 'privacy';
    if (params.get('policy') === 'tos') return 'tos';
    return null;
  });

  // Decoupled user settings and theme management
  const {
    hourlyRate,
    setHourlyRate,
    nonPayingStudents,
    setNonPayingStudents,
    nonPayingList,
    theme,
    toggleTheme,
    capacityMode,
    setCapacityMode,
    customIdealHours,
    setCustomIdealHours,
    enableAiInsights,
    setEnableAiInsights,
    aiProvider,
    setAiProvider,
    aiModel,
    setAiModel,
    aiApiKey,
    setAiApiKey,
    googleClientId,
    outlookClientId,
  } = useUserSettings();

  // Navigation action bridge for safe callback execution
  const weekNavActionsRef = useRef<{
    setWeekStart: (d: Date) => void;
    resetYear: () => void;
  }>({
    setWeekStart: () => {},
    resetYear: () => {},
  });

  const onWeekCalculated = useCallback((newDate: Date) => {
    weekNavActionsRef.current.setWeekStart(newDate);
  }, []);

  const onResetView = useCallback(() => {
    setViewMode('dashboard');
    weekNavActionsRef.current.resetYear();
  }, []);

  // Decoupled calendar data, ingestion, and OAuth
  const {
    fileName,
    instructorEvents,
    filteredOutEvents,
    availableYears,
    isSyncing,
    syncError,
    onboardingComplete,
    setOnboardingComplete,
    onboardingStep,
    setOnboardingStep,
    accessToken,
    tokenType,
    calendarUrl,
    setCalendarUrl,
    handleSyncLiveCalendar,
    handleFetchEventsForCalendar,
    handleConnectGoogle,
    handleConnectOutlook,
    handleDisconnectLiveSync,
    handleClear,
    handleFileParsed,
  } = useCalendarData(onWeekCalculated, onResetView);

  // Decoupled Monday-aligned week navigation
  const {
    currentWeekStart,
    setCurrentWeekStart,
    weekEnd,
    weekRangeLabel,
    selectedYear,
    setSelectedYear,
    handlePrevWeek,
    handleNextWeek,
    handleCurrentWeek,
    weekInstructorEvents,
    weekFilteredOutEvents,
    filteredYearlyEvents,
  } = useWeekNavigation(instructorEvents, filteredOutEvents);

  useEffect(() => {
    weekNavActionsRef.current.setWeekStart = setCurrentWeekStart;
    weekNavActionsRef.current.resetYear = () => setSelectedYear(null);
  }, [setCurrentWeekStart, setSelectedYear]);

  // Sliding toggle indicator physics for liquid glass navigation strip
  const navStripRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicatorPos, setIndicatorPos] = useState({ left: 0, width: 0, ready: false });

  const updateIndicator = useCallback(() => {
    const currentBtn = tabRefs.current[viewMode];
    const container = navStripRef.current;
    if (currentBtn && container) {
      setIndicatorPos({
        left: currentBtn.offsetLeft,
        width: currentBtn.offsetWidth,
        ready: true,
      });
    }
  }, [viewMode]);

  useLayoutEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    return () => cancelAnimationFrame(rafId);
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div className="sfd-mockup-root">
      {/* Master Fluid Header */}
      <header className="sfd-header">
        <div className="sfd-brand">
          <div className="sfd-brand-symbol">
            <img src="/favicon.png" alt="ADI stats logo" style={{ height: '26px', width: '26px', objectFit: 'contain' }} />
          </div>
          <div className="sfd-brand-text">
            <span className="sfd-brand-title hover-serif-switch">ADI stats</span>
            <span className="sfd-brand-sub font-editorial">Approved Driving Instructor Schedule Analytics</span>
          </div>
        </div>

        <div className="sfd-header-controls">
          {/* Kota Liquid Glass Navigation Strip with Animated Toggle Slider */}
          {onboardingComplete && (
            <nav ref={navStripRef} className="sfd-liquid-glass-strip" aria-label="Main Navigation">
              <div 
                className="sfd-nav-toggle-indicator"
                style={{
                  transform: `translateX(${indicatorPos.left}px)`,
                  width: `${indicatorPos.width}px`,
                  opacity: indicatorPos.ready ? 1 : 0,
                }}
                aria-hidden="true"
              />
              <MagneticPill
                ref={(el) => { tabRefs.current['dashboard'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${viewMode === 'dashboard' ? 'active' : ''}`}
                onClick={() => setViewMode('dashboard')}
              >
                <LayoutDashboard size={14} />
                <span className="sfd-char-wave">
                  {'Weekly'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </MagneticPill>
              <MagneticPill
                ref={(el) => { tabRefs.current['yearly'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${viewMode === 'yearly' ? 'active' : ''}`}
                onClick={() => setViewMode('yearly')}
              >
                <TrendingUp size={14} />
                <span className="sfd-char-wave">
                  {'Yearly'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </MagneticPill>
              <MagneticPill
                ref={(el) => { tabRefs.current['events'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${viewMode === 'events' ? 'active' : ''}`}
                onClick={() => setViewMode('events')}
              >
                <List size={14} />
                <span className="sfd-char-wave">
                  {'Explorer'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </MagneticPill>
              {enableAiInsights && (
                <MagneticPill
                  ref={(el) => { tabRefs.current['ai'] = el; }}
                  type="button"
                  className={`sfd-strip-btn sfd-char-hover ${viewMode === 'ai' ? 'active' : ''}`}
                  onClick={() => setViewMode('ai')}
                >
                  <Sparkles size={14} />
                  <span className="sfd-char-wave">
                    {'AI'.split('').map((c, i) => (
                      <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                    ))}
                  </span>
                </MagneticPill>
              )}
              <MagneticPill
                ref={(el) => { tabRefs.current['settings'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${viewMode === 'settings' ? 'active' : ''}`}
                onClick={() => setViewMode('settings')}
              >
                <Settings size={14} />
                <span className="sfd-char-wave">
                  {'Settings'.split('').map((c, i) => (
                    <span key={i} className="sfd-char" style={{ animationDelay: `${i * 0.025}s` }}>{c}</span>
                  ))}
                </span>
              </MagneticPill>
            </nav>
          )}

          {/* Week Selector Chip in Header (when on weekly view) */}
          {onboardingComplete && viewMode === 'dashboard' && (
            <div className="sfd-week-chip">
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                onClick={handlePrevWeek}
                title="Previous Week"
                aria-label="Previous Week"
              >
                <ChevronLeft size={16} />
              </MagneticPill>
              <span className="sfd-week-label">
                {weekRangeLabel}
              </span>
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                onClick={handleNextWeek}
                title="Next Week"
                aria-label="Next Week"
              >
                <ChevronRight size={16} />
              </MagneticPill>
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                onClick={handleCurrentWeek}
                title="Current Week"
                aria-label="Current Week"
              >
                <RefreshCw size={13} />
              </MagneticPill>
            </div>
          )}

          {/* Year Selector Chip in Header (when on yearly view) */}
          {onboardingComplete && viewMode === 'yearly' && (
            <div className="sfd-week-chip">
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                disabled={selectedYear === null || availableYears.indexOf(selectedYear) === availableYears.length - 1}
                onClick={() => {
                  if (selectedYear !== null) {
                    const idx = availableYears.indexOf(selectedYear);
                    if (idx < availableYears.length - 1) {
                      setSelectedYear(availableYears[idx + 1]);
                    }
                  }
                }}
                title="Older Year"
              >
                <ChevronLeft size={16} />
              </MagneticPill>
              <select
                value={selectedYear || 'all'}
                onChange={(e) => setSelectedYear(e.target.value === 'all' ? null : parseInt(e.target.value, 10))}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  outline: 'none',
                  padding: '0 4px'
                }}
              >
                <option value="all">All Time</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year} Stats</option>
                ))}
              </select>
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                disabled={selectedYear === null}
                onClick={() => {
                  if (selectedYear !== null) {
                    const idx = availableYears.indexOf(selectedYear);
                    if (idx > 0) {
                      setSelectedYear(availableYears[idx - 1]);
                    } else {
                      setSelectedYear(null);
                    }
                  }
                }}
                title="Newer Year"
              >
                <ChevronRight size={16} />
              </MagneticPill>
            </div>
          )}

          {/* AI Copilot Toggle Pill */}
          <MagneticPill 
            type="button" 
            className={`sfd-ai-toggle ${enableAiInsights ? 'active' : ''}`}
            onClick={() => {
              const val = !enableAiInsights;
              setEnableAiInsights(val);
              if (!val && viewMode === 'ai') {
                setViewMode('dashboard');
              }
            }}
            title={enableAiInsights ? "Disable AI Features globally" : "Enable AI Features globally"}
          >
            <Sparkles size={14} />
            <span>AI Copilot: {enableAiInsights ? 'On' : 'Off'}</span>
          </MagneticPill>

          {/* Theme Switcher */}
          <MagneticPill 
            type="button" 
            className="sfd-chip-btn" 
            style={{ width: '36px', height: '36px', border: '1px solid var(--border-light)' }}
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} style={{ color: 'var(--accent-amber)' }} /> : <Moon size={15} style={{ color: 'var(--accent-rose)' }} />}
          </MagneticPill>

          {/* Connected file / sync / clear buttons when onboarding complete */}
          {onboardingComplete && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-nested)', border: '1px solid var(--border-light)', padding: '6px 12px', borderRadius: '9999px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName || ''}>
                {fileName}
              </span>
              {calendarUrl && (
                <MagneticPill
                  type="button"
                  className="sfd-btn-primary"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => handleSyncLiveCalendar()}
                  disabled={isSyncing}
                  title="Sync Live Calendar Feed"
                >
                  <RefreshCw size={13} className={isSyncing ? 'spin-animation' : ''} />
                  <span>{isSyncing ? 'Syncing...' : 'Sync Live'}</span>
                </MagneticPill>
              )}
              <MagneticPill 
                type="button" 
                className="btn btn-danger" 
                style={{ padding: '6px 14px', fontSize: '13px' }} 
                onClick={handleClear}
              >
                <LogOut size={13} />
                <span>Clear</span>
              </MagneticPill>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main>
        {!onboardingComplete ? (
          <OnboardingWizard
            onboardingStep={onboardingStep}
            setOnboardingStep={setOnboardingStep}
            onCompleteOnboarding={() => setOnboardingComplete(true)}
            handleConnectGoogle={handleConnectGoogle}
            handleConnectOutlook={handleConnectOutlook}
            calendarUrl={calendarUrl}
            setCalendarUrl={setCalendarUrl}
            handleSyncLiveCalendar={handleSyncLiveCalendar}
            isSyncing={isSyncing}
            onFileParsed={handleFileParsed}

            enableAiInsights={enableAiInsights}
            setEnableAiInsights={setEnableAiInsights}
            aiProvider={aiProvider}
            setAiProvider={setAiProvider}
            aiModel={aiModel}
            setAiModel={setAiModel}
            aiApiKey={aiApiKey}
            setAiApiKey={setAiApiKey}
            accessToken={accessToken}
            tokenType={tokenType}
            onFetchEventsForCalendar={handleFetchEventsForCalendar}
            syncError={syncError}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Display active view */}
            {viewMode === 'dashboard' ? (
              <StatsDashboard 
                instructorEvents={weekInstructorEvents} 
                filteredOutEvents={weekFilteredOutEvents} 
                allInstructorEvents={instructorEvents} 
                weekStart={currentWeekStart}
                weekEnd={weekEnd}
                hourlyRate={hourlyRate}
                nonPayingList={nonPayingList}
                capacityMode={capacityMode}
                customIdealHours={customIdealHours}
                enableAiInsights={enableAiInsights}
                aiProvider={aiProvider}
                aiModel={aiModel}
                aiApiKey={aiApiKey}
              />
            ) : viewMode === 'yearly' ? (
              <YearlyStats 
                instructorEvents={filteredYearlyEvents} 
                hourlyRate={hourlyRate}
                nonPayingList={nonPayingList}
                capacityMode={capacityMode}
                customIdealHours={customIdealHours}
                enableAiInsights={enableAiInsights}
                aiProvider={aiProvider}
                aiModel={aiModel}
                aiApiKey={aiApiKey}
              />
            ) : viewMode === 'events' ? (
              <EventList 
                instructorEvents={instructorEvents} 
                filteredOutEvents={filteredOutEvents} 
                weekInstructorEvents={weekInstructorEvents}
                weekFilteredOutEvents={weekFilteredOutEvents}
                weekStart={currentWeekStart}
                weekEnd={weekEnd}
              />
            ) : viewMode === 'ai' ? (
              <AIInsights 
                allEvents={instructorEvents}
                hourlyRate={hourlyRate}
                nonPayingList={nonPayingList}
                aiProvider={aiProvider}
                aiModel={aiModel}
                aiApiKey={aiApiKey}
              />
            ) : (
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                  <Settings size={20} className="gradient-text" style={{ filter: 'brightness(1.2)' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>Instructor & Rates Settings</h2>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Configure your standard rates and globally non-paying student profiles. Changes are saved automatically and applied dynamically across all statistics.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
                  {/* Hourly Rate */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Hourly Lesson Rate (£/hr)</label>
                    <input 
                      type="number" 
                      className="select-input" 
                      style={{ padding: '0.6rem 0.8rem', width: '100%', fontSize: '0.9rem' }}
                      min="0"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Standard rate charged for lessons. Used to estimate weekly and annual earnings.
                    </span>
                  </div>

                  {/* Non-Paying Students */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Globally Non-Paying Students (Friends & Family)</label>
                    <input 
                      type="text" 
                      className="select-input" 
                      style={{ padding: '0.6rem 0.8rem', width: '100%', fontSize: '0.9rem' }}
                      placeholder="e.g. Jordan, Aaisha, family"
                      value={nonPayingStudents}
                      onChange={(e) => setNonPayingStudents(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Comma-separated keywords. Events matching these names will be treated as free and excluded from active workload/financial stats.
                    </span>
                  </div>

                  {/* Live Calendar Feed URL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Live iCalendar Feed URL (.ics)</label>
                    <input 
                      type="text" 
                      className="select-input" 
                      style={{ padding: '0.6rem 0.8rem', width: '100%', fontSize: '0.9rem' }}
                      placeholder="e.g. webcal://calendar.google.com/..."
                      value={calendarUrl}
                      onChange={(e) => setCalendarUrl(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Webcal or HTTPS link to sync lessons dynamically in real-time.
                    </span>
                  </div>

                  {/* Live Calendar Integration Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem' }}>
                    <label style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>Calendar Connections & Live Integration</label>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                      Connect directly to your calendar provider via secure client-side OAuth login (Recommended) or add a private iCalendar feed.
                    </p>

                    {syncError && (
                      <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', color: '#f87171', fontSize: '0.8rem' }}>
                        Sync Error: {syncError}
                      </div>
                    )}

                    {fileName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(6, 182, 212, 0.06)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '8px', height: '8px', background: 'var(--accent-cyan)', borderRadius: '50%' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            Currently Connected: <strong>{fileName}</strong>
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
                          onClick={handleDisconnectLiveSync}
                        >
                          Disconnect Sync
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '0.25rem' }}>
                      {/* Google Calendar Link */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>1. Google Calendar Integration</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Direct one-click connection to sync your Google Calendar lessons in real time.
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', margin: '0.25rem 0' }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: googleClientId && !googleClientId.includes('your-default-') ? 'var(--accent-emerald)' : '#ef4444' 
                          }} />
                          <span style={{ color: 'var(--text-muted)' }}>
                            {googleClientId && !googleClientId.includes('your-default-') 
                              ? 'Developer Status: Pre-Configured' 
                              : 'Developer Status: Missing VITE_GOOGLE_CLIENT_ID in .env.local'}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary animate-hover"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}
                          onClick={handleConnectGoogle}
                          disabled={!googleClientId || googleClientId.includes('your-default-')}
                        >
                          <RefreshCw size={14} className={isSyncing && fileName?.includes("Google") ? 'spin-animation' : ''} />
                          {fileName === "Google Calendar Sync" ? "Re-auth & Sync Google" : "Login & Sync Google Calendar"}
                        </button>
                      </div>

                      {/* Outlook Calendar Link */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '10px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'block' }}>2. Outlook / Office 365 Calendar</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Direct one-click connection to sync your Microsoft Outlook lessons in real time.
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', margin: '0.25rem 0' }}>
                          <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            borderRadius: '50%', 
                            background: outlookClientId && !outlookClientId.includes('your-default-') ? 'var(--accent-emerald)' : '#ef4444' 
                          }} />
                          <span style={{ color: 'var(--text-muted)' }}>
                            {outlookClientId && !outlookClientId.includes('your-default-') 
                              ? 'Developer Status: Pre-Configured' 
                              : 'Developer Status: Missing VITE_OUTLOOK_CLIENT_ID in .env.local'}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn btn-primary animate-hover"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.25rem' }}
                          onClick={handleConnectOutlook}
                          disabled={!outlookClientId || outlookClientId.includes('your-default-')}
                        >
                          <RefreshCw size={14} className={isSyncing && fileName?.includes("Outlook") ? 'spin-animation' : ''} />
                          {fileName === "Outlook Calendar Sync" ? "Re-auth & Sync Outlook" : "Login & Sync Outlook Calendar"}
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Capacity target settings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>Capacity & Working Hours Settings</label>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Target Hours Source</label>
                      <select 
                        className="select-input" 
                        value={capacityMode}
                        onChange={(e) => setCapacityMode(e.target.value as 'historical' | 'custom')}
                      >
                        <option value="historical">Derive from calendar history (lesson span)</option>
                        <option value="custom">Set custom daily target hours</option>
                      </select>
                    </div>

                    {capacityMode === 'custom' && (
                      <div style={{ marginTop: '0.5rem', animation: 'fadeIn 0.3s ease-out' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
                          Specify the ideal number of working hours you would like to book for each day of the week:
                        </span>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.75rem' }}>
                          {[
                            { label: 'Mon', index: 1 },
                            { label: 'Tue', index: 2 },
                            { label: 'Wed', index: 3 },
                            { label: 'Thu', index: 4 },
                            { label: 'Fri', index: 5 },
                            { label: 'Sat', index: 6 },
                            { label: 'Sun', index: 0 },
                          ].map(day => (
                            <div key={day.index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '0.5rem', borderRadius: '8px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{day.label}</span>
                              <input 
                                type="number" 
                                className="select-input" 
                                style={{ padding: '0.3rem 0.5rem', width: '100%', textAlign: 'center', fontSize: '0.9rem' }}
                                min="0"
                                max="24"
                                step="0.5"
                                value={customIdealHours[day.index] ?? 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setCustomIdealHours(prev => ({ ...prev, [day.index]: val }));
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Assistant & Copilot Insights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
                      AI Assistant & Dashboard Copilot
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Enable client-side AI analysis to generate automated business summaries, seasonality reviews, and interactive coaching.
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
                      <input 
                        type="checkbox" 
                        id="enable-ai-checkbox"
                        checked={enableAiInsights} 
                        onChange={(e) => setEnableAiInsights(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="enable-ai-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                        Enable AI Insights Tab (requires your own API Key)
                      </label>
                    </div>

                    {enableAiInsights && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '0.5rem', animation: 'fadeIn 0.3s ease-out' }}>
                        {/* Provider Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Model Provider</label>
                          <select 
                            className="select-input" 
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openai')}
                          >
                            <option value="gemini">Google Gemini (Developer API Key)</option>
                            <option value="openai">OpenAI (ChatGPT API Key)</option>
                          </select>
                        </div>

                        {/* Model Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Model Choice</label>
                          <select 
                            className="select-input" 
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                          >
                            {aiProvider === 'gemini' ? (
                              <>
                                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended/Fast)</option>
                                <option value="gemini-2.5-pro">gemini-2.5-pro (Highly Intelligent)</option>
                                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                              </>
                            ) : (
                              <>
                                <option value="gpt-4o-mini">gpt-4o-mini (Recommended/Cost-efficient)</option>
                                <option value="gpt-4o">gpt-4o (Highly Intelligent)</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* API Key Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {aiProvider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
                          </label>
                          <input 
                            type="password" 
                            className="select-input" 
                            style={{ padding: '0.6rem 0.8rem', width: '100%', fontSize: '0.9rem', fontFamily: 'monospace' }}
                            placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                            value={aiApiKey}
                            onChange={(e) => setAiApiKey(e.target.value)}
                          />
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                            Your API key is saved only in your local browser storage and requests are sent directly to the provider endpoints.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Page Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <span>&copy; {new Date().getFullYear()} ADI stats. All driving school data stays locally in the browser.</span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href="?policy=privacy" onClick={(e) => { e.preventDefault(); setLegalModal('privacy'); }} style={{ textDecoration: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'inherit' }} className="hover-glow">Privacy Policy</a>
          <a href="?policy=tos" onClick={(e) => { e.preventDefault(); setLegalModal('tos'); }} style={{ textDecoration: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 'inherit' }} className="hover-glow">Terms of Service</a>
        </div>
      </footer>
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );
}

export default App;
