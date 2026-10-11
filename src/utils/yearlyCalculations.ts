import type { CalendarEvent } from './icsParser';
import type { IdealDaySchedule } from './capacityCalculations';

export interface WeekData {
  weekStart: Date;
  label: string;
  actualHours: number;
  fillPct: number;
  lessonCount: number;
  testCount: number;
}

export interface MonthData {
  monthKey: string; // YYYY-MM
  label: string;
  actualHours: number;
  idealHours: number;
  fillPct: number;
  lessonCount: number;
  testCount: number;
  earnings: number;
}

export interface YearlyMetric {
  year: number;
  efficiencyRatio: number;
  earningsPerActiveDay: number;
  activeDaysCount: number;
  totalLessons: number;
  earnings: number;
  projectedEarnings: number | null;
}

export interface AdvisorInsights {
  totalDeadHours: number;
  totalBufferHours: number;
  lostEarnings: number;
  worstDayName: string;
  worstDayEff: string;
}

export interface GlobalSummary {
  totalHours: number;
  avgWeeklyHours: number;
  avgFillPct: number;
  totalLessons: number;
  totalTests: number;
  totalEarnings: number;
  busiestWeekLabel: string;
}

export interface SeasonalData {
  sortedYears: number[];
  dataByYear: Record<number, Record<number, number>>;
}

export interface YoyDataResult {
  sortedYears: number[];
  dataByYear: Record<number, Record<number, number>>;
  deseasonalizedDataByYear: Record<number, Record<number, number>>;
}

export interface YearlyAverage {
  year: number;
  averageFillPct: number;
  change: number;
  isFutureYear?: boolean;
  activeWeeks?: number;
  totalWeeks?: number;
}

export function getMondayOfDate(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function formatMinsToTime(mins: number): string {
  if (mins === 0) return 'No lessons';
  const hours24 = Math.floor(mins / 60);
  const minutes = Math.round(mins % 60);
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function calculateYearlyIdealSchedules(
  lessonsOnly: CalendarEvent[],
  capacityMode: 'historical' | 'custom' = 'historical',
  customIdealHours?: Record<number, number>
): Record<number, IdealDaySchedule> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const schedules: Record<number, IdealDaySchedule> = {};

  if (capacityMode === 'custom' && customIdealHours) {
    for (let day = 0; day < 7; day++) {
      schedules[day] = {
        dayName: dayNames[day],
        startMinutes: 0,
        endMinutes: (customIdealHours[day] || 0) * 60,
        spanHours: customIdealHours[day] || 0
      };
    }
    return schedules;
  }

  const lessonsByDate: Record<string, CalendarEvent[]> = {};
  lessonsOnly.forEach(e => {
    const dateStr = e.start.toISOString().split('T')[0];
    if (!lessonsByDate[dateStr]) {
      lessonsByDate[dateStr] = [];
    }
    lessonsByDate[dateStr].push(e);
  });

  const dayOfWeekSpans: Record<number, number[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: []
  };
  const dayOfWeekStarts: Record<number, number[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: []
  };
  const dayOfWeekEnds: Record<number, number[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: []
  };

  Object.entries(lessonsByDate).forEach(([dateStr, events]) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    const firstStart = sorted[0].start;
    const lastEnd = sorted[sorted.length - 1].end;
    
    const startMins = firstStart.getHours() * 60 + firstStart.getMinutes();
    const endMins = lastEnd.getHours() * 60 + lastEnd.getMinutes();
    const spanMins = (lastEnd.getTime() - firstStart.getTime()) / 60000;
    
    dayOfWeekStarts[dayOfWeek].push(startMins);
    dayOfWeekEnds[dayOfWeek].push(endMins);
    dayOfWeekSpans[dayOfWeek].push(spanMins + 30); // Include travel buffer
  });

  [1, 2, 3, 4, 5, 6, 0].forEach(dayOfWeek => {
    const spans = dayOfWeekSpans[dayOfWeek];
    const starts = dayOfWeekStarts[dayOfWeek];
    const ends = dayOfWeekEnds[dayOfWeek];
    
    if (spans.length > 0) {
      spans.sort((a, b) => a - b);
      starts.sort((a, b) => a - b);
      ends.sort((a, b) => a - b);
      
      const mid = Math.floor(spans.length / 2);
      const medianSpanMins = spans.length % 2 !== 0 ? spans[mid] : (spans[mid - 1] + spans[mid]) / 2;
      const medianStartMins = Math.round(starts.length % 2 !== 0 ? starts[mid] : (starts[mid - 1] + starts[mid]) / 2);
      const medianEndMins = Math.round(ends.length % 2 !== 0 ? ends[mid] : (ends[mid - 1] + ends[mid]) / 2);
      
      schedules[dayOfWeek] = {
        dayName: dayNames[dayOfWeek],
        startMinutes: medianStartMins,
        endMinutes: medianEndMins,
        spanHours: medianSpanMins / 60
      };
    } else {
      schedules[dayOfWeek] = {
        dayName: dayNames[dayOfWeek],
        startMinutes: 0,
        endMinutes: 0,
        spanHours: 0
      };
    }
  });

  return schedules;
}

export function calculateWeekDataList(
  instructorEvents: CalendarEvent[],
  lessonsOnly: CalendarEvent[],
  testsOnly: CalendarEvent[],
  weeklyIdealHours: number
): WeekData[] {
  if (instructorEvents.length === 0) return [];
  
  const sorted = [...instructorEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  const startMonday = getMondayOfDate(sorted[0].start);
  const endMonday = getMondayOfDate(sorted[sorted.length - 1].start);

  const list: WeekData[] = [];
  let current = new Date(startMonday.getTime());

  while (current <= endMonday) {
    const nextWeek = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const weeklyLessons = lessonsOnly.filter(e => e.start >= current && e.start < nextWeek);
    const weeklyTests = testsOnly.filter(e => e.start >= current && e.start < nextWeek);
    
    let totalUsedMins = 0;
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayStart = new Date(current.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
      const dayLessons = weeklyLessons.filter(e => e.start >= dayStart && e.start <= dayEnd);
      
      if (dayLessons.length > 0) {
        const sortedLessons = [...dayLessons].sort((a, b) => a.start.getTime() - b.start.getTime());
        let dayMins = sortedLessons.reduce((acc, curr) => acc + curr.durationMinutes, 0);
        
        dayMins += 30; // 15 travel before first, 15 travel after last
        
        for (let i = 0; i < sortedLessons.length - 1; i++) {
          const gap = Math.round((sortedLessons[i + 1].start.getTime() - sortedLessons[i].end.getTime()) / 60000);
          if (gap > 0) {
            if (gap < 90) {
              dayMins += gap; // Unusable dead time gap counted as used
            } else {
              dayMins += 30; // Usable gap: add 30 mins travel total
            }
          }
        }
        totalUsedMins += dayMins;
      }
    }

    const actualHours = weeklyLessons.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60;
    const usedHours = totalUsedMins / 60;
    const fillPct = weeklyIdealHours > 0 ? (usedHours / weeklyIdealHours) * 100 : 0;
    
    list.push({
      weekStart: new Date(current.getTime()),
      label: current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      actualHours,
      fillPct,
      lessonCount: weeklyLessons.length,
      testCount: weeklyTests.length
    });

    current = nextWeek;
  }
  return list;
}

export function calculateYoyData(weekDataList: WeekData[], excludedYears: number[] = []): YoyDataResult {
  const dataByYear: Record<number, Record<number, number>> = {};
  const deseasonalizedDataByYear: Record<number, Record<number, number>> = {};
  const yearsSet = new Set<number>();
  
  // Compute 52-week centered moving average (26 weeks before, 25 weeks after)
  const deseasonalizedFillPcts = weekDataList.map((w, idx) => {
    let sum = 0;
    let count = 0;
    const start = Math.max(0, idx - 26);
    const end = Math.min(weekDataList.length - 1, idx + 25);
    for (let j = start; j <= end; j++) {
      sum += weekDataList[j].fillPct;
      count++;
    }
    return count > 0 ? sum / count : w.fillPct;
  });

  weekDataList.forEach((w, idx) => {
    const year = w.weekStart.getFullYear();
    if (excludedYears.includes(year)) return;
    yearsSet.add(year);
    
    const firstDayOfYear = new Date(year, 0, 1);
    const firstMonday = getMondayOfDate(firstDayOfYear);
    const diffMs = w.weekStart.getTime() - firstMonday.getTime();
    const weekIdx = Math.max(0, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
    
    if (!dataByYear[year]) {
      dataByYear[year] = {};
      deseasonalizedDataByYear[year] = {};
    }
    dataByYear[year][weekIdx] = w.fillPct;
    deseasonalizedDataByYear[year][weekIdx] = deseasonalizedFillPcts[idx];
  });
  
  const sortedYears = Array.from(yearsSet).sort();
  return { sortedYears, dataByYear, deseasonalizedDataByYear };
}

export function calculateYearlyAverages(yoyData: YoyDataResult, excludedYears: number[] = []): YearlyAverage[] {
  const { sortedYears, dataByYear } = yoyData;
  const filteredYears = sortedYears.filter(yr => !excludedYears.includes(yr));
  const currentYear = new Date().getFullYear();

  return filteredYears.map((yr, idx) => {
    const allVals = Object.values(dataByYear[yr] || {});
    // Filter out 0% weeks (holidays, vacations, non-teaching weeks, and unbooked future weeks)
    const activeVals = allVals.filter(v => v > 0);
    const valsToAverage = activeVals.length > 0 ? activeVals : allVals;
    const avg = valsToAverage.length > 0 ? valsToAverage.reduce((a, b) => a + b, 0) / valsToAverage.length : 0;
    
    let change = 0;
    if (idx > 0) {
      const prevYr = filteredYears[idx - 1];
      const prevAllVals = Object.values(dataByYear[prevYr] || {});
      const prevActiveVals = prevAllVals.filter(v => v > 0);
      const prevValsToAverage = prevActiveVals.length > 0 ? prevActiveVals : prevAllVals;
      const prevAvg = prevValsToAverage.length > 0 ? prevValsToAverage.reduce((a, b) => a + b, 0) / prevValsToAverage.length : 0;
      change = avg - prevAvg;
    }
    
    return {
      year: yr,
      averageFillPct: avg,
      change,
      isFutureYear: yr > currentYear,
      activeWeeks: activeVals.length,
      totalWeeks: allVals.length
    };
  });
}

export function calculateMonthDataList(
  lessonsOnly: CalendarEvent[],
  testsOnly: CalendarEvent[],
  idealSchedules: Record<number, IdealDaySchedule>,
  hourlyRate: number,
  testRate: number = 0
): MonthData[] {
  const months: Record<string, { lessons: CalendarEvent[]; tests: CalendarEvent[]; dates: Set<string> }> = {};
  
  lessonsOnly.forEach(e => {
    const year = e.start.getFullYear();
    const month = (e.start.getMonth() + 1).toString().padStart(2, '0');
    const key = `${year}-${month}`;
    
    if (!months[key]) {
      months[key] = { lessons: [], tests: [], dates: new Set() };
    }
    months[key].lessons.push(e);
    months[key].dates.add(e.start.toISOString().split('T')[0]);
  });

  testsOnly.forEach(e => {
    const year = e.start.getFullYear();
    const month = (e.start.getMonth() + 1).toString().padStart(2, '0');
    const key = `${year}-${month}`;
    
    if (!months[key]) {
      months[key] = { lessons: [], tests: [], dates: new Set() };
    }
    months[key].tests.push(e);
    months[key].dates.add(e.start.toISOString().split('T')[0]);
  });

  const list: MonthData[] = [];
  const keys = Object.keys(months).sort();

  keys.forEach(key => {
    const data = months[key];
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    
    const monthDate = new Date(year, monthIdx, 1);
    const monthLabel = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    
    const actualHours = data.lessons.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60;
    
    let idealHoursInMonth = 0;
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, monthIdx, day);
      const dayOfWeek = dateObj.getDay();
      idealHoursInMonth += idealSchedules[dayOfWeek]?.spanHours || 0;
    }

    const fillPct = idealHoursInMonth > 0 ? (actualHours / idealHoursInMonth) * 100 : 0;
    const lessonEarnings = Math.round(actualHours * hourlyRate);
    const testEarnings = testRate > 0 ? data.tests.length * testRate : 0;
    const earnings = lessonEarnings + testEarnings;

    list.push({
      monthKey: key,
      label: monthLabel,
      actualHours,
      idealHours: idealHoursInMonth,
      fillPct,
      lessonCount: data.lessons.length,
      testCount: data.tests.length,
      earnings
    });
  });

  return list;
}

export function calculateSeasonalData(monthDataList: MonthData[]): SeasonalData {
  const dataByYear: Record<number, Record<number, number>> = {};
  const yearsSet = new Set<number>();

  monthDataList.forEach(m => {
    const [yearStr, monthStr] = m.monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    yearsSet.add(year);

    if (!dataByYear[year]) {
      dataByYear[year] = {};
    }
    dataByYear[year][monthIdx] = m.fillPct;
  });

  const sortedYears = Array.from(yearsSet).sort();
  return { sortedYears, dataByYear };
}

export function calculateYearlyMetrics(
  lessonsOnly: CalendarEvent[],
  hourlyRate: number,
  isYtdComparison: boolean,
  idealSchedules: Record<number, IdealDaySchedule>,
  capacityMode: 'historical' | 'custom' = 'historical',
  customIdealHours?: Record<number, number>,
  testsOnly: CalendarEvent[] = [],
  testRate: number = 0
): YearlyMetric[] {
  const targetLessons = isYtdComparison
    ? lessonsOnly.filter(e => {
        const m = e.start.getMonth();
        const d = e.start.getDate();
        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();
        return m < todayMonth || (m === todayMonth && d <= todayDate);
      })
    : lessonsOnly;

  const targetTests = isYtdComparison
    ? testsOnly.filter(e => {
        const m = e.start.getMonth();
        const d = e.start.getDate();
        const today = new Date();
        const todayMonth = today.getMonth();
        const todayDate = today.getDate();
        return m < todayMonth || (m === todayMonth && d <= todayDate);
      })
    : testsOnly;

  const metrics: Record<number, { paidMins: number; capacityUsedMins: number; activeDays: Set<string>; earnings: number; lessonsCount: number }> = {};
  
  targetLessons.forEach(e => {
    const year = e.start.getFullYear();
    if (!metrics[year]) {
      metrics[year] = { paidMins: 0, capacityUsedMins: 0, activeDays: new Set(), earnings: 0, lessonsCount: 0 };
    }
    metrics[year].paidMins += e.durationMinutes;
    metrics[year].lessonsCount += 1;
    metrics[year].activeDays.add(e.start.toISOString().split('T')[0]);
  });

  const lessonsByDateAndYear: Record<number, Record<string, CalendarEvent[]>> = {};
  targetLessons.forEach(e => {
    const year = e.start.getFullYear();
    const dateStr = e.start.toISOString().split('T')[0];
    if (!lessonsByDateAndYear[year]) {
      lessonsByDateAndYear[year] = {};
    }
    if (!lessonsByDateAndYear[year][dateStr]) {
      lessonsByDateAndYear[year][dateStr] = [];
    }
    lessonsByDateAndYear[year][dateStr].push(e);
  });

  Object.entries(lessonsByDateAndYear).forEach(([yearStr, daysObj]) => {
    const year = parseInt(yearStr, 10);
    let yearCapacityMins = 0;

    Object.keys(daysObj).forEach((dateStr) => {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();
      
      const dayMins = (capacityMode === 'custom' && customIdealHours)
        ? (customIdealHours[dayOfWeek] || 0) * 60
        : (idealSchedules[dayOfWeek]?.spanHours || 0) * 60;
      
      yearCapacityMins += dayMins;
    });

    if (metrics[year]) {
      metrics[year].capacityUsedMins = yearCapacityMins;
      const lessonEarnings = Math.round((metrics[year].paidMins / 60) * hourlyRate);
      const testCountInYear = targetTests.filter(t => t.start.getFullYear() === year).length;
      const testEarnings = testRate > 0 ? testCountInYear * testRate : 0;
      metrics[year].earnings = lessonEarnings + testEarnings;
    }
  });

  return Object.entries(metrics).map(([yearStr, data]) => {
    const year = parseInt(yearStr, 10);
    const efficiencyRatio = data.capacityUsedMins > 0 ? (data.paidMins / data.capacityUsedMins) * 100 : 0;
    const earningsPerActiveDay = data.activeDays.size > 0 ? data.earnings / data.activeDays.size : 0;
    
    let projectedEarnings: number | null = null;
    if (year === new Date().getFullYear()) {
      const today = new Date();
      const startOfYear = new Date(year, 0, 1);
      const daysElapsed = Math.max(1, Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
      projectedEarnings = Math.round((data.earnings / daysElapsed) * 365);
    }
    
    return {
      year,
      efficiencyRatio,
      earningsPerActiveDay,
      activeDaysCount: data.activeDays.size,
      totalLessons: data.lessonsCount,
      earnings: data.earnings,
      projectedEarnings
    };
  }).filter(m => m.totalLessons >= 10 && m.year <= new Date().getFullYear()).sort((a, b) => a.year - b.year);
}

export function calculateAdvisorInsights(lessonsOnly: CalendarEvent[], hourlyRate: number): AdvisorInsights | null {
  if (lessonsOnly.length === 0) return null;
  
  const efficiencyByDay: Record<number, { paid: number; total: number }> = {
    1: { paid: 0, total: 0 },
    2: { paid: 0, total: 0 },
    3: { paid: 0, total: 0 },
    4: { paid: 0, total: 0 },
    5: { paid: 0, total: 0 },
    6: { paid: 0, total: 0 },
    0: { paid: 0, total: 0 },
  };

  let totalDeadMins = 0;
  let totalBufferMins = 0;
  const lessonsByDate: Record<string, CalendarEvent[]> = {};

  lessonsOnly.forEach(e => {
    const dateStr = e.start.toISOString().split('T')[0];
    if (!lessonsByDate[dateStr]) {
      lessonsByDate[dateStr] = [];
    }
    lessonsByDate[dateStr].push(e);
  });

  Object.entries(lessonsByDate).forEach(([dateStr, events]) => {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();
    
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());
    const dayPaidMins = sorted.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    
    let dayTotalMins = dayPaidMins;
    dayTotalMins += 30;
    totalBufferMins += 30;

    for (let i = 0; i < sorted.length - 1; i++) {
      const gap = Math.round((sorted[i + 1].start.getTime() - sorted[i].end.getTime()) / 60000);
      if (gap > 0) {
        if (gap < 90) {
          dayTotalMins += gap;
          totalDeadMins += gap;
        } else {
          dayTotalMins += 30;
          totalBufferMins += 30;
        }
      }
    }

    if (efficiencyByDay[dayOfWeek]) {
      efficiencyByDay[dayOfWeek].paid += dayPaidMins;
      efficiencyByDay[dayOfWeek].total += dayTotalMins;
    }
  });

  let lowestDayIdx = -1;
  let lowestEff = 1;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  Object.entries(efficiencyByDay).forEach(([dayStr, data]) => {
    const day = parseInt(dayStr, 10);
    if (data.total > 0) {
      const eff = data.paid / data.total;
      if (eff < lowestEff) {
        lowestEff = eff;
        lowestDayIdx = day;
      }
    }
  });

  const lostEarnings = Math.round((totalDeadMins / 60) * hourlyRate);

  return {
    totalDeadHours: totalDeadMins / 60,
    totalBufferHours: totalBufferMins / 60,
    lostEarnings,
    worstDayName: lowestDayIdx !== -1 ? dayNames[lowestDayIdx] : 'N/A',
    worstDayEff: lowestDayIdx !== -1 ? (lowestEff * 100).toFixed(0) : 'N/A',
  };
}

export function calculateGlobalSummary(
  weekDataList: WeekData[],
  lessonsOnly: CalendarEvent[],
  testsOnly: CalendarEvent[],
  hourlyRate: number,
  testRate: number = 0
): GlobalSummary {
  const activeWeeks = weekDataList.filter(w => w.lessonCount > 0 || w.testCount > 0);
  const totalHours = lessonsOnly.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60;
  const avgWeeklyHours = activeWeeks.length > 0 ? totalHours / activeWeeks.length : 0;
  const avgFillPct = activeWeeks.length > 0 
    ? activeWeeks.reduce((acc, curr) => acc + curr.fillPct, 0) / activeWeeks.length 
    : 0;

  let busiestWeek: WeekData | null = null;
  let maxWeekHours = -1;
  for (const w of weekDataList) {
    if (w.actualHours > maxWeekHours) {
      maxWeekHours = w.actualHours;
      busiestWeek = w;
    }
  }

  const lessonEarnings = Math.round(totalHours * hourlyRate);
  const testEarnings = testRate > 0 ? testsOnly.length * testRate : 0;
  const totalEarnings = lessonEarnings + testEarnings;

  return {
    totalHours,
    avgWeeklyHours,
    avgFillPct,
    totalLessons: lessonsOnly.length,
    totalTests: testsOnly.length,
    totalEarnings,
    busiestWeekLabel: busiestWeek ? `${busiestWeek.label} (${busiestWeek.actualHours.toFixed(1)}h)` : 'N/A'
  };
}
