import { UserStreak } from '../types/streak';
import { getTodayDateString, shiftDate } from './dateUtils';

/**
 * Updates streak counters when the user completes meaningful daily activity.
 * A "streak day" counts when the user completes at least one task on a calendar day.
 */
export function updateStreakOnDailyActivity(
  streak: UserStreak,
  activityDate: string
): UserStreak {
  const today = getTodayDateString();
  const lastActive = streak.lastActiveDate;

  // Future scheduling does not count toward streak
  if (activityDate > today) {
    return streak;
  }

  // If this is a historical activity from the past (before today and before lastActive),
  // do not regress the streak's lastActiveDate or reset current streak.
  if (activityDate < today && lastActive && activityDate < lastActive) {
    return {
      ...streak,
      totalCompletedActivities: streak.totalCompletedActivities + 1,
    };
  }

  // Already counted today
  if (lastActive === activityDate) {
    return {
      ...streak,
      totalCompletedActivities: streak.totalCompletedActivities + 1,
    };
  }

  const yesterday = shiftDate(today, -1);
  let currentStreakDays = streak.currentStreakDays;

  if (lastActive === yesterday) {
    // Continuous streak!
    currentStreakDays += 1;
  } else if (!lastActive || lastActive < yesterday) {
    // Gap in activity or fresh account — start fresh streak of 1
    currentStreakDays = 1;
  }

  const longestStreakDays = Math.max(streak.longestStreakDays, currentStreakDays);
  // Never regress lastActiveDate to a date older than what's already recorded
  const newLastActiveDate = lastActive && lastActive > activityDate ? lastActive : activityDate;

  return {
    ...streak,
    currentStreakDays,
    longestStreakDays,
    lastActiveDate: newLastActiveDate,
    totalCompletedActivities: streak.totalCompletedActivities + 1,
  };
}
