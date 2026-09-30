import React, { useState } from 'react';
import { Activity, CATEGORY_DEFINITIONS } from '../../types/activity';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculateEndTime, formatMinutesDuration } from '../../utils/timeUtils';
import { 
  CheckCircle2, 
  Circle, 
  GripVertical, 
  Clock, 
  Zap, 
  AlertCircle, 
  Play, 
  Edit3, 
  Trash2, 
  Pin,
  ChevronDown
} from 'lucide-react';

interface Props {
  activity: Activity;
  topPx: number;
  heightPx: number;
  isConflicted: boolean;
  onStartDrag: (e: React.PointerEvent, act: Activity) => void;
  onStartResize: (e: React.PointerEvent, act: Activity) => void;
}

export const TimelineCard: React.FC<Props> = ({
  activity,
  topPx,
  heightPx,
  isConflicted,
  onStartDrag,
  onStartResize,
}) => {
  const { 
    toggleCompleteActivity, 
    setEditingActivity, 
    setIsActivityModalOpen, 
    deleteActivity,
    setFocusActivity,
    setIsFocusModalOpen 
  } = useApp();

  const { theme } = useTheme();
  const { t, isRTL } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const catMeta = CATEGORY_DEFINITIONS[activity.category] || CATEGORY_DEFINITIONS.work;
  const endTimeStr = calculateEndTime(activity.startTime, activity.durationMinutes);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingActivity(activity);
    setIsActivityModalOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirmingDelete) {
      deleteActivity(activity.id);
    } else {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 4000);
    }
  };

  const handleStartFocus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFocusActivity(activity);
    setIsFocusModalOpen(true);
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompleteActivity(activity.id);
  };

  const isCompact = heightPx < 55;
  const isMinimal = heightPx < 40;

  // Background and border styling
  const bgColor = theme === 'dark' ? catMeta.darkBg : catMeta.lightBg;
  const borderColor = isConflicted 
    ? 'var(--status-danger)' 
    : theme === 'dark' 
      ? catMeta.darkBorder 
      : catMeta.lightBorder;

  const accentBorderColor = isConflicted ? 'var(--status-danger)' : catMeta.accentColor;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsConfirmingDelete(false); }}
      style={{
        position: 'absolute',
        top: topPx,
        ...(isRTL ? {
          right: 'var(--timeline-gutter-width)',
          left: 16,
          borderRight: `4px solid ${accentBorderColor}`,
          borderLeft: `1px solid ${borderColor}`,
        } : {
          left: 'var(--timeline-gutter-width)',
          right: 16,
          borderLeft: `4px solid ${accentBorderColor}`,
          borderRight: `1px solid ${borderColor}`,
        }),
        height: Math.max(34, heightPx),
        backgroundColor: activity.isCompleted 
          ? (theme === 'dark' ? '#18181B' : '#F1F5F9') 
          : 'var(--bg-surface)',
        borderTop: `1px solid ${borderColor}`,
        borderBottom: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-sm)',
        padding: isMinimal ? '4px 10px' : isCompact ? '6px 12px' : '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isCompact ? 'center' : 'space-between',
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        opacity: activity.isCompleted ? 0.65 : 1,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
        zIndex: isHovered ? 10 : 5,
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      {/* Top Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          {/* Drag Handle */}
          <div
            onPointerDown={(e) => onStartDrag(e, activity)}
            style={{
              cursor: 'grab',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              padding: '2px 0',
            }}
            title={t('timeline.dragToReschedule')}
          >
            <GripVertical size={14} />
          </div>

          {/* Completion Checkbox */}
          <button
            onClick={handleToggleComplete}
            style={{
              color: activity.isCompleted ? 'var(--status-success)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
            title={activity.isCompleted ? t('timeline.markIncomplete') : t('timeline.markComplete')}
          >
            {activity.isCompleted ? (
              <CheckCircle2 size={16} color="var(--status-success)" />
            ) : (
              <Circle size={16} />
            )}
          </button>

          {/* Title */}
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-primary)',
              textDecoration: activity.isCompleted ? 'line-through' : 'none',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {activity.title}
          </span>

          {/* Fixed Time Pin */}
          {activity.isFixedTime && (
            <span title={t('timeline.fixedTime')} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
              <Pin size={11} />
            </span>
          )}

          {/* Conflict Badge */}
          {isConflicted && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--status-danger)',
                backgroundColor: 'var(--status-danger-bg)',
                padding: '1px 6px',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <AlertCircle size={11} />
              <span>{t('timeline.overlap')}</span>
            </span>
          )}
        </div>

        {/* Time Window & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* Time range */}
          <span 
            style={{ 
              fontSize: 12, 
              fontFamily: 'var(--font-mono)', 
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {activity.startTime} – {endTimeStr} ({formatMinutesDuration(activity.durationMinutes)})
          </span>

          {/* Hover Actions: Focus, Edit, Delete */}
          {isHovered && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 4 }} className="animate-fade-in">
              {!activity.isCompleted && (
                <button
                  onClick={handleStartFocus}
                  className="btn-icon-subtle"
                  style={{ width: 24, height: 24, color: 'var(--accent-primary)' }}
                  title={t('timeline.startFocus')}
                >
                  <Play size={13} />
                </button>
              )}

              <button
                onClick={handleEdit}
                className="btn-icon-subtle"
                style={{ width: 24, height: 24 }}
                title={t('timeline.editActivity')}
              >
                <Edit3 size={13} />
              </button>

              <button
                onClick={handleDelete}
                className="btn-icon-subtle"
                style={{
                  width: isConfirmingDelete ? 'auto' : 24,
                  height: 24,
                  padding: isConfirmingDelete ? '0 6px' : 0,
                  backgroundColor: isConfirmingDelete ? 'var(--status-danger)' : undefined,
                  color: isConfirmingDelete ? '#FFF' : 'var(--status-danger)',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
                title={isConfirmingDelete ? (isRTL ? 'انقر مجدداً للتأكيد' : 'Click again to confirm') : t('timeline.deleteActivity')}
              >
                <Trash2 size={13} />
                {isConfirmingDelete && <span>{isRTL ? 'تأكيد؟' : 'Sure?'}</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle & Bottom Details (shown if card height allows) */}
      {!isCompact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 4 }}>
          {/* Badges: Category, Priority, Energy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Category Pill */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: catMeta.accentColor,
                backgroundColor: bgColor,
                padding: '2px 7px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              {catMeta.label}
            </span>

            {/* Priority Badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 
                  activity.priority === 'urgent' 
                    ? 'var(--status-danger-bg)' 
                    : activity.priority === 'high' 
                      ? 'var(--status-warning-bg)' 
                      : 'var(--bg-subtle)',
                color: 
                  activity.priority === 'urgent' 
                    ? 'var(--status-danger)' 
                    : activity.priority === 'high' 
                      ? 'var(--status-warning)' 
                      : 'var(--text-muted)',
              }}
            >
              {activity.priority}
            </span>

            {/* Energy Level Badge */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                backgroundColor: 'var(--bg-subtle)',
                padding: '1px 5px',
                borderRadius: 'var(--radius-xs)',
              }}
              title={`Energy requirement: ${activity.energyLevel}`}
            >
              <Zap size={10} color="var(--accent-primary)" />
              <span style={{ textTransform: 'capitalize' }}>{activity.energyLevel} {t('timeline.energyLabel')}</span>
            </span>

            {/* Location or Notes snippet */}
            {activity.location && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>
                📍 {activity.location}
              </span>
            )}
          </div>

          {/* Focus logged tag */}
          {activity.focusMinutesLogged && activity.focusMinutesLogged > 0 ? (
            <span style={{ fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500 }}>
              ⏱️ {activity.focusMinutesLogged}m {t('timeline.focused')}
            </span>
          ) : null}
        </div>
      )}

      {/* Bottom Duration Resize Handle */}
      <div
        onPointerDown={(e) => onStartResize(e, activity)}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          cursor: 'ns-resize',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
        title={t('timeline.dragToResize')}
      />
    </div>
  );
};
