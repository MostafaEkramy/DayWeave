import { Activity, ActivityCategory, EnergyLevel } from '../types/activity';
import { timeToMinutes } from '../utils/timeUtils';

export type Chronotype = 'morning_lark' | 'balanced' | 'night_owl';

export interface UserEnergyProfile {
  chronotype: Chronotype;
  morningPeakTime: string;    // e.g. "09:00"
  afternoonDipTime: string;   // e.g. "14:00"
  eveningRecoveryTime: string;// e.g. "18:00"
}

export const DEFAULT_ENERGY_PROFILE: UserEnergyProfile = {
  chronotype: 'balanced',
  morningPeakTime: '09:30',
  afternoonDipTime: '14:00',
  eveningRecoveryTime: '18:00',
};

export interface EnergyAdvice {
  level: 'info' | 'warning' | 'success';
  title: string;
  message: string;
  recommendedAction?: string;
  suggestedTasks?: string[];
}

/**
 * Predicts the user's expected energy level at a given time string (HH:mm)
 * based on their customized chronotype / energy curve profile.
 */
export function getEnergyAtTime(
  timeStr: string,
  profile: UserEnergyProfile = DEFAULT_ENERGY_PROFILE
): EnergyLevel {
  const mins = timeToMinutes(timeStr);

  // Deep night / pre-dawn
  if (mins < 6 * 60 || mins >= 23 * 60) {
    return profile.chronotype === 'night_owl' && mins >= 21 * 60 ? 'medium' : 'low';
  }

  if (profile.chronotype === 'morning_lark') {
    if (mins >= 7 * 60 && mins <= 12 * 60) return 'high';
    if (mins > 12 * 60 && mins <= 15 * 60) return 'low';
    if (mins > 15 * 60 && mins <= 19 * 60) return 'medium';
    return 'low';
  }

  if (profile.chronotype === 'night_owl') {
    if (mins >= 8 * 60 && mins <= 11 * 60) return 'low';
    if (mins > 11 * 60 && mins <= 16 * 60) return 'medium';
    if (mins > 16 * 60 && mins <= 22 * 60) return 'high';
    return 'medium';
  }

  // Balanced default profile
  // Morning peak: 8:30 - 12:30
  if (mins >= 8.5 * 60 && mins <= 12.5 * 60) return 'high';
  // Afternoon dip: 13:30 - 15:30
  if (mins > 13.5 * 60 && mins <= 15.5 * 60) return 'low';
  // Evening recovery: 17:00 - 20:00
  if (mins >= 17 * 60 && mins <= 20 * 60) return 'medium';

  return 'medium';
}

/**
 * Deterministically suggests an energy level based on category and title keywords.
 */
export function suggestEnergyForActivity(category: ActivityCategory, title: string = ''): EnergyLevel {
  const t = title.toLowerCase();

  if (
    t.includes('code') || 
    t.includes('program') || 
    t.includes('architect') || 
    t.includes('math') || 
    t.includes('exam') || 
    t.includes('heavy') || 
    t.includes('sprint') ||
    t.includes('strategy') ||
    t.includes('writing')
  ) {
    return 'high';
  }

  if (
    t.includes('relax') || 
    t.includes('coffee') || 
    t.includes('walk') || 
    t.includes('errand') || 
    t.includes('grocer') || 
    t.includes('clean') || 
    t.includes('chill') ||
    t.includes('meditat') ||
    t.includes('lunch')
  ) {
    return 'low';
  }

  switch (category) {
    case 'study':
    case 'work':
      return 'high';
    case 'health':
      return 'high';
    case 'social':
    case 'personal':
      return 'medium';
    case 'entertainment':
    case 'rest':
      return 'low';
    default:
      return 'medium';
  }
}

/**
 * Analyzes today's schedule against current user energy and returns actionable advice.
 */
export function analyzeEnergyAlignment(
  currentEnergy: EnergyLevel,
  activities: Activity[],
  profile: UserEnergyProfile = DEFAULT_ENERGY_PROFILE
): EnergyAdvice {
  if (activities.length === 0) {
    return {
      level: 'info',
      title: 'No Activities Scheduled',
      message: 'Add activities or use "Plan My Day" to map out your timeline.',
    };
  }

  const highEnergyCount = activities.filter(a => a.energyLevel === 'high' && !a.isCompleted).length;

  if (currentEnergy === 'low') {
    if (highEnergyCount > 1) {
      return {
        level: 'warning',
        title: 'Energy Deficit Warning',
        message: `You currently have low energy, but ${highEnergyCount} demanding high-energy tasks are scheduled. Consider rescheduling heavy blocks to your peak window (${profile.morningPeakTime}) or inserting breaks.`,
        recommendedAction: 'Schedule a rest break or swap to lighter tasks',
      };
    }
    return {
      level: 'info',
      title: 'Pacing for Low Energy',
      message: 'Your schedule aligns well with gentle tasks. Focus on admin, organizing, or light review.',
    };
  }

  if (currentEnergy === 'high') {
    if (highEnergyCount === 0 && activities.length > 2) {
      return {
        level: 'info',
        title: 'High Focus Available',
        message: 'You have peak energy! Tackle your hardest study, coding, or high-priority project tasks now.',
        recommendedAction: 'Tackle a deep work milestone',
      };
    }
    return {
      level: 'success',
      title: 'Optimal Peak Focus',
      message: 'Your high energy is matched with demanding priorities. Protect your focus window from interruptions.',
    };
  }

  // Medium energy
  return {
    level: 'info',
    title: 'Balanced Energy Flow',
    message: 'Maintain a steady rhythm with regular hydration and small 5-minute pauses between blocks.',
  };
}

/**
 * Calculates a 0-100 energy alignment score for the day, evaluating both user energy
 * and time-of-day curve alignment.
 */
export function calculateEnergyScore(
  userEnergy: EnergyLevel,
  activities: Activity[],
  profile: UserEnergyProfile = DEFAULT_ENERGY_PROFILE
): number {
  if (activities.length === 0) return 100;

  let totalScore = 0;
  activities.forEach(a => {
    // Expected energy at scheduled time
    const expectedEnergy = getEnergyAtTime(a.startTime, profile);

    if (a.energyLevel === expectedEnergy) {
      totalScore += 100;
    } else if (
      (expectedEnergy === 'medium' && (a.energyLevel === 'high' || a.energyLevel === 'low')) ||
      (expectedEnergy === 'high' && a.energyLevel === 'medium') ||
      (expectedEnergy === 'low' && a.energyLevel === 'medium')
    ) {
      totalScore += 75;
    } else {
      // Demanding task scheduled during energy dip
      totalScore += 40;
    }
  });

  return Math.round(totalScore / activities.length);
}
