import React from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { Clock, Percent, Activity, CalendarDays, Award, TrendingUp, Download, Sparkles, RefreshCw } from 'lucide-react';
import { useYearlyMetrics } from '../hooks/useYearlyMetrics';
import { formatMinsToTime, getMondayOfDate } from '../utils/yearlyCalculations';

interface YearlyStatsProps {
  instructorEvents: CalendarEvent[];
  hourlyRate: number;
  nonPayingList: string[];
  capacityMode?: 'historical' | 'custom';
  customIdealHours?: Record<number, number>;
  enableAiInsights?: boolean;
  aiProvider?: 'gemini' | 'openai';
  aiModel?: string;
  aiApiKey?: string;
  excludedYears?: number[];
}

export const YearlyStats: React.FC<YearlyStatsProps> = ({ 
  instructorEvents, 
  hourlyRate, 
  nonPayingList,
  capacityMode = 'historical',
  customIdealHours = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 },
  enableAiInsights = false,
  aiProvider = 'gemini',
  aiModel = 'gemini-2.5-flash',
  aiApiKey = '',
  excludedYears = []
}) => {
  // Decoupled multi-year analytics and calculations
  const {
    trendMode,
    setTrendMode,
    isYtdComparison,
    setIsYtdComparison,
    selectedTrendMonth,
    setSelectedTrendMonth,
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
  } = useYearlyMetrics({
    instructorEvents,
    hourlyRate,
    nonPayingList,
    capacityMode,
    customIdealHours,
    enableAiInsights,
    aiProvider,
    aiModel,
    aiApiKey,
    excludedYears,
  });

  // Markdown parsing helpers
  const parseMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} style={{ color: 'var(--text-main)', marginTop: '0.5rem', marginBottom: '0.25rem' }}>{trimmed.slice(4)}</h4>;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return <li key={idx} style={{ color: 'var(--text-muted)', marginLeft: '0.75rem', marginBottom: '0.15rem', fontSize: '0.8rem' }}>{parseBold(trimmed.slice(2))}</li>;
      }
      if (trimmed === '') {
        return <div key={idx} style={{ height: '0.25rem' }} />;
      }
      return <p key={idx} style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.2rem 0', lineHeight: '1.4' }}>{parseBold(trimmed)}</p>;
    });
  };

  const parseBold = (text: string) => {
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, i) => (i % 2 === 1 ? <strong key={i} style={{ color: 'var(--text-main)', fontWeight: 700 }}>{part}</strong> : part));
  };



  const renderYearlyGlance = () => {
    if (yearlyAverages.length === 0) return null;
    
    return (
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} className="gradient-text" />
            Year-over-Year Performance Summary
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Annual schedule booking rate (capacity utilization). Higher % means a fuller schedule and higher earnings. Incomplete or starting years can be excluded in Settings.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {yearlyAverages.map((item, idx) => {
            const color = idx === 0 
              ? 'var(--accent-purple)' 
              : idx === 1 
                ? 'var(--accent-indigo)' 
                : 'var(--accent-cyan)';
            
            return (
              <div 
                key={item.year} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '0.75rem',
                  paddingBottom: '0.75rem',
                  borderBottom: idx < yearlyAverages.length - 1 ? '1px solid var(--border-light)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', minWidth: '45px' }}>
                    {item.year}
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, color }}>
                        {item.averageFillPct.toFixed(1)}%
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        booking rate
                      </span>
                    </div>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div style={{ flex: '1 1 200px', maxWidth: '300px', background: 'rgba(148, 163, 184, 0.2)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(item.averageFillPct, 100)}%`, height: '100%', background: color, borderRadius: '5px' }} />
                </div>

                {/* Trend Badge */}
                <div>
                  {idx === 0 ? (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                      Baseline Year
                    </span>
                  ) : item.change >= 0 ? (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-emerald)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      ▲ +{item.change.toFixed(1)}% vs {yearlyAverages[idx - 1].year}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      ▼ {item.change.toFixed(1)}% vs {yearlyAverages[idx - 1].year}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYoYChart = () => {
    const { sortedYears, dataByYear, deseasonalizedDataByYear } = yoyData;
    if (sortedYears.length === 0) return null;

    const width = 800;
    const height = 280;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const getX = (weekIdx: number) => paddingLeft + (weekIdx / 52) * chartWidth;
    const maxY = 120;
    const getY = (val: number) => paddingBottom + chartHeight - (Math.min(val, maxY) / maxY) * chartHeight;

    const yearColors: Record<number, string> = {
      2024: '#ec4899', // Pink
      2025: '#8b5cf6', // Purple
      2026: '#06b6d4', // Cyan
      2027: '#10b981', // Emerald
    };
    
    const getYearColor = (yr: number) => {
      if (yearColors[yr]) return yearColors[yr];
      const keys = Object.values(yearColors);
      return keys[yr % keys.length];
    };

    return (
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} className="gradient-text" />
              Year-over-Year Capacity Trends
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Comparing weekly fill percentages across different calendar years (Week 1 to Week 53).
            </p>
          </div>

          <div className="sfd-liquid-glass-strip" style={{ padding: '3px 4px' }}>
            {(['raw', 'smoothed', 'deseasonalized'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTrendMode(mode)}
                className={`sfd-strip-btn ${trendMode === mode ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                {mode === 'raw' && 'Raw View'}
                {mode === 'smoothed' && 'Smoothed (4w MA)'}
                {mode === 'deseasonalized' && 'Deseasonalized (52w CMA)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          {sortedYears.map(yr => (
            <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '12px', height: '12px', background: getYearColor(yr), borderRadius: '3px' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{yr}</span>
            </div>
          ))}
        </div>

        <div className="chart-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            style={{ width: '100%', height: 'auto', minWidth: '600px', background: 'transparent' }}
          >
            {[0, 25, 50, 75, 100, 120].map(val => {
              const y = getY(val);
              return (
                <g key={val} opacity="0.15">
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={width - paddingRight} 
                    y2={y} 
                    stroke="var(--text-main)" 
                    strokeWidth="1" 
                    strokeDasharray={val === 100 ? 'none' : '4 4'}
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 4} 
                    fill="var(--text-main)" 
                    fontSize="10" 
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((mLabel, idx) => {
              const weekIdx = Math.round((idx / 5) * 52);
              const x = getX(weekIdx);
              return (
                <text
                  key={mLabel}
                  x={x}
                  y={height - 15}
                  fill="var(--text-dim)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  opacity="0.7"
                >
                  {mLabel}
                </text>
              );
            })}

            {sortedYears.map(yr => {
              const rawData = dataByYear[yr];
              const deseasonalizedRawData = deseasonalizedDataByYear[yr];
              const color = getYearColor(yr);
              
              const yrData: Record<number, number> = {};
              if (trendMode === 'smoothed') {
                const windowSize = 4;
                for (let weekIdx = 0; weekIdx <= 52; weekIdx++) {
                  let sum = 0;
                  let count = 0;
                  for (let w = Math.max(0, weekIdx - windowSize + 1); w <= weekIdx; w++) {
                    if (rawData[w] !== undefined) {
                      sum += rawData[w];
                      count++;
                    }
                  }
                  if (count > 0) {
                    yrData[weekIdx] = sum / count;
                  }
                }
              } else if (trendMode === 'deseasonalized') {
                Object.assign(yrData, deseasonalizedRawData);
              } else {
                Object.assign(yrData, rawData);
              }

              let pathD = '';
              let first = true;
              
              for (let weekIdx = 0; weekIdx <= 52; weekIdx++) {
                if (yrData[weekIdx] !== undefined) {
                  const x = getX(weekIdx);
                  const y = getY(yrData[weekIdx]);
                  if (first) {
                    pathD = `M ${x} ${y}`;
                    first = false;
                  } else {
                    pathD += ` L ${x} ${y}`;
                  }
                }
              }

              return (
                <g key={yr}>
                  <path 
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                  
                  {Object.entries(yrData).map(([weekIdxStr, val]) => {
                    const weekIdx = parseInt(weekIdxStr, 10);
                    const x = getX(weekIdx);
                    const y = getY(val);
                    return (
                      <circle
                        key={weekIdx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="var(--bg-card)"
                        stroke={color}
                        strokeWidth="2"
                        style={{ cursor: 'pointer' }}
                      >
                        <title>{`${yr} - Week ${weekIdx + 1}:\nUtilization: ${val.toFixed(0)}%${
                          trendMode === 'smoothed' 
                            ? ' (Smoothed 4w MA)' 
                            : trendMode === 'deseasonalized' 
                              ? ' (Deseasonalized 52w CMA)' 
                              : ''
                        }`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };



  // 4.4. Monthly Seasonality Comparison Chart
  const renderMonthlySeasonalityChart = () => {
    const { sortedYears, dataByYear } = seasonalData;
    if (sortedYears.length === 0) return null;

    const width = 800;
    const height = 280;
    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 20;
    const paddingBottom = 40;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const getX = (monthIdx: number) => paddingLeft + (monthIdx / 11) * chartWidth;
    const maxY = 120;
    const getY = (val: number) => paddingBottom + chartHeight - (Math.min(val, maxY) / maxY) * chartHeight;

    const yearColors: Record<number, string> = {
      2024: '#ec4899', // Pink
      2025: '#8b5cf6', // Purple
      2026: '#06b6d4', // Cyan
      2027: '#10b981', // Emerald
    };
    
    const getYearColor = (yr: number) => {
      if (yearColors[yr]) return yearColors[yr];
      const keys = Object.values(yearColors);
      return keys[yr % keys.length];
    };

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={18} className="gradient-text" />
            Seasonal Capacity Overlay (Month-by-Month)
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Compare how different months of the year performed across 2024, 2025, and 2026 side-by-side.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
          {sortedYears.map(yr => (
            <div key={yr} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '12px', height: '12px', background: getYearColor(yr), borderRadius: '3px' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{yr}</span>
            </div>
          ))}
        </div>

        <div className="responsive-split-grid">
          <div className="chart-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              style={{ width: '100%', height: 'auto', minWidth: '600px', background: 'transparent' }}
            >
            {[0, 25, 50, 75, 100, 120].map(val => {
              const y = getY(val);
              return (
                <g key={val} opacity="0.15">
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={width - paddingRight} 
                    y2={y} 
                    stroke="var(--text-main)" 
                    strokeWidth="1" 
                    strokeDasharray={val === 100 ? 'none' : '4 4'}
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 4} 
                    fill="var(--text-main)" 
                    fontSize="10" 
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {monthLabels.map((mLabel, idx) => {
              const x = getX(idx);
              return (
                <text
                  key={mLabel}
                  x={x}
                  y={height - 15}
                  fill="var(--text-dim)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                  opacity="0.7"
                >
                  {mLabel}
                </text>
              );
            })}

            {sortedYears.map(yr => {
              const yrData = dataByYear[yr];
              const color = getYearColor(yr);
              
              let pathD = '';
              let first = true;
              
              for (let monthIdx = 0; monthIdx < 12; monthIdx++) {
                if (yrData[monthIdx] !== undefined) {
                  const x = getX(monthIdx);
                  const y = getY(yrData[monthIdx]);
                  if (first) {
                    pathD = `M ${x} ${y}`;
                    first = false;
                  } else {
                    pathD += ` L ${x} ${y}`;
                  }
                }
              }

              return (
                <g key={yr}>
                  <path 
                    d={pathD}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                  
                  {Object.entries(yrData).map(([monthIdxStr, val]) => {
                    const monthIdx = parseInt(monthIdxStr, 10);
                    const x = getX(monthIdx);
                    const y = getY(val);
                    return (
                      <circle
                        key={monthIdx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        fill="var(--bg-card)"
                        stroke={color}
                        strokeWidth="2"
                        style={{ cursor: 'pointer' }}
                      >
                        <title>{`${yr} - ${monthLabels[monthIdx]}:\nUtilization: ${val.toFixed(0)}%`}</title>
                      </circle>
                    );
                  })}
                </g>
              );
            })}
          </svg>
        </div>
          {enableAiInsights && aiApiKey && (
            <div className="glass-card animate-slide-up" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '12px', height: 'fit-content' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
                <Sparkles size={15} style={{ color: 'var(--accent-cyan)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>AI Seasonality Analyst</span>
              </div>
              {yoyAiLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={18} className="spin-animation" style={{ margin: '0 auto' }} />
                  <span style={{ fontSize: '0.75rem' }}>Analyzing seasonal peaks...</span>
                </div>
              ) : yoyAiError ? (
                <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Failed to load AI Insights: {yoyAiError}</span>
              ) : yoyAiReport ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  <p style={{ margin: 0 }}>{yoyAiReport.seasonalityAdvice}</p>
                </div>
              ) : (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>No seasonality data.</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSpecificMonthTrendChart = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthAbbrevs = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const width = 800;
    const height = 280;
    const paddingLeft = 55;
    const paddingRight = 55;
    const paddingTop = 30;
    const paddingBottom = 40;
    
    const chartWidth = width - paddingLeft - paddingRight;
    const chartInnerHeight = height - paddingTop - paddingBottom;

    // Check if there is data
    const hasData = specificMonthTrendData.length > 0;
    
    // Y-Axis limits
    const maxEarnings = hasData 
      ? Math.max(1000, ...specificMonthTrendData.map(m => m.earnings)) * 1.15 
      : 1000;
    const maxFill = 120; // 120% cap

    const getYLeft = (val: number) => height - paddingBottom - (val / maxEarnings) * chartInnerHeight;
    const getYRight = (val: number) => height - paddingBottom - (Math.min(val, maxFill) / maxFill) * chartInnerHeight;
    
    // Bar placement calculations
    const getX = (idx: number) => {
      if (specificMonthTrendData.length === 0) return 0;
      if (specificMonthTrendData.length === 1) {
        return paddingLeft + chartWidth / 2;
      }
      const sectionWidth = chartWidth / specificMonthTrendData.length;
      return paddingLeft + idx * sectionWidth + sectionWidth / 2;
    };

    const barWidth = Math.min(50, chartWidth / (Math.max(2, specificMonthTrendData.length) * 2));

    return (
      <div className="glass-card animate-slide-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={18} className="gradient-text" />
              YoY Monthly Trend Tracker: {monthNames[selectedTrendMonth]}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Track how {monthNames[selectedTrendMonth]} has evolved financially and operationally across the years.
            </p>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-indigo))', borderRadius: '3px' }} />
              <span style={{ color: 'var(--text-muted)' }}>Estimated Earnings</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '2px', background: 'var(--accent-emerald)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Fill %</span>
            </div>
          </div>
        </div>

        {/* Month Selector Buttons */}
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', padding: '0.25rem 0', WebkitOverflowScrolling: 'touch' }}>
          {monthAbbrevs.map((m, idx) => {
            const isActive = selectedTrendMonth === idx;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedTrendMonth(idx)}
                className="glass-card hover-glow"
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-light)',
                  background: isActive ? 'rgba(6,182,212,0.15)' : 'var(--bg-card)',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderRadius: '6px',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {m}
              </button>
            );
          })}
        </div>

        {!hasData ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
            <CalendarDays size={28} style={{ color: 'var(--text-dim)', marginBottom: '0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.8rem', margin: 0 }}>No diary records found for {monthNames[selectedTrendMonth]} across the recorded years.</p>
          </div>
        ) : (
          <div className="chart-container" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <svg 
              viewBox={`0 0 ${width} ${height}`} 
              style={{ width: '100%', height: 'auto', minWidth: '600px', background: 'transparent', overflow: 'visible' }}
            >
              <defs>
                <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-purple)" />
                  <stop offset="100%" stopColor="var(--accent-cyan)" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                const y = paddingTop + ratio * chartInnerHeight;
                const earningsVal = Math.round(maxEarnings * (1 - ratio));
                const fillVal = Math.round(maxFill * (1 - ratio));
                
                return (
                  <g key={i} opacity="0.15">
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={width - paddingRight} 
                      y2={y} 
                      stroke="var(--text-main)" 
                      strokeWidth="1" 
                      strokeDasharray="4 4"
                    />
                    {/* Left label (Earnings) */}
                    <text 
                      x={paddingLeft - 8} 
                      y={y + 4} 
                      fill="var(--text-main)" 
                      fontSize="9" 
                      fontWeight="600"
                      textAnchor="end"
                    >
                      £{earningsVal.toLocaleString()}
                    </text>
                    {/* Right label (Fill %) */}
                    <text 
                      x={width - paddingRight + 8} 
                      y={y + 4} 
                      fill="var(--accent-emerald)" 
                      fontSize="9" 
                      fontWeight="600"
                      textAnchor="start"
                    >
                      {fillVal}%
                    </text>
                  </g>
                );
              })}

              {/* Bars for Earnings */}
              {specificMonthTrendData.map((mData, idx) => {
                const x = getX(idx);
                const y = getYLeft(mData.earnings);
                const barHeight = height - paddingBottom - y;
                const yearLabel = mData.monthKey.split('-')[0];

                return (
                  <g key={mData.monthKey}>
                    <rect
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx="4"
                      fill="url(#earningsGrad)"
                      opacity="0.8"
                      className="bar-hover"
                      style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                    >
                      <title>{`${mData.label}:\nEarnings: £${mData.earnings.toLocaleString()}\nLessons: ${mData.lessonCount}\nTests: ${mData.testCount}`}</title>
                    </rect>

                    {/* Earnings label above bar */}
                    <text
                      x={x}
                      y={y - 6}
                      fill="var(--text-main)"
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      £{mData.earnings.toLocaleString()}
                    </text>

                    {/* X-axis label (Year) */}
                    <text
                      x={x}
                      y={height - 15}
                      fill="var(--text-main)"
                      fontSize="10"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {yearLabel}
                    </text>
                  </g>
                );
              })}

              {/* Capacity Line */}
              {(() => {
                let pathD = '';
                specificMonthTrendData.forEach((mData, idx) => {
                  const x = getX(idx);
                  const y = getYRight(mData.fillPct);
                  if (idx === 0) {
                    pathD = `M ${x} ${y}`;
                  } else {
                    pathD += ` L ${x} ${y}`;
                  }
                });

                return (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="var(--accent-emerald)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.95"
                  />
                );
              })()}

              {/* Capacity dots and percentage labels */}
              {specificMonthTrendData.map((mData, idx) => {
                const x = getX(idx);
                const y = getYRight(mData.fillPct);

                return (
                  <g key={`dot-${mData.monthKey}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill="var(--bg-main)"
                      stroke="var(--accent-emerald)"
                      strokeWidth="2.5"
                      style={{ cursor: 'pointer' }}
                    >
                      <title>{`${mData.label}:\nUtilization: ${mData.fillPct.toFixed(0)}%`}</title>
                    </circle>

                    {/* Capacity label above circle */}
                    <text
                      x={x}
                      y={y - 8}
                      fill="var(--accent-emerald)"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {mData.fillPct.toFixed(0)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    );
  };

  // 4.5. YoY Business & Scheduling Efficiency Insights Card
  const renderYearlyBusinessInsights = () => {
    if (yearlyMetrics.length === 0) return null;

    return (
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <div>
            <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} className="gradient-text" />
              Business & Scheduling Efficiency Metrics (YoY)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Novel Year-over-Year KPIs tracking paid lesson efficiency, rate optimization, and workload.
            </p>
          </div>

          <button
            onClick={() => setIsYtdComparison(!isYtdComparison)}
            className="glass-card hover-glow"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.7rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: isYtdComparison ? '1px solid var(--accent-cyan)' : '1px solid var(--border-light)',
              background: isYtdComparison ? 'rgba(6,182,212,0.1)' : 'var(--bg-card)',
              color: isYtdComparison ? 'var(--accent-cyan)' : 'var(--text-main)',
              borderRadius: '6px',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
            title={`Align comparisons to the same calendar progress (up to ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`}
          >
            {isYtdComparison ? `• YTD Aligned (up to ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})` : 'Full Year View'}
          </button>
        </div>

        <div className="responsive-split-grid" style={{ marginTop: '1rem' }}>
          <div className="table-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Year</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Lessons</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Scheduling Efficiency</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Earnings / Workday</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Active Days</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Annual Revenue</th>
              </tr>
            </thead>
            <tbody>
              {yearlyMetrics.map((m, idx) => {
                let effChange = 0;
                let revenueChange = 0;
                if (idx > 0) {
                  effChange = m.efficiencyRatio - yearlyMetrics[idx - 1].efficiencyRatio;
                  revenueChange = m.earnings - yearlyMetrics[idx - 1].earnings;
                }

                return (
                  <tr key={m.year} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }} className="row-hover">
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>{m.year}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{m.totalLessons}</td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-main)' }}>{m.efficiencyRatio.toFixed(1)}%</span>
                        {idx > 0 && (
                          <span style={{ fontSize: '0.7rem', color: effChange >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                            {effChange >= 0 ? `▲ +${effChange.toFixed(1)}%` : `▼ ${effChange.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      £{m.earningsPerActiveDay.toFixed(0)}/day
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {m.activeDaysCount} days
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span>£{m.earnings.toLocaleString()}</span>
                        {m.projectedEarnings && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                            Proj. EoY: £{m.projectedEarnings.toLocaleString()}
                          </div>
                        )}
                        {idx > 0 && (
                          <span style={{ fontSize: '0.7rem', color: revenueChange >= 0 ? 'var(--accent-emerald)' : '#ef4444' }}>
                            {revenueChange >= 0 ? `▲ +£${revenueChange.toLocaleString()}` : `▼ -£${Math.abs(revenueChange).toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </div>

        {enableAiInsights && aiApiKey && (
          <div className="glass-card animate-slide-up" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRadius: '12px', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
              <Sparkles size={15} style={{ color: 'var(--accent-purple)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>AI YoY Growth Analyst</span>
            </div>
            {yoyAiLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-muted)' }}>
                <RefreshCw size={18} className="spin-animation" style={{ margin: '0 auto' }} />
                <span style={{ fontSize: '0.75rem' }}>Analyzing financial trajectory...</span>
              </div>
            ) : yoyAiError ? (
              <span style={{ fontSize: '0.75rem', color: '#f87171' }}>Failed to load AI Insights: {yoyAiError}</span>
            ) : yoyAiReport ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                <p style={{ color: 'var(--text-main)', lineHeight: 1.4, margin: 0 }}>{yoyAiReport.summary}</p>
                <div style={{ background: 'rgba(129, 140, 248, 0.05)', padding: '0.6rem 0.8rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-indigo)' }}>
                  <span style={{ fontWeight: 700, display: 'block', marginBottom: '0.1rem', color: 'var(--text-main)', fontSize: '0.75rem' }}>Efficiency Analysis</span>
                  <span style={{ color: 'var(--text-muted)' }}>{yoyAiReport.efficiencyInsight}</span>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>No report data.</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // 4.6. Smart Scheduling Advisor Insights Card
  const renderAdvisorCard = () => {
    if (!advisorInsights) return null;

    return (
      <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.03) 0%, rgba(6,182,212,0.03) 100%)', border: '1px solid rgba(6,182,212,0.15)' }}>
        <h3 className="chart-title" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Award size={18} className="gradient-text" style={{ color: 'var(--accent-cyan)' }} />
          Smart Scheduling Advisor
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          AI-driven diagnostics analyzing routes, travel buffers, and daily scheduling gaps to optimize your business revenue.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Wasted Dead Gaps</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.25rem' }}>
              {advisorInsights.totalDeadHours.toFixed(1)} hrs
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.2rem' }}>
              Time spent waiting between lessons
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Potential Lost Revenue</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
              £{advisorInsights.lostEarnings.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.2rem' }}>
              If dead gaps were billed lessons
            </span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Route Efficiency Focus</span>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.25rem' }}>
              {advisorInsights.worstDayName}
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.2rem' }}>
              Lowest scheduling efficiency ({advisorInsights.worstDayEff}%)
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem', background: 'rgba(6,182,212,0.05)', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {enableAiInsights && aiApiKey ? 'AI Dynamic Scheduling Tip' : 'Actionable Recommendation'}
            </span>
            {enableAiInsights && aiApiKey && (
              <button
                type="button"
                onClick={() => fetchDynamicRecommendation(true)}
                disabled={recLoading}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <RefreshCw size={9} className={recLoading ? 'spin-animation' : ''} />
                Regenerate
              </button>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            {enableAiInsights && aiApiKey ? (
              recLoading && !dynamicRec ? (
                <span style={{ color: 'var(--text-dim)' }}>Drafting tailored scheduling hack...</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  <div>
                    {parseMarkdown(dynamicRec || 'Click Regenerate to query AI coach.')}
                  </div>
                  {yoyAiReport?.coachingTips && yoyAiReport.coachingTips.length > 0 && (
                    <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Sparkles size={11} style={{ color: 'var(--accent-purple)' }} />
                        Long-term Business Strategy:
                      </span>
                      <ul style={{ paddingLeft: '1rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {yoyAiReport.coachingTips.map((tip, tIdx) => (
                          <li key={tIdx} style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            ) : (
              <>
                Your scheduling is least efficient on <strong>{advisorInsights.worstDayName}s</strong> due to travel buffers and dead time. 
                Try restricting booking slots for students in similar postcodes on {advisorInsights.worstDayName}s to reduce travel buffer and convert up to <strong>{advisorInsights.totalDeadHours.toFixed(0)} hours</strong> of dead time back to productive paid lessons.
              </>
            )}
          </span>
        </div>
      </div>
    );
  };

  // 4.7. CSV Exporter Utility
  const exportToCSV = (type: 'weekly' | 'monthly') => {
    let headers: string[];
    let rows: string[][];
    let filename: string;

    if (type === 'weekly') {
      filename = 'weekly_stats.csv';
      headers = ['Week Commencing', 'Teaching Hours', 'Fill Percentage', 'Lessons Count', 'Tests Count'];
      rows = weekDataList.map(w => [
        w.weekStart.toISOString().split('T')[0],
        w.actualHours.toFixed(2),
        w.fillPct.toFixed(0),
        w.lessonCount.toString(),
        w.testCount.toString(),
      ]);
    } else {
      filename = 'monthly_stats.csv';
      headers = ['Month', 'Teaching Hours', 'Ideal Target Hours', 'Fill Percentage', 'Lessons Count', 'Tests Count', 'Estimated Earnings'];
      rows = monthDataList.map(m => [
        m.label,
        m.actualHours.toFixed(2),
        m.idealHours.toFixed(2),
        m.fillPct.toFixed(0),
        m.lessonCount.toString(),
        m.testCount.toString(),
        m.earnings.toString(),
      ]);
    }

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart configuration parameters
  const chartHeight = 220;
  const paddingLeft = 50;
  const paddingRight = 50;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartInnerHeight = chartHeight - paddingTop - paddingBottom;

  // Render Double-Axis Weekly SVG Chart (Hours & Fill Percentage)
  const renderWeeklyTrendsChart = () => {
    if (weekDataList.length === 0) return null;
    
    // Dynamic width to allow horizontal scrolling for long calendars
    const barWidth = 24;
    const barGap = 16;
    const chartWidth = Math.max(800, weekDataList.length * (barWidth + barGap) + paddingLeft + paddingRight);

    // Y1-axis limits (Hours)
    const maxHours = Math.max(40, ...weekDataList.map(w => w.actualHours)) * 1.1;
    // Y2-axis limits (Fill Percentage)
    const maxFill = Math.max(100, ...weekDataList.map(w => w.fillPct)) * 1.1;

    // Helper coordinates generators
    const getX = (idx: number) => paddingLeft + idx * (barWidth + barGap) + barWidth / 2;
    const getY2 = (pct: number) => chartHeight - paddingBottom - (pct / maxFill) * chartInnerHeight;

    // Draw Fill Percentage trend line path (segmented into past and future/upcoming)
    let pastPath = '';
    let futurePath = '';
    const currentWeekMon = getMondayOfDate(new Date());
    const firstFutureIdx = weekDataList.findIndex(w => w.weekStart >= currentWeekMon);

    weekDataList.forEach((w, idx) => {
      const x = getX(idx);
      const y = getY2(w.fillPct);
      const isFuture = w.weekStart >= currentWeekMon;

      if (!isFuture) {
        if (pastPath === '') {
          pastPath += `M ${x} ${y}`;
        } else {
          pastPath += ` L ${x} ${y}`;
        }
        // Connect past to first future point to keep line continuous
        if (idx === firstFutureIdx - 1 || (firstFutureIdx === -1 && idx === weekDataList.length - 1)) {
          const nextW = weekDataList[idx + 1];
          if (nextW) {
            pastPath += ` L ${getX(idx + 1)} ${getY2(nextW.fillPct)}`;
          }
        }
      } else {
        if (futurePath === '') {
          // Connect to last past point to keep line continuous
          const prevW = weekDataList[idx - 1];
          if (prevW) {
            futurePath += `M ${getX(idx - 1)} ${getY2(prevW.fillPct)} L ${x} ${y}`;
          } else {
            futurePath += `M ${x} ${y}`;
          }
        } else {
          futurePath += ` L ${x} ${y}`;
        }
      }
    });

    return (
      <div style={{ overflowX: 'auto', width: '100%', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-light)', borderRadius: '16px', padding: '1.25rem' }}>
        <div style={{ width: `${chartWidth}px`, height: `${chartHeight}px`, position: 'relative' }}>
          <svg width={chartWidth} height={chartHeight} style={{ overflow: 'visible' }}>
            
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingTop + ratio * chartInnerHeight;
              const hourVal = (maxHours * (1 - ratio)).toFixed(0);
              const pctVal = (maxFill * (1 - ratio)).toFixed(0);
              
              return (
                <g key={i}>
                  {/* Gridline */}
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={chartWidth - paddingRight} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.04)" 
                    strokeDasharray="4 4" 
                  />
                  {/* Left Label (Hours) */}
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 4} 
                    fill="var(--text-dim)" 
                    fontSize="10" 
                    textAnchor="end"
                  >
                    {hourVal}h
                  </text>
                  {/* Right Label (Fill %) */}
                  <text 
                    x={chartWidth - paddingRight + 8} 
                    y={y + 4} 
                    fill="var(--accent-emerald)" 
                    fontSize="10" 
                    textAnchor="start"
                  >
                    {pctVal}%
                  </text>
                </g>
              );
            })}

            {/* Bars for Weekly Teaching Hours */}
            {weekDataList.map((w, idx) => {
              const x = paddingLeft + idx * (barWidth + barGap);
              const barHeight = (w.actualHours / maxHours) * chartInnerHeight;
              const y = chartHeight - paddingBottom - barHeight;
              
              // Only display labels for some weeks if there are many to avoid overlap
              const displayLabel = weekDataList.length < 24 || idx % 2 === 0;
              const isFuture = w.weekStart >= currentWeekMon;

              return (
                <g key={idx}>
                  {/* Teaching Hours Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    rx="4"
                    fill={isFuture ? 'url(#futureGrad)' : 'url(#indigoGrad)'}
                    opacity="0.8"
                    className="bar-hover"
                    style={{ transition: 'opacity 0.2s', cursor: 'pointer' }}
                  >
                    <title>{`Week of ${w.weekStart.toLocaleDateString()}:\nTeaching Hours: ${w.actualHours.toFixed(1)}h\nLessons: ${w.lessonCount}\nTests: ${w.testCount}${isFuture ? ' (Upcoming)' : ''}`}</title>
                  </rect>
                  
                  {/* X-axis Label */}
                  {displayLabel && (
                    <text
                      x={x + barWidth / 2}
                      y={chartHeight - paddingBottom + 16}
                      fill="var(--text-muted)"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      {w.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Fill Percentage Line Segmented */}
            {pastPath && (
              <path
                d={pastPath}
                fill="none"
                stroke="var(--accent-emerald)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            )}
            {futurePath && (
              <path
                d={futurePath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />
            )}

            {/* Markers (circles) on the Fill Percentage Line */}
            {weekDataList.map((w, idx) => {
              const x = getX(idx);
              const y = getY2(w.fillPct);
              const isFuture = w.weekStart >= currentWeekMon;
              
              return (
                <circle
                  key={idx}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="var(--bg-main)"
                  stroke={isFuture ? '#f59e0b' : 'var(--accent-emerald)'}
                  strokeWidth="2.5"
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`Week of ${w.weekStart.toLocaleDateString()}:\nFill Percentage: ${w.fillPct.toFixed(0)}%\n(Ideal span: ${weeklyIdealHours.toFixed(1)}h)${isFuture ? ' (Upcoming)' : ''}`}</title>
                </circle>
              );
            })}

            {/* Gradient definitions */}
            <defs>
              <linearGradient id="indigoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-purple)" />
                <stop offset="100%" stopColor="var(--accent-indigo)" />
              </linearGradient>
              <linearGradient id="futureGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>

          </svg>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* CSV Export Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginBottom: '-0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => exportToCSV('weekly')}
          className="glass-card hover-glow"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.5rem 0.85rem', 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Download size={14} />
          Export Weekly CSV
        </button>
        <button 
          onClick={() => exportToCSV('monthly')}
          className="glass-card hover-glow"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            padding: '0.5rem 0.85rem', 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-card)',
            color: 'var(--text-main)',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Download size={14} />
          Export Monthly CSV
        </button>
      </div>

      {/* 1. Global KPIs Panel */}
      <div className="kpi-grid">
        
        <div className="glass-card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Total Teaching Hours</span>
            <Clock size={16} className="gradient-text" />
          </div>
          <div className="kpi-value">{globalSummary.totalHours.toFixed(0)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>hrs</span></div>
          <span className="kpi-footer">Cumulative lesson duration</span>
        </div>

        <div className="glass-card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Typical Weekly Ideal Span</span>
            <CalendarDays size={16} className="gradient-text" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-indigo)' }}>
            {weeklyIdealHours.toFixed(1)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>hrs</span>
          </div>
          <span className="kpi-footer">Target week based on diaries</span>
        </div>

        <div className="glass-card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Average Fill Percentage</span>
            <Percent size={16} className="gradient-text" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-emerald)' }}>{globalSummary.avgFillPct.toFixed(0)}%</div>
          <span className="kpi-footer">Average capacity utilization</span>
        </div>

        <div className="glass-card kpi-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="kpi-title">Estimated Total Earnings</span>
            <Award size={16} className="gradient-text" />
          </div>
          <div className="kpi-value" style={{ color: 'var(--accent-cyan)' }}>
            £{globalSummary.totalEarnings.toLocaleString()}
          </div>
          <span className="kpi-footer">From {globalSummary.totalLessons} drives ({globalSummary.totalTests} tests)</span>
        </div>

      </div>

      {/* Yearly Summary Performance Glance */}
      {renderYearlyGlance()}

      {/* Smart Scheduling Advisor */}
      {renderAdvisorCard()}

      {/* YoY Business & Scheduling Efficiency metrics */}
      {renderYearlyBusinessInsights()}

      {/* 2. Ideal Working Schedule Table */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} className="gradient-text" />
          Calculated Ideal Schedule
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Typical working hours calculated globally using median start and end times across active days in your diary to avoid single-day outliers.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Day</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Calculated First Start</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Calculated Last End</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Calculated Work Span</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
                const daySched = idealSchedules[dayIdx];
                return (
                  <tr 
                    key={dayIdx} 
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', verticalAlign: 'middle' }}
                    className="row-hover"
                  >
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>{daySched.dayName}</td>
                    <td style={{ padding: '0.75rem 0.5rem', color: daySched.spanHours > 0 ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                      {formatMinsToTime(daySched.startMinutes)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: daySched.spanHours > 0 ? 'var(--text-muted)' : 'var(--text-dim)' }}>
                      {formatMinsToTime(daySched.endMinutes)}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: daySched.spanHours > 0 ? 'var(--accent-indigo)' : 'var(--text-dim)' }}>
                      {daySched.spanHours > 0 ? `${daySched.spanHours.toFixed(1)} hrs` : 'Off-duty'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Global Weekly Trends Chart */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="chart-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={18} className="gradient-text" />
              Weekly Teaching Workload & Capacity Utilization
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Chronological weekly trends. Hover bars for details. Drag or scroll horizontally to see all weeks.
            </p>
          </div>
          
          {/* Legend */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', background: 'var(--accent-purple)', borderRadius: '3px' }} />
              <span style={{ color: 'var(--text-muted)' }}>Teaching Hours (Past)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '3px' }} />
              <span style={{ color: 'var(--text-muted)' }}>Teaching Hours (Upcoming)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '2px', background: 'var(--accent-emerald)' }} />
              <span style={{ color: 'var(--text-muted)' }}>Fill % (Past)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <div style={{ width: '12px', height: '2px', background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} />
              <span style={{ color: 'var(--text-muted)' }}>Fill % (Upcoming)</span>
            </div>
          </div>
        </div>

        {renderWeeklyTrendsChart()}
      </div>

      {/* YoY Comparison Chart */}
      {renderYoYChart()}

      {/* Monthly Seasonality Overlay Chart */}
      {renderMonthlySeasonalityChart()}

      {/* YoY Monthly Trend Tracker Chart */}
      {renderSpecificMonthTrendChart()}

      {/* 4. Monthly Breakdowns */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <h3 className="chart-title" style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={18} className="gradient-text" />
          Monthly Aggregate Breakdowns
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Overview of pupil lessons, test bookings, total hours, and relative fill capacity grouped by month.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600 }}>Month</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Lessons</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Tests</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Hours Taught</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Ideal Span Hours</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center' }}>Fill Percentage</th>
                <th style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Est. Earnings</th>
              </tr>
            </thead>
            <tbody>
              {monthDataList.map(mData => (
                <tr 
                  key={mData.monthKey} 
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                  className="row-hover"
                >
                  <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: 'var(--text-main)' }}>{mData.label}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{mData.lessonCount}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: mData.testCount > 0 ? 'var(--accent-cyan)' : 'var(--text-dim)' }}>{mData.testCount}</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--text-main)' }}>{mData.actualHours.toFixed(1)} hrs</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{mData.idealHours.toFixed(1)} hrs</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 600, color: 'var(--accent-emerald)' }}>{mData.fillPct.toFixed(0)}%</td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--accent-cyan)' }}>£{mData.earnings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
