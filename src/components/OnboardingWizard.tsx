import React, { useState, useEffect } from 'react';
import { Sparkles, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
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
  enableAiInsights: boolean;
  setEnableAiInsights: (val: boolean) => void;
  aiProvider: 'gemini' | 'openai';
  setAiProvider: (val: 'gemini' | 'openai') => void;
  aiModel: string;
  setAiModel: (val: string) => void;
  aiApiKey: string;
  setAiApiKey: (val: string) => void;
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
  enableAiInsights,
  setEnableAiInsights,
  aiProvider,
  setAiProvider,
  aiModel,
  setAiModel,
  aiApiKey,
  setAiApiKey,
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
    <div style={{ maxWidth: '640px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Onboarding Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 className="gradient-text" style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0 }}>Welcome to ADI stats</h2>
        <div style={{ color: 'var(--text-main)', fontSize: '1rem', maxWidth: '580px', margin: '0 auto', lineHeight: '1.6' }}>
          <strong>ADI stats</strong> is an analytical dashboard built specifically for Approved Driving Instructors. 
          By connecting your calendar, the app securely analyzes your past and upcoming driving lessons to calculate your scheduling efficiency, total teaching hours, and estimated revenue.
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
          All data processing happens entirely inside your local web browser. Your calendar data is <strong>never</strong> uploaded to any centralized server, ensuring maximum privacy for your driving school.
        </p>
      </div>

      {/* Steps Indicator Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-light)', padding: '0.75rem 1.5rem', borderRadius: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            background: onboardingStep === 'connect' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'var(--accent-emerald)', 
            color: '#fff', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.75rem', 
            fontWeight: 700 
          }}>
            {onboardingStep === 'connect' ? '1' : '✓'}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: onboardingStep === 'connect' ? 'var(--text-main)' : 'var(--text-muted)' }}>Connect</span>
        </div>

        <div style={{ height: '2px', width: '40px', background: 'var(--border-light)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: tokenType ? 1 : 0.5 }}>
          <span style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            background: onboardingStep === 'calendar_select' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : onboardingStep === 'ai_config' ? 'var(--accent-emerald)' : 'var(--bg-nested)', 
            color: onboardingStep === 'calendar_select' || onboardingStep === 'ai_config' ? '#fff' : 'var(--text-muted)', 
            border: onboardingStep === 'calendar_select' || onboardingStep === 'ai_config' ? 'none' : '1px solid var(--border-light)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.75rem', 
            fontWeight: 700 
          }}>
            {onboardingStep === 'ai_config' ? '✓' : '2'}
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: onboardingStep === 'calendar_select' ? 'var(--text-main)' : 'var(--text-muted)' }}>Select Calendar</span>
        </div>

        <div style={{ height: '2px', width: '40px', background: 'var(--border-light)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '50%', 
            background: onboardingStep === 'ai_config' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'var(--bg-nested)', 
            color: onboardingStep === 'ai_config' ? '#fff' : 'var(--text-muted)', 
            border: onboardingStep === 'ai_config' ? 'none' : '1px solid var(--border-light)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '0.75rem', 
            fontWeight: 700 
          }}>
            3
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: onboardingStep === 'ai_config' ? 'var(--text-main)' : 'var(--text-muted)' }}>AI Insights</span>
        </div>
      </div>

      {/* Step Panels */}
      <div className="glass-card" style={{ padding: '2rem', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
        
        {/* STEP 1: CONNECT */}
        {onboardingStep === 'connect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Step 1: Link your calendar events</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Sync directly with Google / Outlook to enable live stats, or load an offline calendar backup file.
              </p>
            </div>
            
            <FileUploader
              onFileParsed={(text, name) => {
                onFileParsed(text, name);
                setOnboardingStep('ai_config'); // skip calendar select step for raw files
              }}
              handleConnectGoogle={handleConnectGoogle}
              handleConnectOutlook={handleConnectOutlook}
              calendarUrl={calendarUrl}
              setCalendarUrl={setCalendarUrl}
              handleSyncLiveCalendar={(url) => {
                handleSyncLiveCalendar(url);
                setOnboardingStep('ai_config'); // skip calendar select step for feed URLs
              }}
              isSyncing={isSyncing}
            />

            {syncError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                        {cal.isDefault && <span style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', marginTop: '0.05rem' }}>Primary Calendar</span>}
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
                        Confirm & Fetch events <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: AI CONFIGURATION */}
        {onboardingStep === 'ai_config' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Step 3: Setup AI Copilot Analyst</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Optionally hook up Gemini or OpenAI to get automated weekly coaching insights and scheduling tips.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Toggle Switch */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderRadius: '10px', background: 'var(--bg-nested)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={enableAiInsights} 
                  onChange={(e) => setEnableAiInsights(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Sparkles size={14} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
                    Enable AI Coaching Reports
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Generates schedules ratings, coaching recommendations, and YoY reports.</span>
                </div>
              </label>

              {enableAiInsights && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '1.25rem', borderRadius: '12px', animation: 'fadeIn 0.25s ease-out' }}>
                  
                  {/* Provider Select */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Model Provider</label>
                    <select 
                      className="select-input" 
                      value={aiProvider}
                      onChange={(e) => {
                        const prov = e.target.value as 'gemini' | 'openai';
                        setAiProvider(prov);
                        setAiModel(prov === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
                      }}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                    >
                      <option value="gemini">Google Gemini API (Highly Recommended)</option>
                      <option value="openai">OpenAI API</option>
                    </select>
                  </div>

                  {/* Model Choice */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Model Choice</label>
                    <select 
                      className="select-input" 
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                    >
                      {aiProvider === 'gemini' ? (
                        <>
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended/Cost-free tiers)</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro (Deeper Insights)</option>
                        </>
                      ) : (
                        <>
                          <option value="gpt-4o-mini">gpt-4o-mini (Lightweight/Low cost)</option>
                          <option value="gpt-4o">gpt-4o (Premium)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* API Key Instructions */}
                  <div style={{ marginBottom: '1.5rem', background: 'rgba(6, 182, 212, 0.05)', border: '1px solid var(--accent-cyan)', padding: '1rem', borderRadius: '8px' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600 }}>Need an API Key?</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      You can get a free Gemini API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>Google AI Studio</a>. Make sure it starts with <code>AIzaSy</code>.
                    </p>
                  </div>

                  {/* API Key */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>API Developer Key</label>
                    <input 
                      type="password"
                      className="select-input" 
                      placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}
                    />
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                      Key stays local. Calls are executed entirely client-side directly from your browser.
                    </span>
                  </div>
                </div>
              )}

              {/* Security Banner */}
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '0.75rem 1rem', borderRadius: '10px', alignItems: 'flex-start' }}>
                <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  <strong>Client-Side Processing Guarantee:</strong> All calendar parses, earnings metrics, and AI analysis are run client-side. We never store or upload your private data.
                </span>
              </div>

              {/* Complete Setup */}
              <button
                type="button"
                className="btn btn-primary hover-glow"
                onClick={onCompleteOnboarding}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.9rem', width: '100%', marginTop: '0.5rem' }}
              >
                <CheckCircle2 size={16} /> Setup Completed &rarr; Open Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
