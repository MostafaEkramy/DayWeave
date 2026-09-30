import { Activity, ActivityPriority, EnergyLevel, PreferredTimeWindow } from '../types/activity';
import { timeToMinutes, minutesToTime, snapTo15Minutes } from '../utils/timeUtils';

export interface PlannerInputItem {
  id: string;
  title: string;
  description?: string;
  category: Activity['category'];
  durationMinutes: number;
  priority: ActivityPriority;
  energyLevel: EnergyLevel;
  preferredTime?: PreferredTimeWindow;
  isFixedTime?: boolean;
  fixedStartTime?: string; // e.g. "13:00"
  deadlineTime?: string;   // e.g. "17:00"
  dependsOn?: string[];    // IDs of tasks that must be completed before this
  notes?: string;
  unplacedReason?: string;
}

export interface PlannerConfig {
  date: string;
  availableStartTime: string; // e.g. "09:00"
  availableEndTime: string;   // e.g. "20:00"
  userEnergyLevel: EnergyLevel;
  insertBreaks: boolean;
  breakDurationMinutes: number; // default 15
  preserveBufferPercent: number; // e.g. 10%
}

export interface PlannerResult {
  scheduledActivities: Activity[];
  unplacedActivities: PlannerInputItem[];
  totalAvailableMinutes: number;
  totalPlannedMinutes: number;
  totalBreakMinutes: number;
  totalBufferMinutes: number;
  freeMinutes: number;
  isOverCapacity: boolean;
  message: string;
}

const PRIORITY_SCORES: Record<ActivityPriority, number> = {
  urgent: 100,
  high: 75,
  medium: 50,
  low: 25,
};

const ENERGY_SCORES: Record<EnergyLevel, number> = {
  high: 30,
  medium: 20,
  low: 10,
};

/**
 * Deterministic constraint-based scheduling engine for "Plan My Day".
 * Supports:
 * - Fixed commitments
 * - Priority & Energy scoring
 * - Strict deadline enforcement
 * - Task dependencies (DAG sequencing)
 * - Buffer preservation
 * - Explainable scheduling metadata
 */
export function scheduleDayPlan(items: PlannerInputItem[], config: PlannerConfig): PlannerResult {
  const windowStartMin = snapTo15Minutes(timeToMinutes(config.availableStartTime));
  const windowEndMin = snapTo15Minutes(timeToMinutes(config.availableEndTime));
  const totalWindowMinutes = Math.max(0, windowEndMin - windowStartMin);

  // Time occupation tracker (15-minute boolean bucket map: windowStartMin to windowEndMin)
  const isSlotOccupied = new Map<number, string>(); // minute -> activity title/id

  const scheduledActivities: Activity[] = [];
  const unplacedActivities: PlannerInputItem[] = [];
  const placedEndTimes = new Map<string, number>(); // activityId -> endMinute

  // 1. Separate fixed-time activities vs flexible activities
  const fixedItems: PlannerInputItem[] = [];
  const flexibleItems: PlannerInputItem[] = [];

  for (const item of items) {
    if (item.isFixedTime && item.fixedStartTime) {
      fixedItems.push(item);
    } else {
      flexibleItems.push(item);
    }
  }

  // 2. Place all fixed-time activities first
  for (const item of fixedItems) {
    const startMin = snapTo15Minutes(timeToMinutes(item.fixedStartTime!));
    const duration = snapTo15Minutes(item.durationMinutes);
    const endMin = startMin + duration;

    // Mark occupied
    for (let m = startMin; m < endMin; m += 15) {
      isSlotOccupied.set(m, item.id);
    }

    placedEndTimes.set(item.id, endMin);

    const explanation = `Fixed commitment locked at ${item.fixedStartTime}`;

    scheduledActivities.push({
      id: item.id || `act-plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: config.date,
      title: item.title,
      description: item.description,
      category: item.category,
      startTime: minutesToTime(startMin),
      durationMinutes: duration,
      priority: item.priority,
      energyLevel: item.energyLevel,
      preferredTime: item.preferredTime,
      deadline: item.deadlineTime,
      dependsOn: item.dependsOn,
      isCompleted: false,
      isFixedTime: true,
      notes: item.notes,
      schedulingExplanation: explanation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Sort flexible items using deterministic topological priority + energy scoring
  // Handle dependencies: items with prerequisites cannot go before prerequisites
  flexibleItems.sort((a, b) => {
    // If B depends on A, A must come before B
    if (b.dependsOn?.includes(a.id)) return -1;
    if (a.dependsOn?.includes(b.id)) return 1;

    let scoreA = PRIORITY_SCORES[a.priority];
    let scoreB = PRIORITY_SCORES[b.priority];

    // Energy alignment bonus: if user has high energy, prioritize high energy tasks
    if (config.userEnergyLevel === 'high') {
      scoreA += ENERGY_SCORES[a.energyLevel] * 1.5;
      scoreB += ENERGY_SCORES[b.energyLevel] * 1.5;
    } else if (config.userEnergyLevel === 'low') {
      if (a.energyLevel === 'low') scoreA += 20;
      if (b.energyLevel === 'low') scoreB += 20;
    }

    // Preferred time window weighting (morning vs evening)
    if (a.preferredTime === 'morning') scoreA += 15;
    if (b.preferredTime === 'morning') scoreB += 15;

    // Deadline urgency weighting (closer deadline gets higher score)
    if (a.deadlineTime) scoreA += 20;
    if (b.deadlineTime) scoreB += 20;

    return scoreB - scoreA;
  });

  // Calculate buffer reserve
  const bufferPercent = Math.min(30, Math.max(0, config.preserveBufferPercent || 0));
  const reservedBufferMinutes = Math.round(totalWindowMinutes * (bufferPercent / 100));
  const effectiveWindowEnd = Math.max(windowStartMin + 60, windowEndMin - reservedBufferMinutes);

  // 4. Helper to find earliest free continuous slot of given duration
  function findFreeSlot(requiredMinutes: number, preferredStart: number = windowStartMin, maxEnd: number = windowEndMin): number | null {
    let candidate = preferredStart;
    
    while (candidate + requiredMinutes <= maxEnd) {
      let isAvailable = true;
      for (let m = candidate; m < candidate + requiredMinutes; m += 15) {
        if (isSlotOccupied.has(m)) {
          isAvailable = false;
          // Jump candidate past the occupied block
          candidate = m + 15;
          break;
        }
      }

      if (isAvailable) {
        return candidate;
      }
    }

    return null;
  }

  // 5. Place flexible activities
  let continuousWorkMinutes = 0;
  let totalBreakMinutes = 0;

  for (const item of flexibleItems) {
    const duration = snapTo15Minutes(item.durationMinutes);

    // Determine earliest allowed start based on dependencies
    let earliestDependencyEnd = windowStartMin;
    if (item.dependsOn && item.dependsOn.length > 0) {
      for (const depId of item.dependsOn) {
        const depEnd = placedEndTimes.get(depId);
        if (depEnd !== undefined) {
          earliestDependencyEnd = Math.max(earliestDependencyEnd, depEnd);
        }
      }
    }

    // Determine target start search region based on preferred time
    let searchStart = Math.max(windowStartMin, earliestDependencyEnd);
    if (item.preferredTime === 'afternoon') {
      searchStart = Math.max(searchStart, 12 * 60); // 12:00
    } else if (item.preferredTime === 'evening') {
      searchStart = Math.max(searchStart, 17 * 60); // 17:00
    }

    // Strict Deadline Handling
    let deadlineLimit = effectiveWindowEnd;
    const hasDeadline = Boolean(item.deadlineTime);
    if (hasDeadline) {
      deadlineLimit = Math.min(windowEndMin, timeToMinutes(item.deadlineTime!));
    }

    // Attempt 1: search within preferred range before deadline
    let placedStart = findFreeSlot(duration, searchStart, deadlineLimit);

    // Attempt 2: if preferred window is full, search from earliest dependency start up to deadline
    if (placedStart === null && searchStart > earliestDependencyEnd) {
      placedStart = findFreeSlot(duration, earliestDependencyEnd, deadlineLimit);
    }

    // Attempt 3: if still not placed and buffer was reserved, try into buffer before deadline
    if (placedStart === null && effectiveWindowEnd < windowEndMin) {
      placedStart = findFreeSlot(duration, earliestDependencyEnd, deadlineLimit);
    }

    if (placedStart !== null) {
      // Mark occupied
      for (let m = placedStart; m < placedStart + duration; m += 15) {
        isSlotOccupied.set(m, item.id);
      }

      const endMin = placedStart + duration;
      placedEndTimes.set(item.id, endMin);

      // Construct explainable scheduling metadata
      const reasons: string[] = [];
      if (item.priority === 'urgent' || item.priority === 'high') {
        reasons.push(`${item.priority} priority`);
      }
      if (item.energyLevel === config.userEnergyLevel) {
        reasons.push(`aligned with your ${config.userEnergyLevel} energy`);
      }
      if (item.preferredTime) {
        reasons.push(`matches ${item.preferredTime} preference`);
      }
      if (hasDeadline) {
        reasons.push(`before deadline ${item.deadlineTime}`);
      }
      if (item.dependsOn?.length) {
        reasons.push(`scheduled after prerequisite tasks`);
      }
      if (reasons.length === 0) {
        reasons.push('optimal available time window');
      }

      const explanation = `${minutesToTime(placedStart)} selected: ${reasons.join(', ')}.`;

      scheduledActivities.push({
        id: item.id || `act-plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: config.date,
        title: item.title,
        description: item.description,
        category: item.category,
        startTime: minutesToTime(placedStart),
        durationMinutes: duration,
        priority: item.priority,
        energyLevel: item.energyLevel,
        preferredTime: item.preferredTime,
        deadline: item.deadlineTime,
        dependsOn: item.dependsOn,
        isCompleted: false,
        isFixedTime: false,
        notes: item.notes,
        schedulingExplanation: explanation,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Break insertion rule: if continuous focus >= 90m and user opted for breaks
      continuousWorkMinutes += duration;
      if (config.insertBreaks && continuousWorkMinutes >= 90) {
        const breakDuration = config.breakDurationMinutes || 15;
        const breakStart = placedStart + duration;

        // Try to insert a rest break right after
        const canInsertBreak = findFreeSlot(breakDuration, breakStart, breakStart + breakDuration) !== null;
        if (canInsertBreak && breakStart + breakDuration <= windowEndMin) {
          for (let bm = breakStart; bm < breakStart + breakDuration; bm += 15) {
            isSlotOccupied.set(bm, 'break');
          }

          scheduledActivities.push({
            id: `break-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: config.date,
            title: 'Rest & Recharge Break',
            category: 'rest',
            startTime: minutesToTime(breakStart),
            durationMinutes: breakDuration,
            priority: 'low',
            energyLevel: 'low',
            isCompleted: false,
            isFixedTime: false,
            schedulingExplanation: 'Inserted after 90m of continuous deep work to maintain focus.',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          totalBreakMinutes += breakDuration;
          continuousWorkMinutes = 0; // reset
        }
      }
    } else {
      // Could not place task within constraints
      const reason = hasDeadline 
        ? `No continuous ${duration}m slot available before deadline (${item.deadlineTime})`
        : `No continuous ${duration}m slot available in the ${config.availableStartTime} - ${config.availableEndTime} window`;
      unplacedActivities.push({ ...item, unplacedReason: reason });
    }
  }

  // Sort final scheduled activities chronologically
  scheduledActivities.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  const totalPlannedMinutes = scheduledActivities.reduce((acc, a) => acc + a.durationMinutes, 0);
  const freeMinutes = Math.max(0, totalWindowMinutes - totalPlannedMinutes);
  const isOverCapacity = unplacedActivities.length > 0;

  let message = 'Your day is ready.';
  if (isOverCapacity) {
    message = `Planned ${scheduledActivities.length} activities. ${unplacedActivities.length} task(s) could not fit within constraints (see reasons below).`;
  } else {
    message = `Organized ${scheduledActivities.length} activities smoothly with ${Math.round(freeMinutes / 60)}h ${freeMinutes % 60}m free buffer time.`;
  }

  return {
    scheduledActivities,
    unplacedActivities,
    totalAvailableMinutes: totalWindowMinutes,
    totalPlannedMinutes,
    totalBreakMinutes,
    totalBufferMinutes: reservedBufferMinutes,
    freeMinutes,
    isOverCapacity,
    message,
  };
}

/**
 * Dynamic rescheduling helper: takes existing activities and reschedules remaining uncompleted items
 * from current time forward without disrupting fixed commitments.
 */
export function dynamicRescheduleRemainingDay(
  activities: Activity[],
  currentTimeStr: string,
  userEnergy: EnergyLevel
): Activity[] {
  const currentMin = snapTo15Minutes(timeToMinutes(currentTimeStr));
  const completedOrPast: Activity[] = [];
  const flexibleToReschedule: PlannerInputItem[] = [];
  const fixedFuture: Activity[] = [];

  for (const act of activities) {
    const startMin = timeToMinutes(act.startTime);
    if (act.isCompleted || startMin < currentMin) {
      completedOrPast.push(act);
    } else if (act.isFixedTime) {
      fixedFuture.push(act);
    } else {
      flexibleToReschedule.push({
        id: act.id,
        title: act.title,
        description: act.description,
        category: act.category,
        durationMinutes: act.durationMinutes,
        priority: act.priority,
        energyLevel: act.energyLevel,
        preferredTime: act.preferredTime,
        deadlineTime: act.deadline,
        dependsOn: act.dependsOn,
        notes: act.notes,
      });
    }
  }

  if (flexibleToReschedule.length === 0) {
    return activities;
  }

  const result = scheduleDayPlan(
    [
      ...fixedFuture.map(f => ({
        id: f.id,
        title: f.title,
        category: f.category,
        durationMinutes: f.durationMinutes,
        priority: f.priority,
        energyLevel: f.energyLevel,
        isFixedTime: true,
        fixedStartTime: f.startTime,
        notes: f.notes,
      })),
      ...flexibleToReschedule,
    ],
    {
      date: activities[0]?.date || new Date().toISOString().split('T')[0],
      availableStartTime: currentTimeStr,
      availableEndTime: '23:00',
      userEnergyLevel: userEnergy,
      insertBreaks: true,
      breakDurationMinutes: 15,
      preserveBufferPercent: 5,
    }
  );

  return [...completedOrPast, ...result.scheduledActivities].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
}
