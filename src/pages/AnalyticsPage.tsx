import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { CATEGORY_DEFINITIONS, ActivityCategory } from '../types/activity';
import { formatMinutesDuration } from '../utils/timeUtils';
import { getWeekDates, shiftDate, getTodayDateString } from '../utils/dateUtils';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Timer,
  Flame,
  Zap,
  Target,
  Calendar,
  Award,
} from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  const { activities, streak, reviews } = useApp();
  const { t } = useLanguage();
  const todayStr = getTodayDateString();

  // Last 7 days data
  const last7Days = useMemo(() => {
    const days: { date: string; label: string; planned: number; completed: number; focus: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dateStr = shiftDate(todayStr, -i);
      const dayActs = activities.filter(a => a.date === dateStr);
      const planned = dayActs.reduce((acc, a) => acc + a.durationMinutes, 0);
      const completed = dayActs.filter(a => a.isCompleted).reduce((acc, a) => acc + a.durationMinutes, 0);
      const focus = dayActs.reduce((acc, a) => acc + (a.focusMinutesLogged || 0), 0);
      const dayLabel = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
      days.push({ date: dateStr, label: dayLabel, planned, completed, focus });
    }
    return days;
  }, [activities, todayStr]);

  // Overall stats
  const totalStats = useMemo(() => {
    const totalActivities = activities.length;
    const completedActivities = activities.filter(a => a.isCompleted).length;
    const totalPlanned = activities.reduce((acc, a) => acc + a.durationMinutes, 0);
    const totalCompleted = activities.filter(a => a.isCompleted).reduce((acc, a) => acc + a.durationMinutes, 0);
    const totalFocus = activities.reduce((acc, a) => acc + (a.focusMinutesLogged || 0), 0);
    const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
    return { totalActivities, completedActivities, totalPlanned, totalCompleted, totalFocus, completionRate };
  }, [activities]);

  // Category distribution (all time)
  const categoryDist = useMemo(() => {
    const catMap = new Map<ActivityCategory, number>();
    activities.forEach(a => {
      catMap.set(a.category, (catMap.get(a.category) || 0) + a.durationMinutes);
    });
    const total = activities.reduce((acc, a) => acc + a.durationMinutes, 0);
    return Array.from(catMap.entries())
      .map(([cat, mins]) => ({
        category: cat,
        minutes: mins,
        percentage: total > 0 ? Math.round((mins / total) * 100) : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [activities]);

  // Productivity heatmap (hours of the day)
  const hourlyHeatmap = useMemo(() => {
    const hours = Array(24).fill(0);
    activities.filter(a => a.isCompleted).forEach(a => {
      const hour = parseInt(a.startTime.split(':')[0], 10);
      hours[hour] += a.durationMinutes;
    });
    const maxVal = Math.max(...hours, 1);
    return hours.map((val, i) => ({ hour: i, minutes: val, intensity: val / maxVal }));
  }, [activities]);

  // Max bar height for the chart
  const maxDayPlanned = Math.max(...last7Days.map(d => d.planned), 60);

  // SVG Donut for category distribution
  let cumulativePercent = 0;

  return (
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={22} style={{ color: 'var(--accent-primary)' }} />
            {t('analytics.title')}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {t('analytics.subtitle')}
          </p>
        </div>
      </div>

      {/* Summary Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
        }}
      >
        {/* Total Activities */}
        <div className="analytics-card">
          <div className="analytics-card__header">
            <Target size={16} />
            <span>{t('analytics.totalActivities')}</span>
          </div>
          <div className="analytics-card__value">{totalStats.totalActivities}</div>
          <span className="analytics-card__sub">
            {totalStats.completedActivities} {t('analytics.completedSuffix')}
          </span>
        </div>

        {/* Total Time */}
        <div className="analytics-card">
          <div className="analytics-card__header" style={{ color: 'var(--accent-primary)' }}>
            <Clock size={16} />
            <span>{t('analytics.timePlanned')}</span>
          </div>
          <div className="analytics-card__value" style={{ color: 'var(--accent-primary)' }}>
            {formatMinutesDuration(totalStats.totalPlanned)}
          </div>
          <span className="analytics-card__sub">
            {formatMinutesDuration(totalStats.totalCompleted)} {t('analytics.completedSuffix')}
          </span>
        </div>

        {/* Completion Rate */}
        <div className="analytics-card">
          <div className="analytics-card__header" style={{ color: 'var(--status-success)' }}>
            <CheckCircle2 size={16} />
            <span>{t('analytics.completionRate')}</span>
          </div>
          <div className="analytics-card__value" style={{ color: 'var(--status-success)' }}>
            {totalStats.completionRate}%
          </div>
          <div style={{ width: '100%', height: 6, backgroundColor: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
            <div
              style={{
                width: `${totalStats.completionRate}%`,
                height: '100%',
                backgroundColor: 'var(--status-success)',
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>

        {/* Focus Time */}
        <div className="analytics-card">
          <div className="analytics-card__header" style={{ color: 'var(--status-warning)' }}>
            <Timer size={16} />
            <span>{t('analytics.focusTime')}</span>
          </div>
          <div className="analytics-card__value" style={{ color: 'var(--status-warning)' }}>
            {formatMinutesDuration(totalStats.totalFocus)}
          </div>
          <span className="analytics-card__sub">
            {streak.totalFocusSessions} {t('analytics.sessionsLogged')}
          </span>
        </div>

        {/* Streak */}
        <div className="analytics-card">
          <div className="analytics-card__header" style={{ color: '#F97316' }}>
            <Flame size={16} />
            <span>{t('analytics.currentStreak')}</span>
          </div>
          <div className="analytics-card__value" style={{ color: '#F97316' }}>
            {streak.currentStreakDays}d
          </div>
          <span className="analytics-card__sub">
            {t('analytics.best')} {streak.longestStreakDays} {t('analytics.days')}
          </span>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
        {/* Weekly Activity Chart (Bar Chart) */}
        <div
          style={{
            padding: 24,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} style={{ color: 'var(--accent-primary)' }} />
            {t('analytics.last7Days')}
          </h4>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, paddingTop: 12 }}>
            {last7Days.map((day) => {
              const plannedHeight = Math.max(4, (day.planned / maxDayPlanned) * 160);
              const completedHeight = Math.max(0, (day.completed / maxDayPlanned) * 160);
              const isToday = day.date === todayStr;

              return (
                <div
                  key={day.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {/* Time label */}
                  <span style={{
                    fontSize: 10,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                  }}>
                    {day.planned > 0 ? formatMinutesDuration(day.planned) : '—'}
                  </span>

                  {/* Bar */}
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 44,
                      height: plannedHeight,
                      borderRadius: 6,
                      backgroundColor: 'var(--bg-subtle)',
                      position: 'relative',
                      overflow: 'hidden',
                      border: isToday ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: completedHeight,
                        backgroundColor: 'var(--accent-primary)',
                        opacity: 0.7,
                        borderRadius: '0 0 4px 4px',
                        transition: 'height 0.4s ease',
                      }}
                    />
                  </div>

                  {/* Day label */}
                  <span style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }} />
              {t('analytics.planned')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: 'var(--accent-primary)', opacity: 0.7 }} />
              {t('analytics.completedLabel')}
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div
          style={{
            padding: 24,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: 'var(--status-warning)' }} />
            {t('analytics.categoryDistribution')}
          </h4>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
            {/* SVG Donut */}
            <svg width="140" height="140" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--bg-subtle)" strokeWidth="5" />
              {categoryDist.map((item) => {
                const strokeDasharray = `${item.percentage} ${100 - item.percentage}`;
                const strokeDashoffset = -cumulativePercent;
                cumulativePercent += item.percentage;
                const catMeta = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.work;
                return (
                  <circle
                    key={item.category}
                    cx="21"
                    cy="21"
                    r="15.91549430918954"
                    fill="transparent"
                    stroke={catMeta.accentColor}
                    strokeWidth="5"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease' }}
                  />
                );
              })}
            </svg>

            {/* Legend / breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 160 }}>
              {categoryDist.map(item => {
                const catMeta = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.work;
                return (
                  <div key={item.category} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: catMeta.accentColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{catMeta.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                          {formatMinutesDuration(item.minutes)}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: catMeta.lightBg,
                          color: catMeta.accentColor,
                        }}>
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Productivity Heatmap */}
      <div
        style={{
          padding: 24,
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Award size={16} style={{ color: 'var(--status-success)' }} />
          {t('analytics.heatmapTitle')}
        </h4>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {t('analytics.heatmapSubtitle')}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {hourlyHeatmap.map((slot) => {
            const label = `${String(slot.hour).padStart(2, '0')}:00`;
            const bgOpacity = slot.intensity;
            return (
              <div
                key={slot.hour}
                title={`${label} — ${formatMinutesDuration(slot.minutes)} completed`}
                style={{
                  width: 52,
                  height: 48,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: slot.intensity > 0
                    ? `rgba(16, 185, 129, ${0.1 + bgOpacity * 0.6})`
                    : 'var(--bg-subtle)',
                  border: '1px solid',
                  borderColor: slot.intensity > 0.5
                    ? 'rgba(16, 185, 129, 0.3)'
                    : 'var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  transition: 'background-color 0.3s ease',
                  cursor: 'default',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)', color: slot.intensity > 0.4 ? 'var(--status-success)' : 'var(--text-muted)' }}>
                  {label}
                </span>
                {slot.minutes > 0 && (
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    {formatMinutesDuration(slot.minutes)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements Section */}
      {streak.achievements && streak.achievements.length > 0 && (
        <div
          style={{
            padding: 24,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={16} style={{ color: '#F59E0B' }} />
            {t('analytics.achievements')}
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
            {streak.achievements.map(ach => (
              <div
                key={ach.id}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: ach.isUnlocked ? 'var(--status-warning-bg)' : 'var(--bg-subtle)',
                  border: '1px solid',
                  borderColor: ach.isUnlocked ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)',
                  opacity: ach.isUnlocked ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{ach.isUnlocked ? '🏆' : '🔒'}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{ach.title}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{ach.description}</p>
                <div style={{ width: '100%', height: 4, backgroundColor: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${ach.progress}%`,
                    height: '100%',
                    backgroundColor: ach.isUnlocked ? '#F59E0B' : 'var(--text-muted)',
                    borderRadius: 2,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  {ach.currentCount}/{ach.targetCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
