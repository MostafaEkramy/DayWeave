import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  PlannerInputItem, 
  PlannerConfig, 
  PlannerResult, 
  scheduleDayPlan 
} from '../../services/schedulerEngine';
import { ActivityCategory, ActivityPriority, EnergyLevel, CATEGORY_DEFINITIONS } from '../../types/activity';
import { formatMinutesDuration, calculateEndTime } from '../../utils/timeUtils';
import { 
  Sparkles, 
  X, 
  Plus, 
  Trash2, 
  Clock, 
  Coffee, 
  Zap, 
  CheckCircle2, 
  RotateCw,
  Pin
} from 'lucide-react';
import { TimePicker } from '../Common/TimePicker';

export const SmartPlannerModal: React.FC = () => {
  const { 
    isPlannerOpen, 
    setIsPlannerOpen, 
    selectedDate, 
    userEnergy, 
    replaceDayActivities, 
    showToast 
  } = useApp();

  const { t, isRTL } = useLanguage();

  // Configuration
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [insertBreaks, setInsertBreaks] = useState(true);
  const [breakDuration] = useState(15);
  const [plannerEnergy, setPlannerEnergy] = useState<EnergyLevel>(userEnergy);

  // Target Activities Pool
  const [items, setItems] = useState<PlannerInputItem[]>([
    {
      id: 'plan-1',
      title: 'Study React & State Architecture',
      category: 'study',
      durationMinutes: 120,
      priority: 'high',
      energyLevel: 'high',
      preferredTime: 'morning',
    },
    {
      id: 'plan-2',
      title: 'Core Project Implementation',
      category: 'work',
      durationMinutes: 180,
      priority: 'high',
      energyLevel: 'high',
      preferredTime: 'morning',
    },
    {
      id: 'plan-3',
      title: 'Strength & Conditioning Workout',
      category: 'health',
      durationMinutes: 60,
      priority: 'medium',
      energyLevel: 'high',
      preferredTime: 'afternoon',
    },
    {
      id: 'plan-4',
      title: 'Grocery Shopping & Essentials',
      category: 'personal',
      durationMinutes: 60,
      priority: 'low',
      energyLevel: 'low',
      preferredTime: 'evening',
    },
    {
      id: 'plan-5',
      title: 'Healthy Lunch Break',
      category: 'health',
      durationMinutes: 60,
      priority: 'medium',
      energyLevel: 'low',
      isFixedTime: true,
      fixedStartTime: '13:00',
    },
  ]);

  // Quick New Item State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory] = useState<ActivityCategory>('work');
  const [newDuration, setNewDuration] = useState(60);
  const [newPriority, setNewPriority] = useState<ActivityPriority>('medium');
  const [newEnergy, setNewEnergy] = useState<EnergyLevel>('medium');

  // Plan generation result
  const [planResult, setPlanResult] = useState<PlannerResult | null>(null);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setItems(prev => [
      ...prev,
      {
        id: `plan-item-${Date.now()}`,
        title: newTitle.trim(),
        category: newCategory,
        durationMinutes: Number(newDuration),
        priority: newPriority,
        energyLevel: newEnergy,
      },
    ]);
    setNewTitle('');
    setPlanResult(null); // reset preview on change
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setPlanResult(null);
  };

  const handleGeneratePlan = () => {
    if (items.length === 0) return;

    const config: PlannerConfig = {
      date: selectedDate,
      availableStartTime: startTime,
      availableEndTime: endTime,
      userEnergyLevel: plannerEnergy,
      insertBreaks,
      breakDurationMinutes: breakDuration,
      preserveBufferPercent: 10,
    };

    const result = scheduleDayPlan(items, config);
    setPlanResult(result);
  };

  const handleAcceptPlan = () => {
    if (!planResult) return;
    replaceDayActivities(selectedDate, planResult.scheduledActivities);
    const toastMsg = t('smartPlanner.toastOrganized')
      .replace('{count}', planResult.scheduledActivities.length.toString())
      .replace('{date}', selectedDate);
    showToast(toastMsg);
    setIsPlannerOpen(false);
  };

  if (!isPlannerOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 16,
      }}
      onClick={() => setIsPlannerOpen(false)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 720,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-modal)',
          padding: 24,
          maxHeight: '92vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
        className="animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                {t('smartPlanner.title')}
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {t('smartPlanner.subtitle')}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setIsPlannerOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Available Time Window & Constraints Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {/* Row 1: Time Window & Energy Level */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>
                {t('smartPlanner.availableFrom')}
              </label>
              <TimePicker
                value={startTime}
                onChange={val => {
                  setStartTime(val);
                  setPlanResult(null);
                }}
                align="start"
                showShortcuts={false}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>
                {t('smartPlanner.availableUntil')}
              </label>
              <TimePicker
                value={endTime}
                onChange={val => {
                  setEndTime(val);
                  setPlanResult(null);
                }}
                align="end"
                showShortcuts={false}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.04em' }}>
                {t('smartPlanner.dayEnergyLevel')}
              </label>
              <select
                value={plannerEnergy}
                onChange={e => {
                  setPlannerEnergy(e.target.value as EnergyLevel);
                  setPlanResult(null);
                }}
                style={{
                  width: '100%',
                  fontSize: 13,
                  padding: '7px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="high">{t('smartPlanner.highEnergyDesc')}</option>
                <option value="medium">{t('smartPlanner.mediumEnergyDesc')}</option>
                <option value="low">{t('smartPlanner.lowEnergyDesc')}</option>
              </select>
            </div>
          </div>

          {/* Row 2: Auto-Insert Breaks Toggle Card */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: insertBreaks ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
              border: `1px solid ${insertBreaks ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={insertBreaks}
                onChange={e => {
                  setInsertBreaks(e.target.checked);
                  setPlanResult(null);
                }}
                style={{ width: 18, height: 18, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {t('smartPlanner.autoInsertBreaks')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t('smartPlanner.afterDeepFocus')}
                </div>
              </div>
            </div>
            <Coffee size={18} style={{ color: insertBreaks ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
          </label>
        </div>

        {/* Content Split: Left (Activities Pool) | Right (Preview Result) */}
        {!planResult ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {t('smartPlanner.targetPool')} ({items.length})
              </h4>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {t('smartPlanner.totalDuration')}: {formatMinutesDuration(items.reduce((acc, i) => acc + i.durationMinutes, 0))}
              </span>
            </div>

            {/* List of target items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', marginBottom: 16 }}>
              {items.map(item => {
                const catMeta = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.work;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          backgroundColor: catMeta.accentColor,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{item.title}</span>
                      {item.isFixedTime && (
                        <span title={`Fixed at ${item.fixedStartTime}`} style={{ color: 'var(--text-muted)' }}>
                          <Pin size={12} />
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {formatMinutesDuration(item.durationMinutes)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                        {t(`priority.${item.priority}`)}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={12} />
                        <span>
                          {item.energyLevel === 'high' 
                            ? t('smartPlanner.highEnergy') 
                            : item.energyLevel === 'medium' 
                            ? t('smartPlanner.mediumEnergy') 
                            : t('smartPlanner.lowEnergy')}
                        </span>
                      </span>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="btn-icon-subtle"
                        style={{ width: 24, height: 24, color: 'var(--text-muted)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Add Row */}
            <form
              onSubmit={handleAddItem}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(140px, 2fr) 80px 110px 110px auto',
                gap: 8,
                padding: 10,
                backgroundColor: 'var(--bg-inset)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder={t('smartPlanner.addPlaceholder')}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ padding: '7px 10px', fontSize: 12 }}
              />
              <select
                value={newDuration}
                onChange={e => setNewDuration(Number(e.target.value))}
                style={{ padding: '7px 8px', fontSize: 12 }}
              >
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>1h</option>
                <option value={90}>1.5h</option>
                <option value={120}>2h</option>
                <option value={180}>3h</option>
              </select>
              <select
                value={newPriority}
                onChange={e => setNewPriority(e.target.value as ActivityPriority)}
                style={{ padding: '7px 8px', fontSize: 12 }}
              >
                <option value="high">{t('smartPlanner.highPriority')}</option>
                <option value="medium">{t('smartPlanner.mediumPriority')}</option>
                <option value="low">{t('smartPlanner.lowPriority')}</option>
              </select>
              <select
                value={newEnergy}
                onChange={e => setNewEnergy(e.target.value as EnergyLevel)}
                style={{ padding: '7px 8px', fontSize: 12 }}
              >
                <option value="high">{t('smartPlanner.highEnergy')}</option>
                <option value="medium">{t('smartPlanner.mediumEnergy')}</option>
                <option value="low">{t('smartPlanner.lowEnergy')}</option>
              </select>
              <button type="submit" className="btn-secondary" style={{ padding: '7px 12px' }}>
                <Plus size={14} />
              </button>
            </form>
          </div>
        ) : (
          /* Plan Generated Result View */
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: planResult.isOverCapacity ? 'var(--status-warning-bg)' : 'var(--status-success-bg)',
                border: '1px solid',
                borderColor: planResult.isOverCapacity ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('smartPlanner.dayReady')}
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {planResult.message}
                </p>
              </div>

              <div style={{ textAlign: isRTL ? 'left' : 'right', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('smartPlanner.freeBuffer')} </span>
                <span style={{ fontWeight: 700, color: 'var(--status-success)' }}>
                  {formatMinutesDuration(planResult.freeMinutes)}
                </span>
              </div>
            </div>

            {/* Generated Schedule Preview List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {planResult.scheduledActivities.map(act => {
                const isBreak = act.category === 'rest';
                const endTimeStr = calculateEndTime(act.startTime, act.durationMinutes);
                return (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isBreak ? 'var(--bg-inset)' : 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderLeft: isRTL ? undefined : `4px solid ${isBreak ? 'var(--status-success)' : 'var(--accent-primary)'}`,
                      borderRight: isRTL ? `4px solid ${isBreak ? 'var(--status-success)' : 'var(--accent-primary)'}` : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {act.startTime} – {endTimeStr}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{act.title}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {formatMinutesDuration(act.durationMinutes)}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {t(`categories.${act.category}`)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 14,
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          {planResult ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPlanResult(null)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RotateCw size={14} />
                <span>{t('smartPlanner.adjustReplan')}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button type="button" className="btn-ghost" onClick={() => setIsPlannerOpen(false)}>
                  {t('smartPlanner.cancel')}
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAcceptPlan}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, padding: '8px 20px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>{t('smartPlanner.acceptPlan')}</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button type="button" className="btn-ghost" onClick={() => setIsPlannerOpen(false)}>
                {t('smartPlanner.cancel')}
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleGeneratePlan}
                disabled={items.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, padding: '8px 22px' }}
              >
                <Sparkles size={16} />
                <span>{t('smartPlanner.generatePlan')}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
