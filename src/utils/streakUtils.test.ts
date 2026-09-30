import { describe, it, expect } from 'vitest';
import { updateStreakOnDailyActivity } from './streakUtils';
import { UserStreak } from '../types/streak';
import { getTodayDateString, shiftDate } from './dateUtils';

describe('streakUtils', () => {
  const baseStreak: UserStreak = {
    currentStreakDays: 1,
    longestStreakDays: 5,
    totalCompletedActivities: 10,
    totalFocusSessions: 4,
    totalFocusMinutes: 120,
    lastActiveDate: shiftDate(getTodayDateString(), -1), // yesterday
    achievements: [],
  };

  it('increments streak when active today after yesterday', () => {
    const today = getTodayDateString();
    const updated = updateStreakOnDailyActivity(baseStreak, today);

    expect(updated.currentStreakDays).toBe(2);
    expect(updated.lastActiveDate).toBe(today);
    expect(updated.totalCompletedActivities).toBe(11);
  });

  it('does not double-count streak for multiple activities on the same day', () => {
    const today = getTodayDateString();
    const streakToday: UserStreak = { ...baseStreak, lastActiveDate: today, currentStreakDays: 2 };
    const updated = updateStreakOnDailyActivity(streakToday, today);

    expect(updated.currentStreakDays).toBe(2);
    expect(updated.totalCompletedActivities).toBe(11);
  });

  it('does not regress lastActiveDate when logging historical activity from 3 days ago', () => {
    const today = getTodayDateString();
    const threeDaysAgo = shiftDate(today, -3);
    const streakToday: UserStreak = { ...baseStreak, lastActiveDate: today, currentStreakDays: 5 };

    const updated = updateStreakOnDailyActivity(streakToday, threeDaysAgo);

    expect(updated.currentStreakDays).toBe(5); // Streak NOT broken
    expect(updated.lastActiveDate).toBe(today); // Date did not regress
    expect(updated.totalCompletedActivities).toBe(11);
  });
});
