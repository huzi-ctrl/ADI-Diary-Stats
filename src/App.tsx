import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { OnboardingWizard } from './components/OnboardingWizard';
import { StatsDashboard } from './components/StatsDashboard';
import { EventList } from './components/EventList';
import { YearlyStats } from './components/YearlyStats';
import { AIInsights } from './components/AIInsights';
import { LegalModal } from './components/LegalModal';
import { DayStats } from './components/DayStats';
import { LayoutDashboard, Calendar, List, LogOut, ChevronLeft, ChevronRight, ChevronDown, RefreshCw, TrendingUp, Settings, Sun, Moon, Sparkles, CheckCircle2, Menu, X, Car, Fuel, Gauge } from 'lucide-react';
import { useUserSettings } from './hooks/useUserSettings';
import { useCalendarData } from './hooks/useCalendarData';
import { useWeekNavigation } from './hooks/useWeekNavigation';
import { MagneticPill } from './components/ui/MagneticPill';
import { DEFAULT_MASTER_GEMINI_KEY } from './utils/aiHelper';
import { 
  type VehicleFuelType, 
  DEFAULT_UK_BENCHMARKS, 
  fetchLiveUKFuelPrices, 
  calculateVehicleCosts 
} from './utils/costEstimator';

import './components/mockup/design-system-mockup.css';

type ViewMode = 'dashboard' | 'day' | 'yearly' | 'events' | 'ai' | 'settings';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const dayDropdownRef = useRef<HTMLDivElement>(null);
  const [legalModal, setLegalModal] = useState<'privacy' | 'tos' | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('policy') === 'privacy') return 'privacy';
    if (params.get('policy') === 'tos') return 'tos';
    return null;
  });
  const [showCustomApiKey, setShowCustomApiKey] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setYearDropdownOpen(false);
      }
      if (dayDropdownRef.current && !dayDropdownRef.current.contains(e.target as Node)) {
        setDayDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    if (yearDropdownOpen || dayDropdownOpen || mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [yearDropdownOpen, dayDropdownOpen, mobileMenuOpen]);

  // Decoupled user settings and theme management
  const {
    hourlyRate,
    setHourlyRate,
    testRate,
    setTestRate,
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
    excludedYears,
    setExcludedYears,
    vehicleFuelType,
    setVehicleFuelType,
    fuelCostPerUnit,
    setFuelCostPerUnit,
    fuelEfficiency,
    setFuelEfficiency,
    milesPerHour,
    setMilesPerHour,
    enableDepreciation,
    setEnableDepreciation,
    depreciationPerMile,
    setDepreciationPerMile,
    vehicleCostSettings,
    exportSettings,
    importSettings,
  } = useUserSettings();

  const [isFetchingFuel, setIsFetchingFuel] = useState(false);
  const [fuelFetchMessage, setFuelFetchMessage] = useState<string | null>(null);

  const handleFetchLiveFuelPrices = async () => {
    setIsFetchingFuel(true);
    setFuelFetchMessage(null);
    try {
      const data = await fetchLiveUKFuelPrices();
      if (vehicleFuelType === 'diesel') {
        setFuelCostPerUnit(data.diesel);
        setFuelFetchMessage(`Updated: ${(data.diesel * 100).toFixed(1)}p/L (${data.source})`);
      } else if (vehicleFuelType === 'electric') {
        setFuelCostPerUnit(data.electric);
        setFuelFetchMessage(`Updated: ${(data.electric * 100).toFixed(1)}p/kWh (${data.source})`);
      } else {
        setFuelCostPerUnit(data.petrol);
        setFuelFetchMessage(`Updated: ${(data.petrol * 100).toFixed(1)}p/L (${data.source})`);
      }
    } catch {
      setFuelFetchMessage('Using UK forecourt benchmarks.');
    } finally {
      setIsFetchingFuel(false);
    }
  };

  const handleSelectFuelType = (type: VehicleFuelType) => {
    setVehicleFuelType(type);
    const benchmark = DEFAULT_UK_BENCHMARKS[type];
    setFuelCostPerUnit(benchmark.costPerUnit);
    setFuelEfficiency(benchmark.defaultMpg);
    setFuelFetchMessage(null);
  };

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
      const btnRect = currentBtn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const relativeLeft = btnRect.left - containerRect.left;
      
      setIndicatorPos({
        left: relativeLeft,
        width: btnRect.width,
        ready: true,
      });
    }
  }, [viewMode]);

  useLayoutEffect(() => {
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    const timer = setTimeout(updateIndicator, 60);
    const timer2 = setTimeout(updateIndicator, 250);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [updateIndicator, onboardingComplete]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  const sampleLessonHours = 2;
  const sampleCosts = calculateVehicleCosts(sampleLessonHours, (hourlyRate || 40) * sampleLessonHours, vehicleCostSettings);

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
            <nav 
              ref={navStripRef} 
              className={`sfd-liquid-glass-strip sfd-desktop-nav-strip ${indicatorPos.ready ? 'indicator-ready' : ''}`} 
              aria-label="Main Navigation"
            >
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
                ref={(el) => { tabRefs.current['day'] = el; }}
                type="button"
                className={`sfd-strip-btn sfd-char-hover ${viewMode === 'day' ? 'active' : ''}`}
                onClick={() => setViewMode('day')}
              >
                <Calendar size={14} />
                <span className="sfd-char-wave">
                  {'Day'.split('').map((c, i) => (
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

          {/* Day Selector Chip in Header (when on day view) */}
          {onboardingComplete && viewMode === 'day' && (
            <div className="sfd-week-chip">
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                onClick={() => {
                  const prev = new Date(selectedDay);
                  prev.setDate(prev.getDate() - 1);
                  setSelectedDay(prev);
                }}
                title="Previous Day"
                aria-label="Previous Day"
              >
                <ChevronLeft size={16} />
              </MagneticPill>
              
              {/* Custom Liquid Glass Day Dropdown */}
              <div ref={dayDropdownRef} style={{ position: 'relative', zIndex: 1000 }}>
                <button
                  type="button"
                  onClick={() => setDayDropdownOpen(!dayDropdownOpen)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '4px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '9999px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{selectedDay.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <ChevronDown size={13} style={{ opacity: 0.7, transform: dayDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {dayDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      minWidth: '180px',
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
                    {[0, 1, 2, 3, 4, 5, 6].map(i => {
                      const d = new Date(currentWeekStart);
                      d.setDate(currentWeekStart.getDate() + i);
                      const isSelected = d.toDateString() === selectedDay.toDateString();
                      const isToday = new Date().toDateString() === d.toDateString();
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setSelectedDay(d);
                            setDayDropdownOpen(false);
                          }}
                          style={{
                            padding: '8px 12px',
                            fontSize: '12.5px',
                            fontWeight: isSelected ? 700 : 500,
                            color: isSelected ? 'var(--accent-blue)' : 'var(--text-main)',
                            background: isSelected ? 'var(--accent-blue-soft)' : 'transparent',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background 0.15s ease'
                          }}
                          className="dropdown-item-hover"
                        >
                          <span>{d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          {isToday && (
                            <span style={{ fontSize: '10.5px', background: 'var(--sfd-primary-soft)', color: 'var(--sfd-primary)', padding: '2px 6px', borderRadius: '6px', fontWeight: 700 }}>
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
                  const next = new Date(selectedDay);
                  next.setDate(next.getDate() + 1);
                  setSelectedDay(next);
                }}
                title="Next Day"
                aria-label="Next Day"
              >
                <ChevronRight size={16} />
              </MagneticPill>
              <MagneticPill 
                type="button" 
                className="sfd-chip-btn" 
                onClick={() => setSelectedDay(new Date())}
                title="Today"
                aria-label="Today"
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
              {/* Custom Liquid Glass Year Dropdown */}
              <div ref={yearDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 700,
                    fontSize: '13px',
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    outline: 'none',
                    padding: '4px 8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '9999px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{selectedYear ? `${selectedYear} Stats` : 'All Time'}</span>
                  <ChevronDown size={13} style={{ opacity: 0.7, transform: yearDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {yearDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      minWidth: '130px',
                      background: 'var(--bg-card)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '14px',
                      padding: '5px',
                      boxShadow: '0 12px 30px -4px rgba(15, 23, 42, 0.15), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYear(null);
                        setYearDropdownOpen(false);
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: selectedYear === null ? 700 : 500,
                        color: selectedYear === null ? 'var(--accent-blue)' : 'var(--text-main)',
                        background: selectedYear === null ? 'var(--accent-blue-soft)' : 'transparent',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease'
                      }}
                      className="dropdown-item-hover"
                    >
                      All Time
                    </button>
                    {availableYears.map(year => (
                      <button
                        key={year}
                        type="button"
                        onClick={() => {
                          setSelectedYear(year);
                          setYearDropdownOpen(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          fontWeight: selectedYear === year ? 700 : 500,
                          color: selectedYear === year ? 'var(--accent-blue)' : 'var(--text-main)',
                          background: selectedYear === year ? 'var(--accent-blue-soft)' : 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'background 0.15s ease'
                        }}
                        className="dropdown-item-hover"
                      >
                        {year} Stats
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

          {/* Desktop Controls (Hidden on Mobile) */}
          <div className="sfd-desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
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
                  title="Log out and reset session"
                >
                  <LogOut size={13} />
                  <span>Log out</span>
                </MagneticPill>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button (Only on Mobile) */}
          <div className="sfd-mobile-only" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            <MagneticPill
              type="button"
              className="sfd-chip-btn"
              style={{ width: '38px', height: '38px', border: '1px solid var(--border-light)' }}
              onClick={() => setMobileMenuOpen(true)}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu size={18} />
            </MagneticPill>
          </div>
        </div>

        {/* Mobile Slide-Over Drawer */}
        {mobileMenuOpen && (
          <>
            <div 
              className="sfd-mobile-drawer-backdrop" 
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true" 
            />
            <div ref={mobileMenuRef} className="sfd-mobile-drawer" role="dialog" aria-modal="true">
              {/* Drawer Header */}
              <div className="sfd-drawer-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/favicon.png" alt="ADI stats logo" style={{ height: '20px', width: '20px', objectFit: 'contain' }} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-main)', display: 'block', lineHeight: 1.2 }}>ADI stats</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Navigation & Controls</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-light)', background: 'var(--bg-nested)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Main Navigation Links */}
              {onboardingComplete && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', paddingLeft: '4px' }}>
                    Views & Analytics
                  </span>
                  <div className="sfd-drawer-nav-list">
                    <button
                      type="button"
                      className={`sfd-drawer-nav-item ${viewMode === 'dashboard' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('dashboard');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sfd-drawer-icon-wrap">
                          <LayoutDashboard size={16} />
                        </div>
                        <span>Weekly Workload</span>
                      </div>
                      <ChevronRight size={15} style={{ opacity: 0.5 }} />
                    </button>

                    <button
                      type="button"
                      className={`sfd-drawer-nav-item ${viewMode === 'day' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('day');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sfd-drawer-icon-wrap">
                          <Calendar size={16} />
                        </div>
                        <span>Day Schedule</span>
                      </div>
                      <ChevronRight size={15} style={{ opacity: 0.5 }} />
                    </button>

                    <button
                      type="button"
                      className={`sfd-drawer-nav-item ${viewMode === 'yearly' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('yearly');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sfd-drawer-icon-wrap">
                          <TrendingUp size={16} />
                        </div>
                        <span>Yearly Metrics</span>
                      </div>
                      <ChevronRight size={15} style={{ opacity: 0.5 }} />
                    </button>

                    <button
                      type="button"
                      className={`sfd-drawer-nav-item ${viewMode === 'events' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('events');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sfd-drawer-icon-wrap">
                          <List size={16} />
                        </div>
                        <span>Event Explorer</span>
                      </div>
                      <ChevronRight size={15} style={{ opacity: 0.5 }} />
                    </button>

                    {enableAiInsights && (
                      <button
                        type="button"
                        className={`sfd-drawer-nav-item ${viewMode === 'ai' ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('ai');
                          setMobileMenuOpen(false);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="sfd-drawer-icon-wrap" style={{ color: 'var(--accent-purple)' }}>
                            <Sparkles size={16} />
                          </div>
                          <span>AI Copilot Insights</span>
                        </div>
                        <ChevronRight size={15} style={{ opacity: 0.5 }} />
                      </button>
                    )}

                    <button
                      type="button"
                      className={`sfd-drawer-nav-item ${viewMode === 'settings' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('settings');
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="sfd-drawer-icon-wrap">
                          <Settings size={16} />
                        </div>
                        <span>Settings & Rates</span>
                      </div>
                      <ChevronRight size={15} style={{ opacity: 0.5 }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Connected File / Live Calendar Info */}
              {onboardingComplete && fileName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', paddingLeft: '4px' }}>
                    Connected Calendar
                  </span>
                  <div style={{ background: 'var(--sfd-surface-nested)', padding: '12px 14px', borderRadius: '16px', border: '1px solid var(--sfd-border-hairline)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Active Source</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-all' }}>{fileName}</span>
                    {calendarUrl && (
                      <button
                        type="button"
                        className="sfd-btn-primary"
                        style={{ marginTop: '8px', width: '100%', justifyContent: 'center', padding: '8px', fontSize: '12.5px' }}
                        onClick={() => {
                          handleSyncLiveCalendar();
                          setMobileMenuOpen(false);
                        }}
                        disabled={isSyncing}
                      >
                        <RefreshCw size={13} className={isSyncing ? 'spin-animation' : ''} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Live Calendar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Preferences Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', paddingLeft: '4px' }}>
                  Preferences
                </span>

                {/* AI Copilot Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--sfd-surface-nested)', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={15} style={{ color: enableAiInsights ? 'var(--accent-purple)' : 'var(--text-dim)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>AI Copilot</span>
                  </div>
                  <button
                    type="button"
                    className={`sfd-ai-toggle ${enableAiInsights ? 'active' : ''}`}
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => {
                      const val = !enableAiInsights;
                      setEnableAiInsights(val);
                      if (!val && viewMode === 'ai') {
                        setViewMode('dashboard');
                      }
                    }}
                  >
                    <span>{enableAiInsights ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>

                {/* Theme Toggle Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--sfd-surface-nested)', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {theme === 'dark' ? <Moon size={15} style={{ color: 'var(--accent-rose)' }} /> : <Sun size={15} style={{ color: 'var(--accent-amber)' }} />}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Dark Mode</span>
                  </div>
                  <button
                    type="button"
                    className="sfd-strip-btn"
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={toggleTheme}
                  >
                    <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
                  </button>
                </div>
              </div>

              {/* Log Out Action */}
              {onboardingComplete && (
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--sfd-border-hairline)' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ width: '100%', justifyContent: 'center', padding: '11px', borderRadius: '14px', fontSize: '13.5px', fontWeight: 700 }}
                    onClick={() => {
                      handleClear();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut size={15} />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}
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
                testRate={testRate}
                nonPayingList={nonPayingList}
                capacityMode={capacityMode}
                customIdealHours={customIdealHours}
                enableAiInsights={enableAiInsights}
                aiProvider={aiProvider}
                aiModel={aiModel}
                aiApiKey={aiApiKey}
                vehicleCostSettings={vehicleCostSettings}
                onSelectDay={(dayDate) => {
                  setSelectedDay(dayDate);
                  setViewMode('day');
                }}
              />
            ) : viewMode === 'day' ? (
              <DayStats
                allInstructorEvents={instructorEvents}
                weekInstructorEvents={weekInstructorEvents}
                weekStart={currentWeekStart}
                selectedDate={selectedDay}
                onSelectDate={(newDay) => setSelectedDay(newDay)}
                hourlyRate={hourlyRate}
                testRate={testRate}
                nonPayingList={nonPayingList}
                vehicleCostSettings={vehicleCostSettings}
                enableAiInsights={enableAiInsights}
              />
            ) : viewMode === 'yearly' ? (
              <YearlyStats 
                instructorEvents={filteredYearlyEvents} 
                hourlyRate={hourlyRate}
                testRate={testRate}
                nonPayingList={nonPayingList}
                capacityMode={capacityMode}
                customIdealHours={customIdealHours}
                enableAiInsights={enableAiInsights}
                aiProvider={aiProvider}
                aiModel={aiModel}
                aiApiKey={aiApiKey}
                excludedYears={excludedYears}
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
              <div className="sfd-card-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
                  <Settings size={20} className="gradient-text" style={{ filter: 'brightness(1.2)' }} />
                  <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)' }}>Instructor & Rates Settings</h2>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                  Configure your standard rates and globally non-paying student profiles. Changes are saved automatically and applied dynamically across all statistics.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginTop: '0.5rem' }}>
                  {/* Hourly Rate */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--sfd-surface-nested)', padding: '16px', borderRadius: '18px', border: '1px solid var(--sfd-border-hairline)' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 700, minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                      Hourly Lesson Rate (£/hr)
                    </label>
                    <input 
                      type="number" 
                      className="select-input" 
                      style={{ padding: '0.65rem 0.85rem', width: '100%', fontSize: '0.95rem', fontWeight: 600 }}
                      min="0"
                      value={hourlyRate === 0 ? '' : hourlyRate}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value;
                        setHourlyRate(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      Standard rate charged for lessons. Used to estimate weekly and annual earnings.
                    </span>
                  </div>

                  {/* Exclusive Practical Test Rate */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--sfd-surface-nested)', padding: '16px', borderRadius: '18px', border: '1px solid var(--sfd-border-hairline)' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 700, minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                      Practical Test Rate (£/test)
                    </label>
                    <input 
                      type="number" 
                      className="select-input" 
                      style={{ padding: '0.65rem 0.85rem', width: '100%', fontSize: '0.95rem', fontWeight: 600 }}
                      min="0"
                      value={testRate === 0 ? '' : testRate}
                      placeholder="0 (e.g. £80-£120)"
                      onChange={(e) => {
                        const val = e.target.value;
                        setTestRate(val === '' ? 0 : parseFloat(val) || 0);
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      Flat fee for practical test bookings (car hire + test slot). Factored into earnings.
                    </span>
                  </div>

                  {/* Non-Paying Students */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--sfd-surface-nested)', padding: '16px', borderRadius: '18px', border: '1px solid var(--sfd-border-hairline)' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 700, minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                      Non-Paying Students (Friends &amp; Family)
                    </label>
                    <input 
                      type="text" 
                      className="select-input" 
                      style={{ padding: '0.65rem 0.85rem', width: '100%', fontSize: '0.95rem', fontWeight: 600 }}
                      placeholder="e.g. Jordan, Aaisha, family"
                      value={nonPayingStudents}
                      onChange={(e) => setNonPayingStudents(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
                      Comma-separated keywords. Matches will be excluded from earnings stats.
                    </span>
                  </div>

                  {/* Live Calendar Feed URL */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', background: 'var(--sfd-surface-nested)', padding: '16px', borderRadius: '18px', border: '1px solid var(--sfd-border-hairline)' }}>
                    <label style={{ fontSize: '0.875rem', color: 'var(--text-main)', fontWeight: 700, minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                      Live iCalendar Feed URL (.ics)
                    </label>
                    <input 
                      type="text" 
                      className="select-input" 
                      style={{ padding: '0.65rem 0.85rem', width: '100%', fontSize: '0.95rem', fontWeight: 600 }}
                      placeholder="e.g. webcal://calendar.google.com/..."
                      value={calendarUrl}
                      onChange={(e) => setCalendarUrl(e.target.value)}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: 1.4 }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1.5rem', marginTop: '0.25rem' }}>
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

                  {/* Vehicle Operating Costs & Net Take-Home Calculator */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Car size={18} className="gradient-text" style={{ color: 'var(--sfd-emerald)' }} />
                        <label style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 700 }}>
                          Vehicle Running Costs &amp; Net Take-Home Calculator
                        </label>
                      </div>

                      {/* Fuel Type Pills */}
                      <div style={{ display: 'flex', gap: '6px', background: 'var(--sfd-surface-nested)', padding: '3px', borderRadius: '9999px', border: '1px solid var(--sfd-border-hairline)' }}>
                        {[
                          { id: 'petrol' as VehicleFuelType, label: '⛽ Petrol', mpg: '40 MPG' },
                          { id: 'diesel' as VehicleFuelType, label: '🛢️ Diesel', mpg: '45 MPG' },
                          { id: 'electric' as VehicleFuelType, label: '⚡ Electric', mpg: '3.8 mi/kWh' },
                        ].map(f => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleSelectFuelType(f.id)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              background: vehicleFuelType === f.id ? 'var(--sfd-primary)' : 'transparent',
                              color: vehicleFuelType === f.id ? '#ffffff' : 'var(--text-muted)',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                      Model real-world driving school expenses including stop-and-go learner fuel consumption, live forecourt prices, and car wear to determine your true take-home pay.
                    </p>

                    {/* Live Fuel Price Fetch Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', background: 'var(--sfd-surface-nested)', padding: '10px 14px', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Fuel size={16} style={{ color: 'var(--sfd-primary)' }} />
                        <span style={{ fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 600 }}>
                          UK Forecourt Fuel Benchmark:
                        </span>
                        <span style={{ fontSize: '0.825rem', color: 'var(--sfd-emerald)', fontWeight: 700 }}>
                          {vehicleFuelType === 'electric' 
                            ? `${(fuelCostPerUnit * 100).toFixed(1)}p / kWh`
                            : `${(fuelCostPerUnit * 100).toFixed(1)}p / Litre`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {fuelFetchMessage && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            {fuelFetchMessage}
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={handleFetchLiveFuelPrices}
                          disabled={isFetchingFuel}
                        >
                          <RefreshCw size={12} className={isFetchingFuel ? 'spin-animation' : ''} />
                          {isFetchingFuel ? 'Checking prices...' : 'Fetch Live UK Fuel Prices'}
                        </button>
                      </div>
                    </div>

                    {/* Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '0.25rem' }}>
                      {/* Fuel / Energy Price */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 700 }}>
                          {vehicleFuelType === 'electric' ? 'Energy Price (£ / kWh)' : 'Fuel Price (£ / Litre)'}
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          placeholder="0"
                          className="select-input"
                          style={{ padding: '0.5rem 0.75rem', width: '100%', fontSize: '0.9rem', fontWeight: 600 }}
                          value={fuelCostPerUnit === 0 ? '' : fuelCostPerUnit}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFuelCostPerUnit(val === '' ? 0 : parseFloat(val) || 0);
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {vehicleFuelType === 'electric' 
                            ? `e.g. £0.275/kWh home standard tariff` 
                            : `e.g. £1.425/L (142.5p per litre)`}
                        </span>
                      </div>

                      {/* Fuel Efficiency */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 700 }}>
                          Tuition Efficiency ({vehicleFuelType === 'electric' ? 'mi / kWh' : 'MPG'})
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          placeholder="40"
                          className="select-input"
                          style={{ padding: '0.5rem 0.75rem', width: '100%', fontSize: '0.9rem', fontWeight: 600 }}
                          value={fuelEfficiency === 0 ? '' : fuelEfficiency}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFuelEfficiency(val === '' ? 0 : parseFloat(val) || 0);
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          {vehicleFuelType === 'electric'
                            ? 'EV city consumption (avg 3.5–4.2 mi/kWh)'
                            : 'Learner stop-start town driving (avg 38–45 MPG)'}
                        </span>
                      </div>

                      {/* Tuition Speed */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                        <label style={{ fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 700 }}>
                          Average Speed (Miles / Hour)
                        </label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="25"
                          className="select-input"
                          style={{ padding: '0.5rem 0.75rem', width: '100%', fontSize: '0.9rem', fontWeight: 600 }}
                          value={milesPerHour === 0 ? '' : milesPerHour}
                          onChange={(e) => {
                            const val = e.target.value;
                            setMilesPerHour(val === '' ? 0 : parseFloat(val) || 0);
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Distance driven per teaching hour (UK avg: 25 mph)
                        </span>
                      </div>

                      {/* Wear & Depreciation */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--sfd-surface-nested)', padding: '14px', borderRadius: '14px', border: '1px solid var(--sfd-border-hairline)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ fontSize: '0.825rem', color: 'var(--text-main)', fontWeight: 700 }}>
                            Wear &amp; Depreciation (£/mile)
                          </label>
                          <input
                            type="checkbox"
                            checked={enableDepreciation}
                            onChange={(e) => setEnableDepreciation(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            title="Toggle vehicle wear and depreciation"
                          />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.12"
                          disabled={!enableDepreciation}
                          className="select-input"
                          style={{ padding: '0.5rem 0.75rem', width: '100%', fontSize: '0.9rem', fontWeight: 600, opacity: enableDepreciation ? 1 : 0.5 }}
                          value={depreciationPerMile === 0 ? '' : depreciationPerMile}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDepreciationPerMile(val === '' ? 0 : parseFloat(val) || 0);
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          Tyres, clutch, brakes, dual controls &amp; depreciation (~£0.12/mi)
                        </span>
                      </div>
                    </div>

                    {/* Live Net Profit Simulator Widget */}
                    <div style={{ marginTop: '0.5rem', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '16px', padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sfd-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Gauge size={15} /> Real-Time Cost Simulator Preview (Typical 2-Hour Lesson)
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--sfd-emerald)', padding: '2px 8px', borderRadius: '9999px' }}>
                          {sampleCosts.profitMargin.toFixed(0)}% Net Margin
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Running Cost / Mile</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{(sampleCosts.totalCostPerMile * 100).toFixed(1)}p</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Hourly Running Cost</span>
                          <strong style={{ fontSize: '1rem', color: '#ef4444' }}>£{sampleCosts.costPerHour.toFixed(2)}/hr</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>2h Gross Revenue</span>
                          <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>£{(sampleCosts.grossRevenue).toFixed(2)}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>2h Net Take-Home</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--sfd-emerald)', fontWeight: 800 }}>£{sampleCosts.netRevenue.toFixed(2)}</strong>
                        </div>
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

                  {/* Excluded Years from Analytics */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>
                      Exclude Calendar Years from Statistics (Partial / Inactive Work)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Exclude years with incomplete data (e.g. only started late in the year, or future forward-bookings) so they don&apos;t skew your multi-year performance and average booking rates.
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      {availableYears.map(yr => {
                        const isExcluded = excludedYears.includes(yr);
                        return (
                          <label key={yr} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: isExcluded ? 'rgba(239, 68, 68, 0.08)' : 'var(--sfd-surface-nested)', border: `1px solid ${isExcluded ? 'rgba(239, 68, 68, 0.3)' : 'var(--sfd-border-hairline)'}`, padding: '6px 14px', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: isExcluded ? '#ef4444' : 'var(--text-main)' }}>
                            <input 
                              type="checkbox"
                              checked={isExcluded}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExcludedYears(prev => [...prev, yr]);
                                } else {
                                  setExcludedYears(prev => prev.filter(y => y !== yr));
                                }
                              }}
                              style={{ cursor: 'pointer' }}
                            />
                            <span>{yr} {isExcluded ? '(Excluded)' : ''}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Zero-Scope Cross-Device Sync */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <RefreshCw size={16} className="gradient-text" style={{ color: 'var(--sfd-primary)' }} />
                      Cross-Device Settings Backup &amp; Sync
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Quickly transfer your hourly rate, non-paying student profiles, and target hours to another phone, tablet, or PC without needing an account or cloud permissions.
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          const json = exportSettings();
                          const blob = new Blob([json], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `drivestats-settings-${new Date().toISOString().split('T')[0]}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        Export Settings File (.json)
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          const json = exportSettings();
                          navigator.clipboard.writeText(json).then(() => {
                            alert('Settings copied to clipboard! You can paste this on another device.');
                          });
                        }}
                      >
                        Copy Settings to Clipboard
                      </button>
                      <label className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}>
                        Import Settings File
                        <input 
                          type="file" 
                          accept=".json,application/json" 
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const content = ev.target?.result as string;
                                if (importSettings(content)) {
                                  alert('Settings successfully imported!');
                                } else {
                                  alert('Invalid settings file format.');
                                }
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* AI Assistant & Copilot Insights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: '1 / -1', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Sparkles size={16} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
                      AI Assistant &amp; Dashboard Copilot
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Enable client-side AI analysis to generate automated business summaries, seasonality reviews, and interactive coaching.
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0.25rem 0', flexWrap: 'wrap' }}>
                      <input 
                        type="checkbox" 
                        id="enable-ai-checkbox"
                        checked={enableAiInsights} 
                        onChange={(e) => setEnableAiInsights(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <label htmlFor="enable-ai-checkbox" style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}>
                        Enable AI Insights Tab
                      </label>
                      <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--sfd-emerald)', padding: '2px 8px', borderRadius: '9999px', fontWeight: 600 }}>
                        Master Key Connected
                      </span>
                    </div>

                    {enableAiInsights && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem', marginTop: '0.5rem', animation: 'fadeIn 0.3s ease-out' }}>
                        {/* Provider Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Model Provider</label>
                          <select 
                            className="select-input" 
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openai')}
                          >
                            <option value="gemini">Google Gemini (Recommended &amp; Pre-configured)</option>
                            <option value="openai">OpenAI (Requires Custom ChatGPT Key)</option>
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
                                <option value="gemini-2.5-flash">gemini-2.5-flash (Fast &amp; Accurate)</option>
                                <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                              </>
                            ) : (
                              <>
                                <option value="gpt-4o-mini">gpt-4o-mini (Cost-efficient)</option>
                                <option value="gpt-4o">gpt-4o (Highly Intelligent)</option>
                              </>
                            )}
                          </select>
                        </div>

                        {/* Gemini Pre-configured Status Banner */}
                        {aiProvider === 'gemini' && (
                          <div style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '12px 14px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CheckCircle2 size={16} style={{ color: 'var(--sfd-emerald)', flexShrink: 0 }} />
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                                  Built-in Master License Active
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Pre-configured developer Gemini key is active. No setup or manual API key required.
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'fit-content' }}
                              onClick={() => setShowCustomApiKey(!showCustomApiKey)}
                            >
                              {showCustomApiKey ? 'Hide Key Field' : 'Custom Key (Optional)'}
                            </button>
                          </div>
                        )}

                        {/* API Key Input (Only visible when OpenAI is selected, or user explicitly opened Custom Key) */}
                        {(aiProvider === 'openai' || showCustomApiKey) && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: '1 / -1', animation: 'fadeIn 0.2s ease-out' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {aiProvider === 'gemini' ? 'Custom Gemini API Key (Optional Override)' : 'OpenAI API Key'}
                            </label>
                            <input 
                              type="password" 
                              className="select-input" 
                              style={{ padding: '0.6rem 0.8rem', width: '100%', fontSize: '0.9rem', fontFamily: 'monospace' }}
                              placeholder={aiProvider === 'gemini' ? 'Built-in Key Active (Leave blank to use default)' : 'sk-proj-...'}
                              value={aiApiKey === DEFAULT_MASTER_GEMINI_KEY ? '' : aiApiKey}
                              onChange={(e) => setAiApiKey(e.target.value)}
                            />
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              {aiProvider === 'gemini'
                                ? 'Leave blank to use the built-in Master Gemini key.'
                                : 'Your API key is saved only in your local browser storage and requests are sent directly to OpenAI.'}
                            </span>
                          </div>
                        )}
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
