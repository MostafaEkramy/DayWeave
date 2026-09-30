/**
 * Formats a Date object or today's date to YYYY-MM-DD in local time.
 */
export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateISO(d: Date): string {
  return getTodayDateString(d);
}

/**
 * Safely parses a YYYY-MM-DD date string into a local Date object.
 */
export function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); // midday avoids timezone midnight shifts
}

/**
 * Formats a date string (YYYY-MM-DD) into full human format:
 * "Wednesday, September 23"
 */
export function formatDateTitle(dateStr: string, locale: string = 'en-US'): string {
  if (!dateStr) return '';
  const date = parseDateString(dateStr);
  const loc = locale === 'ar' ? 'ar-EG' : locale;
  return date.toLocaleDateString(loc, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats a date string into short format: "Wed, Sep 23"
 */
export function formatDateShort(dateStr: string, locale: string = 'en-US'): string {
  if (!dateStr) return '';
  const date = parseDateString(dateStr);
  const loc = locale === 'ar' ? 'ar-EG' : locale;
  return date.toLocaleDateString(loc, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Shifts a YYYY-MM-DD date string by a given number of days (+1 for tomorrow, -1 for yesterday).
 */
export function shiftDate(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  return getTodayDateString(date);
}

/**
 * Checks if a date string is today.
 */
export function isDateToday(dateStr: string): boolean {
  return dateStr === getTodayDateString();
}

export interface WeekDayInfo {
  dateStr: string;
  dayName: string;      // "Mon"
  dayFullName: string;  // "Monday"
  dayNumber: number;    // 23
  monthName: string;    // "Sep"
  isToday: boolean;
  isSelected: boolean;
}

/**
 * Generates the 7 days of the week containing the specified date (starting on Monday).
 */
export function getWeekDates(targetDateStr: string, locale: string = 'en-US'): WeekDayInfo[] {
  const target = parseDateString(targetDateStr);
  
  // Find Monday of this week (0=Sun, 1=Mon, ..., 6=Sat)
  const currentDay = target.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMonday);

  const days: WeekDayInfo[] = [];
  const todayStr = getTodayDateString();
  const loc = locale === 'ar' ? 'ar-EG' : locale;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = getTodayDateString(d);
    
    days.push({
      dateStr,
      dayName: d.toLocaleDateString(loc, { weekday: 'short' }),
      dayFullName: d.toLocaleDateString(loc, { weekday: 'long' }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString(loc, { month: 'short' }),
      isToday: dateStr === todayStr,
      isSelected: dateStr === targetDateStr,
    });
  }

  return days;
}
