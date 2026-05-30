import type { CalendarEvent } from './icsParser';

// Comprehensive list of substrings that indicate personal, medical, holiday, or leisure activities
export const NON_INSTRUCTOR_KEYWORDS_SUBSTRING = [
  // Medical & Health
  'dentist', 'dental', 'teeth', 'doctor', 'clinic', 'checkup', 'check-up',
  'hospital', 'surgery', 'pharmacy', 'chemist', 'physio', 'physiotherapy',
  'chiropractor', 'vaccine', 'vaccination', 'optician', 'therapy', 'therapist',

  // Social & Family
  'birthday', 'bday', 'anniversary', 'party', 'dinner', 'lunch', 'brunch',
  'breakfast', 'coffee date', 'cinema', 'movie', 'concert', 'gig', 'wedding',
  'funeral', 'memorial', 'baby shower', 'picnic', 'bbq', 'get-together',
  'hangout', 'family time', 'visit mom', 'visit dad', 'visit mum',

  // Fitness & Hobbies
  'gym session', 'workout', 'weightlifting', 'cardio', 'yoga', 'pilates',
  'jogging', 'split-keyboard', 'keyboard config', 'coding', 'programming',
  'chess club', 'guitar lesson', 'hike', 'hiking',

  // Holidays & Days Off
  'annual leave', 'annual-leave', 'vacation', 'holiday', 'day off', 'day-off',
  'weekend away', 'out of office', 'off duty', 'off-duty', 'rest',

  // Home & Chores
  'groceries', 'supermarket', 'barber', 'haircut', 'salon', 'manicure',
  'pedicure', 'dog walk', 'gardening', 'plumber', 'electrician', 'handyman',
  'laundry',

  // Official Holidays
  'christmas', 'xmas', 'thanksgiving', 'easter monday', 'boxing day',
  'new year\'s eve', 'new years eve', 'halloween', 'bank holiday'
];

// Exact word matches (checked with word boundaries or exact matches)
export const NON_INSTRUCTOR_KEYWORDS_EXACT = [
  'rest', 'gym', 'run', 'break', 'ooo', 'vet', 'bank', 'date', 'pub', 'personal',
  'errand', 'errands', 'chore', 'chores', 'todo', 'to-do', 'tasks', 'reminder'
];

// Exception keywords: if these are present, DO NOT filter the event out, 
// as they are highly relevant to driving instruction.
export const INSTRUCTOR_FORCE_KEEP = [
  'lesson', 'student', 'pupil', 'mock', 'test', 'drive', 'driving',
  'instructor', 'cpd', 'adi', 'pdi', 'theory', 'adi part', 'show me'
];

/**
 * Checks if a calendar event is NOT relevant to driving instruction.
 */
export function isNonInstructorEvent(summary: string, description: string = ''): boolean {
  const cleanSummary = summary.toLowerCase();
  const cleanDesc = description.toLowerCase();
  const combinedText = `${cleanSummary} ${cleanDesc}`;

  // Rule 1: Check force keep exceptions
  // High confidence if it's in the summary (title)
  let hasKeepKeyword = INSTRUCTOR_FORCE_KEEP.some(kw => cleanSummary.includes(kw));

  // If found in description, make sure it isn't part of a negation (e.g. "no lessons", "lesson-free")
  if (!hasKeepKeyword) {
    hasKeepKeyword = INSTRUCTOR_FORCE_KEEP.some(kw => {
      if (!cleanDesc.includes(kw)) return false;
      
      // Look for patterns like "no lessons", "not a lesson", "lesson free", etc.
      const negatedPattern = new RegExp(
        `\\b(no|not|free|without|zero)\\s+${kw}s?\\b|\\b${kw}s?\\s+(free|off|break)\\b`, 
        'i'
      );
      return !negatedPattern.test(cleanDesc);
    });
  }

  if (hasKeepKeyword) {
    return false; // Force keep this event
  }

  // Rule 2: Check substring keywords
  const hasSubKeyword = NON_INSTRUCTOR_KEYWORDS_SUBSTRING.some(kw => combinedText.includes(kw));
  if (hasSubKeyword) {
    return true; // Exclude
  }

  // Rule 3: Check exact word boundaries
  const hasExactKeyword = NON_INSTRUCTOR_KEYWORDS_EXACT.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(combinedText);
  });
  if (hasExactKeyword) {
    return true; // Exclude
  }

  return false; // Default: Keep it
}

/**
 * Splits calendar events into Driving Instructor Events and Filtered Personal Events.
 */
export function splitInstructorEvents(events: CalendarEvent[]): {
  instructorEvents: CalendarEvent[];
  filteredOutEvents: CalendarEvent[];
} {
  const instructorEvents: CalendarEvent[] = [];
  const filteredOutEvents: CalendarEvent[] = [];

  events.forEach(event => {
    if (isNonInstructorEvent(event.summary, event.description)) {
      filteredOutEvents.push(event);
    } else {
      instructorEvents.push(event);
    }
  });

  return { instructorEvents, filteredOutEvents };
}
