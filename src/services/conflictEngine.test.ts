import { describe, it, expect } from 'vitest';
import { detectConflicts, autoResolveAllConflicts } from './conflictEngine';
import { Activity } from '../types/activity';

describe('conflictEngine', () => {
  const baseAct: Activity = {
    id: '1',
    date: '2026-09-28',
    title: 'Task 1',
    category: 'work',
    startTime: '09:00',
    durationMinutes: 60,
    priority: 'medium',
    energyLevel: 'medium',
    isCompleted: false,
    isFixedTime: false,
    createdAt: '',
    updatedAt: '',
  };

  it('detects direct overlapping activities', () => {
    const act1: Activity = { ...baseAct, id: 'a1', startTime: '09:00', durationMinutes: 60 };
    const act2: Activity = { ...baseAct, id: 'a2', startTime: '09:30', durationMinutes: 60 };

    const conflicts = detectConflicts([act1, act2]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });

  it('ignores non-overlapping back-to-back activities', () => {
    const act1: Activity = { ...baseAct, id: 'a1', startTime: '09:00', durationMinutes: 60 }; // 09:00 - 10:00
    const act2: Activity = { ...baseAct, id: 'a2', startTime: '10:00', durationMinutes: 60 }; // 10:00 - 11:00

    const conflicts = detectConflicts([act1, act2]);
    expect(conflicts).toHaveLength(0);
  });

  it('detects nested activity inside a longer activity', () => {
    const act1: Activity = { ...baseAct, id: 'a1', startTime: '09:00', durationMinutes: 180 }; // 09:00 - 12:00
    const act2: Activity = { ...baseAct, id: 'a2', startTime: '10:00', durationMinutes: 30 };  // 10:00 - 10:30

    const conflicts = detectConflicts([act1, act2]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].overlapMinutes).toBe(30);
  });

  it('auto-resolves conflicts by shifting flexible activity without moving fixed commitment', () => {
    const fixedAct: Activity = { ...baseAct, id: 'fixed', startTime: '10:00', durationMinutes: 60, isFixedTime: true };
    const flexAct: Activity = { ...baseAct, id: 'flex', startTime: '09:30', durationMinutes: 60, isFixedTime: false };

    const resolved = autoResolveAllConflicts([fixedAct, flexAct]);
    const afterConflicts = detectConflicts(resolved);
    expect(afterConflicts).toHaveLength(0);

    const afterFixed = resolved.find(a => a.id === 'fixed');
    expect(afterFixed?.startTime).toBe('10:00'); // Fixed task never moved
  });
});
