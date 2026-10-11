import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { Calendar, BarChart3, Activity, ShieldAlert, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { getCachedAiItem, setCachedAiItem, formatAiError } from '../utils/aiHelper';
import { useWeeklyCapacity } from '../hooks/useWeeklyCapacity';

const dayIndices = [1, 2, 3, 4, 5, 6, 0];
const dayOfWeekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface StatsDashboardProps {
  instructorEvents: CalendarEvent[]; // already filtered to active week
  filteredOutEvents: CalendarEvent[]; // already filtered to active week
  allInstructorEvents: CalendarEvent[]; // full calendar history
  weekStart: Date;
  weekEnd: Date;
  hourlyRate: number;
  nonPayingList: string[];
  capacityMode?: 'historical' | 'custom';
  customIdealHours?: Record<number, number>;
  enableAiInsights?: boolean;
  aiProvider?: 'gemini' | 'openai';
  aiModel?: string;
  aiApiKey?: string;
}

export const StatsDashboard: React.FC<StatsDashboardProps> = ({ 
  instructorEvents, 
  filteredOutEvents,
  allInstructorEvents,
  weekStart,
  weekEnd,
  hourlyRate,
  nonPayingList,
  capacityMode = 'historical',
  customIdealHours = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 },
  enableAiInsights = false,
  aiProvider = 'gemini',
  aiModel = 'gemini-2.5-flash',
  aiApiKey = ''
}) => {
  const [weeklyAiReport, setWeeklyAiReport] = useState<{
    summary: string;
    score: number;
    scoreReason: string;
    bottleneckDay: string;
    recommendations: string[];
  } | null>(null);
  const [weeklyAiLoading, setWeeklyAiLoading] = useState(false);
  const [weeklyAiError, setWeeklyAiError] = useState<string | null>(null);

  // Decoupled capacity and scheduling analytics
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
    weekdayStatsString,
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
    formatRangeShort,
    formatRemainingThisWeek,
    formatDateShort,
  } = useWeeklyCapacity({
    instructorEvents,
    allInstructorEvents,
    weekStart,
    weekEnd,
    hourlyRate,
    nonPayingList,
    capacityMode,
    customIdealHours,
  });

  const lessonsSig = useMemo(() => {
    return lessonsOnly.map(e => `${e.id}-${e.start.getTime()}-${e.end.getTime()}`).join('|');
  }, [lessonsOnly]);

  const fetchWeeklyAiReport = useCallback(async (force = false) => {
    if (!aiApiKey || !enableAiInsights) return;

    const cacheKey = `weekly_ai_v6_${weekStart.toISOString()}_${aiProvider}_${aiModel}_${hourlyRate}_${lessonsSig}`;
    const nowTime = new Date();
    const isCurrentWeek = weekStart <= nowTime && weekEnd >= nowTime;
    const cacheAgeLimit = isCurrentWeek ? 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;

    const cached = getCachedAiItem<{
      summary: string;
      score: number;
      scoreReason: string;
      bottleneckDay: string;
      recommendations: string[];
    }>(cacheKey, cacheAgeLimit);

    if (cached && !force) {
      setTimeout(() => setWeeklyAiReport(cached), 0);
      return;
    }

    setWeeklyAiLoading(true);
    setWeeklyAiError(null);

    try {
      const systemPrompt = `You are an elite business analyst and driving school coaching AI.
You analyze the instructor's calendar data for the week and return a structured JSON report.
Your output must be strictly valid JSON. Do not include markdown formatting or extra text outside the JSON.
The JSON must follow this exact structure:
{
  "summary": "A concise 2-3 sentence overview of their weekly performance and workload pacing.",
  "score": 75, // A scheduling/productivity score from 0 to 100 based on utilization, empty gaps, and earnings
  "scoreReason": "A brief explanation of why this score was given.",
  "bottleneckDay": "The day of the week with the most dead/unusable time (e.g., 'Tuesday'), or 'None'",
  "recommendations": [
    "Specific tip 1 based on their gaps/workload",
    "Specific tip 2 to optimize booking efficiency"
  ]
}`;

      const userPrompt = `Weekly Calendar Data (${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}):
- Total Lessons: ${lessonsOnly.length}
- Total Teaching Hours: ${totalTeachHours} hrs
- Weekly Earnings: £${weeklyEarnings} (hourly rate: £${hourlyRate}/hr)
- Weekday Distribution: ${weekdayStatsString}
- Time-of-day slots: Morning ${morningPct}%, Afternoon ${afternoonPct}%, Evening ${eveningPct}%, Night ${nightPct}%
- Wasted dead gaps: ${thisWeekStats.freeHours.toFixed(1)} hrs (${thisWeekStats.fillPct}% utilization rate)

Analyze and return the JSON object.`;

      let contents: Array<Record<string, unknown>> = [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ];

      let accumulatedAnswer = '';
      let attempts = 0;
      const maxAttempts = 3;
      let finalFinishReason = '';
      let debugTrace = '';

      while (attempts < maxAttempts) {
        if (aiProvider === 'gemini') {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiApiKey.trim()}`;
          
          const payload: Record<string, unknown> = {
            contents,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 8192
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          };

          if (systemPrompt) {
            payload.systemInstruction = {
              parts: [{ text: systemPrompt }]
            };
          }

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
          }
          const res = await response.json();
          const parts = res?.candidates?.[0]?.content?.parts || [];
          const text = parts.map((p: { text?: string }) => p.text || '').join('');
          accumulatedAnswer += text;
          finalFinishReason = res?.candidates?.[0]?.finishReason;
        } else {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${aiApiKey.trim()}`
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...contents
              ],
              temperature: 0.2,
              response_format: { type: 'json_object' }
            })
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `OpenAI API returned status ${response.status}`);
          }
          const res = await response.json();
          const text = res?.choices?.[0]?.message?.content || '';
          accumulatedAnswer += text;
          finalFinishReason = res?.choices?.[0]?.finish_reason;
        }

        let cleanAnswer = accumulatedAnswer.trim();
        if (cleanAnswer.startsWith('```')) {
          cleanAnswer = cleanAnswer.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
        }

        const isReportComplete = cleanAnswer.trim().endsWith('}');
        const lastChar = cleanAnswer.trim().slice(-1);
        const isEndingValid = lastChar === '}';

        if (isEndingValid && isReportComplete) {
          break;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          break;
        }

        console.log(`[StatsDashboard] AI output looks incomplete (ending: "${lastChar}", complete: ${isReportComplete}). Triggering continuation ${attempts}/${maxAttempts}...`);
        debugTrace += `\n[Attempt ${attempts}] Incomplete response. Triggering continuation...`;

        if (aiProvider === 'gemini') {
          contents = [
            ...contents,
            { role: 'model', parts: [{ text: accumulatedAnswer }] },
            { role: 'user', parts: [{ text: 'Your previous response was cut off. Please continue writing the response from where you left off. Start immediately with the continuation, without repeating what you already wrote.' }] }
          ];
        } else {
          contents = [
            ...contents,
            { role: 'assistant', content: accumulatedAnswer },
            { role: 'user', content: 'Your previous response was cut off. Please continue writing the response from where you left off. Start immediately with the continuation, without repeating what you already wrote.' }
          ];
        }
      }

      if (finalFinishReason && finalFinishReason !== 'STOP' && finalFinishReason !== 'stop' && finalFinishReason !== 'MAX_TOKENS' && finalFinishReason !== 'length') {
        console.warn(`[StatsDashboard] AI generation finished with reason: ${finalFinishReason}`);
        debugTrace += `\n[Final] Interrupted by reason: ${finalFinishReason}`;
      }

      let finalClean = accumulatedAnswer.trim();
      if (finalClean.startsWith('```')) {
        finalClean = finalClean.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
      }
      const parsed = JSON.parse(finalClean);
      if (debugTrace) {
        parsed.debugTrace = debugTrace;
      }
      setWeeklyAiReport(parsed);
      setCachedAiItem(cacheKey, parsed);
    } catch (err) {
      console.error('Failed to fetch weekly AI insights:', err);
      setWeeklyAiError(formatAiError(err));
    } finally {
      setWeeklyAiLoading(false);
    }
  }, [aiApiKey, enableAiInsights, weekStart, weekEnd, lessonsOnly, totalTeachHours, weeklyEarnings, hourlyRate, weekdayStatsString, thisWeekStats.freeHours, thisWeekStats.fillPct, morningPct, afternoonPct, eveningPct, nightPct, aiProvider, aiModel, lessonsSig]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWeeklyAiReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchWeeklyAiReport]);

  const showAiPanel = enableAiInsights && aiApiKey;

  return (
    <div className={`dashboard-layout-container ${showAiPanel ? 'with-sidebar' : ''}`} style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Main Stats Column */}
      <div className="dashboard-main-column">
        {/* Date display & Filter banner */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ background: 'var(--sfd-surface-card)', border: '1px solid var(--sfd-border-hairline)', boxShadow: 'var(--sfd-shadow-soft)', padding: '0.45rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sfd-ink-secondary)' }}>
            <Calendar size={14} style={{ color: 'var(--sfd-primary)' }} />
            <span>Active Week:</span>
            <strong style={{ color: 'var(--sfd-ink-primary)' }}>{formatDateShort(weekStart)} &mdash; {formatDateShort(weekEnd)}</strong>
          </div>

          {filteredOutEvents.length > 0 && (
            <div style={{ background: 'var(--sfd-primary-soft)', border: '1px solid rgba(29, 78, 216, 0.15)', padding: '0.45rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--sfd-primary)' }}>
              <ShieldAlert size={14} />
              <span>Hidden <strong>{filteredOutEvents.length}</strong> personal events/rests this week.</span>
            </div>
          )}
        </div>

        {enableAiInsights && !aiApiKey && (
          <div className="sfd-section-card animate-slide-up" style={{ padding: '1.25rem', border: '1px solid rgba(29, 78, 216, 0.2)', background: 'linear-gradient(135deg, rgba(29, 78, 216, 0.04), rgba(2, 132, 199, 0.02))', borderRadius: '22px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} style={{ color: 'var(--sfd-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--sfd-ink-primary)' }}>AI Weekly Coaching Overview</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)', margin: 0 }}>
              AI Coaching is active. Please input a Gemini or OpenAI API Key in the <strong>Settings</strong> tab to power up the dynamic weekly analyst.
            </p>
          </div>
        )}

        {/* Sculpted Organic KPI Cards */}
        <div className="sfd-kpi-grid">
          <div className="sfd-kpi-card">
            <div className="sfd-kpi-top">
              <span className="sfd-kpi-label">Weekly Lessons</span>
              <span className="sfd-kpi-badge emerald">
                {lessonsOnly.length > 0 ? `${lessonsOnly.length} booked` : '0 booked'}
              </span>
            </div>
            <div className="sfd-kpi-value">{lessonsOnly.length}</div>
            <span className="sfd-kpi-sub">
              {lessonsOnly.length} paid • {nonPayingLessons.length} free
            </span>
          </div>
          
          <div className="sfd-kpi-card">
            <div className="sfd-kpi-top">
              <span className="sfd-kpi-label">Teaching Hours</span>
              <span className="sfd-kpi-badge neutral">
                {totalTeachHours} hrs
              </span>
            </div>
            <div className="sfd-kpi-value">{totalTeachHours}<span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--sfd-ink-muted)' }}>h</span></div>
            <span className="sfd-kpi-sub">
              {totalTeachHours}h paid • {nonPayingTeachHours}h free
            </span>
          </div>

          <div className="sfd-kpi-card">
            <div className="sfd-kpi-top">
              <span className="sfd-kpi-label">Weekly Tests</span>
              <span className="sfd-kpi-badge amber">
                {testBookings.length} tests
              </span>
            </div>
            <div className="sfd-kpi-value">{testBookings.length}</div>
            <span className="sfd-kpi-sub">
              Mock exams & official tests
            </span>
          </div>

          <div className="sfd-kpi-card">
            <div className="sfd-kpi-top">
              <span className="sfd-kpi-label">Estimated Revenue</span>
              <span className="sfd-kpi-badge emerald">
                £{hourlyRate}/hr
              </span>
            </div>
            <div className="sfd-kpi-value">£{weeklyEarnings.toLocaleString()}</div>
            <span className="sfd-kpi-sub">
              {totalTeachHours}h teaching @ £{hourlyRate}/hr
            </span>
          </div>
        </div>

        {/* Drives Tracker & Upcoming Bookings */}
        <div className="sfd-section-card">
          <div className="sfd-section-header">
            <div>
              <h3 className="sfd-section-title">
                <Activity size={18} style={{ color: 'var(--sfd-primary)' }} />
                <span>Drives Tracker & Upcoming Bookings</span>
              </h3>
              <span className="sfd-section-sub">
                Real-time status relative to today: <strong>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            
            {/* Progress Bar for This Week's Lessons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>This Week's Lessons Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                  {completedWeeklyLessons} / {lessonsOnly.length} Completed ({weeklyLessonsCompletionPct}%)
                </span>
              </div>
              
              {/* Fluid Pill Progress Bar */}
              <div style={{ height: '14px', background: 'var(--sfd-surface-nested)', borderRadius: '9999px', overflow: 'hidden', display: 'flex', border: '1px solid var(--sfd-border-hairline)', padding: '2px' }}>
                <div style={{ 
                  width: `${weeklyLessonsCompletionPct}%`, 
                  background: 'linear-gradient(90deg, #059669, #1d4ed8)', 
                  borderRadius: '9999px',
                  transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--sfd-ink-faint)' }}>
                <span>Completed: {completedWeeklyLessons}</span>
                <span>Upcoming: {upcomingWeeklyLessons}</span>
              </div>
            </div>

            {/* All-Time Future Schedule stats */}
            <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'var(--sfd-primary-soft)', border: '1px solid rgba(29, 78, 216, 0.15)', padding: '0.6rem 1rem', borderRadius: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sfd-primary)', display: 'block', lineHeight: 1.2 }}>
                    {allFutureLessons.length}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--sfd-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Future Lessons
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'var(--sfd-emerald-soft)', border: '1px solid var(--sfd-emerald-border)', padding: '0.6rem 1rem', borderRadius: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--sfd-emerald)', display: 'block', lineHeight: 1.2 }}>
                    {allFutureTests.length}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--sfd-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    Future Tests
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming Capacity Fill Percentages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-hairline)', padding: '0.85rem 1.1rem', borderRadius: '18px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--sfd-ink-secondary)', fontWeight: 600, borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>Upcoming Capacity</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* This Week */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)' }} title={formatRemainingThisWeek()}>
                      This Week ({formatRemainingThisWeek()})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                      {thisWeekStats.fillPct}% filled &bull; {thisWeekStats.freePct}% free ({thisWeekStats.freeHours.toFixed(1)}h free)
                    </span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.06)', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(thisWeekStats.freePct, 100)}%`, height: '100%', background: 'var(--sfd-emerald)', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Next Week */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={formatRangeShort(nextWeekStart)}>
                      Next Week ({nextWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {nextWeekStats.fillPct}% filled &bull; {nextWeekStats.freePct}% free ({nextWeekStats.freeHours.toFixed(1)}h free)
                    </span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.06)', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(nextWeekStats.freePct, 100)}%`, height: '100%', background: 'var(--sfd-primary)', borderRadius: '9999px' }} />
                  </div>
                </div>

                {/* Two Weeks Out */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={formatRangeShort(twoWeeksOutStart)}>
                      Week after Next ({twoWeeksOutStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {twoWeeksOutStats.fillPct}% filled &bull; {twoWeeksOutStats.freePct}% free ({twoWeeksOutStats.freeHours.toFixed(1)}h free)
                    </span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(15, 23, 42, 0.06)', height: '6px', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(twoWeeksOutStats.freePct, 100)}%`, height: '100%', background: '#0284c7', borderRadius: '9999px' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Workload Chart (Full Width) */}
        <div className="sfd-section-card" style={{ width: '100%' }}>
          <div className="sfd-section-header">
            <div>
              <h3 className="sfd-section-title">
                <BarChart3 size={18} style={{ color: 'var(--sfd-primary)' }} />
                <span>Weekly Teaching Workload (Monday &ndash; Sunday)</span>
              </h3>
              <span className="sfd-section-sub">Active Driving Lesson Hours</span>
            </div>
          </div>

          <div className="chart-scroll-container">
            <div style={{ height: '240px', minWidth: '500px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '1.5rem 1rem 0.5rem 1rem', position: 'relative' }}>
              {dayIndices.map((dayIdx, i) => {
                const hours = dayOfWeekHours[dayIdx];
                const heightPct = (hours / maxDayHours) * 100;
                return (
                  <div key={dayIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: hours > 0 ? 'var(--sfd-ink-primary)' : 'var(--sfd-ink-faint)', height: '18px' }}>
                      {hours > 0 ? `${hours.toFixed(1)}h` : ''}
                    </span>
                    
                    <div style={{ height: '170px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%' }}>
                      <div style={{ 
                        height: `${heightPct}%`, 
                        width: '42px', 
                        minHeight: hours > 0 ? '8px' : '0px',
                        background: hours > 0 
                          ? 'linear-gradient(180deg, #1d4ed8 0%, #2563eb 100%)' 
                          : 'var(--sfd-surface-nested)',
                        border: hours > 0 ? 'none' : '1px dashed var(--sfd-border-subtle)',
                        borderRadius: '9999px 9999px 8px 8px',
                        boxShadow: hours > 0 ? '0 6px 16px -2px rgba(29, 78, 216, 0.25)' : 'none',
                        transition: 'height 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        cursor: 'pointer'
                      }}
                      className="bar-hover"
                      title={`${dayOfWeekNames[i]}: ${hours.toFixed(1)} lesson hours`}
                      />
                    </div>
                    
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--sfd-ink-secondary)' }}>
                      {dayOfWeekNames[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Daily Time of Day Distribution */}
        <div className="sfd-section-card">
          <div className="sfd-section-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h3 className="sfd-section-title">
                <Activity size={18} style={{ color: 'var(--sfd-primary)' }} />
                <span>Lesson Time-of-Day Slots</span>
              </h3>
              <span className="sfd-section-sub">Weekly Lesson Blocks Distribution</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-hairline)', borderRadius: '18px', padding: '1.1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)', fontWeight: 500 }}>Morning (6am - 12pm)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--sfd-primary)' }}>{morningPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--sfd-ink-faint)' }}>{morningCount} slots</span>
            </div>

            <div style={{ background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-hairline)', borderRadius: '18px', padding: '1.1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)', fontWeight: 500 }}>Afternoon (12pm - 6pm)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#2563eb' }}>{afternoonPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--sfd-ink-faint)' }}>{afternoonCount} slots</span>
            </div>

            <div style={{ background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-hairline)', borderRadius: '18px', padding: '1.1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)', fontWeight: 500 }}>Evening (6pm - 12am)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--sfd-emerald)' }}>{eveningPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--sfd-ink-faint)' }}>{eveningCount} slots</span>
            </div>

            <div style={{ background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-hairline)', borderRadius: '18px', padding: '1.1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)', fontWeight: 500 }}>Night (12am - 6am)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--sfd-amber)' }}>{nightPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--sfd-ink-faint)' }}>{nightCount} slots</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Sidebar Column */}
      {showAiPanel && (
        <div className="dashboard-sidebar-column">
          <div className="sfd-section-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} style={{ color: 'var(--sfd-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--sfd-ink-primary)' }}>AI Weekly Copilot</h3>
              </div>
              <button
                type="button"
                onClick={() => fetchWeeklyAiReport(true)}
                disabled={weeklyAiLoading}
                style={{ background: 'transparent', border: 'none', color: 'var(--sfd-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                title="Regenerate Weekly Insights"
              >
                <RefreshCw size={12} className={weeklyAiLoading ? 'spin-animation' : ''} />
              </button>
            </div>

            {weeklyAiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--sfd-primary)', gap: '1rem' }}>
                <RefreshCw size={24} className="spin-animation" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Analyzing weekly pacing...</span>
              </div>
            ) : weeklyAiError ? (
              <div style={{ background: 'var(--sfd-coral-soft)', color: 'var(--sfd-coral)', border: '1px solid var(--sfd-coral-border)', padding: '1rem', borderRadius: '14px', fontSize: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>Error generating insights: {weeklyAiError}</span>
              </div>
            ) : weeklyAiReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Score & Gauge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--sfd-surface-nested)', border: '1px solid var(--sfd-border-hairline)', padding: '1rem', borderRadius: '18px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--sfd-ink-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scheduling Score</span>
                  
                  {/* Gauge SVG */}
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--sfd-border-hairline)" strokeWidth="6"/>
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      fill="none" 
                      stroke={weeklyAiReport.score >= 80 ? 'var(--sfd-emerald)' : weeklyAiReport.score >= 60 ? 'var(--sfd-primary)' : 'var(--sfd-coral)'} 
                      strokeWidth="6" 
                      strokeDasharray="264" 
                      strokeDashoffset={264 - (264 * weeklyAiReport.score) / 100} 
                      strokeLinecap="round" 
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                    <text x="50" y="56" textAnchor="middle" fill="var(--sfd-ink-primary)" fontSize="18" fontWeight="bold">{weeklyAiReport.score}%</text>
                  </svg>

                  <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: '0.25rem' }}>
                    {weeklyAiReport.scoreReason}
                  </span>
                </div>

                {/* Coaching Overview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Coaching Summary</span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45, margin: 0 }}>
                    {weeklyAiReport.summary}
                  </p>
                </div>

                {/* Bottleneck Day */}
                {weeklyAiReport.bottleneckDay && weeklyAiReport.bottleneckDay.toLowerCase() !== 'none' && (
                  <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', padding: '0.65rem 0.85rem', borderRadius: '8px', alignItems: 'flex-start' }}>
                    <AlertCircle size={14} style={{ color: 'var(--accent-amber)', flexShrink: 0, marginTop: '0.1rem' }} />
                    <div style={{ fontSize: '0.725rem', lineHeight: 1.3 }}>
                      <strong style={{ color: 'var(--accent-amber)', display: 'block', marginBottom: '0.1rem' }}>Bottleneck Day Detected</strong>
                      <span style={{ color: 'var(--text-muted)' }}>
                        <strong>{weeklyAiReport.bottleneckDay}</strong> has high waiting times or scheduling gaps relative to lesson duration.
                      </span>
                    </div>
                  </div>
                )}

                {/* Actionable Recommendations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actionable Recommendations</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {weeklyAiReport.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--accent-cyan)', fontSize: '0.75rem', marginTop: '0.15rem' }}>&bull;</span>
                        <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                No weekly data generated. Click reload.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
