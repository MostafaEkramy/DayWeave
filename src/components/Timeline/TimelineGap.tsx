import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatMinutesDuration, minutesToTime } from '../../utils/timeUtils';
import { Plus, Coffee } from 'lucide-react';

interface Props {
  startMinutes: number;
  durationMinutes: number;
  topPx: number;
  heightPx: number;
}

export const TimelineGap: React.FC<Props> = ({ startMinutes, durationMinutes, topPx, heightPx }) => {
  const { setEditingActivity, setIsActivityModalOpen, addActivity, selectedDate } = useApp();
  const { t } = useLanguage();

  if (durationMinutes < 15 || heightPx < 28) return null;

  const startTimeStr = minutesToTime(startMinutes);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingActivity({
      id: '',
      date: selectedDate,
      title: '',
      category: 'work',
      startTime: startTimeStr,
      durationMinutes: Math.min(durationMinutes, 60),
      priority: 'medium',
      energyLevel: 'medium',
      isCompleted: false,
      isFixedTime: false,
      createdAt: '',
      updatedAt: '',
    });
    setIsActivityModalOpen(true);
  };

  const handleAddBreak = (e: React.MouseEvent) => {
    e.stopPropagation();
    addActivity({
      date: selectedDate,
      title: 'Rest & Coffee Break',
      category: 'rest',
      startTime: startTimeStr,
      durationMinutes: Math.min(durationMinutes, 30),
      priority: 'low',
      energyLevel: 'low',
      isCompleted: false,
      isFixedTime: false,
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: topPx,
        left: 'var(--timeline-gutter-width)',
        right: 16,
        height: heightPx,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        border: '1px dashed var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-inset)',
        color: 'var(--text-muted)',
        fontSize: 12,
        userSelect: 'none',
        zIndex: 2,
        opacity: 0.85,
        transition: 'opacity 0.15s ease',
      }}
      className="timeline-gap-container"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
        <span>☕</span>
        <span>{formatMinutesDuration(durationMinutes)} {t('timeline.free')}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({startTimeStr})</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {durationMinutes >= 15 && (
          <button
            onClick={handleAddBreak}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Coffee size={12} />
            <span>{t('timeline.addBreak')}</span>
          </button>
        )}

        <button
          onClick={handleQuickAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--accent-primary)',
          }}
        >
          <Plus size={12} />
          <span>{t('timeline.addActivity')}</span>
        </button>
      </div>
    </div>
  );
};
