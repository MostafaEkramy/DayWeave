import { describe, it, expect } from 'vitest';
import { generateRecurringInstances, isActivityDueOnDate } from './recurringEngine';
import { Activity } from '../types/activity';

describe('recurringEngine', () => {
  const recurringActivity: Activity = {
    id: 'gym-1',
    date: '2026-09-01',
    title: 'Gym Workout',
    category: 'health',
    startTime: '19:00',
    durationMinutes: 60,
    priority: 'high',
    energyLevel: 'high',
    isCompleted: false,
    isFixedTime: true,
    recurrence: {
      type: 'custom',
      daysOfWeek: [0, 2, 4], // Sun (0), Tue (2), Thu (4)
    },
    createdAt: '',
    updatedAt: '',
  };

  it('correctly identifies due dates for custom days (Sunday, Tuesday, Thursday)', () => {
    // 2026-09-27 is Sunday (0), 2026-09-28 is Monday (1), 2026-09-29 is Tuesday (2)
    expect(isActivityDueOnDate(recurringActivity, '2026-09-27')).toBe(true); // Sunday
    expect(isActivityDueOnDate(recurringActivity, '2026-09-28')).toBe(false); // Monday
    expect(isActivityDueOnDate(recurringActivity, '2026-09-29')).toBe(true); // Tuesday
  });

  it('handles weekdays recurrence', () => {
    const weekdayAct: Activity = {
      ...recurringActivity,
      recurrence: { type: 'weekdays' },
    };

    expect(isActivityDueOnDate(weekdayAct, '2026-09-28')).toBe(true); // Mon
    expect(isActivityDueOnDate(weekdayAct, '2026-09-27')).toBe(false); // Sun
  });

  it('generates instances within a date range', () => {
    const instances = generateRecurringInstances(recurringActivity, '2026-09-20', '2026-09-27');
    expect(instances.length).toBeGreaterThanOrEqual(3);
    expect(instances.every(i => i.title === 'Gym Workout')).toBe(true);
  });
});
