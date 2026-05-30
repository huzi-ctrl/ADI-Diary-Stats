import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, TrendingUp, MessageSquare, Send, Key, AlertCircle, Calendar } from 'lucide-react';
import { type CalendarEvent } from '../utils/icsParser';
import { getCachedAiItem, setCachedAiItem, formatAiError } from '../utils/aiHelper';

interface AIInsightsProps {
  allEvents: CalendarEvent[];
  hourlyRate: number;
  nonPayingList: string[];
  aiProvider: 'gemini' | 'openai';
  aiModel: string;
  aiApiKey: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  allEvents,
  hourlyRate,
  nonPayingList,
  aiProvider,
  aiModel,
  aiApiKey
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'trends' | 'chat'>('summary');
  
  // Report caching states
  const [summaryReport, setSummaryReport] = useState<string>('');
  const [trendsReport, setTrendsReport] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if API key is provided
  const hasApiKey = aiApiKey && aiApiKey.trim().length > 0;

  const lastEventTime = useMemo(() => {
    return allEvents.length > 0 ? allEvents[allEvents.length - 1].start.getTime() : 0;
  }, [allEvents]);

  const cacheKeySummary = useMemo(() => {
    return `insights_summary_v6_${allEvents.length}_${lastEventTime}_${hourlyRate}`;
  }, [allEvents.length, lastEventTime, hourlyRate]);

  const cacheKeyTrends = useMemo(() => {
    return `insights_trends_v6_${allEvents.length}_${lastEventTime}_${hourlyRate}`;
  }, [allEvents.length, lastEventTime, hourlyRate]);

  // Load from cache on key change
  useEffect(() => {
    if (hasApiKey) {
      const cached = getCachedAiItem<string>(cacheKeySummary, 7 * 24 * 60 * 60 * 1000);
      const timer = setTimeout(() => {
        setSummaryReport(cached || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [cacheKeySummary, hasApiKey]);

  useEffect(() => {
    if (hasApiKey) {
      const cached = getCachedAiItem<string>(cacheKeyTrends, 7 * 24 * 60 * 60 * 1000);
      const timer = setTimeout(() => {
        setTrendsReport(cached || '');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [cacheKeyTrends, hasApiKey]);

  // Chat states
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);


  // Filter lessons & tests
  const lessonsOnly = useMemo(() => {
    return allEvents.filter(e => 
      !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !nonPayingList.some(kw => e.summary.toLowerCase().includes(kw))
    );
  }, [allEvents, nonPayingList]);

  const testsOnly = useMemo(() => {
    return allEvents.filter(e => 
      !e.isAllDay &&
      e.summary.toLowerCase().includes('test')
    );
  }, [allEvents]);

  // Aggregate stats payload for LLM context
  const statsSummaryText = useMemo(() => {
    if (allEvents.length === 0) return 'No events loaded.';

    const totalHours = lessonsOnly.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60;
    const totalEarnings = Math.round(totalHours * hourlyRate);

    // Group lessons by year
    const yearStats: Record<number, { count: number; hours: number; activeDays: Set<string> }> = {};
    lessonsOnly.forEach(e => {
      const year = e.start.getFullYear();
      if (!yearStats[year]) {
        yearStats[year] = { count: 0, hours: 0, activeDays: new Set() };
      }
      yearStats[year].count += 1;
      yearStats[year].hours += e.durationMinutes / 60;
      yearStats[year].activeDays.add(e.start.toISOString().split('T')[0]);
    });

    // Group lessons by weekday
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    lessonsOnly.forEach(e => {
      weekdayCounts[e.start.getDay()] += 1;
    });

    const weekdaysStr = `Mon: ${weekdayCounts[1]} lessons, Tue: ${weekdayCounts[2]} lessons, Wed: ${weekdayCounts[3]} lessons, Thu: ${weekdayCounts[4]} lessons, Fri: ${weekdayCounts[5]} lessons, Sat: ${weekdayCounts[6]} lessons, Sun: ${weekdayCounts[0]} lessons`;

    let yoyEarnings = '';
    Object.entries(yearStats).forEach(([year, data]) => {
      const revenue = Math.round(data.hours * hourlyRate);
      yoyEarnings += `- Year ${year}: ${data.count} lessons, ${data.hours.toFixed(0)} hours, ${data.activeDays.size} active workdays, Estimated Earnings: £${revenue.toLocaleString()}\n`;
    });

    // Group lessons by month chronologically
    const monthStats: Record<string, { count: number; hours: number }> = {};
    lessonsOnly.forEach(e => {
      const year = e.start.getFullYear();
      const monthIdx = e.start.getMonth();
      const key = `${year}-${(monthIdx + 1).toString().padStart(2, '0')}`;
      if (!monthStats[key]) {
        monthStats[key] = { count: 0, hours: 0 };
      }
      monthStats[key].count += 1;
      monthStats[key].hours += e.durationMinutes / 60;
    });

    let monthlyBreakdownStr = '';
    Object.keys(monthStats).sort().forEach(monthKey => {
      const data = monthStats[monthKey];
      const earnings = Math.round(data.hours * hourlyRate);
      const [year, monthNum] = monthKey.split('-');
      const dateObj = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
      const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthlyBreakdownStr += `- ${monthLabel}: ${data.count} lessons, ${data.hours.toFixed(1)} hours, Est. Earnings: £${earnings.toLocaleString()}\n`;
    });

    return `
### DRIVE STATS CALENDAR CONTEXT DATA:
- Instructor Hourly Rate: £${hourlyRate}/hr
- Total Lessons: ${lessonsOnly.length}
- Total Mock/Official Tests: ${testsOnly.length}
- Total Billing Lesson Hours: ${totalHours.toFixed(1)} hrs
- Estimated Total Billing Revenue: £${totalEarnings.toLocaleString()}
- Weekday Schedule Distribution:
  ${weekdaysStr}
- Year-over-Year Performance Breakdown:
${yoyEarnings}
- Month-over-Month Performance Breakdown:
${monthlyBreakdownStr || '- No monthly data available.\n'}
    `.trim();
  }, [lessonsOnly, testsOnly, hourlyRate, allEvents]);

  const callAIProvider = useCallback(async (systemPrompt: string, userPrompt: string, activeTabForReport?: 'summary' | 'trends'): Promise<string> => {
    if (!hasApiKey) {
      throw new Error('API Key is missing. Please set it in the Settings tab.');
    }

    if (aiProvider === 'gemini') {
      const cleanKey = aiApiKey.trim();
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${cleanKey}`;
      
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
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson?.error?.message || `Gemini API returned status ${response.status}`);
        }

        const result = await response.json();
        const candidate = result?.candidates?.[0];
        const finishReason = candidate?.finishReason || 'STOP';
        finalFinishReason = finishReason;
        const parts = candidate?.content?.parts || [];
        const currentChunk = parts.map((p: any) => p.text || '').join('');

        if (!currentChunk) {
          debugTrace += `\n[Attempt ${attempts}] Empty chunk received. Finish reason: ${finishReason}`;
          if (accumulatedAnswer) break;
          throw new Error(`Received an empty response from Gemini. (Finish reason: ${finishReason})`);
        }

        accumulatedAnswer += currentChunk;

        // If the finishReason is SAFETY, RECITATION, or similar block reasons, do not attempt to continue
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          debugTrace += `\n[Attempt ${attempts}] Blocked by finish reason: ${finishReason}`;
          break;
        }

        // Check if report is complete
        const trimmed = accumulatedAnswer.trim();
        const lastChar = trimmed.slice(-1);
        const validEndings = ['.', '!', '?', '*', '_', '"', '\'', ')', ']', '}'];
        const isEndingValid = validEndings.includes(lastChar);
        
        let isReportComplete = true;
        if (activeTabForReport === 'summary') {
          isReportComplete = /actionable\s+scheduling/i.test(accumulatedAnswer) || /pricing\s+strategy/i.test(accumulatedAnswer);
        } else if (activeTabForReport === 'trends') {
          isReportComplete = /strategic\s+seasonal/i.test(accumulatedAnswer) || /seasonal\s+adjustments/i.test(accumulatedAnswer);
        }

        if (isEndingValid && isReportComplete) {
          break;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          break;
        }

        console.log(`[AIInsights] Gemini output looks incomplete (ending: "${lastChar}", complete: ${isReportComplete}). Triggering continuation ${attempts}/${maxAttempts}...`);

        debugTrace += `\n[Attempt ${attempts}] Incomplete response. Triggering continuation...`;
        
        contents = [
          ...contents,
          {
            role: 'model',
            parts: [{ text: currentChunk }]
          },
          {
            role: 'user',
            parts: [{ text: 'Your previous response was cut off. Please continue writing the response from where you left off. Start immediately with the continuation, without repeating what you already wrote.' }]
          }
        ];
      }

      if (finalFinishReason && finalFinishReason !== 'STOP' && finalFinishReason !== 'MAX_TOKENS') {
        console.warn(`Gemini generation finished with reason: ${finalFinishReason}`);
        accumulatedAnswer += `\n\n> **[Warning] Report generation partially interrupted by the AI provider (Reason: ${finalFinishReason}).** If the content is incomplete, please click Re-generate or check your API key quotas/limits.`;
      }

      if (debugTrace) {
        accumulatedAnswer += `\n\n> **[Debug Trace]** \`\`\`${debugTrace}\`\`\``;
      }

      return accumulatedAnswer;
    } else {
      // OpenAI API
      const cleanKey = aiApiKey.trim();
      const endpoint = 'https://api.openai.com/v1/chat/completions';

      let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      let accumulatedAnswer = '';
      let attempts = 0;
      const maxAttempts = 3;
      let finalFinishReason = '';

      while (attempts < maxAttempts) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cleanKey}`
          },
          body: JSON.stringify({
            model: aiModel,
            messages,
            temperature: 0.2,
            max_tokens: 8192
          })
        });

        if (!response.ok) {
          const errorJson = await response.json().catch(() => ({}));
          throw new Error(errorJson?.error?.message || `OpenAI API returned status ${response.status}`);
        }

        const result = await response.json();
        const choice = result?.choices?.[0];
        const finishReason = choice?.finish_reason || choice?.finishReason || 'stop';
        finalFinishReason = finishReason;
        const currentChunk = choice?.message?.content || '';

        if (!currentChunk) {
          if (accumulatedAnswer) break;
          throw new Error(`Received an empty response from OpenAI. (Finish reason: ${finishReason})`);
        }

        accumulatedAnswer += currentChunk;

        // If block reasons, do not continue
        if (finishReason && finishReason !== 'stop' && finishReason !== 'length') {
          break;
        }

        // Check completeness
        const trimmed = accumulatedAnswer.trim();
        const lastChar = trimmed.slice(-1);
        const validEndings = ['.', '!', '?', '*', '_', '"', '\'', ')', ']', '}'];
        const isEndingValid = validEndings.includes(lastChar);

        let isReportComplete = true;
        if (activeTabForReport === 'summary') {
          isReportComplete = /actionable\s+scheduling/i.test(accumulatedAnswer) || /pricing\s+strategy/i.test(accumulatedAnswer);
        } else if (activeTabForReport === 'trends') {
          isReportComplete = /strategic\s+seasonal/i.test(accumulatedAnswer) || /seasonal\s+adjustments/i.test(accumulatedAnswer);
        }

        if (isEndingValid && isReportComplete) {
          break;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          break;
        }

        console.log(`[AIInsights] OpenAI output looks incomplete (ending: "${lastChar}", complete: ${isReportComplete}). Triggering continuation ${attempts}/${maxAttempts}...`);

        messages = [
          ...messages,
          { role: 'assistant', content: currentChunk },
          { role: 'user', content: 'Your previous response was cut off. Please continue writing the response from where you left off. Start immediately with the continuation, without repeating what you already wrote.' }
        ];
      }

      if (finalFinishReason && finalFinishReason !== 'stop' && finalFinishReason !== 'length') {
        console.warn(`OpenAI generation finished with reason: ${finalFinishReason}`);
        accumulatedAnswer += `\n\n> **[Warning] Report generation partially interrupted by the AI provider (Reason: ${finalFinishReason}).** If the content is incomplete, please click Re-generate.`;
      }

      return accumulatedAnswer;
    }
  }, [hasApiKey, aiProvider, aiModel, aiApiKey]);

  // Generate Quick Summary
  const handleGenerateSummary = useCallback(async (force = false) => {
    const cached = getCachedAiItem<string>(cacheKeySummary, 7 * 24 * 60 * 60 * 1000);
    if (cached && !force) {
      setSummaryReport(cached);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const system = `You are an elite, senior business analyst and scheduling optimization coach for Approved Driving Instructors (ADIs) using DriveStats.
Analyze the provided stats and compose an extensive, comprehensive, and detailed executive summary report.
Do NOT write a brief summary. Write a highly detailed, thorough, multi-paragraph analysis for each section.
Focus strictly on business operations, scheduling efficiency, revenue, and time management. Ensure the response is fully complete and does not cut off. If you run out of space, prioritize summarizing the recommendations rather than leaving them incomplete.
Provide:
1. # Executive Performance Summary: An in-depth evaluation of total lessons, active teaching weeks, student retention, and test bookings/passes ratio. Include comprehensive context and performance scores.
2. # Workload Balance & Revenue Summary: A complete financial audit of their workload pacing, hourly rate productivity, mock test impacts, and total revenue streams, explaining where margins are lost or won.
3. # Actionable Scheduling & Pricing Strategy: 3 highly detailed, tailored recommendations to optimize scheduling blocks, eliminate route dead-time, and implement a smart rate increase strategy.
Write in Markdown format with bold text, clear section headers, and blockquotes. Be extremely thorough and elaborate on every single point in detail.`;
      
      const user = `Here is my calendar summary stats:\n${statsSummaryText}`;
      const result = await callAIProvider(system, user, 'summary');
      setSummaryReport(result);
      setCachedAiItem(cacheKeySummary, result);
    } catch (err) {
      console.error(err);
      setError(formatAiError(err));
    } finally {
      setLoading(false);
    }
  }, [cacheKeySummary, statsSummaryText, callAIProvider]);

  // Generate Trend Analysis
  const handleGenerateTrends = useCallback(async (force = false) => {
    const cached = getCachedAiItem<string>(cacheKeyTrends, 7 * 24 * 60 * 60 * 1000);
    if (cached && !force) {
      setTrendsReport(cached);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const system = `You are a senior seasonality, workload trend, and revenue optimization specialist for DriveStats ADI.
Review the statistics and write an exhaustive, highly detailed Trend Analysis report.
Do NOT write a brief outline. Provide comprehensive, multi-paragraph breakdowns for the following areas:
Focus strictly on business operations, scheduling efficiency, revenue, and time management. Ensure the response is fully complete and does not cut off. If you run out of space, prioritize summarizing the recommendations rather than leaving them incomplete.
1. # Seasonality & Volume Shifts: Identify specific months, quarters, and seasons where booking volume peaks and dips. Analyze seasonal driving habits, holiday effects, and winter slumps in detail.
2. # Year-over-Year Growth & Revenue Trajectory: Track their historical business progression across the years, highlighting growth trends, efficiency shifts, active workday volume, and revenue changes.
3. # Strategic Seasonal Adjustments & Pricing: Provide a comprehensive, actionable pricing and booking buffer guide for peak vs off-peak seasons (e.g. implementing summer premiums or winter route optimizations).
Write in Markdown format with bold text, clear section headers, and blockquotes. Elaborate extensively.`;
      
      const user = `Here is my calendar summary stats:\n${statsSummaryText}`;
      const result = await callAIProvider(system, user, 'trends');
      setTrendsReport(result);
      setCachedAiItem(cacheKeyTrends, result);
    } catch (err) {
      console.error(err);
      setError(formatAiError(err));
    } finally {
      setLoading(false);
    }
  }, [cacheKeyTrends, statsSummaryText, callAIProvider]);

  // Send Chat message
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || loading) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    setError(null);

    try {
      const system = `You are the DriveStats AI Dashboard Copilot. You are answering a specific question from the Approved Driving Instructor (ADI) using their schedule statistics as context. Be helpful, concise, and professional. Use markdown.`;
      const contextPrompt = `
Instructor Context:\n${statsSummaryText}\n\n
Chat History so far:\n${chatHistory.map(m => `${m.role}: ${m.content}`).join('\n')}\n\n
User Question: ${userMsg}
      `;

      const response = await callAIProvider(system, contextPrompt);
      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error(err);
      const errMsg = formatAiError(err);
      setError(errMsg);
      setChatHistory(prev => [...prev, { role: 'assistant', content: `❌ Error: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  // Markdown parsing helper
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    const flushList = (key: number) => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`list-${key}`} style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', listStyleType: 'disc' }}>
            {currentList}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        currentList.push(
          <li key={idx} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem', fontSize: '0.85rem', lineHeight: '1.4' }}>
            {parseBold(trimmed.slice(2))}
          </li>
        );
      } else {
        flushList(idx);
        if (trimmed.startsWith('### ')) {
          elements.push(<h4 key={idx} style={{ color: 'var(--text-main)', marginTop: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>{trimmed.slice(4)}</h4>);
        } else if (trimmed.startsWith('## ')) {
          elements.push(<h3 key={idx} style={{ color: 'var(--accent-cyan)', marginTop: '1.25rem', marginBottom: '0.5rem' }}>{trimmed.slice(3)}</h3>);
        } else if (trimmed.startsWith('# ')) {
          elements.push(<h2 key={idx} style={{ color: 'var(--accent-purple)', marginTop: '1.5rem', marginBottom: '0.75rem' }}>{trimmed.slice(2)}</h2>);
        } else if (trimmed.startsWith('> ')) {
          elements.push(<blockquote key={idx} style={{ borderLeft: '3px solid var(--accent-cyan)', background: 'rgba(6,182,212,0.05)', padding: '0.5rem 1rem', margin: '0.5rem 0', borderRadius: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{parseBold(trimmed.slice(2))}</blockquote>);
        } else if (trimmed === '') {
          elements.push(<div key={idx} style={{ height: '0.5rem' }} />);
        } else {
          elements.push(<p key={idx} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.4rem 0', lineHeight: '1.5' }}>{parseBold(trimmed)}</p>);
        }
      }
    });

    flushList(lines.length);
    return elements;
  };

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-main)', fontWeight: 700 }}>{part}</strong> : part));
  };

  // Run initial summaries on tab change
  useEffect(() => {
    if (hasApiKey) {
      const timer = setTimeout(() => {
        if (activeTab === 'summary') {
          handleGenerateSummary();
        } else if (activeTab === 'trends') {
          handleGenerateTrends();
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeTab, hasApiKey, handleGenerateSummary, handleGenerateTrends]);

  // Renders alert box when key is missing
  if (!hasApiKey) {
    return (
      <div className="glass-card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ background: 'rgba(6,182,212,0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Key size={32} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 0.5rem 0' }}>AI Insights Require an API Key</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '450px', margin: '0 auto', lineHeight: '1.5' }}>
            To unlock the AI summaries, seasonal trend analysis, and custom coaching advisor, please set up a Gemini or OpenAI API Key in the settings panel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            API Keys are stored strictly on your local computer and queries are sent directly to the model.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* AI Header & Sub-Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>ADI Copilot Insights</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.03)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
            Model: {aiModel}
          </span>
        </div>

        {/* Sub-Tabs Selector */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.02)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'summary' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'summary' ? 'var(--bg-main)' : 'var(--text-muted)'
            }}
          >
            <Calendar size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />
            Quick Summary
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'trends' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'trends' ? 'var(--bg-main)' : 'var(--text-muted)'
            }}
          >
            <TrendingUp size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />
            Trend Analysis
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              background: activeTab === 'chat' ? 'var(--accent-cyan)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--bg-main)' : 'var(--text-muted)'
            }}
          >
            <MessageSquare size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />
            AI Advisor Chat
          </button>
        </div>
      </div>

      {/* Error Callout */}
      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
          <AlertCircle size={18} />
          <div>
            <strong>Request Failed:</strong> {error}
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'summary' && (
        <div className="glass-card" style={{ padding: '1.75rem', position: 'relative', minHeight: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={18} style={{ color: 'var(--accent-cyan)' }} />
              Executive Business Summary
            </h3>
            <button
              onClick={() => handleGenerateSummary(true)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={12} className={loading ? 'spin-animation' : ''} />
              Re-generate
            </button>
          </div>

          {loading && !summaryReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
              <RefreshCw size={32} className="spin-animation" style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Querying {aiModel} for summary...</span>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              {summaryReport ? parseMarkdown(summaryReport) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No report generated. Click Re-generate to load.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="glass-card" style={{ padding: '1.75rem', position: 'relative', minHeight: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-cyan)' }} />
              Seasonal Trajectory & Capacity Trends
            </h3>
            <button
              onClick={() => handleGenerateTrends(true)}
              disabled={loading}
              className="btn btn-secondary"
              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', width: 'auto', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <RefreshCw size={12} className={loading ? 'spin-animation' : ''} />
              Re-generate
            </button>
          </div>

          {loading && !trendsReport ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 0' }}>
              <RefreshCw size={32} className="spin-animation" style={{ color: 'var(--accent-cyan)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Querying {aiModel} for seasonal metrics...</span>
            </div>
          ) : (
            <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
              {trendsReport ? parseMarkdown(trendsReport) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  No report generated. Click Re-generate to load.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '400px', maxHeight: '600px' }}>
          <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <MessageSquare size={18} style={{ color: 'var(--accent-cyan)' }} />
              Interactive AI Advisor Copilot
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Ask any question about your calendar drive stats (e.g. "Which day has the highest volume?" or "What months should I schedule less?")
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
            {chatHistory.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '0.8rem', gap: '0.5rem', textAlign: 'center', padding: '2rem' }}>
                <Sparkles size={24} style={{ color: 'var(--accent-cyan)', opacity: 0.5 }} />
                <span>How can I help you analyze your driving school statistics today?</span>
              </div>
            )}

            {chatHistory.map((msg, idx) => (
              <div 
                key={idx} 
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent-indigo), var(--accent-purple))' : 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-light)',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--accent-cyan)', display: 'block', marginBottom: '0.25rem' }}>
                  {msg.role === 'user' ? 'You' : `${aiProvider.toUpperCase()} Assistant`}
                </span>
                <div style={{ fontSize: '0.85rem', color: '#fff', lineHeight: '1.4' }}>
                  {msg.role === 'user' ? msg.content : parseMarkdown(msg.content)}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Form */}
          <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
            <input
              type="text"
              className="select-input"
              style={{ flex: 1, padding: '0.6rem 0.8rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.02)' }}
              placeholder="Ask anything about your schedule..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              disabled={loading || !chatInput.trim()}
            >
              {loading ? (
                <RefreshCw size={14} className="spin-animation" />
              ) : (
                <>
                  <Send size={14} />
                  Send
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
