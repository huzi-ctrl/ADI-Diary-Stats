import { useState, useMemo, useCallback, useEffect } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { isEventNonPaying } from '../utils/capacityCalculations';
import { getCachedAiItem, setCachedAiItem, formatAiError, getEffectiveApiKey } from '../utils/aiHelper';
import {
  calculateYearlyIdealSchedules,
  calculateWeekDataList,
  calculateYoyData,
  calculateYearlyAverages,
  calculateMonthDataList,
  calculateSeasonalData,
  calculateYearlyMetrics,
  calculateAdvisorInsights,
  calculateGlobalSummary,
  type WeekData,
  type MonthData,
  type YearlyMetric,
  type AdvisorInsights,
  type GlobalSummary,
  type SeasonalData,
  type YoyDataResult,
  type YearlyAverage
} from '../utils/yearlyCalculations';
import type { IdealDaySchedule } from '../utils/capacityCalculations';

export interface UseYearlyMetricsProps {
  instructorEvents: CalendarEvent[];
  hourlyRate: number;
  testRate?: number;
  nonPayingList: string[];
  capacityMode?: 'historical' | 'custom';
  customIdealHours?: Record<number, number>;
  enableAiInsights?: boolean;
  aiProvider?: 'gemini' | 'openai';
  aiModel?: string;
  aiApiKey?: string;
  excludedYears?: number[];
}

export interface YoyAiReport {
  summary: string;
  efficiencyInsight: string;
  seasonalityAdvice: string;
  coachingTips: string[];
}

export interface YearlyMetricsResult {
  trendMode: 'raw' | 'smoothed' | 'deseasonalized';
  setTrendMode: React.Dispatch<React.SetStateAction<'raw' | 'smoothed' | 'deseasonalized'>>;
  isYtdComparison: boolean;
  setIsYtdComparison: React.Dispatch<React.SetStateAction<boolean>>;
  selectedTrendMonth: number;
  setSelectedTrendMonth: React.Dispatch<React.SetStateAction<number>>;
  lessonsOnly: CalendarEvent[];
  testsOnly: CalendarEvent[];
  idealSchedules: Record<number, IdealDaySchedule>;
  weeklyIdealHours: number;
  weekDataList: WeekData[];
  yoyData: YoyDataResult;
  yearlyAverages: YearlyAverage[];
  monthDataList: MonthData[];
  specificMonthTrendData: MonthData[];
  seasonalData: SeasonalData;
  yearlyMetrics: YearlyMetric[];
  advisorInsights: AdvisorInsights | null;
  globalSummary: GlobalSummary;
  yoyAiReport: YoyAiReport | null;
  yoyAiLoading: boolean;
  yoyAiError: string | null;
  dynamicRec: string;
  recLoading: boolean;
  fetchDynamicRecommendation: (force?: boolean) => Promise<void>;
  fetchYoyAiReport: (force?: boolean) => Promise<void>;
}

export function useYearlyMetrics({
  instructorEvents,
  hourlyRate,
  testRate = 0,
  nonPayingList,
  capacityMode = 'historical',
  customIdealHours = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 },
  enableAiInsights = false,
  aiProvider = 'gemini',
  aiModel = 'gemini-2.5-flash',
  aiApiKey = '',
  excludedYears = []
}: UseYearlyMetricsProps): YearlyMetricsResult {
  const [trendMode, setTrendMode] = useState<'raw' | 'smoothed' | 'deseasonalized'>('raw');
  const [isYtdComparison, setIsYtdComparison] = useState(true);
  const [selectedTrendMonth, setSelectedTrendMonth] = useState<number>(new Date().getMonth());

  // AI states for Yearly Stats page
  const [yoyAiReport, setYoyAiReport] = useState<YoyAiReport | null>(null);
  const [yoyAiLoading, setYoyAiLoading] = useState(false);
  const [yoyAiError, setYoyAiError] = useState<string | null>(null);

  const effectiveApiKey = getEffectiveApiKey(aiApiKey, aiProvider);

  const [dynamicRec, setDynamicRec] = useState<string>('');
  const [recLoading, setRecLoading] = useState<boolean>(false);

  // 1. Filter out non-lesson events and non-paying events
  const lessonsOnly = useMemo(() => {
    return instructorEvents.filter(e => 
      !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests') &&
      !isEventNonPaying(e.summary, nonPayingList)
    );
  }, [instructorEvents, nonPayingList]);

  // Test bookings
  const testsOnly = useMemo(() => {
    return instructorEvents.filter(e => 
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !isEventNonPaying(e.summary, nonPayingList) &&
      (e.summary.toLowerCase().includes('test') || 
       e.summary.toLowerCase().includes('mock') || 
       e.categories.includes('Tests'))
    );
  }, [instructorEvents, nonPayingList]);

  // 2. Calculate Ideal Working Hours
  const idealSchedules = useMemo(() => {
    return calculateYearlyIdealSchedules(lessonsOnly, capacityMode, customIdealHours);
  }, [lessonsOnly, capacityMode, customIdealHours]);

  const weeklyIdealHours = useMemo(() => {
    return Object.values(idealSchedules).reduce((acc, curr) => acc + curr.spanHours, 0);
  }, [idealSchedules]);

  // 3. Aggregate stats by week starting Monday (chronologically)
  const weekDataList = useMemo<WeekData[]>(() => {
    return calculateWeekDataList(instructorEvents, lessonsOnly, testsOnly, weeklyIdealHours);
  }, [instructorEvents, lessonsOnly, testsOnly, weeklyIdealHours]);

  // 3.5. YoY comparison grouping
  const yoyData = useMemo(() => {
    return calculateYoyData(weekDataList, excludedYears);
  }, [weekDataList, excludedYears]);

  // 3.6. Yearly summary averages and changes
  const yearlyAverages = useMemo(() => {
    return calculateYearlyAverages(yoyData, excludedYears);
  }, [yoyData, excludedYears]);

  // 4. Monthly aggregates
  const monthDataList = useMemo<MonthData[]>(() => {
    return calculateMonthDataList(lessonsOnly, testsOnly, idealSchedules, hourlyRate, testRate);
  }, [lessonsOnly, testsOnly, idealSchedules, hourlyRate, testRate]);

  // Specific Month YoY Trend data filter
  const specificMonthTrendData = useMemo(() => {
    const monthStr = (selectedTrendMonth + 1).toString().padStart(2, '0');
    return monthDataList.filter(m => m.monthKey.endsWith(`-${monthStr}`));
  }, [monthDataList, selectedTrendMonth]);

  // 4.1. Monthly Seasonality Comparison
  const seasonalData = useMemo(() => {
    return calculateSeasonalData(monthDataList);
  }, [monthDataList]);

  // 4.2. YoY Business & Scheduling Efficiency Metrics
  const yearlyMetrics = useMemo(() => {
    return calculateYearlyMetrics(lessonsOnly, hourlyRate, isYtdComparison, idealSchedules, capacityMode, customIdealHours, testsOnly, testRate);
  }, [lessonsOnly, hourlyRate, isYtdComparison, idealSchedules, capacityMode, customIdealHours, testsOnly, testRate]);

  // 4.3. Smart Scheduling Advisor Diagnostics
  const advisorInsights = useMemo(() => {
    return calculateAdvisorInsights(lessonsOnly, hourlyRate);
  }, [lessonsOnly, hourlyRate]);

  // Global Statistics Summary
  const globalSummary = useMemo(() => {
    return calculateGlobalSummary(weekDataList, lessonsOnly, testsOnly, hourlyRate, testRate);
  }, [weekDataList, lessonsOnly, testsOnly, hourlyRate, testRate]);

  // Dynamic coaching recommendation cache key
  const cacheKeyRec = useMemo(() => {
    if (!advisorInsights) return '';
    return `${advisorInsights.worstDayName}_${advisorInsights.totalDeadHours.toFixed(1)}_${advisorInsights.lostEarnings}`;
  }, [advisorInsights]);

  const fetchDynamicRecommendation = useCallback(async (force = false) => {
    if (!effectiveApiKey || !enableAiInsights || !advisorInsights) return;

    const cacheKey = `adi_rec_ai_${cacheKeyRec}`;
    const cached = getCachedAiItem<string>(cacheKey, 7 * 24 * 60 * 60 * 1000);
    if (cached && !force) {
      setDynamicRec(cached);
      return;
    }

    setRecLoading(true);
    try {
      const systemPrompt = `You are a high-level strategic business advisor for Approved Driving Instructors (ADIs).
Review the yearly performance metrics and formulate an extensive, highly actionable, multi-paragraph recommendation report.
Focus strictly on business operations, scheduling efficiency, revenue, and time management. Ensure the response is fully complete and does not cut off. If you run out of space, prioritize summarizing the recommendations rather than leaving them incomplete.
Provide:
1. # Core Strategic Focus: Identify the primary bottleneck holding back their profitability based on the data.
2. # Workload Distribution: Address their day-of-week and month-by-month distribution, identifying fatigue risks and efficiency gaps.
3. # Financial Optimization: Outline 3 highly specific strategies to increase their effective hourly rate without sacrificing student outcomes.
Write in Markdown. Be extremely direct and use blockquotes for key takeaways.`;
      
      const userPrompt = `Diagnostics:
- Lowest Efficiency Workday: ${advisorInsights.worstDayName} (scheduling efficiency: ${advisorInsights.worstDayEff}%)
- Wasted dead gaps: ${advisorInsights.totalDeadHours.toFixed(1)} hours
- Potential Lost Revenue: £${advisorInsights.lostEarnings.toLocaleString()} (at £${hourlyRate}/hr)`;

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
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${effectiveApiKey}`;
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
          
          if (response.ok) {
            const res = await response.json();
            const candidate = res?.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const text = parts.map((p: { text?: string }) => p.text || '').join('');
            const finishReason = candidate?.finishReason;
            finalFinishReason = finishReason;

            if (!text && finishReason) {
              debugTrace += `\n[Attempt ${attempts}] Empty text received. Finish reason: ${finishReason}`;
              if (accumulatedAnswer) break;
              throw new Error(`Received an empty response from Gemini. (Finish reason: ${finishReason})`);
            }

            accumulatedAnswer += text;

            if (finishReason === 'STOP') break;
          } else {
             const errData = await response.json().catch(() => ({}));
             throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
          }
        } else {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${effectiveApiKey}`
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...contents
              ],
              temperature: 0.3
            })
          });
          if (response.ok) {
            const res = await response.json();
            const choice = res?.choices?.[0];
            accumulatedAnswer += choice?.message?.content || '';
            finalFinishReason = choice?.finish_reason;
            if (finalFinishReason === 'stop') break;
          } else {
             const errData = await response.json().catch(() => ({}));
             throw new Error(errData?.error?.message || `OpenAI API returned status ${response.status}`);
          }
        }

        const lastChar = accumulatedAnswer.slice(-1);
        const isEndingValid = ['.', '!', '?', '>', '}', '`'].includes(lastChar);
        const isReportComplete = accumulatedAnswer.length > 500;
        
        if (isEndingValid && isReportComplete) {
          break;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          break;
        }

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

      if (finalFinishReason && finalFinishReason !== 'STOP' && finalFinishReason !== 'stop' && finalFinishReason !== 'length') {
        debugTrace += `\n[Final] Finished with reason: ${finalFinishReason}`;
      }
      
      if (debugTrace) {
        accumulatedAnswer += `\n\n> **[Debug Trace]** \`\`\`${debugTrace}\`\`\``;
      }

      setDynamicRec(accumulatedAnswer);
      setCachedAiItem(cacheKey, accumulatedAnswer);
    } catch (err) {
      console.error('Failed to fetch dynamic coaching advice:', err);
    } finally {
      setRecLoading(false);
    }
  }, [effectiveApiKey, enableAiInsights, advisorInsights, cacheKeyRec, aiProvider, aiModel, hourlyRate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (enableAiInsights && effectiveApiKey) {
        fetchDynamicRecommendation();
      } else {
        setDynamicRec('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [cacheKeyRec, enableAiInsights, effectiveApiKey, fetchDynamicRecommendation]);

  const fetchYoyAiReport = useCallback(async (force = false) => {
    if (!effectiveApiKey || !enableAiInsights || yearlyMetrics.length === 0) return;

    const cacheKey = `yoy_ai_${isYtdComparison ? 'ytd' : 'full'}_${yearlyMetrics.length}_${yearlyMetrics[yearlyMetrics.length - 1]?.earnings}`;
    const cached = getCachedAiItem<YoyAiReport>(cacheKey, 7 * 24 * 60 * 60 * 1000);
    
    if (cached && !force) {
      setTimeout(() => setYoyAiReport(cached), 0);
      return;
    }

    setYoyAiLoading(true);
    setYoyAiError(null);

    try {
      const systemPrompt = `You are a financial analyst and business operations coach for driving instructors.
Analyze the Year-over-Year (YoY) performance metrics of the instructor's business and return a structured JSON report.
Your output must be strictly valid JSON. Do not include markdown formatting or extra text outside the JSON.
The JSON must follow this exact structure:
{
  "summary": "A concise 2-3 sentence YoY overview highlighting growth, decline, or stabilization in revenue and lessons.",
  "efficiencyInsight": "A 1-2 sentence analysis of scheduling efficiency trends and active workday utilization.",
  "seasonalityAdvice": "A 1-2 sentence recommendation for managing peak vs off-peak months based on seasonal trends.",
  "coachingTips": [
    "A practical, high-impact business strategy to increase margins or efficiency YoY",
    "A scheduling/pricing hack based on their yearly work cycles"
  ]
}`;

      const metricsContext = yearlyMetrics.map(m => {
        const projStr = m.projectedEarnings ? `, Projected EoY: £${m.projectedEarnings.toLocaleString()}` : '';
        return `Year ${m.year}: ${m.totalLessons} lessons, ${m.activeDaysCount} active days, Scheduling Efficiency: ${m.efficiencyRatio.toFixed(1)}%, Est. Earnings: £${m.earnings.toLocaleString()}${projStr} (Avg: £${m.earningsPerActiveDay.toFixed(0)}/day)`;
      }).join('\n');

      const userPrompt = `YoY Calendar Business Performance Metrics (Comparison Type: ${isYtdComparison ? 'Year-to-Date aligned' : 'Full Year'}):
${metricsContext}
Instructor Hourly Rate: £${hourlyRate}/hr

Please analyze this data and return the JSON object.`;

      let text = '';
      if (aiProvider === 'gemini') {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${effectiveApiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json'
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || `Gemini API returned status ${response.status}`);
        }
        const res = await response.json();
        const parts = res?.candidates?.[0]?.content?.parts || [];
        text = parts.map((p: { text?: string }) => p.text || '').join('');
      } else {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effectiveApiKey}`
          },
          body: JSON.stringify({
            model: aiModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
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
        text = res?.choices?.[0]?.message?.content || '';
      }

      let cleanText = text.trim();
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (match) {
        cleanText = match[1].trim();
      } else {
        const startIdx = cleanText.indexOf('{');
        const endIdx = cleanText.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          cleanText = cleanText.slice(startIdx, endIdx + 1);
        }
      }
      
      let parsed: YoyAiReport;
      try {
        if (!cleanText) throw new Error("Empty response");
        parsed = JSON.parse(cleanText);
      } catch (parseError) {
        console.warn("JSON.parse failed. Attempting regex extraction. Raw text:", text);
        
        const extractField = (fieldName: string) => {
          const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, 'i');
          const m = text.match(regex);
          if (m) {
            try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
          }
          return "N/A";
        };

        const summary = extractField("summary");
        const efficiencyInsight = extractField("efficiencyInsight");
        const seasonalityAdvice = extractField("seasonalityAdvice");
        
        let coachingTips: string[] = [];
        const tipsMatch = text.match(/"coachingTips"\s*:\s*\[([\s\S]*?)\]/i);
        if (tipsMatch) {
           const matches = [...tipsMatch[1].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)];
           coachingTips = matches.map(m => {
             try { return JSON.parse(`"${m[1]}"`); } catch { return m[1]; }
           });
        }

        if (summary !== "N/A" || efficiencyInsight !== "N/A" || seasonalityAdvice !== "N/A") {
          parsed = { summary, efficiencyInsight, seasonalityAdvice, coachingTips };
        } else {
          parsed = {
             summary: "The AI was unable to generate a structured report. " + String(parseError),
             efficiencyInsight: "N/A",
             seasonalityAdvice: "Raw Output: " + (text ? text.substring(0, 150) + "..." : "No output"),
             coachingTips: []
          };
        }
      }

      setYoyAiReport(parsed);
      setCachedAiItem(cacheKey, parsed);
    } catch (err) {
      console.error('Failed to fetch YoY AI report:', err);
      setYoyAiError(formatAiError(err));
    } finally {
      setYoyAiLoading(false);
    }
  }, [effectiveApiKey, enableAiInsights, yearlyMetrics, isYtdComparison, aiProvider, aiModel, hourlyRate]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchYoyAiReport();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchYoyAiReport]);

  return {
    trendMode,
    setTrendMode,
    isYtdComparison,
    setIsYtdComparison,
    selectedTrendMonth,
    setSelectedTrendMonth,
    lessonsOnly,
    testsOnly,
    idealSchedules,
    weeklyIdealHours,
    weekDataList,
    yoyData,
    yearlyAverages,
    monthDataList,
    specificMonthTrendData,
    seasonalData,
    yearlyMetrics,
    advisorInsights,
    globalSummary,
    yoyAiReport,
    yoyAiLoading,
    yoyAiError,
    dynamicRec,
    recLoading,
    fetchDynamicRecommendation,
    fetchYoyAiReport,
  };
}
