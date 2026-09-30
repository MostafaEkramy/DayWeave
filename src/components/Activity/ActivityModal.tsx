import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  ActivityCategory, 
  ActivityPriority, 
  EnergyLevel, 
  PreferredTimeWindow, 
  CATEGORY_DEFINITIONS,
  RecurrenceRule
} from '../../types/activity';
import { suggestEnergyForActivity } from '../../services/energyEngine';
import { timeToMinutes, calculateEndTime } from '../../utils/timeUtils';
import { X, Pin, Repeat, Link, Inbox, AlertCircle } from 'lucide-react';
import { TimePicker } from '../Common/TimePicker';

const DAYS_OF_WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export const ActivityModal: React.FC = () => {
  const { 
    isActivityModalOpen, 
    setIsActivityModalOpen, 
    editingActivity, 
    setEditingActivity, 
    addActivity, 
    updateActivity, 
    addToBacklog,
    activities,
    selectedDate 
  } = useApp();
  const { t, isRTL } = useLanguage();

  const isEditing = Boolean(editingActivity && editingActivity.id);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ActivityCategory>('work');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [priority, setPriority] = useState<ActivityPriority>('medium');
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [preferredTime, setPreferredTime] = useState<PreferredTimeWindow>('morning');
  const [deadline, setDeadline] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isFixedTime, setIsFixedTime] = useState(false);
  const [isBacklogTask, setIsBacklogTask] = useState(false);
  const [selectedDependsOn, setSelectedDependsOn] = useState<string[]>([]);
  
  // Recurrence State
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceRule['type']>('none');
  const [customDays, setCustomDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [recurrenceEnd, setRecurrenceEnd] = useState<string>('');

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingActivity) {
      setTitle(editingActivity.title || '');
      setDescription(editingActivity.description || '');
      setCategory(editingActivity.category || 'work');
      setDurationMinutes(editingActivity.durationMinutes || 60);
      setStartTime(editingActivity.startTime || '09:00');
      setPriority(editingActivity.priority || 'medium');
      setEnergyLevel(editingActivity.energyLevel || 'medium');
      setPreferredTime(editingActivity.preferredTime || 'morning');
      setDeadline(editingActivity.deadline || '');
      setLocation(editingActivity.location || '');
      setNotes(editingActivity.notes || '');
      setIsFixedTime(Boolean(editingActivity.isFixedTime));
      setIsBacklogTask(Boolean(editingActivity.isBacklog));
      setSelectedDependsOn(editingActivity.dependsOn || []);
      setRecurrenceType(editingActivity.recurrence?.type || 'none');
      setCustomDays(editingActivity.recurrence?.daysOfWeek || [1, 3, 5]);
      setRecurrenceEnd(editingActivity.recurrence?.endDate || '');
    } else {
      setTitle('');
      setDescription('');
      setCategory('work');
      setDurationMinutes(60);
      setStartTime('09:00');
      setPriority('medium');
      setEnergyLevel('medium');
      setPreferredTime('morning');
      setDeadline('');
      setLocation('');
      setNotes('');
      setIsFixedTime(false);
      setIsBacklogTask(false);
      setSelectedDependsOn([]);
      setRecurrenceType('none');
      setCustomDays([1, 3, 5]);
      setRecurrenceEnd('');
    }
    setValidationError(null);
  }, [editingActivity, isActivityModalOpen]);

  // Auto suggest energy when user types title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isEditing && val.length > 3) {
      const suggested = suggestEnergyForActivity(category, val);
      setEnergyLevel(suggested);
    }
  };

  const handleCategoryChange = (cat: ActivityCategory) => {
    setCategory(cat);
    if (!isEditing) {
      const suggested = suggestEnergyForActivity(cat, title);
      setEnergyLevel(suggested);
    }
  };

  const toggleDayOfWeek = (d: number) => {
    if (customDays.includes(d)) {
      setCustomDays(customDays.filter(day => day !== d));
    } else {
      setCustomDays([...customDays, d].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError(t('activityModal.titleRequired'));
      return;
    }

    if (durationMinutes <= 0) {
      setValidationError(t('activityModal.durationInvalid'));
      return;
    }

    // Check if start time + duration overflows 24:00 (1440 minutes)
    if (!isBacklogTask) {
      const startMin = timeToMinutes(startTime);
      if (startMin + durationMinutes > 24 * 60) {
        setValidationError(t('activityModal.overflowMidnight').replace('{time}', calculateEndTime(startTime, durationMinutes)));
        return;
      }
    }

    const recurrence: RecurrenceRule | undefined = recurrenceType !== 'none' ? {
      type: recurrenceType,
      daysOfWeek: recurrenceType === 'custom' || recurrenceType === 'weekly' ? customDays : undefined,
      endDate: recurrenceEnd || undefined,
    } : undefined;

    if (isBacklogTask) {
      addToBacklog({
        title: title.trim(),
        description: description.trim(),
        category,
        durationMinutes,
        priority,
        energyLevel,
        preferredTime,
        deadline: deadline || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        isCompleted: false,
        isFixedTime: false,
        dependsOn: selectedDependsOn.length > 0 ? selectedDependsOn : undefined,
      });
      setIsActivityModalOpen(false);
      setEditingActivity(null);
      return;
    }

    if (isEditing && editingActivity) {
      updateActivity(editingActivity.id, {
        title: title.trim(),
        description: description.trim(),
        category,
        durationMinutes,
        startTime,
        priority,
        energyLevel,
        preferredTime,
        deadline: deadline || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        isFixedTime,
        recurrence,
        dependsOn: selectedDependsOn.length > 0 ? selectedDependsOn : undefined,
      });
    } else {
      addActivity({
        date: selectedDate,
        title: title.trim(),
        description: description.trim(),
        category,
        startTime,
        durationMinutes,
        priority,
        energyLevel,
        preferredTime,
        deadline: deadline || undefined,
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        isCompleted: false,
        isFixedTime,
        recurrence,
        dependsOn: selectedDependsOn.length > 0 ? selectedDependsOn : undefined,
      });
    }

    setIsActivityModalOpen(false);
    setEditingActivity(null);
  };

  if (!isActivityModalOpen) return null;

  const otherActivities = activities.filter(a => a.date === selectedDate && a.id !== editingActivity?.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 16,
      }}
      onClick={() => { setIsActivityModalOpen(false); setEditingActivity(null); }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {isEditing ? t('activityModal.editTitle') : t('activityModal.addTitle')}
          </h3>
          <button
            onClick={() => { setIsActivityModalOpen(false); setEditingActivity(null); }}
            className="btn-icon"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {validationError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              fontSize: 12,
              color: 'var(--status-danger)',
              fontWeight: 600,
            }}>
              <AlertCircle size={14} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Title Input */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('activityModal.nameLabel')} *
            </label>
            <input
              type="text"
              required
              placeholder={t('activityModal.namePlaceholder')}
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: 13,
                marginTop: 6,
              }}
            />
          </div>

          {/* Category Selector Pills */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
              {t('activityModal.category')}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(CATEGORY_DEFINITIONS) as ActivityCategory[]).map(catKey => {
                const cat = CATEGORY_DEFINITIONS[catKey];
                const isSelected = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => handleCategoryChange(catKey)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: 12,
                      fontWeight: 600,
                      border: `1px solid ${isSelected ? cat.accentColor : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? cat.darkBg : 'var(--bg-subtle)',
                      color: isSelected ? cat.accentColor : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {t(`categories.${catKey}`) || cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time & Duration Row */}
          {!isBacklogTask && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('activityModal.startTime')}
                </label>
                <div style={{ marginTop: 6 }}>
                  <TimePicker value={startTime} onChange={setStartTime} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {t('activityModal.durationMins')}
                </label>
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    marginTop: 6,
                  }}
                />
              </div>
            </div>
          )}

          {/* Priority & Energy Level Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('activityModal.priority')}
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as ActivityPriority)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                <option value="low">{t('activityModal.lowPriority')}</option>
                <option value="medium">{t('activityModal.mediumPriority')}</option>
                <option value="high">{t('activityModal.highPriority')}</option>
                <option value="urgent">{t('activityModal.urgentPriority')}</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {t('activityModal.energyRequirement')}
              </label>
              <select
                value={energyLevel}
                onChange={e => setEnergyLevel(e.target.value as EnergyLevel)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  marginTop: 6,
                }}
              >
                <option value="low">{t('activityModal.lowEnergy')}</option>
                <option value="medium">{t('activityModal.mediumEnergy')}</option>
                <option value="high">{t('activityModal.highEnergy')}</option>
              </select>
            </div>
          </div>

          {/* Recurring Task Options */}
          <div style={{
            padding: 12,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Repeat size={15} style={{ color: 'var(--accent-primary)' }} />
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                {t('activityModal.recurringRoutine')}
              </label>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'none', labelKey: 'activityModal.doesNotRepeat' },
                { id: 'daily', labelKey: 'activityModal.daily' },
                { id: 'weekdays', labelKey: 'activityModal.weekdays' },
                { id: 'custom', labelKey: 'activityModal.customDays' },
                { id: 'monthly', labelKey: 'activityModal.monthly' },
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecurrenceType(r.id as any)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: 11,
                    fontWeight: 500,
                    border: `1px solid ${recurrenceType === r.id ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    backgroundColor: recurrenceType === r.id ? 'var(--accent-primary)' : 'var(--bg-app)',
                    color: recurrenceType === r.id ? '#FFF' : 'var(--text-secondary)',
                  }}
                >
                  {t(r.labelKey)}
                </button>
              ))}
            </div>

            {recurrenceType === 'custom' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {DAYS_OF_WEEK_KEYS.map((dayKey, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDayOfWeek(index)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      borderRadius: 'var(--radius-xs)',
                      fontSize: 11,
                      fontWeight: 600,
                      border: `1px solid ${customDays.includes(index) ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      backgroundColor: customDays.includes(index) ? 'var(--accent-primary)' : 'var(--bg-app)',
                      color: customDays.includes(index) ? '#FFF' : 'var(--text-secondary)',
                    }}
                  >
                    {t(`activityModal.${dayKey}`)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task Dependency Selector */}
          {otherActivities.length > 0 && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Link size={13} />
                <span>{t('activityModal.prerequisites')}</span>
              </label>
              <select
                multiple
                value={selectedDependsOn}
                onChange={e => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSelectedDependsOn(values);
                }}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  marginTop: 6,
                  height: 60,
                }}
              >
                {otherActivities.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.startTime})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fixed Time & Backlog Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${isFixedTime ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                backgroundColor: isFixedTime ? 'var(--bg-subtle)' : 'transparent',
                transition: 'all 0.15s ease',
              }}
            >
              <input
                type="checkbox"
                checked={isFixedTime}
                onChange={e => setIsFixedTime(e.target.checked)}
                style={{ accentColor: 'var(--accent-primary)', width: 15, height: 15, flexShrink: 0 }}
              />
              <Pin size={14} style={{ color: isFixedTime ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ color: isFixedTime ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {t('activityModal.fixedDesc')}
              </span>
            </label>

            {!isEditing && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${isBacklogTask ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  backgroundColor: isBacklogTask ? 'var(--bg-subtle)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="checkbox"
                  checked={isBacklogTask}
                  onChange={e => setIsBacklogTask(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', width: 15, height: 15, flexShrink: 0 }}
                />
                <Inbox size={14} style={{ color: isBacklogTask ? 'var(--accent-primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ color: isBacklogTask ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {t('activityModal.addToBacklog')}
                </span>
              </label>
            )}
          </div>

          {/* Notes & Location */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('activityModal.notes')}
            </label>
            <textarea
              rows={2}
              placeholder={t('activityModal.notesPlaceholder')}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-medium)',
                backgroundColor: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontSize: 13,
                marginTop: 6,
                resize: 'none',
              }}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => { setIsActivityModalOpen(false); setEditingActivity(null); }}
              className="btn-ghost"
            >
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {isEditing ? t('common.save') : t('activityModal.addTitle')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
