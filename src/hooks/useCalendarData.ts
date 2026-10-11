import { useState, useMemo, useEffect, useCallback } from 'react';
import { parseICS, type CalendarEvent } from '../utils/icsParser';
import { splitInstructorEvents } from '../utils/eventFilters';

export interface GoogleCalendarItem {
  id?: string;
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  colorId?: string;
}

export interface OutlookCalendarItem {
  id?: string;
  subject?: string;
  bodyPreview?: string;
  start?: { dateTime?: string };
  end?: { dateTime?: string };
  isAllDay?: boolean;
  categories?: string[];
}

export interface CalendarDataResult {
  allEvents: CalendarEvent[];
  setAllEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  fileName: string | null;
  setFileName: React.Dispatch<React.SetStateAction<string | null>>;
  instructorEvents: CalendarEvent[];
  filteredOutEvents: CalendarEvent[];
  availableYears: number[];
  isSyncing: boolean;
  syncError: string | null;
  onboardingComplete: boolean;
  setOnboardingComplete: React.Dispatch<React.SetStateAction<boolean>>;
  onboardingStep: 'connect' | 'calendar_select' | 'ai_config';
  setOnboardingStep: React.Dispatch<React.SetStateAction<'connect' | 'calendar_select' | 'ai_config'>>;
  accessToken: string;
  setAccessToken: React.Dispatch<React.SetStateAction<string>>;
  tokenType: 'google' | 'outlook' | null;
  setTokenType: React.Dispatch<React.SetStateAction<'google' | 'outlook' | null>>;
  selectedCalendarId: string;
  setSelectedCalendarId: React.Dispatch<React.SetStateAction<string>>;
  calendarUrl: string;
  setCalendarUrl: React.Dispatch<React.SetStateAction<string>>;
  handleSyncLiveCalendar: (customUrl?: string, silent?: boolean) => Promise<void>;
  handleFetchGoogleCalendar: (token: string, calendarId?: string) => Promise<void>;
  handleFetchOutlookCalendar: (token: string, calendarId?: string) => Promise<void>;
  handleFetchEventsForCalendar: (calendarId: string) => Promise<boolean>;
  handleConnectGoogle: () => void;
  handleConnectOutlook: () => void;
  handleDisconnectLiveSync: () => void;
  handleClear: () => void;
  handleFileParsed: (text: string, name: string) => void;
}

export function useCalendarData(
  onWeekCalculated?: (date: Date) => void,
  onResetView?: () => void
): CalendarDataResult {
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

  // OAuth Client IDs (configured at build time via Vite env)
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

  const handleFileParsed = useCallback((text: string, name: string) => {
    try {
      const parsedEvents = parseICS(text);
      setAllEvents(parsedEvents);
      setFileName(name);
      if (onResetView) onResetView();

      // Smart Default Week Selection
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      const todayMonday = new Date(today.setDate(diff));
      todayMonday.setHours(0, 0, 0, 0);
      const todaySunday = new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      
      const hasEventsThisWeek = parsedEvents.some(e => e.start >= todayMonday && e.start <= todaySunday);
      
      if (hasEventsThisWeek) {
        if (onWeekCalculated) onWeekCalculated(todayMonday);
      } else if (parsedEvents.length > 0) {
        const latestEvent = parsedEvents[parsedEvents.length - 1];
        const latestDate = new Date(latestEvent.start);
        const lDay = latestDate.getDay();
        const lDiff = latestDate.getDate() - lDay + (lDay === 0 ? -6 : 1);
        const latestMonday = new Date(latestDate.setDate(lDiff));
        latestMonday.setHours(0, 0, 0, 0);
        if (onWeekCalculated) onWeekCalculated(latestMonday);
      } else {
        if (onWeekCalculated) onWeekCalculated(todayMonday);
      }

      localStorage.setItem('adi_calendar_ics', text);
      localStorage.setItem('adi_calendar_filename', name);
    } catch (err) {
      alert('Failed to parse .ics file. Please ensure it is a valid iCalendar format.');
      console.error(err);
    }
  }, [onWeekCalculated, onResetView]);

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
      if (onResetView) onResetView();
      localStorage.setItem('adi_cached_calendar_events', JSON.stringify(mappedEvents));
      localStorage.setItem('adi_calendar_filename', "Google Calendar Sync");
      localStorage.removeItem('adi_calendar_ics');
    } catch (err) {
      console.error(err);
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  }, [onResetView]);

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
      if (onResetView) onResetView();
      localStorage.setItem('adi_cached_calendar_events', JSON.stringify(mappedEvents));
      localStorage.setItem('adi_calendar_filename', "Outlook Calendar Sync");
      localStorage.removeItem('adi_calendar_ics');
    } catch (err) {
      console.error(err);
      setSyncError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSyncing(false);
    }
  }, [onResetView]);

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
    if (onResetView) onResetView();
  };

  // Split events globally
  const { instructorEvents, filteredOutEvents } = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() + 6);
    const validEvents = allEvents.filter(e => e.start <= cutoffDate);
    return splitInstructorEvents(validEvents);
  }, [allEvents]);

  // Get available years from events
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    instructorEvents.forEach(e => {
      yearsSet.add(e.start.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a); // newest to oldest
  }, [instructorEvents]);

  return {
    allEvents,
    setAllEvents,
    fileName,
    setFileName,
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
    setAccessToken,
    tokenType,
    setTokenType,
    selectedCalendarId,
    setSelectedCalendarId,
    calendarUrl,
    setCalendarUrl,
    handleSyncLiveCalendar,
    handleFetchGoogleCalendar,
    handleFetchOutlookCalendar,
    handleFetchEventsForCalendar,
    handleConnectGoogle,
    handleConnectOutlook,
    handleDisconnectLiveSync,
    handleClear,
    handleFileParsed,
  };
}
