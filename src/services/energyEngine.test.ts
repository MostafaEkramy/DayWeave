import { describe, it, expect } from 'vitest';
import { getEnergyAtTime, suggestEnergyForActivity, calculateEnergyScore, DEFAULT_ENERGY_PROFILE } from './energyEngine';
import { Activity } from '../types/activity';

describe('energyEngine', () => {
  it('predicts morning peak energy for morning lark chronotype', () => {
    const energy = getEnergyAtTime('09:00', {
      chronotype: 'morning_lark',
      morningPeakTime: '08:00',
      afternoonDipTime: '13:00',
      eveningRecoveryTime: '17:00',
    });
    expect(energy).toBe('high');
  });

  it('predicts afternoon dip energy', () => {
    const energy = getEnergyAtTime('14:30', DEFAULT_ENERGY_PROFILE);
    expect(energy).toBe('low');
  });

  it('suggests high energy for deep technical or intensive work', () => {
    expect(suggestEnergyForActivity('work', 'Code new feature in React')).toBe('high');
    expect(suggestEnergyForActivity('study', 'Math Exam Prep')).toBe('high');
  });

  it('suggests low energy for gentle relaxing tasks', () => {
    expect(suggestEnergyForActivity('rest', 'Afternoon Coffee Walk')).toBe('low');
    expect(suggestEnergyForActivity('entertainment', 'Watch documentary')).toBe('low');
  });

  it('computes energy alignment score for daily schedule', () => {
    const activities: Activity[] = [
      {
        id: '1',
        date: '2026-09-28',
        title: 'Deep Coding',
        category: 'work',
        startTime: '09:30', // High energy slot
        durationMinutes: 60,
        priority: 'high',
        energyLevel: 'high',
        isCompleted: false,
        isFixedTime: false,
        createdAt: '',
        updatedAt: '',
      },
    ];

    const score = calculateEnergyScore('high', activities);
    expect(score).toBe(100);
  });
});
