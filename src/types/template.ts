import { ActivityCategory, ActivityPriority, EnergyLevel } from './activity';

export interface TemplateActivityItem {
  id: string;
  title: string;
  category: ActivityCategory;
  startTime: string; // relative to day or default start
  durationMinutes: number;
  priority: ActivityPriority;
  energyLevel: EnergyLevel;
  notes?: string;
}

export interface ScheduleTemplate {
  id: string;
  userId?: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  totalPlannedMinutes: number;
  activitiesCount: number;
  activities: TemplateActivityItem[];
  createdAt: string;
}
