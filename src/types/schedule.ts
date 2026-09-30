import { EnergyLevel } from './activity';

export interface TimeWindow {
  startTime: string; // "07:00"
  endTime: string;   // "22:00"
}

export interface ScheduleConflict {
  id: string;
  activityAId: string;
  activityBId: string;
  activityATitle: string;
  activityBTitle: string;
  overlapMinutes: number;
  conflictStartTime: string;
  conflictEndTime: string;
  suggestedResolution?: 'shift_next' | 'swap' | 'shrink';
}

export interface TimeBudget {
  availableMinutes: number;
  plannedMinutes: number;
  freeMinutes: number;
  completedMinutes: number;
  completionPercentage: number;
  isOverBudget: boolean;
  overBudgetMinutes: number;
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  userEnergyLevel: EnergyLevel;
  timeWindow: TimeWindow;
  notes?: string;
}

export interface FreeTimeGap {
  id: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}
