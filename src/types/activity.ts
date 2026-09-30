export type ActivityCategory = 
  | 'study'
  | 'work'
  | 'health'
  | 'personal'
  | 'social'
  | 'entertainment'
  | 'rest';

export type ActivityPriority = 'low' | 'medium' | 'high' | 'urgent';

export type EnergyLevel = 'low' | 'medium' | 'high';

export type PreferredTimeWindow = 'morning' | 'afternoon' | 'evening' | 'night' | 'specific';

export interface RecurrenceRule {
  type: 'none' | 'daily' | 'weekdays' | 'weekly' | 'custom' | 'monthly';
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayOfMonth?: number; // 1-31 for monthly
  endDate?: string; // YYYY-MM-DD
  occurrences?: number; // max count
  skippedDates?: string[]; // YYYY-MM-DD
}

export interface Activity {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  category: ActivityCategory;
  startTime: string; // HH:mm (24-hour)
  durationMinutes: number; // e.g. 60, 90, 120
  priority: ActivityPriority;
  energyLevel: EnergyLevel;
  preferredTime?: PreferredTimeWindow;
  deadline?: string; // e.g. "17:00" or ISO string
  location?: string;
  notes?: string;
  color?: string;
  isCompleted: boolean;
  completedAt?: string;
  isFixedTime: boolean; // if true, smart planner preserves exact slot
  recurrence?: RecurrenceRule;
  dependsOn?: string[]; // IDs of prerequisite activities
  isBacklog?: boolean; // if true, unscheduled task in backlog
  schedulingExplanation?: string; // explainable scheduling explanation
  focusMinutesLogged?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryMetadata {
  id: ActivityCategory;
  label: string;
  icon: string;
  accentColor: string;
  lightBg: string;
  lightBorder: string;
  darkBg: string;
  darkBorder: string;
}

export const CATEGORY_DEFINITIONS: Record<ActivityCategory, CategoryMetadata> = {
  study: {
    id: 'study',
    label: 'Study',
    icon: 'GraduationCap',
    accentColor: '#6366F1', // Indigo
    lightBg: 'rgba(99, 102, 241, 0.08)',
    lightBorder: 'rgba(99, 102, 241, 0.25)',
    darkBg: 'rgba(99, 102, 241, 0.15)',
    darkBorder: 'rgba(99, 102, 241, 0.35)',
  },
  work: {
    id: 'work',
    label: 'Work',
    icon: 'Briefcase',
    accentColor: '#3B82F6', // Blue
    lightBg: 'rgba(59, 130, 246, 0.08)',
    lightBorder: 'rgba(59, 130, 246, 0.25)',
    darkBg: 'rgba(59, 130, 246, 0.15)',
    darkBorder: 'rgba(59, 130, 246, 0.35)',
  },
  health: {
    id: 'health',
    label: 'Health',
    icon: 'HeartPulse',
    accentColor: '#10B981', // Emerald
    lightBg: 'rgba(16, 185, 129, 0.08)',
    lightBorder: 'rgba(16, 185, 129, 0.25)',
    darkBg: 'rgba(16, 185, 129, 0.15)',
    darkBorder: 'rgba(16, 185, 129, 0.35)',
  },
  personal: {
    id: 'personal',
    label: 'Personal',
    icon: 'UserCheck',
    accentColor: '#F59E0B', // Amber
    lightBg: 'rgba(245, 158, 11, 0.08)',
    lightBorder: 'rgba(245, 158, 11, 0.25)',
    darkBg: 'rgba(245, 158, 11, 0.15)',
    darkBorder: 'rgba(245, 158, 11, 0.35)',
  },
  social: {
    id: 'social',
    label: 'Social',
    icon: 'Users',
    accentColor: '#EC4899', // Pink
    lightBg: 'rgba(236, 72, 153, 0.08)',
    lightBorder: 'rgba(236, 72, 153, 0.25)',
    darkBg: 'rgba(236, 72, 153, 0.15)',
    darkBorder: 'rgba(236, 72, 153, 0.35)',
  },
  entertainment: {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'Film',
    accentColor: '#8B5CF6', // Purple
    lightBg: 'rgba(139, 92, 246, 0.08)',
    lightBorder: 'rgba(139, 92, 246, 0.25)',
    darkBg: 'rgba(139, 92, 246, 0.15)',
    darkBorder: 'rgba(139, 92, 246, 0.35)',
  },
  rest: {
    id: 'rest',
    label: 'Rest',
    icon: 'Coffee',
    accentColor: '#14B8A6', // Teal
    lightBg: 'rgba(20, 184, 166, 0.08)',
    lightBorder: 'rgba(20, 184, 166, 0.25)',
    darkBg: 'rgba(20, 184, 166, 0.15)',
    darkBorder: 'rgba(20, 184, 166, 0.35)',
  },
};
