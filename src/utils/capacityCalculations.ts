import type { CalendarEvent } from './icsParser';

export interface IdealDaySchedule {
  dayName: string;
  startMinutes: number;
  endMinutes: number;
  spanHours: number;
}

export interface WeekCapacityStats {
  usedHours: number;
  idealHours: number;
  fillPct: number;
  freePct: number;
  freeHours: number;
}

export interface TimeOfDayDistribution {
  morningCount: number;
  afternoonCount: number;
  eveningCount: number;
  nightCount: number;
  morningPct: number;
  afternoonPct: number;
  eveningPct: number;
  nightPct: number;
}

/**
 * Checks if an event is globally non-paying based on matching keywords.
 */
export function isEventNonPaying(summary: string, nonPayingList: string[]): boolean {
  const summaryLower = summary.toLowerCase();
  return nonPayingList.some(keyword => summaryLower.includes(keyword));
}

/**
 * Calculate used minutes on a day, taking into account:
 * - lesson duration
 * - 15 min travel buffer before first lesson
 * - 15 min travel buffer after last lesson
 * - gaps smaller than 90 mins are treated as unusable and fully consumed (dead time)
 * - gaps 90+ mins use 30 mins travel (15 min after current, 15 min before next)
 */
export function getUsedMinutesForDay(dayLessons: CalendarEvent[]): number {
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
    const nextStart = sorted[i + 1].start;
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
}

/**
 * Calculates global ideal working schedules (spans) for each day of the week.
 */
export function calculateIdealSchedules(
  globalLessons: CalendarEvent[],
  capacityMode: 'historical' | 'custom' = 'historical',
  customIdealHours?: Record<number, number>
): Record<number, IdealDaySchedule> {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const schedules: Record<number, IdealDaySchedule> = {};

  for (let day = 0; day < 7; day++) {
    schedules[day] = {
      dayName: dayNames[day],
      startMinutes: 0,
      endMinutes: 0,
      spanHours: (capacityMode === 'custom' && customIdealHours) ? (customIdealHours[day] || 0) : 0
    };
  }

  if (capacityMode === 'custom' && customIdealHours) {
    return schedules;
  }

  // Calculate median daily span from historical lessons
  const lessonsByDayOfWeek: Record<number, Record<string, CalendarEvent[]>> = {
    0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {}
  };

  globalLessons.forEach(e => {
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
}

/**
 * Calculates used and ideal capacity stats for a given week.
 */
export function calculateWeekCapacityStats(
  startOfWeek: Date,
  allInstructorEvents: CalendarEvent[],
  globalIdealSchedules: Record<number, IdealDaySchedule>,
  nonPayingList: string[],
  capacityMode: 'historical' | 'custom' = 'historical',
  customIdealHours?: Record<number, number>,
  isPartial: boolean = false
): WeekCapacityStats {
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

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
      !isEventNonPaying(e.summary, nonPayingList)
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
}

/**
 * Computes time of day distribution counts and percentages.
 */
export function calculateTimeOfDayDistribution(timedEvents: CalendarEvent[]): TimeOfDayDistribution {
  let morningCount = 0;
  let afternoonCount = 0;
  let eveningCount = 0;
  let nightCount = 0;

  timedEvents.forEach(e => {
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

  return {
    morningCount,
    afternoonCount,
    eveningCount,
    nightCount,
    morningPct,
    afternoonPct,
    eveningPct,
    nightPct
  };
}
