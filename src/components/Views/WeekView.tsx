import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { getWeekDates, shiftDate } from '../../utils/dateUtils';
import { formatMinutesDuration, timeToMinutes } from '../../utils/timeUtils';
import { CATEGORY_DEFINITIONS } from '../../types/activity';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle
} from 'lucide-react';

export const WeekView: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    activities, 
    moveActivity, 
    toggleCompleteActivity, 
    setEditingActivity, 
    setIsActivityModalOpen,
  } = useApp();
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [weekCenterDate, setWeekCenterDate] = useState<string>(selectedDate);
  const weekDays = getWeekDates(weekCenterDate, language);

  const handlePrevWeek = () => setWeekCenterDate(shiftDate(weekCenterDate, -7));
  const handleNextWeek = () => setWeekCenterDate(shiftDate(weekCenterDate, 7));

  const handleOpenDayTimeline = (dateStr: string) => {
    setSelectedDate(dateStr);
    navigate('/');
  };

  const handleQuickAddForDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setEditingActivity({
      id: '',
      date: dateStr,
      title: '',
      category: 'work',
      startTime: '09:00',
      durationMinutes: 60,
      priority: 'medium',
      energyLevel: 'medium',
      isCompleted: false,
      isFixedTime: false,
      createdAt: '',
      updatedAt: '',
    });
    setIsActivityModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Week Navigator */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '12px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-icon" onClick={isRTL ? handleNextWeek : handlePrevWeek} title={t('week.previousWeek')}>
            {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {weekDays[0].monthName} {weekDays[0].dayNumber} – {weekDays[6].monthName} {weekDays[6].dayNumber}
          </span>
          <button className="btn-icon" onClick={isRTL ? handlePrevWeek : handleNextWeek} title={t('week.nextWeek')}>
            {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <button 
          className="btn-secondary"
          onClick={() => setWeekCenterDate(selectedDate)}
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          {t('week.jumpToSelected')}
        </button>
      </div>

      {/* 7-Day Grid Columns */}
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          alignItems: 'start',
        }}
      >
        {weekDays.map(day => {
          const dayActs = activities
            .filter(a => a.date === day.dateStr)
            .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

          const totalPlannedMin = dayActs.reduce((acc, a) => acc + a.durationMinutes, 0);

          return (
            <div
              key={day.dateStr}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: day.isSelected 
                  ? 'var(--accent-primary)' 
                  : day.isToday 
                    ? 'var(--border-medium)' 
                    : 'var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 460,
                boxShadow: day.isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
              }}
            >
              {/* Day Column Header */}
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: day.isSelected 
                    ? 'var(--accent-primary-subtle)' 
                    : 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
                onClick={() => handleOpenDayTimeline(day.dateStr)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: day.isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                    {day.dayName.toUpperCase()}
                  </span>
                  {day.isToday && (
                    <span 
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: 'var(--accent-primary)',
                        color: '#FFFFFF',
                        padding: '1px 6px',
                        borderRadius: 3,
                      }}
                    >
                      {t('week.today')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 800 }}>{day.dayNumber}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {formatMinutesDuration(totalPlannedMin)}
                  </span>
                </div>
              </div>

              {/* Day Activities List */}
              <div 
                style={{
                  flex: 1,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  overflowY: 'auto',
                  maxHeight: 380,
                }}
              >
                {dayActs.map(act => {
                  const catMeta = CATEGORY_DEFINITIONS[act.category] || CATEGORY_DEFINITIONS.work;
                  return (
                    <div
                      key={act.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: act.isCompleted ? 'var(--bg-inset)' : 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        borderInlineStart: `3px solid ${catMeta.accentColor}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        opacity: act.isCompleted ? 0.65 : 1,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                          {act.startTime}
                        </span>
                        <button
                          onClick={() => toggleCompleteActivity(act.id)}
                          style={{ color: act.isCompleted ? 'var(--status-success)' : 'var(--text-muted)' }}
                        >
                          {act.isCompleted ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                        </button>
                      </div>

                      <span 
                        style={{ 
                          fontWeight: 600, 
                          color: 'var(--text-primary)', 
                          textDecoration: act.isCompleted ? 'line-through' : 'none',
                          lineHeight: 1.3,
                        }}
                      >
                        {act.title}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {formatMinutesDuration(act.durationMinutes)}
                        </span>

                        {/* Move day quick actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => moveActivity(act.id, act.startTime, shiftDate(day.dateStr, -1))}
                            className="btn-icon-subtle"
                            style={{ width: 18, height: 18 }}
                            title={t('week.shiftPrev')}
                          >
                            {isRTL ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
                          </button>
                          <button
                            onClick={() => moveActivity(act.id, act.startTime, shiftDate(day.dateStr, 1))}
                            className="btn-icon-subtle"
                            style={{ width: 18, height: 18 }}
                            title={t('week.shiftNext')}
                          >
                            {isRTL ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {dayActs.length === 0 && (
                  <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                    {t('week.freeDay')}
                  </div>
                )}
              </div>

              {/* Column Footer: Quick Add */}
              <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
                <button
                  onClick={() => handleQuickAddForDay(day.dateStr)}
                  className="btn-ghost"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Plus size={13} />
                  <span>{t('week.add')}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
