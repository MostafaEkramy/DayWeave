/**
 * Converts a 24-hour time string ("HH:mm") to total minutes from midnight (0-1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Converts total minutes from midnight to a 24-hour time string ("HH:mm").
 */
export function minutesToTime(totalMinutes: number): string {
  const bounded = Math.max(0, Math.min(1439, Math.round(totalMinutes)));
  const hours = Math.floor(bounded / 60);
  const minutes = bounded % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Formats duration in minutes to human readable form like "1h 30m" or "45m".
 */
export function formatMinutesDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Formats a 24-hour "HH:mm" time to standard 12-hour AM/PM format ("9:30 AM").
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Snaps minute value to nearest 15-minute increment.
 */
export function snapTo15Minutes(minutes: number): number {
  return Math.round(minutes / 15) * 15;
}

/**
 * Calculates end time from start time string and duration in minutes.
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + durationMinutes;
  return minutesToTime(endMin);
}

/**
 * Checks if two time intervals overlap (strictly greater than 0 minute intersection).
 */
export function isOverlapping(startA: number, endA: number, startB: number, endB: number): boolean {
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Gets overlap duration in minutes between two intervals.
 */
export function getOverlapDuration(startA: number, endA: number, startB: number, endB: number): number {
  const overlap = Math.min(endA, endB) - Math.max(startA, startB);
  return Math.max(0, overlap);
}

/**
 * Generates an array of hours for timeline grid (e.g. [7, 8, ..., 22]).
 */
export function getTimelineHours(startHour: number = 7, endHour: number = 22): number[] {
  const hours: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    hours.push(h);
  }
  return hours;
}

/**
 * Gets the current real-world time in total minutes from midnight.
 */
export function getCurrentTimeMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Gets current real-world time as "HH:mm" snapped to nearest increment.
 */
export function getSnappedCurrentTime(stepMinutes: number = 15): string {
  const currentMin = getCurrentTimeMinutes();
  const snapped = Math.round(currentMin / stepMinutes) * stepMinutes;
  return minutesToTime(snapped);
}

/**
 * Shifts a 24-hour time string ("HH:mm") by deltaMinutes (positive or negative),
 * properly wrapping around the 24-hour clock.
 */
export function shiftTime(timeStr: string, deltaMinutes: number): string {
  const mins = timeToMinutes(timeStr);
  const shifted = ((mins + deltaMinutes) % 1440 + 1440) % 1440;
  return minutesToTime(shifted);
}

export type TimeOfDayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export function getTimeOfDayPeriod(hour24: number): TimeOfDayPeriod {
  if (hour24 >= 5 && hour24 < 12) return 'morning';
  if (hour24 >= 12 && hour24 < 17) return 'afternoon';
  if (hour24 >= 17 && hour24 < 21) return 'evening';
  return 'night';
}

export interface FormattedTimeInfo {
  hour24: number;
  minutes: number;
  hour12: number;
  isPM: boolean;
  period: 'AM' | 'PM';
  periodLabel: string; // 'AM' | 'PM' or 'ص' | 'م'
  time12Text: string;  // e.g. "09:00"
  time24Text: string;  // e.g. "09:00"
  fullDisplay: string; // e.g. "09:00 AM" or "09:00 ص"
  timeOfDay: TimeOfDayPeriod;
}

export function formatTimeInfo(timeStr: string, isArabic: boolean = false): FormattedTimeInfo {
  const [hStr, mStr] = (timeStr || '09:00').split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) h = 9;
  h = Math.max(0, Math.min(23, h));

  let m = parseInt(mStr || '00', 10);
  if (isNaN(m)) m = 0;
  m = Math.max(0, Math.min(59, m));

  const isPM = h >= 12;
  const period: 'AM' | 'PM' = isPM ? 'PM' : 'AM';
  const periodLabel = isArabic ? (isPM ? 'م' : 'ص') : period;

  let h12 = h % 12;
  if (h12 === 0) h12 = 12;

  const mPadded = m.toString().padStart(2, '0');
  const h12Padded = h12.toString().padStart(2, '0');
  const h24Padded = h.toString().padStart(2, '0');

  const time12Text = `${h12Padded}:${mPadded}`;
  const time24Text = `${h24Padded}:${mPadded}`;
  const fullDisplay = `${time12Text} ${periodLabel}`;

  return {
    hour24: h,
    minutes: m,
    hour12: h12,
    isPM,
    period,
    periodLabel,
    time12Text,
    time24Text,
    fullDisplay,
    timeOfDay: getTimeOfDayPeriod(h),
  };
}
