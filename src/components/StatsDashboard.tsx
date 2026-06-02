import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { Calendar, BarChart3, Activity, ShieldAlert, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { getCachedAiItem, setCachedAiItem, formatAiError } from '../utils/aiHelper';

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

  // Helper to check if student is globally non-paying
  const isEventNonPaying = React.useCallback((summary: string) => {
    const summaryLower = summary.toLowerCase();
    return nonPayingList.some(keyword => summaryLower.includes(keyword));
  }, [nonPayingList]);

  // 1. Core KPIs for the active week
  const timedInstructorEvents = useMemo(() => {
    return instructorEvents.filter(e => !e.isAllDay && !isEventNonPaying(e.summary));
  }, [instructorEvents, isEventNonPaying]);

  const totalTeachMinutes = useMemo(() => {
    return timedInstructorEvents.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  }, [timedInstructorEvents]);

  const totalTeachHours = useMemo(() => {
    return (totalTeachMinutes / 60).toFixed(1);
  }, [totalTeachMinutes]);

  // Lesson counts (exclude tests, CPD/training, and all-day blocks)
  const allLessons = useMemo(() => {
    return instructorEvents.filter(e => 
      !e.isAllDay &&
      !e.categories.includes('Training') && 
      !e.categories.includes('CPD') && 
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests')
    );
  }, [instructorEvents]);

  const lessonsOnly = useMemo(() => {
    return allLessons.filter(e => !isEventNonPaying(e.summary));
  }, [allLessons, isEventNonPaying]);

  const nonPayingLessons = useMemo(() => {
    return allLessons.filter(e => isEventNonPaying(e.summary));
  }, [allLessons, isEventNonPaying]);

  const nonPayingTeachMinutes = useMemo(() => {
    return nonPayingLessons.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  }, [nonPayingLessons]);

  const nonPayingTeachHours = useMemo(() => {
    return (nonPayingTeachMinutes / 60).toFixed(1);
  }, [nonPayingTeachMinutes]);

  const weeklyEarnings = useMemo(() => {
    return Math.round(parseFloat(totalTeachHours) * hourlyRate);
  }, [totalTeachHours, hourlyRate]);
  
  // Test bookings count (mock and official) for this week
  const testBookings = useMemo(() => {
    return instructorEvents.filter(e => 
      !e.categories.includes('Training') && 
      !e.categories.includes('CPD') && 
      (e.summary.toLowerCase().includes('test') || 
       e.summary.toLowerCase().includes('mock') || 
       e.categories.includes('Tests'))
    );
  }, [instructorEvents]);

  const now = useMemo(() => new Date(), []);
  
  // Weekly upcoming/completed calculation
  const completedWeeklyLessons = useMemo(() => {
    return lessonsOnly.filter(e => e.start < now).length;
  }, [lessonsOnly, now]);

  const upcomingWeeklyLessons = useMemo(() => {
    return lessonsOnly.filter(e => e.start >= now).length;
  }, [lessonsOnly, now]);

  const weeklyLessonsCompletionPct = useMemo(() => {
    return lessonsOnly.length > 0 
      ? Math.round((completedWeeklyLessons / lessonsOnly.length) * 100) 
      : 0;
  }, [lessonsOnly, completedWeeklyLessons]);

  // All-time future lessons and tests
  const allFutureLessons = useMemo(() => {
    return allInstructorEvents.filter(e => 
      e.start >= now &&
      !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests')
    );
  }, [allInstructorEvents, now]);

  const allFutureTests = useMemo(() => {
    return allInstructorEvents.filter(e => 
      e.start >= now &&
      !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      (e.summary.toLowerCase().includes('test') || 
       e.summary.toLowerCase().includes('mock') || 
       e.categories.includes('Tests'))
    );
  }, [allInstructorEvents, now]);

  // 1. Filter out non-lesson events and non-paying events for ideal hours calculations
  const globalLessonsOnly = React.useMemo(() => {
    return allInstructorEvents.filter(e => 
      !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests') &&
      !isEventNonPaying(e.summary)
    );
  }, [allInstructorEvents, isEventNonPaying]);

  // 2. Calculate Average Ideal Working Hours based on historical average span for each day of week
  const globalIdealSchedules = React.useMemo(() => {
    if (capacityMode === 'custom' && customIdealHours) {
      const dayNames: Record<number, string> = {
        1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 0: 'Sunday'
      };
      const schedules: Record<number, { dayName: string; spanHours: number }> = {};
      for (let day = 0; day < 7; day++) {
        schedules[day] = {
          dayName: dayNames[day],
          spanHours: customIdealHours[day] || 0
        };
      }
      return schedules;
    }

    const schedules: Record<number, { dayName: string; spanHours: number }> = {
      1: { dayName: 'Monday', spanHours: 0 },
      2: { dayName: 'Tuesday', spanHours: 0 },
      3: { dayName: 'Wednesday', spanHours: 0 },
      4: { dayName: 'Thursday', spanHours: 0 },
      5: { dayName: 'Friday', spanHours: 0 },
      6: { dayName: 'Saturday', spanHours: 0 },
      0: { dayName: 'Sunday', spanHours: 0 }
    };

    const lessonsByDayOfWeek: Record<number, Record<string, typeof globalLessonsOnly>> = {};
    for (let i = 0; i < 7; i++) lessonsByDayOfWeek[i] = {};

    globalLessonsOnly.forEach(e => {
      const day = e.start.getDay();
      const dateStr = e.start.toISOString().split('T')[0];
      if (!lessonsByDayOfWeek[day][dateStr]) {
        lessonsByDayOfWeek[day][dateStr] = [];
      }
      lessonsByDayOfWeek[day][dateStr].push(e);
    });

    for (let day = 0; day < 7; day++) {
      const activeDates = Object.values(lessonsByDayOfWeek[day]);
      if (activeDates.length > 0) {
        const spans: number[] = [];
        activeDates.forEach(events => {
          const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
          const firstStart = sorted[0].start;
          const lastEnd = sorted[sorted.length - 1].end;
          const spanMins = (lastEnd.getTime() - firstStart.getTime()) / 60000;
          spans.push(spanMins + 30); // Add standard 30 min travel buffer to the span
        });
        
        spans.sort((a, b) => a - b);
        const mid = Math.floor(spans.length / 2);
        const medianSpanMins = spans.length % 2 !== 0 ? spans[mid] : (spans[mid - 1] + spans[mid]) / 2;
        
        schedules[day].spanHours = medianSpanMins / 60;
      }
    }
    return schedules;
  }, [globalLessonsOnly, capacityMode, customIdealHours]);

  const todayMonday = React.useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, []);

  const todayMidnight = React.useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const thisWeekEnd = React.useMemo(() => {
    return new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  }, [todayMonday]);

  const nextWeekStart = React.useMemo(() => new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000), [todayMonday]);
  const twoWeeksOutStart = React.useMemo(() => new Date(todayMonday.getTime() + 14 * 24 * 60 * 60 * 1000), [todayMonday]);

  // Helper to calculate used minutes on a day, taking into account:
  // - lesson duration
  // - 15 min travel buffer before/after lessons
  // - Gaps smaller than 90 mins are treated as unusable and fully consumed (dead time)
  const getUsedMinutesForDay = React.useCallback((dayLessons: CalendarEvent[]) => {
    if (dayLessons.length === 0) return 0;
    
    // Sort lessons by start time
    const sorted = [...dayLessons].sort((a, b) => a.start.getTime() - b.start.getTime());
    
    let usedMins = 0;
    
    // 1. Add durations of all lessons
    sorted.forEach(l => {
      usedMins += l.durationMinutes;
    });
    
    // 2. Add travel times and unusable gaps
    // Travel before first lesson: 15 mins
    usedMins += 15;
    
    // Travel after last lesson: 15 mins
    usedMins += 15;
    
    // Gaps between consecutive lessons
    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = sorted[i].end;
      const nextStart = sorted[i+1].start;
      const gapMins = Math.round((nextStart.getTime() - currentEnd.getTime()) / 60000);
      
      if (gapMins < 0) {
        continue;
      }
      
      if (gapMins < 90) {
        // Gap is too small to fit a 1-hour lesson (which needs 15 mins travel before & after, i.e., 90 mins total)
        // So the entire gap is unusable dead time. We count it as used time.
        usedMins += gapMins;
      } else {
        // Gap is large enough. We only use 15 mins after current, and 15 mins before next for travel.
        usedMins += 30;
      }
    }
    
    return usedMins;
  }, []);

  // Helper to get total used and ideal hours for a week (starting on startOfWeek date)
  // if isPartial is true, it only calculates from todayMidnight onwards to the end of that week
  const getWeekCapacityStats = (startOfWeek: Date, isPartial: boolean = false) => {
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const filterStart = isPartial ? todayMidnight : startOfWeek;
    
    const dayIndices = isPartial 
      ? (() => {
          const dayOfWeek = todayMidnight.getDay();
          if (dayOfWeek === 0) return [0];
          const days: number[] = [];
          for (let d = dayOfWeek; d <= 6; d++) days.push(d);
          days.push(0);
          return days;
        })()
      : [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun

    let totalUsedMins = 0;
    let totalIdealMins = 0;

    dayIndices.forEach(d => {
      // Get all events for day d that start within the target range
      const dayLessons = allInstructorEvents.filter(e => 
        e.start >= filterStart && 
        e.start <= endOfWeek &&
        e.start.getDay() === d &&
        !e.isAllDay &&
        !e.categories.includes('Training') &&
        !e.categories.includes('CPD') &&
        !e.summary.toLowerCase().includes('test') &&
        !e.summary.toLowerCase().includes('mock') &&
        !e.categories.includes('Tests') &&
        !isEventNonPaying(e.summary)
      );

      totalUsedMins += getUsedMinutesForDay(dayLessons);
      
      if (capacityMode === 'custom' && customIdealHours) {
        totalIdealMins += (customIdealHours[d] || 0) * 60;
      } else {
        totalIdealMins += (globalIdealSchedules[d]?.spanHours || 0) * 60;
      }
    });

    const usedHours = totalUsedMins / 60;
    const idealHours = totalIdealMins / 60;
    const fillPct = idealHours > 0 ? Math.round((usedHours / idealHours) * 100) : 0;
    const freePct = Math.max(0, 100 - fillPct);
    const freeHours = Math.max(0, idealHours - usedHours);

    return {
      usedHours,
      idealHours,
      fillPct,
      freePct,
      freeHours
    };
  };

  const thisWeekStats = getWeekCapacityStats(todayMonday, true);
  const nextWeekStats = getWeekCapacityStats(nextWeekStart, false);
  const twoWeeksOutStats = getWeekCapacityStats(twoWeeksOutStart, false);

  const formatRangeShort = (start: Date) => {
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString(undefined, opt)} - ${end.toLocaleDateString(undefined, opt)}`;
  };

  const formatRemainingThisWeek = () => {
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${todayMidnight.toLocaleDateString(undefined, opt)} – ${thisWeekEnd.toLocaleDateString(undefined, opt)}`;
  };

  const formatDateShort = (d: Date) => {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // 2. Day of Week Hours Analysis (Monday to Sunday)
  const dayOfWeekHours = useMemo(() => {
    const hours = Array(7).fill(0);
    timedInstructorEvents.forEach(e => {
      const day = e.start.getDay();
      hours[day] += e.durationMinutes / 60;
    });
    return hours;
  }, [timedInstructorEvents]);

  const maxDayHours = useMemo(() => Math.max(...dayOfWeekHours, 1), [dayOfWeekHours]);

  const weekdayStatsString = useMemo(() => {
    return dayIndices.map((dayIdx, i) => {
      return `${dayOfWeekNames[i]}: ${dayOfWeekHours[dayIdx].toFixed(1)}h`;
    }).join(', ');
  }, [dayOfWeekHours]);

  // 3. Time of Day Distribution for lessons this week
  let morningCount = 0;
  let afternoonCount = 0;
  let eveningCount = 0;
  let nightCount = 0;

  timedInstructorEvents.forEach(e => {
    const hour = e.start.getHours();
    if (hour >= 6 && hour < 12) morningCount++;
    else if (hour >= 12 && hour < 18) afternoonCount++;
    else if (hour >= 18 && hour < 24) eveningCount++;
    else nightCount++;
  });

  const totalTimeOfDays = (morningCount + afternoonCount + eveningCount + nightCount) || 1;
  const morningPct = Math.round((morningCount / totalTimeOfDays) * 100);
  const afternoonPct = Math.round((afternoonCount / totalTimeOfDays) * 100);
  const eveningPct = Math.round((eveningCount / totalTimeOfDays) * 100);
  const nightPct = Math.round((nightCount / totalTimeOfDays) * 100);

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

      let contents = [
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
          
          const payload: any = {
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
          const text = parts.map((p: any) => p.text || '').join('');
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
            { role: 'assistant', content: accumulatedAnswer } as any,
            { role: 'user', content: 'Your previous response was cut off. Please continue writing the response from where you left off. Start immediately with the continuation, without repeating what you already wrote.' } as any
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
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-light)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Calendar size={14} className="gradient-text" style={{ filter: 'brightness(1.2)' }} />
            <span>Active Week:</span>
            <strong>{formatDateShort(weekStart)} &mdash; {formatDateShort(weekEnd)}</strong>
          </div>

          {filteredOutEvents.length > 0 && (
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-indigo)' }}>
              <ShieldAlert size={14} />
              <span>Hidden <strong>{filteredOutEvents.length}</strong> personal events/rests this week.</span>
            </div>
          )}
        </div>

        {enableAiInsights && !aiApiKey && (
          <div className="glass-card animate-slide-up" style={{ padding: '1rem', border: '1px solid rgba(6, 182, 212, 0.2)', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.04), rgba(129, 140, 248, 0.01))', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sparkles size={14} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Weekly Coaching Overview</h3>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
              AI Coaching is active. Please input a Gemini or OpenAI API Key in the <strong>Settings</strong> tab to power up the dynamic weekly analyst.
            </p>
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="kpi-grid">
          <div className="glass-card kpi-card">
            <span className="kpi-title">Weekly Lessons</span>
            <div className="kpi-value gradient-text">{lessonsOnly.length}</div>
            <span className="kpi-footer">
              {lessonsOnly.length} paid / {nonPayingLessons.length} free
            </span>
          </div>
          
          <div className="glass-card kpi-card">
            <span className="kpi-title">Weekly Teaching Hours</span>
            <div className="kpi-value">{totalTeachHours} <span style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-muted)' }}>hrs</span></div>
            <span className="kpi-footer">
              {totalTeachHours}h paid / {nonPayingTeachHours}h free
            </span>
          </div>

          <div className="glass-card kpi-card">
            <span className="kpi-title">Weekly Tests</span>
            <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>{testBookings.length}</div>
            <span className="kpi-footer">Mock exams & official tests</span>
          </div>

          <div className="glass-card kpi-card">
            <span className="kpi-title">Estimated Earnings</span>
            <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>£{weeklyEarnings.toLocaleString()}</div>
            <span className="kpi-footer">
              {totalTeachHours}h paid @ £{hourlyRate}/hr
            </span>
          </div>
        </div>

        {/* Drives Tracker & Upcoming Bookings */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="gradient-text" style={{ filter: 'brightness(1.2)' }} />
              Drives Tracker & Upcoming Bookings
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Real-time status relative to today: <strong>{now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'center' }}>
            
            {/* Progress Bar for This Week's Lessons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>This Week's Lessons Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {completedWeeklyLessons} / {lessonsOnly.length} Completed ({weeklyLessonsCompletionPct}%)
                </span>
              </div>
              
              {/* The Bar */}
              <div style={{ height: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex', border: '1px solid var(--border-light)' }}>
                <div style={{ 
                  width: `${weeklyLessonsCompletionPct}%`, 
                  background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-indigo))', 
                  borderRadius: '6px 0 0 6px',
                  transition: 'width 0.8s ease-out'
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                <span>Completed: {completedWeeklyLessons}</span>
                <span>Upcoming: {upcomingWeeklyLessons}</span>
              </div>
            </div>

            {/* All-Time Future Schedule stats */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'space-around', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-indigo)', display: 'block' }}>
                    {allFutureLessons.length}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Future Lessons
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(34, 211, 238, 0.1)', border: '1px solid rgba(34, 211, 238, 0.2)', padding: '0.5rem 0.75rem', borderRadius: '10px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)', display: 'block' }}>
                    {allFutureTests.length}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Future Tests
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming Capacity Fill Percentages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', padding: '0.85rem 1.1rem', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border-light)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>Upcoming Capacity</span>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* This Week */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} title={formatRemainingThisWeek()}>
                      This Week ({formatRemainingThisWeek()})
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)' }}>
                      {thisWeekStats.fillPct}% filled &bull; {thisWeekStats.freePct}% free ({thisWeekStats.freeHours.toFixed(1)}h free)
                    </span>
                  </div>
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(thisWeekStats.freePct, 100)}%`, height: '100%', background: 'var(--accent-emerald)', borderRadius: '3px' }} />
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
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(nextWeekStats.freePct, 100)}%`, height: '100%', background: 'var(--accent-indigo)', borderRadius: '3px' }} />
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
                  <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(twoWeeksOutStats.freePct, 100)}%`, height: '100%', background: 'var(--accent-cyan)', borderRadius: '3px' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Workload Chart (Full Width) */}
        <div className="glass-card" style={{ width: '100%' }}>
          <div className="chart-header">
            <h3 className="chart-title">
              <BarChart3 size={18} className="gradient-text" style={{ filter: 'brightness(1.2)' }} />
              Weekly Teaching Workload (Monday &ndash; Sunday)
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Driving Lesson Hours</span>
          </div>

          <div className="chart-scroll-container">
          <div style={{ height: '260px', minWidth: '500px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '1.5rem 1rem 0.5rem 1rem', position: 'relative' }}>
            {dayIndices.map((dayIdx, i) => {
              const hours = dayOfWeekHours[dayIdx];
              const heightPct = (hours / maxDayHours) * 100;
              return (
                <div key={dayIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: hours > 0 ? 'var(--text-main)' : 'var(--text-dim)', height: '18px' }}>
                    {hours > 0 ? `${hours.toFixed(1)}h` : ''}
                  </span>
                  
                  <div style={{ height: '180px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', width: '100%' }}>
                    <div style={{ 
                      height: `${heightPct}%`, 
                      width: '50%', 
                      minHeight: hours > 0 ? '4px' : '0px',
                      background: hours > 0 
                        ? 'linear-gradient(180deg, var(--accent-purple) 0%, var(--accent-indigo) 100%)' 
                        : 'rgba(255,255,255,0.02)',
                      border: hours > 0 ? 'none' : '1px dashed var(--border-light)',
                      borderRadius: '8px 8px 4px 4px',
                      boxShadow: hours > 0 ? '0 4px 12px rgba(129,140,248,0.2)' : 'none',
                      transition: 'height 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      cursor: 'pointer'
                    }}
                    className="bar-hover"
                    title={`${dayOfWeekNames[i]}: ${hours.toFixed(1)} lesson hours`}
                    />
                  </div>
                  
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    {dayOfWeekNames[i]}
                  </span>
                </div>
              );
            })}
          </div>
          </div>
        </div>

        {/* Daily Time of Day Distribution */}
        <div className="glass-card">
          <div className="chart-header" style={{ marginBottom: '1.25rem' }}>
            <h3 className="chart-title">
              <Activity size={18} className="gradient-text" style={{ filter: 'brightness(1.2)' }} />
              Lesson Time-of-Day Slots
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weekly Lesson Blocks Distribution</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Morning (6am - 12pm)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{morningPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{morningCount} slots</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Afternoon (12pm - 6pm)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>{afternoonPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{afternoonCount} slots</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Evening (6pm - 12am)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{eveningPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{eveningCount} slots</span>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Night (12am - 6am)</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-amber)' }}>{nightPct}%</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{nightCount} slots</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Sidebar Column */}
      {showAiPanel && (
        <div className="dashboard-sidebar-column">
          <div className="glass-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={16} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Weekly Copilot</h3>
              </div>
              <button
                type="button"
                onClick={() => fetchWeeklyAiReport(true)}
                disabled={weeklyAiLoading}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                className="hover-glow"
                title="Regenerate Weekly Insights"
              >
                <RefreshCw size={12} className={weeklyAiLoading ? 'spin-animation' : ''} />
              </button>
            </div>

            {weeklyAiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', color: 'var(--accent-cyan)', gap: '1rem' }}>
                <RefreshCw size={24} className="spin-animation" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Analyzing weekly pacing...</span>
              </div>
            ) : weeklyAiError ? (
              <div style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', padding: '1rem', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', gap: '0.4rem' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>Error generating insights: {weeklyAiError}</span>
              </div>
            ) : weeklyAiReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Score & Gauge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scheduling Score</span>
                  
                  {/* Gauge SVG */}
                  <svg width="100" height="100" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border-light)" strokeWidth="6"/>
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="42" 
                      fill="none" 
                      stroke={weeklyAiReport.score >= 80 ? 'var(--accent-emerald)' : weeklyAiReport.score >= 60 ? 'var(--accent-indigo)' : '#ef4444'} 
                      strokeWidth="6" 
                      strokeDasharray="264" 
                      strokeDashoffset={264 - (264 * weeklyAiReport.score) / 100} 
                      strokeLinecap="round" 
                      transform="rotate(-90 50 50)"
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                    <text x="50" y="56" textAnchor="middle" fill="var(--text-main)" fontSize="18" fontWeight="bold">{weeklyAiReport.score}%</text>
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
