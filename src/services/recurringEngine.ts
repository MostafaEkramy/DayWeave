import { Activity, RecurrenceRule } from '../types/activity';
import { parseDateString, shiftDate, formatDateISO } from '../utils/dateUtils';

/**
 * Generates activity instances for a recurring activity rule within a date window [startDate, endDate].
 */
export function generateRecurringInstances(
  templateActivity: Activity,
  startDateStr: string,
  endDateStr: string
): Activity[] {
  const rule = templateActivity.recurrence;
  if (!rule || rule.type === 'none') {
    return [templateActivity];
  }

  const instances: Activity[] = [];
  let currentDate = parseDateString(startDateStr);
  const targetEnd = parseDateString(endDateStr);
  let count = 0;

  const ruleEnd = rule.endDate ? parseDateString(rule.endDate) : null;
  const maxOccurrences = rule.occurrences || 365;
  const skippedSet = new Set(rule.skippedDates || []);

  while (currentDate <= targetEnd && count < maxOccurrences) {
    if (ruleEnd && currentDate > ruleEnd) {
      break;
    }

    const dateStr = formatDateISO(currentDate);
    const dayOfWeek = currentDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayOfMonth = currentDate.getDate();

    let matchesRule = false;

    switch (rule.type) {
      case 'daily':
        matchesRule = true;
        break;

      case 'weekdays':
        // Monday (1) through Friday (5)
        matchesRule = dayOfWeek >= 1 && dayOfWeek <= 5;
        break;

      case 'weekly':
        // Default to the template activity's original day of week or first in daysOfWeek
        const targetDay = rule.daysOfWeek?.[0] ?? parseDateString(templateActivity.date).getDay();
        matchesRule = dayOfWeek === targetDay;
        break;

      case 'custom':
        if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
          matchesRule = rule.daysOfWeek.includes(dayOfWeek);
        }
        break;

      case 'monthly':
        const targetDOM = rule.dayOfMonth ?? parseDateString(templateActivity.date).getDate();
        matchesRule = dayOfMonth === targetDOM;
        break;
    }

    if (matchesRule && !skippedSet.has(dateStr)) {
      instances.push({
        ...templateActivity,
        id: `${templateActivity.id}-rec-${dateStr}`,
        date: dateStr,
        createdAt: templateActivity.createdAt,
        updatedAt: new Date().toISOString(),
      });
      count++;
    }

    // Step to next day
    currentDate = parseDateString(shiftDate(dateStr, 1));
  }

  return instances;
}

/**
 * Checks if a recurring activity is due on a specific target date string (YYYY-MM-DD).
 */
export function isActivityDueOnDate(activity: Activity, dateStr: string): boolean {
  if (activity.date === dateStr) return true;
  const rule = activity.recurrence;
  if (!rule || rule.type === 'none') return false;

  if (rule.skippedDates?.includes(dateStr)) return false;
  if (rule.endDate && dateStr > rule.endDate) return false;

  const targetDate = parseDateString(dateStr);
  const dayOfWeek = targetDate.getDay();
  const dayOfMonth = targetDate.getDate();

  switch (rule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekly':
      const originalDay = rule.daysOfWeek?.[0] ?? parseDateString(activity.date).getDay();
      return dayOfWeek === originalDay;
    case 'custom':
      return Boolean(rule.daysOfWeek?.includes(dayOfWeek));
    case 'monthly':
      const targetDOM = rule.dayOfMonth ?? parseDateString(activity.date).getDate();
      return dayOfMonth === targetDOM;
    default:
      return false;
  }
}
