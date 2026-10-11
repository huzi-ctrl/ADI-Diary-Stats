import { useMemo } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import {
  isEventNonPaying,
  calculateIdealSchedules,
  calculateWeekCapacityStats,
  calculateTimeOfDayDistribution,
  type IdealDaySchedule,
  type WeekCapacityStats,
  type TimeOfDayDistribution
} from '../utils/capacityCalculations';

export interface UseWeeklyCapacityProps {
  instructorEvents: CalendarEvent[];
  allInstructorEvents: CalendarEvent[];
  weekStart: Date;
  weekEnd: Date;
  hourlyRate: number;
  nonPayingList: string[];
  capacityMode?: 'historical' | 'custom';
  customIdealHours?: Record<number, number>;
}

export interface WeeklyCapacityResult {
  now: Date;
  timedInstructorEvents: CalendarEvent[];
  totalTeachMinutes: number;
  totalTeachHours: string;
  allLessons: CalendarEvent[];
  lessonsOnly: CalendarEvent[];
  nonPayingLessons: CalendarEvent[];
  nonPayingTeachMinutes: number;
  nonPayingTeachHours: string;
  weeklyEarnings: number;
  testBookings: CalendarEvent[];
  completedWeeklyLessons: number;
  upcomingWeeklyLessons: number;
  weeklyLessonsCompletionPct: number;
  allFutureLessons: CalendarEvent[];
  allFutureTests: CalendarEvent[];
  globalIdealSchedules: Record<number, IdealDaySchedule>;
  thisWeekStats: WeekCapacityStats;
  nextWeekStats: WeekCapacityStats;
  twoWeeksOutStats: WeekCapacityStats;
  todayMonday: Date;
  nextWeekStart: Date;
  twoWeeksOutStart: Date;
  dayOfWeekHours: number[];
  maxDayHours: number;
  weekdayStatsString: string;
  dayIndices: number[];
  dayOfWeekNames: string[];
  timeOfDay: TimeOfDayDistribution;
  formatRangeShort: (start: Date) => string;
  formatRemainingThisWeek: () => string;
  formatDateShort: (d: Date) => string;
}

export function useWeeklyCapacity({
  instructorEvents,
  allInstructorEvents,
  hourlyRate,
  nonPayingList,
  capacityMode = 'historical',
  customIdealHours = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 }
}: UseWeeklyCapacityProps): WeeklyCapacityResult {
  const now = useMemo(() => new Date(), []);

  // 1. Core KPIs for the active week
  const timedInstructorEvents = useMemo(() => {
    return instructorEvents.filter(e => !e.isAllDay && !isEventNonPaying(e.summary, nonPayingList));
  }, [instructorEvents, nonPayingList]);

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
    return allLessons.filter(e => !isEventNonPaying(e.summary, nonPayingList));
  }, [allLessons, nonPayingList]);

  const nonPayingLessons = useMemo(() => {
    return allLessons.filter(e => isEventNonPaying(e.summary, nonPayingList));
  }, [allLessons, nonPayingList]);

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
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      (e.summary.toLowerCase().includes('test') ||
       e.summary.toLowerCase().includes('mock') ||
       e.categories.includes('Tests'))
    );
  }, [allInstructorEvents, now]);

  // Ideal Schedules & Capacity
  const globalLessonsOnly = useMemo(() => {
    return allInstructorEvents.filter(e => 
      !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests') &&
      !isEventNonPaying(e.summary, nonPayingList)
    );
  }, [allInstructorEvents, nonPayingList]);

  const globalIdealSchedules = useMemo(() => {
    return calculateIdealSchedules(globalLessonsOnly, capacityMode, customIdealHours);
  }, [globalLessonsOnly, capacityMode, customIdealHours]);

  const todayMonday = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(today.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  }, []);

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const thisWeekEnd = useMemo(() => {
    return new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  }, [todayMonday]);

  const nextWeekStart = useMemo(() => new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000), [todayMonday]);
  const twoWeeksOutStart = useMemo(() => new Date(todayMonday.getTime() + 14 * 24 * 60 * 60 * 1000), [todayMonday]);

  const thisWeekStats = useMemo(() => {
    return calculateWeekCapacityStats(todayMonday, allInstructorEvents, globalIdealSchedules, nonPayingList, capacityMode, customIdealHours, true);
  }, [todayMonday, allInstructorEvents, globalIdealSchedules, nonPayingList, capacityMode, customIdealHours]);

  const nextWeekStats = useMemo(() => {
    return calculateWeekCapacityStats(nextWeekStart, allInstructorEvents, globalIdealSchedules, nonPayingList, capacityMode, customIdealHours, false);
  }, [nextWeekStart, allInstructorEvents, globalIdealSchedules, nonPayingList, capacityMode, customIdealHours]);

  const twoWeeksOutStats = useMemo(() => {
    return calculateWeekCapacityStats(twoWeeksOutStart, allInstructorEvents, globalIdealSchedules, nonPayingList, capacityMode, customIdealHours, false);
  }, [twoWeeksOutStart, allInstructorEvents, globalIdealSchedules, nonPayingList, capacityMode, customIdealHours]);

  // Day of Week Workload
  const dayIndices = useMemo(() => [1, 2, 3, 4, 5, 6, 0], []);
  const dayOfWeekNames = useMemo(() => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], []);

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
  }, [dayIndices, dayOfWeekNames, dayOfWeekHours]);

  // Time of Day distribution
  const timeOfDay = useMemo(() => {
    return calculateTimeOfDayDistribution(timedInstructorEvents);
  }, [timedInstructorEvents]);

  // Formatting helpers
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

  return {
    now,
    timedInstructorEvents,
    totalTeachMinutes,
    totalTeachHours,
    allLessons,
    lessonsOnly,
    nonPayingLessons,
    nonPayingTeachMinutes,
    nonPayingTeachHours,
    weeklyEarnings,
    testBookings,
    completedWeeklyLessons,
    upcomingWeeklyLessons,
    weeklyLessonsCompletionPct,
    allFutureLessons,
    allFutureTests,
    globalIdealSchedules,
    thisWeekStats,
    nextWeekStats,
    twoWeeksOutStats,
    todayMonday,
    nextWeekStart,
    twoWeeksOutStart,
    dayOfWeekHours,
    maxDayHours,
    weekdayStatsString,
    dayIndices,
    dayOfWeekNames,
    timeOfDay,
    formatRangeShort,
    formatRemainingThisWeek,
    formatDateShort,
  };
}
