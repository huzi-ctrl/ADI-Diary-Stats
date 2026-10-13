import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowRight, ArrowLeft, Sparkles, ShieldCheck, Check } from 'lucide-react';
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
      setOnboardingStep('ai_config');
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
                setOnboardingStep('ai_config');
              }}
              handleConnectGoogle={handleConnectGoogle}
              handleConnectOutlook={handleConnectOutlook}
              calendarUrl={calendarUrl}
              setCalendarUrl={setCalendarUrl}
              handleSyncLiveCalendar={(url) => {
                handleSyncLiveCalendar(url);
                setOnboardingStep('ai_config');
              }}
              isSyncing={isSyncing}
            />

            {syncError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>Synchronization error: {syncError}</span>
              </div>
            )}
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
                        Continue to AI Choice <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3 (or Step 2 for ICS/Webcal): DELIBERATE AI YES/NO CHOICE */}
        {onboardingStep === 'ai_config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '9999px', background: 'rgba(37, 99, 235, 0.08)', color: 'var(--accent-blue)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                <Sparkles size={13} /> Decision Required
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Enable AI Copilot &amp; Weekly Insights?
              </h3>
              <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Please choose whether you want automated AI workload analysis or pure offline local analytics. You can adjust this anytime in settings.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
              
              {/* OPTION YES: ENABLE AI */}
              <div
                className="hover-glow"
                onClick={() => {
                  setEnableAiInsights?.(true);
                  localStorage.setItem('adi_enable_ai_insights', 'true');
                  onCompleteOnboarding();
                }}
                style={{
                  background: 'var(--bg-nested)',
                  border: enableAiInsights ? '2px solid rgba(37, 99, 235, 0.7)' : '1px solid var(--border-light)',
                  borderRadius: '18px',
                  padding: '1.4rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: enableAiInsights ? '0 4px 16px rgba(37, 99, 235, 0.12)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.12)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Yes, Enable AI
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 700 }}>
                      Weekly Coaching &amp; Pacing
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    Automated weekly timetable summaries, pupil cancellation pacing, and tips to recover dead gaps.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    marginTop: '1.25rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  <Check size={16} /> Yes, Enable AI
                </button>
              </div>

              {/* OPTION NO: PURE LOCAL MODE */}
              <div
                className="hover-glow"
                onClick={() => {
                  setEnableAiInsights?.(false);
                  localStorage.setItem('adi_enable_ai_insights', 'false');
                  onCompleteOnboarding();
                }}
                style={{
                  background: 'var(--bg-nested)',
                  border: !enableAiInsights ? '2px solid rgba(16, 185, 129, 0.7)' : '1px solid var(--border-light)',
                  borderRadius: '18px',
                  padding: '1.4rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: !enableAiInsights ? '0 4px 16px rgba(16, 185, 129, 0.1)' : 'none',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--sfd-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      No, Keep Pure Local
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sfd-emerald)', fontWeight: 700 }}>
                      100% Offline &amp; Private
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                    Zero AI network calls. All schedule analytics, workload calculations, and vehicle costs run strictly inside your browser.
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    marginTop: '1.25rem',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                >
                  No, Pure Local Mode
                </button>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
              <button
                type="button"
                onClick={() => setOnboardingStep(accessToken ? 'calendar_select' : 'connect')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem' }}
              >
                <ArrowLeft size={14} /> Back to calendar options
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
