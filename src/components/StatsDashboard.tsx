import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { 
  Calendar, 
  BarChart3, 
  Activity, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Top Filter & Date Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ background: 'var(--sfd-surface-card)', border: '1px solid var(--sfd-border-hairline)', boxShadow: 'var(--sfd-shadow-soft)', padding: '6px 16px', borderRadius: '9999px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sfd-ink-secondary)' }}>
          <Calendar size={14} style={{ color: 'var(--sfd-primary)' }} />
          <span>Active Week:</span>
          <strong style={{ color: 'var(--sfd-ink-primary)' }}>{formatDateShort(weekStart)} &mdash; {formatDateShort(weekEnd)}</strong>
        </div>

        {filteredOutEvents.length > 0 && (
          <div style={{ background: 'var(--sfd-primary-soft)', border: '1px solid rgba(29, 78, 216, 0.15)', padding: '6px 16px', borderRadius: '9999px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sfd-primary)' }}>
            <ShieldAlert size={14} />
            <span>Hidden <strong>{filteredOutEvents.length}</strong> personal events/rests this week.</span>
          </div>
        )}
      </div>

      {/* Soft Sculpted KPI Cards */}
      <section className="sfd-kpi-grid">
        {/* Metric 1: Weekly Lessons */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Weekly Lessons</span>
            <span className="sfd-kpi-badge emerald">
              {lessonsOnly.length > 0 ? `${lessonsOnly.length} booked` : '0 booked'}
            </span>
          </div>
          <div className="sfd-kpi-value">{lessonsOnly.length}</div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub font-editorial">
              {lessonsOnly.length} paid &bull; {nonPayingLessons.length} free
            </span>
          </div>
        </div>

        {/* Metric 2: Billable Teaching Hours */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Teaching Hours</span>
            <span className="sfd-kpi-badge neutral">{totalTeachHours} hrs</span>
          </div>
          <div className="sfd-kpi-value">{totalTeachHours}<span style={{ fontSize: '20px', fontWeight: 500, color: 'var(--sfd-ink-muted)' }}>h</span></div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub font-editorial">
              {totalTeachHours}h paid &bull; {nonPayingTeachHours}h free
            </span>
          </div>
        </div>

        {/* Metric 3: Estimated Revenue */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Weekly Revenue</span>
            <span className="sfd-kpi-badge emerald">£{hourlyRate}/hr</span>
          </div>
          <div className="sfd-kpi-value">£{weeklyEarnings.toLocaleString()}</div>
          <div className="sfd-kpi-meta">
            <ArrowUpRight size={14} style={{ color: 'var(--sfd-emerald)' }} />
            <span className="sfd-kpi-sub font-editorial">
              {totalTeachHours}h @ £{hourlyRate}/hr
            </span>
          </div>
        </div>

        {/* Metric 4: Capacity Fill Rate */}
        <div className="sfd-kpi-card">
          <div className="sfd-kpi-top">
            <span className="sfd-kpi-label">Capacity Fill</span>
            <span className={`sfd-kpi-badge ${thisWeekStats.fillPct >= 75 ? 'emerald' : thisWeekStats.fillPct >= 50 ? 'amber' : 'coral'}`}>
              {thisWeekStats.fillPct}% Utilization
            </span>
          </div>
          <div className="sfd-kpi-value">{thisWeekStats.fillPct}%</div>
          <div className="sfd-kpi-meta">
            <span className="sfd-kpi-sub font-editorial">
              {thisWeekStats.freeHours.toFixed(1)}h free bandwidth remaining
            </span>
          </div>
        </div>
      </section>

      {/* Main Split: Real Weekly Capacity, Workload & Sidebar */}
      <main className="sfd-cockpit-split">
        {/* Left Column: Real Weekly Overview Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card 1: Upcoming Capacity & Booking Flow */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <TrendingUp size={18} />
                </div>
                <h2 className="sfd-card-heading">Upcoming Capacity & Booking Flow</h2>
              </div>
              <span className="sfd-card-tag">3-Week Capacity Pulse</span>
            </div>

            <p className="sfd-card-description">
              Real-time booking fill percentages and available bandwidth across the active and upcoming weeks.
            </p>

            {/* Active Week Lesson Progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--sfd-surface-nested)', padding: '14px 18px', borderRadius: '18px', border: '1px solid var(--sfd-border-hairline)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)', fontWeight: 500 }}>Active Week Lesson Completion</span>
                <span style={{ fontWeight: 700, color: 'var(--sfd-ink-primary)' }}>
                  {completedWeeklyLessons} / {lessonsOnly.length} Completed ({weeklyLessonsCompletionPct}%)
                </span>
              </div>
              <div style={{ height: '12px', background: 'rgba(15, 23, 42, 0.06)', borderRadius: '9999px', overflow: 'hidden', padding: '2px', border: '1px solid var(--sfd-border-hairline)' }}>
                <div style={{ 
                  width: `${weeklyLessonsCompletionPct}%`, 
                  height: '100%',
                  background: 'linear-gradient(90deg, #059669 0%, #2563eb 100%)', 
                  borderRadius: '9999px',
                  transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--sfd-ink-faint)' }}>
                <span>Completed: {completedWeeklyLessons} lessons</span>
                <span>Remaining: {upcomingWeeklyLessons} lessons</span>
              </div>
            </div>

            {/* 3-Week Fill Rate Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
              {/* This Week */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                    This Week ({formatRemainingThisWeek()})
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sfd-emerald)' }}>
                    {thisWeekStats.fillPct}% filled &bull; {thisWeekStats.freeHours.toFixed(1)}h free
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--sfd-surface-nested)', height: '10px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ width: `${Math.min(thisWeekStats.fillPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #059669 0%, #10b981 100%)', borderRadius: '9999px', transition: 'width 0.8s var(--sfd-ease-fluid)' }} />
                </div>
              </div>

              {/* Next Week */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                    Next Week ({nextWeekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--sfd-primary)' }}>
                    {nextWeekStats.fillPct}% filled &bull; {nextWeekStats.freeHours.toFixed(1)}h free
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--sfd-surface-nested)', height: '10px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ width: `${Math.min(nextWeekStats.fillPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)', borderRadius: '9999px', transition: 'width 0.8s var(--sfd-ease-fluid)' }} />
                </div>
              </div>

              {/* Week After Next */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sfd-ink-primary)' }}>
                    Week after Next ({twoWeeksOutStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                  </span>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#6366f1' }}>
                    {twoWeeksOutStats.fillPct}% filled &bull; {twoWeeksOutStats.freeHours.toFixed(1)}h free
                  </span>
                </div>
                <div style={{ width: '100%', background: 'var(--sfd-surface-nested)', height: '10px', borderRadius: '9999px', overflow: 'hidden', border: '1px solid var(--sfd-border-hairline)' }}>
                  <div style={{ width: `${Math.min(twoWeeksOutStats.fillPct, 100)}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)', borderRadius: '9999px', transition: 'width 0.8s var(--sfd-ease-fluid)' }} />
                </div>
              </div>
            </div>

            {/* Future Lesson & Test Pill Counter Badges */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--sfd-surface-nested)', padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--sfd-border-subtle)' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sfd-primary)' }}>{allFutureLessons.length}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sfd-ink-secondary)' }}>All Future Lessons</span>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--sfd-emerald-soft)', padding: '8px 16px', borderRadius: '9999px', border: '1px solid var(--sfd-emerald-border)' }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--sfd-emerald)' }}>{allFutureTests.length}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--sfd-ink-secondary)' }}>Future Practical Tests</span>
              </div>
            </div>
          </div>

          {/* Card 2: Weekly Teaching Workload (Monday – Sunday) */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <BarChart3 size={18} />
                </div>
                <h2 className="sfd-card-heading">Weekly Teaching Workload</h2>
              </div>
              <span className="sfd-card-tag">Mon &ndash; Sun Pacing</span>
            </div>

            <p className="sfd-card-description">
              Daily distribution of booked driving lessons throughout the current week.
            </p>

            <div className="sfd-workload-chart">
              {dayIndices.map((dayIdx, i) => {
                const hours = dayOfWeekHours[dayIdx];
                const heightPct = maxDayHours > 0 ? (hours / maxDayHours) * 100 : 0;
                return (
                  <div key={dayIdx} className="sfd-workload-col">
                    <span className="sfd-workload-val">
                      {hours > 0 ? `${hours.toFixed(1)}h` : ''}
                    </span>
                    <div className="sfd-workload-bar-track">
                      <div 
                        className={`sfd-workload-bar ${hours === 0 ? 'empty' : ''}`}
                        style={{ height: hours > 0 ? `${Math.max(heightPct, 8)}%` : '6px' }}
                        title={`${dayOfWeekNames[i]}: ${hours.toFixed(1)} lesson hours`}
                      />
                    </div>
                    <span className="sfd-workload-day">{dayOfWeekNames[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 3: Lesson Time-of-Day Slots */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                  <Activity size={18} />
                </div>
                <h2 className="sfd-card-heading">Lesson Time-of-Day Slots</h2>
              </div>
              <span className="sfd-card-tag">Slot Distribution</span>
            </div>

            <div className="sfd-timeofday-grid">
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Morning (6am &ndash; 12pm)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-primary)' }}>{morningPct}%</span>
                <span className="sfd-timeofday-sub">{morningCount} slots</span>
              </div>
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Afternoon (12pm &ndash; 6pm)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-ink-primary)' }}>{afternoonPct}%</span>
                <span className="sfd-timeofday-sub">{afternoonCount} slots</span>
              </div>
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Evening (6pm &ndash; 12am)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-emerald)' }}>{eveningPct}%</span>
                <span className="sfd-timeofday-sub">{eveningCount} slots</span>
              </div>
              <div className="sfd-timeofday-card">
                <span className="sfd-timeofday-label">Night (12am &ndash; 6am)</span>
                <span className="sfd-timeofday-pct" style={{ color: 'var(--sfd-amber)' }}>{nightPct}%</span>
                <span className="sfd-timeofday-sub">{nightCount} slots</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Executive Summary & Details */}
        <div className="sfd-sidebar-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Card: Active Week Summary */}
          <div className="sfd-card-container">
            <div className="sfd-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-surface-nested)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-ink-primary)' }}>
                  <Clock size={18} />
                </div>
                <h3 className="sfd-card-heading">Schedule Summary</h3>
              </div>
              <span className="sfd-card-tag">Active Week</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Week Span</span>
                <strong style={{ color: 'var(--sfd-ink-primary)' }}>{formatDateShort(weekStart)} &ndash; {formatDateShort(weekEnd)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Status As Of</span>
                <span style={{ color: 'var(--sfd-ink-secondary)' }}>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Hourly Rate</span>
                <strong style={{ color: 'var(--sfd-ink-primary)' }}>£{hourlyRate}/hr</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Booked Lessons</span>
                <strong style={{ color: 'var(--sfd-ink-primary)' }}>{lessonsOnly.length} lessons ({totalTeachHours}h)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderBottom: '1px solid var(--sfd-border-hairline)', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--sfd-ink-muted)' }}>Free Bandwidth</span>
                <strong style={{ color: 'var(--sfd-emerald)' }}>{thisWeekStats.freeHours.toFixed(1)}h available</strong>
              </div>
              {nonPayingLessons.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--sfd-ink-muted)' }}>Non-Paying</span>
                  <span style={{ color: 'var(--sfd-ink-secondary)' }}>{nonPayingLessons.length} lessons ({nonPayingTeachHours}h)</span>
                </div>
              )}
            </div>

            {/* Health Badge */}
            <div style={{ background: 'var(--sfd-surface-nested)', padding: '14px 16px', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--sfd-emerald)' }} />
              <div style={{ fontSize: '13px', color: 'var(--sfd-ink-secondary)', lineHeight: 1.4 }}>
                <strong>Pacing Status:</strong> {thisWeekStats.fillPct >= 80 ? 'High booking capacity week.' : thisWeekStats.fillPct >= 50 ? 'Well-balanced teaching schedule.' : 'Open lesson slots available for new students.'}
              </div>
            </div>
          </div>

          {/* Card: AI Copilot Coaching & Report */}
          {enableAiInsights && (
            <div className="sfd-card-container">
              <div className="sfd-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sfd-primary)' }}>
                    <Sparkles size={18} />
                  </div>
                  <h3 className="sfd-card-heading">AI Weekly Copilot</h3>
                </div>
                {aiApiKey && (
                  <button
                    type="button"
                    onClick={() => fetchWeeklyAiReport(true)}
                    disabled={weeklyAiLoading}
                    style={{ background: 'transparent', border: 'none', color: 'var(--sfd-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Regenerate Weekly Insights"
                  >
                    <RefreshCw size={13} className={weeklyAiLoading ? 'spin-animation' : ''} />
                  </button>
                )}
              </div>

              {!aiApiKey ? (
                <p style={{ fontSize: '13px', color: 'var(--sfd-ink-muted)', margin: 0, lineHeight: 1.5 }}>
                  AI Coaching is active. Add a Gemini or OpenAI API Key in <strong>Settings</strong> to receive automated weekly schedule analysis.
                </p>
              ) : weeklyAiLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', color: 'var(--sfd-primary)', gap: '10px' }}>
                  <RefreshCw size={22} className="spin-animation" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Analyzing weekly pacing...</span>
                </div>
              ) : weeklyAiError ? (
                <div style={{ background: 'var(--sfd-coral-soft)', color: '#9f1239', border: '1px solid var(--sfd-coral-border)', padding: '12px', borderRadius: '14px', fontSize: '12px' }}>
                  {weeklyAiError}
                </div>
              ) : weeklyAiReport ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Score Gauge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--sfd-surface-nested)', padding: '12px 16px', borderRadius: '18px' }}>
                    <svg 
                      width="60" 
                      height="60" 
                      viewBox="0 0 100 100" 
                      style={{ flexShrink: 0, width: '60px', height: '60px', minWidth: '60px', minHeight: '60px' }}
                    >
                      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--sfd-border-hairline)" strokeWidth="8"/>
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="40" 
                        fill="none" 
                        stroke={weeklyAiReport.score >= 80 ? 'var(--sfd-emerald)' : weeklyAiReport.score >= 60 ? 'var(--sfd-primary)' : 'var(--sfd-coral)'} 
                        strokeWidth="8" 
                        strokeDasharray="251" 
                        strokeDashoffset={251 - (251 * weeklyAiReport.score) / 100} 
                        strokeLinecap="round" 
                        transform="rotate(-90 50 50)"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                      />
                      <text x="50" y="56" textAnchor="middle" fill="var(--sfd-ink-primary)" fontSize="20" fontWeight="bold">{weeklyAiReport.score}%</text>
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sfd-ink-primary)' }}>Efficiency Score</span>
                      <span style={{ fontSize: '12px', color: 'var(--sfd-ink-muted)', lineHeight: 1.3 }}>{weeklyAiReport.scoreReason}</span>
                    </div>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--sfd-ink-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {weeklyAiReport.summary}
                  </p>

                  {weeklyAiReport.recommendations?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sfd-ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommendations</span>
                      {weeklyAiReport.recommendations.map((rec, rIdx) => (
                        <div key={rIdx} style={{ display: 'flex', gap: '6px', fontSize: '12.5px', color: 'var(--sfd-ink-secondary)', lineHeight: 1.4 }}>
                          <span style={{ color: 'var(--sfd-primary)' }}>&bull;</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Card: Tests & Practical Exams */}
          {testBookings.length > 0 && (
            <div className="sfd-card-container">
              <div className="sfd-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sfd-amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400e' }}>
                    <Calendar size={18} />
                  </div>
                  <h3 className="sfd-card-heading">Practical Driving Tests</h3>
                </div>
                <span className="sfd-card-tag" style={{ color: '#92400e' }}>{testBookings.length} This Week</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--sfd-ink-muted)', margin: 0, lineHeight: 1.5 }}>
                You have {testBookings.length} driving test appointments scheduled this week ({allFutureTests.length} total across calendar).
              </p>
            </div>
          )}

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
    </div>
  );
};
