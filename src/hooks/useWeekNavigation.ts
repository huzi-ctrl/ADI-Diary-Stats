import { useState, useMemo } from 'react';
import type { CalendarEvent } from '../utils/icsParser';

// Helper to get the Monday of any date
export function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  // Adjust if Sunday (0), otherwise subtract day - 1
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export interface WeekNavigationResult {
  currentWeekStart: Date;
  setCurrentWeekStart: React.Dispatch<React.SetStateAction<Date>>;
  weekEnd: Date;
  weekRangeLabel: string;
  selectedYear: number | null;
  setSelectedYear: React.Dispatch<React.SetStateAction<number | null>>;
  handlePrevWeek: () => void;
  handleNextWeek: () => void;
  handleCurrentWeek: () => void;
  weekInstructorEvents: CalendarEvent[];
  weekFilteredOutEvents: CalendarEvent[];
  filteredYearlyEvents: CalendarEvent[];
}

export function useWeekNavigation(
  instructorEvents: CalendarEvent[],
  filteredOutEvents: CalendarEvent[]
): WeekNavigationResult {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Week-level increment/decrement
  const handlePrevWeek = () => {
    setCurrentWeekStart(prev => new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000));
  };

  const handleCurrentWeek = () => {
    setCurrentWeekStart(getMonday(new Date()));
  };

  // Filter events for Yearly Stats
  const filteredYearlyEvents = useMemo(() => {
    if (selectedYear === null) return instructorEvents;
    return instructorEvents.filter(e => e.start.getFullYear() === selectedYear);
  }, [instructorEvents, selectedYear]);

  // Filter events for the currently selected week
  const { weekInstructorEvents, weekFilteredOutEvents } = useMemo(() => {
    const start = currentWeekStart;
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    
    const instructor = instructorEvents.filter(e => e.start >= start && e.start <= end);
    const filtered = filteredOutEvents.filter(e => e.start >= start && e.start <= end);
    
    return { weekInstructorEvents: instructor, weekFilteredOutEvents: filtered };
  }, [instructorEvents, filteredOutEvents, currentWeekStart]);

  // Week date range text
  const weekEnd = useMemo(() => {
    return new Date(currentWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  }, [currentWeekStart]);

  const weekRangeLabel = useMemo(() => {
    const opt: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${currentWeekStart.toLocaleDateString(undefined, opt)} – ${weekEnd.toLocaleDateString(undefined, opt)}`;
  }, [currentWeekStart, weekEnd]);

  return {
    currentWeekStart,
    setCurrentWeekStart,
    weekEnd,
    weekRangeLabel,
    selectedYear,
    setSelectedYear,
    handlePrevWeek,
    handleNextWeek,
    handleCurrentWeek,
    weekInstructorEvents,
    weekFilteredOutEvents,
    filteredYearlyEvents,
  };
}
