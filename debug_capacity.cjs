const fs = require('fs');
const path = require('path');

const icsContent = fs.readFileSync("c:\\Users\\huzai\\Documents\\Diary Stats\\lrnr2drvr@gmail.com.ics", 'utf8');

function parseIcalDate(value) {
  const cleanValue = value.trim();
  const isDateOnly = /^\d{8}$/.test(cleanValue);
  
  if (isDateOnly) {
    const year = parseInt(cleanValue.substring(0, 4), 10);
    const month = parseInt(cleanValue.substring(4, 6), 10) - 1;
    const day = parseInt(cleanValue.substring(6, 8), 10);
    return { date: new Date(year, month, day), isAllDay: true };
  }

  const match = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (match) {
    const [_, yearStr, monthStr, dayStr, hourStr, minStr, secStr, isUtc] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    const sec = parseInt(secStr, 10);

    if (isUtc) {
      return { date: new Date(Date.UTC(year, month, day, hour, min, sec)), isAllDay: false };
    } else {
      return { date: new Date(year, month, day, hour, min, sec), isAllDay: false };
    }
  }
  return { date: new Date(), isAllDay: false };
}

function parseICS(rawText) {
  const lines = rawText.split(/\r?\n/);
  const unfolded = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line === '') continue;
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].substring(1);
    }
    unfolded.push(line);
  }

  const events = [];
  let currentEvent = null;

  for (const line of unfolded) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {
        id: '',
        summary: '',
        start: null,
        end: null,
        description: '',
        location: '',
        isAllDay: false,
        categories: []
      };
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.start && currentEvent.end) {
        currentEvent.durationMinutes = Math.round((currentEvent.end.getTime() - currentEvent.start.getTime()) / 60000);
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const keyPart = line.substring(0, colonIdx);
      const val = line.substring(colonIdx + 1);

      if (keyPart.startsWith('SUMMARY')) {
        currentEvent.summary = val;
      } else if (keyPart.startsWith('DTSTART')) {
        const parsed = parseIcalDate(val);
        currentEvent.start = parsed.date;
        currentEvent.isAllDay = parsed.isAllDay;
      } else if (keyPart.startsWith('DTEND')) {
        currentEvent.end = parseIcalDate(val).date;
      } else if (keyPart.startsWith('DESCRIPTION')) {
        currentEvent.description = val;
      } else if (keyPart.startsWith('LOCATION')) {
        currentEvent.location = val;
      } else if (keyPart.startsWith('CATEGORIES')) {
        currentEvent.categories = val.split(',').map(c => c.trim());
      } else if (keyPart.startsWith('UID')) {
        currentEvent.id = val;
      }
    }
  }
  return events;
}

const allEvents = parseICS(icsContent);

// Non-instructor check logic from eventFilters
const NON_INSTRUCTOR_KEYWORDS_SUBSTRING = [
  'dentist', 'dental', 'teeth', 'doctor', 'clinic', 'checkup', 'check-up',
  'hospital', 'surgery', 'pharmacy', 'chemist', 'physio', 'physiotherapy',
  'chiropractor', 'vaccine', 'vaccination', 'optician', 'therapy', 'therapist',
  'birthday', 'bday', 'anniversary', 'party', 'dinner', 'lunch', 'brunch',
  'breakfast', 'coffee date', 'cinema', 'movie', 'concert', 'gig', 'wedding',
  'funeral', 'memorial', 'baby shower', 'picnic', 'bbq', 'get-together',
  'hangout', 'family time', 'visit mom', 'visit dad', 'visit mum',
  'gym session', 'workout', 'weightlifting', 'cardio', 'yoga', 'pilates',
  'jogging', 'split-keyboard', 'keyboard config', 'coding', 'programming',
  'chess club', 'guitar lesson', 'hike', 'hiking',
  'annual leave', 'annual-leave', 'vacation', 'holiday', 'day off', 'day-off',
  'weekend away', 'out of office', 'off duty', 'off-duty', 'rest',
  'groceries', 'supermarket', 'barber', 'haircut', 'salon', 'manicure',
  'pedicure', 'dog walk', 'gardening', 'plumber', 'electrician', 'handyman',
  'laundry',
  'christmas', 'xmas', 'thanksgiving', 'easter monday', 'boxing day',
  'new year\'s eve', 'new years eve', 'halloween', 'bank holiday'
];

const NON_INSTRUCTOR_KEYWORDS_EXACT = [
  'rest', 'gym', 'run', 'break', 'ooo', 'vet', 'bank', 'date', 'pub', 'personal',
  'errand', 'errands', 'chore', 'chores', 'todo', 'to-do', 'tasks', 'reminder'
];

const INSTRUCTOR_FORCE_KEEP = [
  'lesson', 'student', 'pupil', 'mock', 'test', 'drive', 'driving',
  'instructor', 'cpd', 'adi', 'pdi', 'theory', 'adi part', 'show me'
];

function isNonInstructorEvent(summary, description = '') {
  const cleanSummary = summary.toLowerCase();
  const cleanDesc = description.toLowerCase();
  const combinedText = `${cleanSummary} ${cleanDesc}`;

  let hasKeepKeyword = INSTRUCTOR_FORCE_KEEP.some(kw => cleanSummary.includes(kw));
  if (!hasKeepKeyword) {
    hasKeepKeyword = INSTRUCTOR_FORCE_KEEP.some(kw => {
      if (!cleanDesc.includes(kw)) return false;
      const negatedPattern = new RegExp(`\\b(no|not|free|without|zero)\\s+${kw}s?\\b|\\b${kw}s?\\s+(free|off|break)\\b`, 'i');
      return !negatedPattern.test(cleanDesc);
    });
  }

  if (hasKeepKeyword) return false;

  const hasSubKeyword = NON_INSTRUCTOR_KEYWORDS_SUBSTRING.some(kw => combinedText.includes(kw));
  if (hasSubKeyword) return true;

  const hasExactKeyword = NON_INSTRUCTOR_KEYWORDS_EXACT.some(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(combinedText);
  });
  if (hasExactKeyword) return true;

  return false;
}

const instructorEvents = allEvents.filter(e => !isNonInstructorEvent(e.summary, e.description));

// Let's filter out "Huzaifa" and "friends, family" as non-paying
const nonPayingList = ['friends', 'family', 'huzaifa'];
const isEventNonPaying = (summary) => {
  const summaryLower = summary.toLowerCase();
  return nonPayingList.some(keyword => summaryLower.includes(keyword));
};

const globalLessonsOnly = instructorEvents.filter(e => 
  !e.isAllDay &&
  !e.categories.includes('Training') &&
  !e.categories.includes('CPD') &&
  !e.summary.toLowerCase().includes('test') &&
  !e.summary.toLowerCase().includes('mock') &&
  !e.categories.includes('Tests') &&
  !isEventNonPaying(e.summary)
);

// We'll use the user's manual target hours of:
// Mon-Fri: 7 hours, Sat-Sun: 0 hours
// So weekly ideal is 35 hours.
const customIdealHours = { 1: 7, 2: 7, 3: 7, 4: 7, 5: 7, 6: 0, 0: 0 };

function getUsedMinutesForDay(dayLessons) {
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
}

const today = new Date("2026-05-28T13:22:14"); // current local time
const todayMonday = new Date(today);
const day = todayMonday.getDay();
const diff = todayMonday.getDate() - day + (day === 0 ? -6 : 1);
todayMonday.setDate(diff);
todayMonday.setHours(0, 0, 0, 0);

const todayMidnight = new Date(today);
todayMidnight.setHours(0, 0, 0, 0);

const thisWeekEnd = new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

// We will group this week's events from todayMidnight to thisWeekEnd by day index
const daysOfWeekList = [4, 5, 6, 0]; // Thu, Fri, Sat, Sun
let totalUsedMinsThisWeek = 0;
let totalIdealMinsThisWeek = 0;

daysOfWeekList.forEach(d => {
  // Find events on this day
  const dayEvents = instructorEvents.filter(e => {
    if (e.start < todayMidnight || e.start > thisWeekEnd) return false;
    
    // Check if it belongs to day index d
    if (e.start.getDay() !== d) return false;
    
    // Filter categories
    return !e.isAllDay &&
      !e.categories.includes('Training') &&
      !e.categories.includes('CPD') &&
      !e.summary.toLowerCase().includes('test') &&
      !e.summary.toLowerCase().includes('mock') &&
      !e.categories.includes('Tests') &&
      !isEventNonPaying(e.summary);
  });
  
  const dayUsedMins = getUsedMinutesForDay(dayEvents);
  const dayIdealMins = (customIdealHours[d] || 0) * 60;
  
  totalUsedMinsThisWeek += dayUsedMins;
  totalIdealMinsThisWeek += dayIdealMins;
  
  console.log(`Day: ${d} | Booked Events: ${dayEvents.length} | Used: ${(dayUsedMins/60).toFixed(2)}h | Target: ${(dayIdealMins/60).toFixed(2)}h`);
});

const usedHours = totalUsedMinsThisWeek / 60;
const idealHours = totalIdealMinsThisWeek / 60;
const fillPct = idealHours > 0 ? Math.round((usedHours / idealHours) * 100) : 0;
const freePct = 100 - fillPct;
const freeHours = Math.max(0, idealHours - usedHours);

console.log(`\nRemaining This Week Summary:`);
console.log(`- Used Hours (including travel/dead gaps): ${usedHours.toFixed(2)} hrs`);
console.log(`- Target Hours: ${idealHours.toFixed(2)} hrs`);
console.log(`- Capacity Fill: ${fillPct}%`);
console.log(`- Free Capacity: ${freePct}% (${freeHours.toFixed(2)} hrs free)`);
