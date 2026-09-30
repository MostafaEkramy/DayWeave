import { Activity } from '../types/activity';
import { ScheduleConflict } from '../types/schedule';
import { timeToMinutes, minutesToTime, isOverlapping, getOverlapDuration, calculateEndTime } from '../utils/timeUtils';

/**
 * Scans a list of activities for a given day and identifies any overlapping time blocks.
 */
export function detectConflicts(activities: Activity[]): ScheduleConflict[] {
  // Only look at active (non-completed or completed) activities on this day
  const sorted = [...activities].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  const conflicts: ScheduleConflict[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const actA = sorted[i];
    const startA = timeToMinutes(actA.startTime);
    const endA = startA + actA.durationMinutes;

    for (let j = i + 1; j < sorted.length; j++) {
      const actB = sorted[j];
      const startB = timeToMinutes(actB.startTime);
      const endB = startB + actB.durationMinutes;

      // If B starts after or at A's end, no more overlaps with A (since list is sorted)
      if (startB >= endA) {
        break;
      }

      if (isOverlapping(startA, endA, startB, endB)) {
        const overlap = getOverlapDuration(startA, endA, startB, endB);
        const conflictStart = Math.max(startA, startB);
        const conflictEnd = Math.min(endA, endB);

        conflicts.push({
          id: `conflict-${actA.id}-${actB.id}`,
          activityAId: actA.id,
          activityBId: actB.id,
          activityATitle: actA.title,
          activityBTitle: actB.title,
          overlapMinutes: overlap,
          conflictStartTime: minutesToTime(conflictStart),
          conflictEndTime: minutesToTime(conflictEnd),
          suggestedResolution: 'shift_next',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Resolves a specific conflict by shifting the flexible activity to start right when the prior one finishes.
 */
export function resolveSpecificConflict(activities: Activity[], conflict: ScheduleConflict): Activity[] {
  const result = [...activities];
  const indexA = result.findIndex(a => a.id === conflict.activityAId);
  const indexB = result.findIndex(a => a.id === conflict.activityBId);

  if (indexA === -1 || indexB === -1) return activities;

  const actA = result[indexA];
  const actB = result[indexB];

  // If actA is fixed and actB is not, or actA starts earlier, shift actB to after actA
  const endA = timeToMinutes(actA.startTime) + actA.durationMinutes;
  
  // Update actB's start time
  result[indexB] = {
    ...actB,
    startTime: minutesToTime(endA),
    updatedAt: new Date().toISOString(),
  };

  return result;
}

/**
 * Automatically cascades and resolves all overlapping activities while respecting fixed-time slots.
 */
export function autoResolveAllConflicts(activities: Activity[]): Activity[] {
  let resolved = [...activities].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  let hasConflicts = true;
  let iterations = 0;

  while (hasConflicts && iterations < 15) {
    iterations++;
    const conflicts = detectConflicts(resolved);
    if (conflicts.length === 0) {
      hasConflicts = false;
      break;
    }

    const firstConflict = conflicts[0];
    const actAIndex = resolved.findIndex(a => a.id === firstConflict.activityAId);
    const actBIndex = resolved.findIndex(a => a.id === firstConflict.activityBId);

    if (actAIndex === -1 || actBIndex === -1) break;

    const actA = resolved[actAIndex];
    const actB = resolved[actBIndex];

    const targetIndex = actB.isFixedTime && !actA.isFixedTime ? actAIndex : actBIndex;
    const anchorIndex = targetIndex === actBIndex ? actAIndex : actBIndex;

    const anchorEnd = timeToMinutes(resolved[anchorIndex].startTime) + resolved[anchorIndex].durationMinutes;

    resolved[targetIndex] = {
      ...resolved[targetIndex],
      startTime: minutesToTime(anchorEnd),
      updatedAt: new Date().toISOString(),
    };

    // Re-sort after move
    resolved.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  return resolved;
}
