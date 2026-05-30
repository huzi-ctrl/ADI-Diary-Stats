import { useState, useMemo, useEffect, useCallback } from 'react';
import { OnboardingWizard } from './components/OnboardingWizard';
import { StatsDashboard } from './components/StatsDashboard';
import { EventList } from './components/EventList';
import { YearlyStats } from './components/YearlyStats';
import { AIInsights } from './components/AIInsights';
import { parseICS, type CalendarEvent } from './utils/icsParser';
import { splitInstructorEvents } from './utils/eventFilters';
import { Calendar, LayoutDashboard, List, LogOut, ChevronLeft, ChevronRight, RefreshCw, TrendingUp, Settings, Sun, Moon, Sparkles } from 'lucide-react';

// Helper to get the Monday of any date
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  // Adjust if Sunday (0), otherwise subtract day - 1
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

interface GoogleCalendarItem {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
}

interface OutlookCalendarItem {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  isAllDay?: boolean;
  categories?: string[];
}

function App() {
  const [fileName, setFileName] = useState<string | null>(() => {
    return localStorage.getItem('adi_calendar_filename');
  });

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>(() => {
    const cachedLive = localStorage.getItem('adi_cached_calendar_events');
    if (cachedLive) {
      try {
        const events = JSON.parse(cachedLive);
        return events.map((e: Record<string, unknown>) => ({
          ...e,
          start: new Date(String(e.start)),
          end: new Date(String(e.end))
        })) as CalendarEvent[];
      } catch (err) {
        console.error('Failed to parse cached live calendar events', err);
      }
    }
    const saved = localStorage.getItem('adi_calendar_ics');
    if (saved) {
      try {
        return parseICS(saved);
      } catch (e) {
        console.error('Failed to parse saved calendar', e);
      }
    }
    return [];
  });

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [viewMode, setViewMode] = useState<'dashboard' | 'yearly' | 'events' | 'ai' | 'settings'>('dashboard');

  const handleFileParsed = useCallback((text: string, name: string) => {
    try {
      const parsedEvents = parseICS(text);
      setAllEvents(parsedEvents);
      setFileName(name);
      setViewMode('dashboard');
      setSelectedYear(null);

      // Smart Default Week Selection
      const today = new Date();
      const todayMonday = getMonday(today);
      const todaySunday = new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      
      // If there are events in the current week, default to today's week
      const hasEventsThisWeek = parsedEvents.some(e => e.start >= todayMonday && e.start <= todaySunday);
      
      if (hasEventsThisWeek) {
        setCurrentWeekStart(todayMonday);
      } else if (parsedEvents.length > 0) {
        // Otherwise, find the latest event in the file and default to its week
        const latestEvent = parsedEvents[parsedEvents.length - 1];
        setCurrentWeekStart(getMonday(latestEvent.start));
      } else {
        setCurrentWeekStart(todayMonday);
      }

      localStorage.setItem('adi_calendar_ics', text);
      localStorage.setItem('adi_calendar_filename', name);
    } catch (err) {
      alert('Failed to parse .ics file. Please ensure it is a valid iCalendar format.');
      console.error(err);
    }
  }, []);

  const [hourlyRate, setHourlyRate] = useState<number>(() => {
    const saved = localStorage.getItem('adi_hourly_rate');
    return saved ? parseFloat(saved) : 40;
  });

  const [nonPayingStudents, setNonPayingStudents] = useState<string>(() => {
    const saved = localStorage.getItem('adi_non_paying_students');
    return saved || 'friends, family';
  });

  useEffect(() => {
    localStorage.setItem('adi_hourly_rate', hourlyRate.toString());
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem('adi_non_paying_students', nonPayingStudents);
  }, [nonPayingStudents]);

  const nonPayingList = useMemo(() => {
    return nonPayingStudents
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);
  }, [nonPayingStudents]);

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('adi_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('adi_theme', theme);
  }, [theme]);

  // Capacity calculation mode
  const [capacityMode, setCapacityMode] = useState<'historical' | 'custom'>(() => {
    const saved = localStorage.getItem('adi_capacity_mode');
    return (saved === 'custom' || saved === 'historical') ? saved : 'historical';
  });

  // Custom daily target hours
  const [customIdealHours, setCustomIdealHours] = useState<Record<number, number>>(() => {
    const saved = localStorage.getItem('adi_custom_ideal_hours');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom ideal hours', e);
      }
    }
    return { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 }; // default 7h Mon-Fri, 0h Sat-Sun
  });

  // AI Settings
  const [enableAiInsights, setEnableAiInsights] = useState<boolean>(() => {
    return localStorage.getItem('adi_enable_ai_insights') === 'true';
  });

  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>(() => {
    const saved = localStorage.getItem('adi_ai_provider');
    return (saved === 'openai' || saved === 'gemini') ? saved : 'gemini';
  });

  const [aiModel, setAiModel] = useState<string>(() => {
    return localStorage.getItem('adi_ai_model') || 'gemini-2.5-flash';
  });

  const [aiApiKey, setAiApiKey] = useState<string>(() => {
    return localStorage.getItem('adi_ai_api_key') || '';
  });

  useEffect(() => {
    localStorage.setItem('adi_enable_ai_insights', enableAiInsights ? 'true' : 'false');
  }, [enableAiInsights]);

  useEffect(() => {
    localStorage.setItem('adi_ai_provider', aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    localStorage.setItem('adi_ai_model', aiModel);
  }, [aiModel]);

  useEffect(() => {
    localStorage.setItem('adi_ai_api_key', aiApiKey);
  }, [aiApiKey]);

  useEffect(() => {
    localStorage.setItem('adi_capacity_mode', capacityMode);
  }, [capacityMode]);

  useEffect(() => {
    localStorage.setItem('adi_custom_ideal_hours', JSON.stringify(customIdealHours));
  }, [customIdealHours]);
  
  // OAuth Client IDs (pre-configured at build time by the developer)
  const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const outlookClientId = (import.meta.env.VITE_OUTLOOK_CLIENT_ID || '').trim();

  // Onboarding States
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => {
    return localStorage.getItem('adi_onboarding_complete') === 'true';
  });
  const [onboardingStep, setOnboardingStep] = useState<'connect' | 'calendar_select' | 'ai_config'>(() => {
    const savedStep = localStorage.getItem('adi_onboarding_step');
    return (savedStep === 'connect' || savedStep === 'calendar_select' || savedStep === 'ai_config') ? savedStep : 'connect';
  });
  const [accessToken, setAccessToken] = useState<string>(() => {
    return sessionStorage.getItem('adi_onboarding_token') || '';
  });
  const [tokenType, setTokenType] = useState<'google' | 'outlook' | null>(() => {
    return (sessionStorage.getItem('adi_onboarding_tokentype') as 'google' | 'outlook' | null) || null;
  });
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>(() => {
    return localStorage.getItem('adi_selected_calendar_id') || '';
  });

  useEffect(() => {
    localStorage.setItem('adi_onboarding_step', onboardingStep);
  }, [onboardingStep]);

  useEffect(() => {
    localStorage.setItem('adi_onboarding_complete', onboardingComplete ? 'true' : 'false');
  }, [onboardingComplete]);

  useEffect(() => {
    if (accessToken) {
      sessionStorage.setItem('adi_onboarding_token', accessToken);
    } else {
      sessionStorage.removeItem('adi_onboarding_token');
    }
  }, [accessToken]);

  useEffect(() => {
    if (tokenType) {
      sessionStorage.setItem('adi_onboarding_tokentype', tokenType);
    } else {
      sessionStorage.removeItem('adi_onboarding_tokentype');
    }
  }, [tokenType]);

  // Live iCalendar feed URL
  const [calendarUrl, setCalendarUrl] = useState<string>(() => {
    return localStorage.getItem('adi_calendar_url') || '';
  });

  useEffect(() => {
    localStorage.setItem('adi_calendar_url', calendarUrl);
  }, [calendarUrl]);

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSyncLiveCalendar = useCallback(async (customUrl?: string, silent: boolean = false) => {
    const urlToFetch = customUrl !== undefined ? customUrl : calendarUrl;
    if (!urlToFetch) {
      if (!silent) alert('Please enter a valid iCalendar Feed URL first.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      let cleanUrl = urlToFetch.trim();
      if (cleanUrl.startsWith('webcal://')) {
        cleanUrl = 'https://' + cleanUrl.slice(9);
      }
      
      const response = await fetch(cleanUrl);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      if (!text.includes('BEGIN:VCALENDAR')) {
        throw new Error('Retrieved content is not in a valid iCalendar (.ics) format.');
      }
      
      let displayFilename = 'live_calendar.ics';
      try {
        const parsedUrl = new URL(cleanUrl, window.location.origin);
        const pathname = parsedUrl.pathname;
        const basename = pathname.substring(pathname.lastIndexOf('/') + 1);
        if (basename && basename.endsWith('.ics')) {
          displayFilename = basename;
        }
      } catch {
        // ignore
      }
      
      // Clear live OAuth caches so we don't mix them
      localStorage.removeItem('adi_cached_calendar_events');
      localStorage.removeItem('adi_google_access_token');
      localStorage.removeItem('adi_outlook_access_token');

      handleFileParsed(text, displayFilename);
      localStorage.setItem('adi_calendar_url', cleanUrl);
    } catch (err) {
      console.error('Failed to sync live calendar:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setSyncError(errMsg);
      if (!silent) alert(`Failed to sync live calendar: ${errMsg}`);
    } finally {
      setIsSyncing(false);
    }
  }, [calendarUrl, handleFileParsed]);

  const handleFetchGoogleCalendar = useCallback(async (token: string, calendarId: string = 'primary') => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const timeMin = new Date(Date.now() - 1460 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 1460 * 24 * 60 * 60 * 1000).toISOString();
      
      const endpoint = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=2500&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`;
      
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        throw new Error(`Google Calendar API error: status ${response.status}`);
      }
      const data = await response.json();
      
      const mappedEvents: CalendarEvent[] = (data.items || []).map((item: GoogleCalendarItem) => {
        const startStr = item.start?.dateTime || item.start?.date;
        const endStr = item.end?.dateTime || item.end?.date;
        const isAllDay = !item.start?.dateTime;
        
        return {
          id: item.id || Math.random().toString(),
          summary: item.summary || 'No Title',
          description: item.description || '',
          start: new Date(startStr || ''),
          end: new Date(endStr || ''),
          durationMinutes: isAllDay ? 0 : Math.round((new Date(endStr || '').getTime() - new Date(startStr || '').getTime()) / 60000),
          isAllDay,
          categories: item.colorId ? ['Color_' + item.colorId] : []
        };
      });
      
      setAllEvents(mappedEvents);
      setFileName("Google Calendar Sync");
      setViewMode('dashboard');
      setSelectedYear(null);
      localStorage.setItem('adi_cached_calendar_events', JSON.stringify(mappedEvents));
      localStorage.setItem('adi_calendar_filename', "Google Calendar Sync");
      localStorage.removeItem('adi_calendar_ics'); // remove uploaded/url ICS to prioritize Google Sync
    } catch (err) {
      console.error(err);
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleFetchOutlookCalendar = useCallback(async (token: string, calendarId?: string) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const timeMin = new Date(Date.now() - 1460 * 24 * 60 * 60 * 1000).toISOString();
      const timeMax = new Date(Date.now() + 1460 * 24 * 60 * 60 * 1000).toISOString();
      
      const endpoint = calendarId 
        ? `https://graph.microsoft.com/v1.0/me/calendars/${encodeURIComponent(calendarId)}/events?$top=1000&$filter=start/dateTime ge '${timeMin}' and start/dateTime le '${timeMax}'`
        : `https://graph.microsoft.com/v1.0/me/calendar/events?$top=1000&$filter=start/dateTime ge '${timeMin}' and start/dateTime le '${timeMax}'`;
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Prefer': 'outlook.timezone="UTC"'
        }
      });
      if (!response.ok) {
        throw new Error(`Outlook API error: status ${response.status}`);
      }
      const data = await response.json();
      
      const mappedEvents: CalendarEvent[] = (data.value || []).map((item: OutlookCalendarItem) => {
        const startStr = item.start?.dateTime;
        const endStr = item.end?.dateTime;
        const isAllDay = item.isAllDay || false;
        
        return {
          id: item.id || Math.random().toString(),
          summary: item.subject || 'No Title',
          description: item.bodyPreview || '',
          start: new Date(startStr || ''),
          end: new Date(endStr || ''),
          durationMinutes: isAllDay ? 0 : Math.round((new Date(endStr || '').getTime() - new Date(startStr || '').getTime()) / 60000),
          isAllDay,
          categories: item.categories || []
        };
      });
      
      setAllEvents(mappedEvents);
      setFileName("Outlook Calendar Sync");
      setViewMode('dashboard');
      setSelectedYear(null);
      localStorage.setItem('adi_cached_calendar_events', JSON.stringify(mappedEvents));
      localStorage.setItem('adi_calendar_filename', "Outlook Calendar Sync");
      localStorage.removeItem('adi_calendar_ics');
    } catch (err) {
      console.error(err);
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const handleConnectGoogle = () => {
    const clientId = googleClientId.trim();
    if (!clientId || clientId.includes('your-default-')) {
      alert("Missing Configuration: Please set VITE_GOOGLE_CLIENT_ID in your .env.local file and restart your Vite development server.");
      return;
    }
    const redirectUri = window.location.origin + '/';
    const scope = 'https://www.googleapis.com/auth/calendar.readonly';
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=google&prompt=consent`;
    window.location.assign(url);
  };

  const handleConnectOutlook = () => {
    const clientId = outlookClientId.trim();
    if (!clientId || clientId.includes('your-default-')) {
      alert("Missing Configuration: Please set VITE_OUTLOOK_CLIENT_ID in your .env.local file and restart your Vite development server.");
      return;
    }
    const redirectUri = window.location.origin + '/';
    const scope = 'https://graph.microsoft.com/Calendars.Read';
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}&state=outlook&response_mode=fragment`;
    window.location.assign(url);
  };

  const handleDisconnectLiveSync = () => {
    localStorage.removeItem('adi_cached_calendar_events');
    localStorage.removeItem('adi_google_access_token');
    localStorage.removeItem('adi_google_token_expiry');
    localStorage.removeItem('adi_outlook_access_token');
    localStorage.removeItem('adi_outlook_token_expiry');
    localStorage.removeItem('adi_calendar_filename');
    setFileName(null);
    setAllEvents([]);
  };

  // OAuth redirect token parser & live sync on start
  useEffect(() => {
    const timer = setTimeout(() => {
      const hash = window.location.hash;
      if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        const accessTokenVal = params.get('access_token');
        const state = params.get('state');
        
        if (accessTokenVal) {
          if (state === 'google') {
            const expiry = Date.now() + 3500 * 1000;
            localStorage.setItem('adi_google_access_token', accessTokenVal);
            localStorage.setItem('adi_google_token_expiry', String(expiry));
            setAccessToken(accessTokenVal);
            setTokenType('google');
            setOnboardingStep('calendar_select');
            setOnboardingComplete(false);
          } else if (state === 'outlook') {
            const expiry = Date.now() + 3500 * 1000;
            localStorage.setItem('adi_outlook_access_token', accessTokenVal);
            localStorage.setItem('adi_outlook_token_expiry', String(expiry));
            setAccessToken(accessTokenVal);
            setTokenType('outlook');
            setOnboardingStep('calendar_select');
            setOnboardingComplete(false);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
        }
      }

      // Auto-fetch if token exists and is valid
      const googleToken = localStorage.getItem('adi_google_access_token');
      const googleExpiry = Number(localStorage.getItem('adi_google_token_expiry') || '0');
      const outlookToken = localStorage.getItem('adi_outlook_access_token');
      const outlookExpiry = Number(localStorage.getItem('adi_outlook_token_expiry') || '0');

      if (googleToken && googleExpiry > Date.now()) {
        setAccessToken(googleToken);
        setTokenType('google');
        handleFetchGoogleCalendar(googleToken, selectedCalendarId || 'primary');
      } else if (outlookToken && outlookExpiry > Date.now()) {
        setAccessToken(outlookToken);
        setTokenType('outlook');
        handleFetchOutlookCalendar(outlookToken, selectedCalendarId || undefined);
      } else {
        const savedUrl = localStorage.getItem('adi_calendar_url');
        if (savedUrl) {
          handleSyncLiveCalendar(savedUrl);
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [handleFetchGoogleCalendar, handleFetchOutlookCalendar, handleSyncLiveCalendar, selectedCalendarId]);

  // Background Auto-Refresh (every 5 minutes)
  useEffect(() => {
    const refreshData = () => {
      const googleToken = localStorage.getItem('adi_google_access_token');
      const googleExpiry = Number(localStorage.getItem('adi_google_token_expiry') || '0');
      const outlookToken = localStorage.getItem('adi_outlook_access_token');
      const outlookExpiry = Number(localStorage.getItem('adi_outlook_token_expiry') || '0');
      
      if (googleToken && googleExpiry > Date.now()) {
        handleFetchGoogleCalendar(googleToken, selectedCalendarId || 'primary').catch(err => 
          console.error('Auto-refresh Google calendar failed:', err)
        );
      } else if (outlookToken && outlookExpiry > Date.now()) {
        handleFetchOutlookCalendar(outlookToken, selectedCalendarId || undefined).catch(err =>
          console.error('Auto-refresh Outlook calendar failed:', err)
        );
      } else {
        const savedUrl = localStorage.getItem('adi_calendar_url');
        if (savedUrl) {
          handleSyncLiveCalendar(savedUrl, true).catch(err =>
            console.error('Auto-refresh Live feed failed:', err)
          );
        }
      }
    };

    // Set up a 5-minute interval for auto refresh (300000 ms)
    const interval = setInterval(refreshData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [handleFetchGoogleCalendar, handleFetchOutlookCalendar, handleSyncLiveCalendar, selectedCalendarId]);

  const handleFetchEventsForCalendar = useCallback(async (calendarId: string): Promise<boolean> => {
    if (!accessToken || !tokenType) {
      alert("No active session. Please connect your calendar again.");
      return false;
    }
    localStorage.setItem('adi_selected_calendar_id', calendarId);
    setSelectedCalendarId(calendarId);
    
    try {
      if (tokenType === 'google') {
        await handleFetchGoogleCalendar(accessToken, calendarId);
        return true;
      } else if (tokenType === 'outlook') {
        await handleFetchOutlookCalendar(accessToken, calendarId);
        return true;
      }
    } catch (err) {
      console.error('Failed to fetch events for calendar', err);
    }
    return false;
  }, [accessToken, tokenType, handleFetchGoogleCalendar, handleFetchOutlookCalendar]);


  const handleClear = () => {
    setAllEvents([]);
    setFileName(null);
    setAccessToken('');
    setTokenType(null);
    setSelectedCalendarId('');
    localStorage.removeItem('adi_calendar_ics');
    localStorage.removeItem('adi_calendar_filename');
    localStorage.removeItem('adi_cached_calendar_events');
    localStorage.removeItem('adi_google_access_token');
    localStorage.removeItem('adi_google_token_expiry');
    localStorage.removeItem('adi_outlook_access_token');
    localStorage.removeItem('adi_outlook_token_expiry');
    localStorage.removeItem('adi_selected_calendar_id');
    localStorage.removeItem('adi_onboarding_complete');
    localStorage.removeItem('adi_onboarding_step');
    setOnboardingComplete(false);
    setOnboardingStep('connect');
    setViewMode('dashboard');
    setSelectedYear(null);
  };

  // Week-level increment/decrement
  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Split events globally
  const { instructorEvents, filteredOutEvents } = useMemo(() => {
    return splitInstructorEvents(allEvents);
  }, [allEvents]);

  // Get available years from events
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    instructorEvents.forEach(e => {
      yearsSet.add(e.start.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // newest to oldest
  }, [instructorEvents]);

  // Filtered events for Yearly Stats
  const filteredYearlyEvents = useMemo(() => {
    if (selectedYear === null) return instructorEvents;
    return instructorEvents.filter(e => e.start.getFullYear() === selectedYear);
  }, [instructorEvents, selectedYear]);

  // Filter events for the currently selected week
  const { weekInstructorEvents, weekFilteredOutEvents } = useMemo(() => {
    const start = currentWeekStart;
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    
    const instructor = instructorEvents.filter(e => e.start >= start && e.start <= end);
    const filtered = filteredOutEvents.filter(e => e.start >= start && e.start <= end);
    
    return { weekInstructorEvents: instructor, weekFilteredOutEvents: filtered };
  }, [instructorEvents, filteredOutEvents, currentWeekStart]);

  // Week date range text
  const weekEnd = useMemo(() => {
    return new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  }, [currentWeekStart]);

  const weekRangeLabel = useMemo(() => {
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${currentWeekStart.toLocaleDateString(undefined, opt)} – ${weekEnd.toLocaleDateString(undefined, opt)}`;
  }, [currentWeekStart, weekEnd]);

  return (
    <div className="app-container">
      {/* App Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <Calendar size={24} color="#fff" />
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>
              DriveStats ADI
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Approved Driving Instructor Schedule Analytics
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }} className="header-actions">
          {/* Theme Switcher Toggle */}
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ padding: '0.5rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }} 
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={15} style={{ color: 'var(--accent-amber)' }} /> : <Moon size={15} style={{ color: 'var(--accent-indigo)' }} />}
          </button>

          {/* Global AI toggle */}
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ 
              padding: '0.5rem 0.75rem', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              border: enableAiInsights ? '1px solid var(--accent-cyan)' : '1px solid var(--border-light)',
              background: enableAiInsights ? 'rgba(6,182,212,0.1)' : 'transparent',
              color: enableAiInsights ? 'var(--accent-cyan)' : 'var(--text-muted)'
            }} 
            onClick={() => {
              const val = !enableAiInsights;
              setEnableAiInsights(val);
              if (!val && viewMode === 'ai') {
                setViewMode('dashboard');
              }
            }}
            title={enableAiInsights ? "Disable AI Features globally" : "Enable AI Features globally"}
          >
            <Sparkles size={15} style={{ color: enableAiInsights ? 'var(--accent-cyan)' : 'var(--text-dim)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>AI: {enableAiInsights ? 'ON' : 'OFF'}</span>
          </button>

          {onboardingComplete && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', padding: '0.4rem 0.8rem', borderRadius: '10px', display: 'inline-block', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName || ''}>
                {fileName}
              </span>
              {calendarUrl && (
                <button
                  type="button"
                  className="btn btn-secondary hover-glow"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.85rem', width: 'auto', borderColor: 'var(--accent-cyan)' }}
                  onClick={() => handleSyncLiveCalendar()}
                  disabled={isSyncing}
                  title="Sync Live Calendar Feed"
                >
                  <RefreshCw size={14} className={isSyncing ? 'spin-animation' : ''} />
                  {isSyncing ? 'Syncing...' : 'Sync Live'}
                </button>
              )}
              <button 
                type="button" 
                className="btn btn-danger" 
                style={{ padding: '0.4rem 0.8rem', borderRadius: '10px', fontSize: '0.85rem', width: 'auto' }} 
                onClick={handleClear}
              >
                <LogOut size={14} />
                Clear
              </button>
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
            
            {/* Control Strip: Week Switcher + View Toggles */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
              
              {/* Conditional Selector: Week Navigator or Year Selector */}
              {viewMode === 'yearly' ? (
                /* Year Selector */
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }} 
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
                  </button>

                  <select
                    value={selectedYear || 'all'}
                    onChange={(e) => setSelectedYear(e.target.value === 'all' ? null : parseInt(e.target.value, 10))}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-main)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      cursor: 'pointer',
                      textAlign: 'center',
                      minWidth: '160px'
                    }}
                  >
                    <option value="all">All Time</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year} Stats</option>
                    ))}
                  </select>

                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }} 
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
                  </button>
                </div>
              ) : (
                /* Week Navigator or Spacer */
                viewMode !== 'settings' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }} 
                      onClick={handlePrevWeek}
                      title="Previous Week"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', flex: '1 1 auto', minWidth: '150px', textAlign: 'center' }}>
                      {weekRangeLabel}
                    </span>

                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.6rem', borderRadius: '8px' }} 
                      onClick={handleNextWeek}
                      title="Next Week"
                    >
                      <ChevronRight size={16} />
                    </button>

                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} 
                      onClick={handleCurrentWeek}
                    >
                      <RefreshCw size={12} />
                      Current
                    </button>
                  </div>
                ) : (
                  <div style={{ flex: 1 }} />
                )
              )}

              {/* View Switcher Tabs */}
              <div className="nav-tab-strip">
                <button
                  type="button"
                  className="btn"
                  style={{ 
                    background: viewMode === 'dashboard' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'transparent',
                    color: viewMode === 'dashboard' ? '#fff' : 'var(--text-muted)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    boxShadow: viewMode === 'dashboard' ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'
                  }}
                  onClick={() => setViewMode('dashboard')}
                >
                  <LayoutDashboard size={13} />
                  Weekly Dashboard
                </button>

                <button
                  type="button"
                  className="btn"
                  style={{ 
                    background: viewMode === 'yearly' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'transparent',
                    color: viewMode === 'yearly' ? '#fff' : 'var(--text-muted)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    boxShadow: viewMode === 'yearly' ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'
                  }}
                  onClick={() => setViewMode('yearly')}
                >
                  <TrendingUp size={13} />
                  Yearly Stats
                </button>
                
                <button
                  type="button"
                  className="btn"
                  style={{ 
                    background: viewMode === 'events' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'transparent',
                    color: viewMode === 'events' ? '#fff' : 'var(--text-muted)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    boxShadow: viewMode === 'events' ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'
                  }}
                  onClick={() => setViewMode('events')}
                >
                  <List size={13} />
                  Explorer
                </button>

                {enableAiInsights && (
                  <button
                    type="button"
                    className="btn animate-pulse-glow"
                    style={{ 
                      background: viewMode === 'ai' ? 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))' : 'transparent',
                      color: viewMode === 'ai' ? '#fff' : 'var(--text-muted)',
                      padding: '0.4rem 1rem',
                      fontSize: '0.8rem',
                      borderRadius: '8px',
                      boxShadow: viewMode === 'ai' ? '0 2px 8px rgba(6, 182, 212, 0.2)' : 'none'
                    }}
                    onClick={() => setViewMode('ai')}
                  >
                    <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
                    AI Insights
                  </button>
                )}

                <button
                  type="button"
                  className="btn"
                  style={{ 
                    background: viewMode === 'settings' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'transparent',
                    color: viewMode === 'settings' ? '#fff' : 'var(--text-muted)',
                    padding: '0.4rem 1rem',
                    fontSize: '0.8rem',
                    borderRadius: '8px',
                    boxShadow: viewMode === 'settings' ? '0 2px 8px rgba(99, 102, 241, 0.2)' : 'none'
                  }}
                  onClick={() => setViewMode('settings')}
                >
                  <Settings size={13} />
                  Settings
                </button>
              </div>
            </div>

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
        <span>&copy; {new Date().getFullYear()} DriveStats ADI. All driving school data stays locally in the browser.</span>
        <span>Built with Antigravity AI</span>
      </footer>
    </div>
  );
}

export default App;
