import { describe, it, expect } from 'vitest';
import { scheduleDayPlan, dynamicRescheduleRemainingDay } from './schedulerEngine';

describe('schedulerEngine', () => {
  it('places fixed activities at their exact specified start time', () => {
    const result = scheduleDayPlan(
      [
        {
          id: 'fixed-1',
          title: 'Daily Standup',
          category: 'work',
          durationMinutes: 30,
          priority: 'high',
          energyLevel: 'medium',
          isFixedTime: true,
          fixedStartTime: '10:00',
        },
      ],
      {
        date: '2026-09-28',
        availableStartTime: '08:00',
        availableEndTime: '18:00',
        userEnergyLevel: 'high',
        insertBreaks: false,
        breakDurationMinutes: 15,
        preserveBufferPercent: 0,
      }
    );

    expect(result.scheduledActivities).toHaveLength(1);
    expect(result.scheduledActivities[0].startTime).toBe('10:00');
    expect(result.scheduledActivities[0].isFixedTime).toBe(true);
  });

  it('strictly respects deadlines and does not silently place past deadline', () => {
    const result = scheduleDayPlan(
      [
        {
          id: 'task-1',
          title: 'Submit Report',
          category: 'work',
          durationMinutes: 120, // 2 hours
          priority: 'urgent',
          energyLevel: 'high',
          deadlineTime: '09:00', // Only 1 hour available before deadline
        },
      ],
      {
        date: '2026-09-28',
        availableStartTime: '08:00',
        availableEndTime: '18:00',
        userEnergyLevel: 'high',
        insertBreaks: false,
        breakDurationMinutes: 15,
        preserveBufferPercent: 0,
      }
    );

    // Should NOT be scheduled because 120min does not fit between 08:00 and 09:00
    expect(result.unplacedActivities).toHaveLength(1);
    expect(result.unplacedActivities[0].unplacedReason).toContain('before deadline (09:00)');
  });

  it('respects task dependency sequencing (Task B after Task A)', () => {
    const result = scheduleDayPlan(
      [
        {
          id: 'task-a',
          title: 'Design Architecture',
          category: 'work',
          durationMinutes: 60,
          priority: 'high',
          energyLevel: 'high',
        },
        {
          id: 'task-b',
          title: 'Implement Code',
          category: 'work',
          durationMinutes: 60,
          priority: 'high',
          energyLevel: 'high',
          dependsOn: ['task-a'],
        },
      ],
      {
        date: '2026-09-28',
        availableStartTime: '09:00',
        availableEndTime: '17:00',
        userEnergyLevel: 'high',
        insertBreaks: false,
        breakDurationMinutes: 15,
        preserveBufferPercent: 0,
      }
    );

    expect(result.scheduledActivities).toHaveLength(2);
    const actA = result.scheduledActivities.find(a => a.id === 'task-a');
    const actB = result.scheduledActivities.find(a => a.id === 'task-b');
    expect(actA).toBeDefined();
    expect(actB).toBeDefined();
    expect(actA!.startTime).toBe('09:00');
    expect(actB!.startTime).toBe('10:00'); // Immediately after A
  });

  it('inserts rest breaks after 90m of continuous deep work', () => {
    const result = scheduleDayPlan(
      [
        {
          id: 'deep-work',
          title: 'Exam Preparation',
          category: 'study',
          durationMinutes: 120, // 2 hours
          priority: 'urgent',
          energyLevel: 'high',
        },
      ],
      {
        date: '2026-09-28',
        availableStartTime: '08:00',
        availableEndTime: '18:00',
        userEnergyLevel: 'high',
        insertBreaks: true,
        breakDurationMinutes: 15,
        preserveBufferPercent: 0,
      }
    );

    expect(result.scheduledActivities).toHaveLength(2);
    expect(result.scheduledActivities[0].title).toBe('Exam Preparation');
    expect(result.scheduledActivities[1].category).toBe('rest');
    expect(result.scheduledActivities[1].startTime).toBe('10:00');
  });

  it('provides explainable scheduling rationale', () => {
    const result = scheduleDayPlan(
      [
        {
          id: 'task-1',
          title: 'Math Revision',
          category: 'study',
          durationMinutes: 60,
          priority: 'urgent',
          energyLevel: 'high',
          preferredTime: 'morning',
        },
      ],
      {
        date: '2026-09-28',
        availableStartTime: '08:00',
        availableEndTime: '12:00',
        userEnergyLevel: 'high',
        insertBreaks: false,
        breakDurationMinutes: 15,
        preserveBufferPercent: 0,
      }
    );

    expect(result.scheduledActivities[0].schedulingExplanation).toBeDefined();
    expect(result.scheduledActivities[0].schedulingExplanation).toContain('urgent priority');
    expect(result.scheduledActivities[0].schedulingExplanation).toContain('aligned with your high energy');
  });
});
