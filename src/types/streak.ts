export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress: number; // 0 to 100
  targetCount: number;
  currentCount: number;
}

export interface UserStreak {
  currentStreakDays: number;
  longestStreakDays: number;
  totalCompletedActivities: number;
  totalFocusSessions: number;
  totalFocusMinutes: number;
  lastActiveDate: string; // YYYY-MM-DD
  achievements: Achievement[];
}
