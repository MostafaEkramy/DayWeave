import { ActivityCategory } from './activity';

export interface CategoryBreakdownItem {
  category: ActivityCategory;
  minutes: number;
  percentage: number;
}

export interface DailyReview {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  plannedMinutes: number;
  completedMinutes: number;
  movedMinutes: number;
  skippedMinutes: number;
  focusMinutes: number;
  completionRate: number; // 0-100
  energyAlignmentScore: number; // 0-100 rating how well activities matched user's energy
  categoryBreakdown: CategoryBreakdownItem[];
  reflectionNote?: string;
  mood?: 'productive' | 'steady' | 'tired' | 'overwhelmed';
  createdAt: string;
}
