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

const nonPayingList = ['friends', 'family'];
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

const schedules = {
  1: { dayName: 'Monday', spanHours: 0 },
  2: { dayName: 'Tuesday', spanHours: 0 },
  3: { dayName: 'Wednesday', spanHours: 0 },
  4: { dayName: 'Thursday', spanHours: 0 },
  5: { dayName: 'Friday', spanHours: 0 },
  6: { dayName: 'Saturday', spanHours: 0 },
  0: { dayName: 'Sunday', spanHours: 0 }
};

const daysMap = {};
for (let i = 0; i < 7; i++) daysMap[i] = { starts: [], ends: [] };

globalLessonsOnly.forEach(e => {
  const day = e.start.getDay();
  const startMins = e.start.getHours() * 60 + e.start.getMinutes();
  const endMins = e.end.getHours() * 60 + e.end.getMinutes();
  daysMap[day].starts.push(startMins);
  daysMap[day].ends.push(endMins);
});

for (let day = 0; day < 7; day++) {
  const starts = daysMap[day].starts;
  const ends = daysMap[day].ends;
  if (starts.length > 0) {
    const minStart = Math.min(...starts);
    const maxEnd = Math.max(...ends);
    schedules[day].spanHours = (maxEnd - minStart) / 60;
  }
}

const weeklyIdealHours = Object.values(schedules).reduce((acc, curr) => acc + curr.spanHours, 0);

console.log('Weekly Ideal Hours:', weeklyIdealHours);
console.log('Schedules:', schedules);

const today = new Date("2026-05-28T13:22:14"); // current local time from metadata
console.log('Today input local date:', today.toString());

const todayMonday = new Date(today);
const day = todayMonday.getDay();
const diff = todayMonday.getDate() - day + (day === 0 ? -6 : 1);
todayMonday.setDate(diff);
todayMonday.setHours(0, 0, 0, 0);
console.log('todayMonday:', todayMonday.toString());

const todayMidnight = new Date(today);
todayMidnight.setHours(0, 0, 0, 0);
console.log('todayMidnight:', todayMidnight.toString());

const thisWeekEnd = new Date(todayMonday.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
console.log('thisWeekEnd:', thisWeekEnd.toString());

const dayOfWeek = todayMidnight.getDay();
const getRemainingDaysOfWeek = (dOfWeek) => {
  if (dOfWeek === 0) return [0]; // Sunday only
  const days = [];
  for (let d = dOfWeek; d <= 6; d++) {
    days.push(d);
  }
  days.push(0); // Add Sunday
  return days;
};
const remainingDays = getRemainingDaysOfWeek(dayOfWeek);
const remainingIdealHours = remainingDays.reduce((sum, d) => sum + (schedules[d]?.spanHours || 0), 0);
console.log('Remaining Ideal Hours for remaining days:', remainingIdealHours);
console.log('Remaining Days:', remainingDays);

// Let's filter the lessons
const weeklyLessons = instructorEvents.filter(e => {
  const isStartOk = e.start >= todayMidnight;
  const isEndOk = e.start <= thisWeekEnd;
  const filterCat = !e.isAllDay && !e.categories.includes('Training') && !e.categories.includes('CPD') && !e.summary.toLowerCase().includes('test') && !e.summary.toLowerCase().includes('mock') && !e.categories.includes('Tests') && !isEventNonPaying(e.summary);
  
  if (e.start >= new Date("2026-05-25") && e.start <= thisWeekEnd) {
    console.log(`Event: "${e.summary}" | start: ${e.start.toString()} | isStartOk: ${isStartOk} | isEndOk: ${isEndOk} | filterCat: ${filterCat}`);
  }
  
  return isStartOk && isEndOk && filterCat;
});

const actualHours = weeklyLessons.reduce((acc, curr) => acc + curr.durationMinutes, 0) / 60;
console.log('Actual Hours matched:', actualHours);

const fillPctThisWeek = remainingIdealHours > 0 ? Math.round((actualHours / remainingIdealHours) * 100) : 0;
console.log('Calculated fillPctThisWeek:', fillPctThisWeek);
