import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { FileUploader } from './FileUploader';

interface GoogleCalendarApiItem {
  id: string;
  summary: string;
  primary?: boolean;
}

interface OutlookCalendarApiItem {
  id: string;
  name: string;
  isDefaultCalendar?: boolean;
}

interface OnboardingWizardProps {
  onboardingStep: 'connect' | 'calendar_select' | 'ai_config';
  setOnboardingStep: (step: 'connect' | 'calendar_select' | 'ai_config') => void;
  onCompleteOnboarding: () => void;
  handleConnectGoogle: () => void;
  handleConnectOutlook: () => void;
  calendarUrl: string;
  setCalendarUrl: (url: string) => void;
  handleSyncLiveCalendar: (url?: string) => void;
  isSyncing: boolean;
  onFileParsed: (text: string, name: string) => void;
  enableAiInsights?: boolean;
  setEnableAiInsights?: (val: boolean) => void;
  aiProvider?: 'gemini' | 'openai';
  setAiProvider?: (val: 'gemini' | 'openai') => void;
  aiModel?: string;
  setAiModel?: (val: string) => void;
  aiApiKey?: string;
  setAiApiKey?: (val: string) => void;
  accessToken: string;
  tokenType: 'google' | 'outlook' | null;
  onFetchEventsForCalendar: (calendarId: string) => Promise<boolean>;
  syncError: string | null;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onboardingStep,
  setOnboardingStep,
  onCompleteOnboarding,
  handleConnectGoogle,
  handleConnectOutlook,
  calendarUrl,
  setCalendarUrl,
  handleSyncLiveCalendar,
  isSyncing,
  onFileParsed,
  enableAiInsights = true,
  setEnableAiInsights,
  accessToken,
  tokenType,
  onFetchEventsForCalendar,
  syncError
}) => {
  const [calendars, setCalendars] = useState<{ id: string; name: string; isDefault: boolean }[]>([]);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('');

  // Fetch calendars when token is available in calendar_select step
  useEffect(() => {
    if (onboardingStep !== 'calendar_select' || !accessToken || !tokenType) return;

    const fetchCalendars = async () => {
      setLoadingCalendars(true);
      setCalendarError(null);
      try {
        if (tokenType === 'google') {
          const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!res.ok) throw new Error(`Google API returned status ${res.status}`);
          const data = await res.json();
          const items: { id: string; name: string; isDefault: boolean }[] = (data.items || []).map((c: GoogleCalendarApiItem) => ({
            id: c.id,
            name: c.summary,
            isDefault: c.primary || false
          }));
          setCalendars(items);
          const defaultCal = items.find((c) => c.isDefault) || items[0];
          if (defaultCal) setSelectedCalendarId(defaultCal.id);
        } else if (tokenType === 'outlook') {
          const res = await fetch('https://graph.microsoft.com/v1.0/me/calendars', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!res.ok) throw new Error(`Outlook API returned status ${res.status}`);
          const data = await res.json();
          const items: { id: string; name: string; isDefault: boolean }[] = (data.value || []).map((c: OutlookCalendarApiItem) => ({
            id: c.id,
            name: c.name,
            isDefault: c.isDefaultCalendar || false
          }));
          setCalendars(items);
          const defaultCal = items.find((c) => c.isDefault) || items[0];
          if (defaultCal) setSelectedCalendarId(defaultCal.id);
        }
      } catch (err) {
        console.error('Failed to fetch calendar list:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setCalendarError(errMsg);
      } finally {
        setLoadingCalendars(false);
      }
    };

    fetchCalendars();
  }, [onboardingStep, accessToken, tokenType]);

  const handleCalendarSelectionNext = async () => {
    if (!selectedCalendarId) {
      alert('Please select a calendar first.');
      return;
    }
    const success = await onFetchEventsForCalendar(selectedCalendarId);
    if (success) {
      onCompleteOnboarding();
    }
  };

  return (
    <div style={{ maxWidth: '520px', margin: '2.5rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      
      {/* Sleek Minimal Brand Hero */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--card-shadow)', marginBottom: '0.25rem' }}>
          <img src="/favicon.png" alt="ADI stats logo" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '-0.025em' }}>Welcome to ADI stats</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: 0, lineHeight: '1.45' }}>
          Connect your calendar to view instant teaching analytics, weekly workload pacing, and revenue insights.
        </p>
      </div>

      {/* Step Panels */}
      <div className="glass-card" style={{ padding: '2rem', borderRadius: '22px' }}>
        
        {/* STEP 1: CONNECT */}
        {onboardingStep === 'connect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <FileUploader
              onFileParsed={(text, name) => {
                onFileParsed(text, name);
                onCompleteOnboarding();
              }}
              handleConnectGoogle={handleConnectGoogle}
              handleConnectOutlook={handleConnectOutlook}
              calendarUrl={calendarUrl}
              setCalendarUrl={setCalendarUrl}
              handleSyncLiveCalendar={(url) => {
                handleSyncLiveCalendar(url);
                onCompleteOnboarding();
              }}
              isSyncing={isSyncing}
            />

            {syncError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>Synchronization error: {syncError}</span>
              </div>
            )}

            {/* AI Assistant & Copilot Preference */}
            <div
              style={{
                marginTop: '0.25rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '16px',
                background: 'var(--bg-nested)',
                border: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '11px',
                    background: enableAiInsights ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                    color: enableAiInsights ? 'var(--accent-blue)' : 'var(--text-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25 }}>
                    AI Copilot &amp; Weekly Insights
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.35, marginTop: '2px' }}>
                    {enableAiInsights
                      ? 'Automated weekly workload analysis & pacing tips'
                      : 'Disabled — pure local offline analytics only'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEnableAiInsights?.(!enableAiInsights)}
                aria-label={enableAiInsights ? 'Disable AI Features' : 'Enable AI Features'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: enableAiInsights ? '1px solid rgba(37, 99, 235, 0.35)' : '1px solid var(--border-medium)',
                  background: enableAiInsights ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                  color: enableAiInsights ? 'var(--accent-blue)' : 'var(--text-muted)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: enableAiInsights ? '#10b981' : '#94a3b8',
                  }}
                />
                {enableAiInsights ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SELECT CALENDAR */}
        {onboardingStep === 'calendar_select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Step 2: Choose your Driving School calendar</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Select the calendar from your account that contains your student bookings and drives.
              </p>
            </div>

            {loadingCalendars ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '1rem', color: 'var(--accent-indigo)' }}>
                <RefreshCw size={32} className="spin-animation" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading available calendars...</span>
              </div>
            ) : calendarError ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>Failed to retrieve calendars: {calendarError}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOnboardingStep('connect')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}
                >
                  <ArrowLeft size={14} /> Back and try again
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {calendars.map(cal => (
                    <label 
                      key={cal.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        padding: '0.85rem 1.1rem', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border-light)', 
                        background: selectedCalendarId === cal.id ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-nested)',
                        borderColor: selectedCalendarId === cal.id ? 'var(--accent-indigo)' : 'var(--border-light)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <input 
                        type="radio" 
                        name="selectedCalendar" 
                        value={cal.id} 
                        checked={selectedCalendarId === cal.id}
                        onChange={() => setSelectedCalendarId(cal.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{cal.name}</span>
                        {cal.isDefault && <span style={{ fontSize: '0.6875rem', color: 'var(--accent-indigo)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.05rem' }}>Primary Calendar</span>}
                      </div>
                    </label>
                  ))}
                </div>

                {/* AI Assistant & Copilot Preference */}
                <div
                  style={{
                    padding: '0.9rem 1.1rem',
                    borderRadius: '16px',
                    background: 'var(--bg-nested)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '11px',
                        background: enableAiInsights ? 'rgba(37, 99, 235, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: enableAiInsights ? 'var(--accent-blue)' : 'var(--text-dim)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.25 }}>
                        AI Copilot &amp; Weekly Insights
                      </div>
                      <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.35, marginTop: '2px' }}>
                        {enableAiInsights
                          ? 'Automated weekly workload analysis & pacing tips'
                          : 'Disabled — pure local offline analytics only'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEnableAiInsights?.(!enableAiInsights)}
                    aria-label={enableAiInsights ? 'Disable AI Features' : 'Enable AI Features'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.775rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: enableAiInsights ? '1px solid rgba(37, 99, 235, 0.35)' : '1px solid var(--border-medium)',
                      background: enableAiInsights ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-card)',
                      color: enableAiInsights ? 'var(--accent-blue)' : 'var(--text-muted)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: enableAiInsights ? '#10b981' : '#94a3b8',
                      }}
                    />
                    {enableAiInsights ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-light)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setOnboardingStep('connect')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <ArrowLeft size={15} /> Back
                  </button>

                  <button
                    type="button"
                    className="btn btn-primary hover-glow"
                    onClick={handleCalendarSelectionNext}
                    disabled={isSyncing || !selectedCalendarId}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw size={15} className="spin-animation" />
                        Fetching events...
                      </>
                    ) : (
                      <>
                        Open Dashboard <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
