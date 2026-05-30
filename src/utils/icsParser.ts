export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  durationMinutes: number;
  description: string;
  location: string;
  isAllDay: boolean;
  categories: string[];
}

/**
 * Unfolds folded lines in an ICS file.
 * According to RFC 5545, lines longer than 75 octets should be folded 
 * by inserting a CRLF followed by a single white space character.
 */
function unfoldLines(rawText: string): string[] {
  const lines = rawText.split(/\r?\n/);
  const unfolded: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line === '') continue;
    
    // While the next line starts with a space or tab, append it (excluding the space/tab)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].substring(1);
    }
    unfolded.push(line);
  }
  
  return unfolded;
}

/**
 * Unescapes standard ICS string escapes (\n, \,, \;, \\)
 */
function unescapeString(val: string): string {
  if (!val) return '';
  return val
    .replace(/\\n/gi, '\n')
    .replace(/\\r/gi, '\r')
    .replace(/\\,/gi, ',')
    .replace(/\\;/gi, ';')
    .replace(/\\\\/gi, '\\');
}

/**
 * Parses iCalendar date strings into JavaScript Date objects.
 * Handles formats like:
 * - 20260528 (All-day date)
 * - 20260528T121703 (Floating date-time)
 * - 20260528T121703Z (UTC date-time)
 */
function parseIcalDate(value: string): { date: Date; isAllDay: boolean } {
  const cleanValue = value.trim();
  const isDateOnly = /^\d{8}$/.test(cleanValue);
  
  if (isDateOnly) {
    const year = parseInt(cleanValue.substring(0, 4), 10);
    const month = parseInt(cleanValue.substring(4, 6), 10) - 1; // 0-based month
    const day = parseInt(cleanValue.substring(6, 8), 10);
    // All day events start at midnight local time
    return { date: new Date(year, month, day), isAllDay: true };
  }

  // Check for date-time format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
  const match = cleanValue.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (match) {
    const [, yearStr, monthStr, dayStr, hourStr, minStr, secStr, isUtc] = match;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const min = parseInt(minStr, 10);
    const sec = parseInt(secStr, 10);

    if (isUtc) {
      return { date: new Date(Date.UTC(year, month, day, hour, min, sec)), isAllDay: false };
    } else {
      // Floating time: treat as local time in user's browser
      return { date: new Date(year, month, day, hour, min, sec), isAllDay: false };
    }
  }

  // Fallback to default parser if format is unexpected
  const parsedFallback = new Date(cleanValue);
  return { 
    date: isNaN(parsedFallback.getTime()) ? new Date() : parsedFallback, 
    isAllDay: false 
  };
}

/**
 * Main parser that translates raw ICS file content into structured objects.
 */
export function parseICS(icsText: string): CalendarEvent[] {
  const lines = unfoldLines(icsText);
  const events: CalendarEvent[] = [];
  const seenIds = new Set<string>();
  
  let currentEvent: Partial<CalendarEvent> | null = null;
  let inVevent = false;

  for (const line of lines) {
    // Split on the first colon to separate key and value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const rawKey = line.substring(0, colonIndex);
    const rawValue = line.substring(colonIndex + 1);

    // Keys can contain parameters, e.g. "DTSTART;TZID=America/New_York"
    const semiIndex = rawKey.indexOf(';');
    const key = (semiIndex !== -1 ? rawKey.substring(0, semiIndex) : rawKey).toUpperCase().trim();
    
    if (key === 'BEGIN' && rawValue.toUpperCase().trim() === 'VEVENT') {
      currentEvent = {
        id: Math.random().toString(36).substring(2, 11), // Default fallback ID
        summary: 'Untitled Event',
        description: '',
        location: '',
        categories: [],
        isAllDay: false,
      };
      inVevent = true;
      continue;
    }

    if (key === 'END' && rawValue.toUpperCase().trim() === 'VEVENT') {
      if (currentEvent && inVevent) {
        // Validate dates and calculate duration
        const start = currentEvent.start || new Date();
        let end = currentEvent.end;

        // If end date is missing, default it based on start date
        if (!end) {
          if (currentEvent.isAllDay) {
            end = new Date(start);
            end.setDate(end.getDate() + 1); // 1 day duration for all day events
          } else {
            end = new Date(start.getTime() + 60 * 60 * 1000); // Default 1 hour
          }
        }

        // Calculate duration in minutes
        const diffMs = end.getTime() - start.getTime();
        const durationMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

        const baseId = currentEvent.id || Math.random().toString(36).substring(2, 11);
        let eventId = baseId;
        let counter = 1;
        while (seenIds.has(eventId)) {
          eventId = `${baseId}-${counter}`;
          counter++;
        }
        seenIds.add(eventId);

        events.push({
          id: eventId,
          summary: currentEvent.summary || 'Untitled Event',
          start,
          end,
          durationMinutes,
          description: currentEvent.description || '',
          location: currentEvent.location || '',
          isAllDay: !!currentEvent.isAllDay,
          categories: currentEvent.categories || [],
        });
      }
      currentEvent = null;
      inVevent = false;
      continue;
    }

    // Process keys inside VEVENT block
    if (inVevent && currentEvent) {
      switch (key) {
        case 'UID':
          currentEvent.id = rawValue.trim();
          break;
        case 'SUMMARY':
          currentEvent.summary = unescapeString(rawValue);
          break;
        case 'DESCRIPTION':
          currentEvent.description = unescapeString(rawValue);
          break;
        case 'LOCATION':
          currentEvent.location = unescapeString(rawValue);
          break;
        case 'CATEGORIES':
          currentEvent.categories = rawValue.split(',').map(c => unescapeString(c).trim()).filter(Boolean);
          break;
        case 'DTSTART': {
          const { date, isAllDay } = parseIcalDate(rawValue);
          currentEvent.start = date;
          currentEvent.isAllDay = isAllDay;
          break;
        }
        case 'DTEND': {
          const { date } = parseIcalDate(rawValue);
          currentEvent.end = date;
          break;
        }
        default:
          break;
      }
    }
  }

  // Sort events chronologically by start date
  return events.sort((a, b) => a.start.getTime() - b.start.getTime());
}
