import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { shiftDate, getTodayDateString } from '../../utils/dateUtils';
import { formatMinutesDuration } from '../../utils/timeUtils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  Clock, 
  Award, 
  Flame, 
  CheckCircle2, 
  BookOpen,
  ArrowUpRight,
  Info
} from 'lucide-react';

type Timeframe = 7 | 14 | 30;
type MetricMode = 'growth' | 'hours';

interface DayMetric {
  date: string;
  dayLabel: string;
  formattedDate: string;
  plannedMinutes: number;
  completedMinutes: number;
  focusMinutes: number;
  studyMinutes: number; // focus + study category completed
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  score: number; // 0 to 100
}

export const GrowthTrendChart: React.FC = () => {
  const { activities, streak } = useApp();
  const { t, language, isRTL } = useLanguage();
  const todayStr = getTodayDateString();

  const [timeframe, setTimeframe] = useState<Timeframe>(7);
  const [metricMode, setMetricMode] = useState<MetricMode>('growth');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute daily metrics for the chosen timeframe
  const daysData = useMemo<DayMetric[]>(() => {
    const list: DayMetric[] = [];

    for (let i = timeframe - 1; i >= 0; i--) {
      const dateStr = shiftDate(todayStr, -i);
      const dayActivities = activities.filter(a => a.date === dateStr);

      const plannedMinutes = dayActivities.reduce((acc, a) => acc + a.durationMinutes, 0);
      const completedActivities = dayActivities.filter(a => a.isCompleted);
      const completedMinutes = completedActivities.reduce((acc, a) => acc + a.durationMinutes, 0);
      
      const focusMinutes = dayActivities.reduce((acc, a) => acc + (a.focusMinutesLogged || 0), 0);
      const studyTasksMinutes = completedActivities
        .filter(a => a.category === 'study')
        .reduce((acc, a) => acc + a.durationMinutes, 0);
      
      const studyMinutes = Math.max(focusMinutes, studyTasksMinutes, focusMinutes + (studyTasksMinutes > focusMinutes ? studyTasksMinutes - focusMinutes : 0));

      const totalTasks = dayActivities.length;
      const completedTasks = completedActivities.length;
      const completionRate = plannedMinutes > 0 ? Math.min(100, Math.round((completedMinutes / plannedMinutes) * 100)) : 0;

      // Score calculation (0 to 100):
      // Weighted between completion rate (60%), study/focus minutes (30%), and task count (10%)
      const focusBonus = Math.min(30, Math.round((studyMinutes / 120) * 30)); // 2 hours = 30 pts
      const ratePoints = Math.round((completionRate / 100) * 60);
      const taskPoints = totalTasks > 0 ? Math.min(10, completedTasks * 3) : 0;
      
      let rawScore = ratePoints + focusBonus + taskPoints;
      // If no tasks planned, check if user logged focus time
      if (totalTasks === 0 && studyMinutes > 0) {
        rawScore = Math.min(100, Math.round((studyMinutes / 60) * 35));
      }

      const score = Math.min(100, Math.max(0, rawScore));

      const dateObj = new Date(dateStr + 'T00:00:00');
      const dayLabel = dateObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'short' });
      const formattedDate = dateObj.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' });

      list.push({
        date: dateStr,
        dayLabel,
        formattedDate,
        plannedMinutes,
        completedMinutes,
        focusMinutes,
        studyMinutes,
        totalTasks,
        completedTasks,
        completionRate,
        score,
      });
    }

    return list;
  }, [activities, timeframe, todayStr, language]);

  // Compare first half of period with second half to calculate growth velocity
  const growthAnalysis = useMemo(() => {
    const half = Math.floor(daysData.length / 2);
    const firstHalf = daysData.slice(0, half);
    const secondHalf = daysData.slice(half);

    const avgScore1 = firstHalf.length > 0 ? firstHalf.reduce((acc, d) => acc + d.score, 0) / firstHalf.length : 0;
    const avgScore2 = secondHalf.length > 0 ? secondHalf.reduce((acc, d) => acc + d.score, 0) / secondHalf.length : 0;

    const diff = Math.round(avgScore2 - avgScore1);
    const percentChange = avgScore1 > 0 ? Math.round(((avgScore2 - avgScore1) / avgScore1) * 100) : (avgScore2 > 0 ? 25 : 0);

    const isRising = diff > 3;
    const isDropping = diff < -5;

    // Total study/focus hours in period
    const totalStudyMins = daysData.reduce((acc, d) => acc + d.studyMinutes, 0);
    const totalCompletedMins = daysData.reduce((acc, d) => acc + d.completedMinutes, 0);
    const avgDailyMins = Math.round(totalCompletedMins / daysData.length);
    const peakDay = [...daysData].sort((a, b) => b.score - a.score)[0];

    return {
      diff,
      percentChange: Math.abs(percentChange),
      trend: isRising ? 'up' : (isDropping ? 'down' : 'steady'),
      totalStudyMins,
      totalCompletedMins,
      avgDailyMins,
      peakDay,
      currentPeriodScore: Math.round(avgScore2),
    };
  }, [daysData]);

  // Level & XP System
  const levelInfo = useMemo(() => {
    const allCompletedMinutes = activities
      .filter(a => a.isCompleted)
      .reduce((acc, a) => acc + a.durationMinutes, 0);
    const totalFocusMinutes = streak.totalFocusMinutes || 0;
    const totalXpMinutes = allCompletedMinutes + totalFocusMinutes;

    // Levels:
    // Level 1: 0 - 300 mins
    // Level 2: 301 - 900 mins
    // Level 3: 901 - 2100 mins
    // Level 4: 2101 - 4500 mins
    // Level 5: 4501+ mins
    let level = 1;
    let badgeKey = 'growth.levelBadge1';
    let minXp = 0;
    let maxXp = 300;

    if (totalXpMinutes >= 4500) {
      level = 5;
      badgeKey = 'growth.levelBadge5';
      minXp = 4500;
      maxXp = 8000;
    } else if (totalXpMinutes >= 2100) {
      level = 4;
      badgeKey = 'growth.levelBadge4';
      minXp = 2100;
      maxXp = 4500;
    } else if (totalXpMinutes >= 900) {
      level = 3;
      badgeKey = 'growth.levelBadge3';
      minXp = 900;
      maxXp = 2100;
    } else if (totalXpMinutes >= 300) {
      level = 2;
      badgeKey = 'growth.levelBadge2';
      minXp = 300;
      maxXp = 900;
    }

    const levelProgress = Math.min(100, Math.max(5, Math.round(((totalXpMinutes - minXp) / (maxXp - minXp)) * 100)));

    return {
      level,
      badge: t(badgeKey),
      totalHours: Math.round((totalXpMinutes / 60) * 10) / 10,
      levelProgress,
      neededHours: Math.max(0, Math.round(((maxXp - totalXpMinutes) / 60) * 10) / 10),
    };
  }, [activities, streak, t]);

  // SVG Chart Dimensions & Coordinates calculation
  const svgWidth = 800;
  const svgHeight = 220;
  const padTop = 25;
  const padBottom = 35;
  const padLeft = 40;
  const padRight = 40;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = useMemo(() => {
    if (metricMode === 'growth') {
      return 100;
    }
    const maxMins = Math.max(...daysData.map(d => Math.max(d.completedMinutes, d.studyMinutes)), 60);
    return Math.ceil(maxMins / 60) * 60; // round to next hour
  }, [metricMode, daysData]);

  const points = useMemo(() => {
    const step = daysData.length > 1 ? chartW / (daysData.length - 1) : chartW;
    return daysData.map((d, idx) => {
      const val = metricMode === 'growth' ? d.score : (d.completedMinutes || d.studyMinutes);
      const ratio = Math.min(1, Math.max(0, val / maxVal));
      const x = padLeft + idx * step;
      const y = padTop + chartH - ratio * chartH;
      return { x, y, data: d, val };
    });
  }, [daysData, metricMode, maxVal, chartW, chartH, padLeft, padTop]);

  // Generate cubic bezier curve for ultra smooth line
  const { pathD, areaD } = useMemo(() => {
    if (points.length === 0) return { pathD: '', areaD: '' };
    if (points.length === 1) {
      const p = points[0];
      return {
        pathD: `M ${p.x} ${p.y}`,
        areaD: `M ${p.x} ${padTop + chartH} L ${p.x} ${p.y} L ${p.x} ${padTop + chartH} Z`,
      };
    }

    let pStr = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx = (p0.x + p1.x) / 2;
      pStr += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = padTop + chartH;
    const aStr = `${pStr} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;

    return { pathD: pStr, areaD: aStr };
  }, [points, padTop, chartH]);

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : points[points.length - 1];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        padding: 24,
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="animate-fade-in"
    >
      {/* Top Header & Level Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
              flexShrink: 0,
            }}
          >
            <TrendingUp size={24} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', margin: 0 }}>
                {t('growth.title')}
              </h3>

              {/* Dynamic Status Badge */}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 9px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: growthAnalysis.trend === 'up' 
                    ? 'rgba(16, 185, 129, 0.12)' 
                    : growthAnalysis.trend === 'down' 
                    ? 'rgba(239, 68, 68, 0.1)' 
                    : 'rgba(59, 130, 246, 0.1)',
                  color: growthAnalysis.trend === 'up' 
                    ? 'var(--status-success)' 
                    : growthAnalysis.trend === 'down' 
                    ? 'var(--status-danger)' 
                    : 'var(--accent-primary)',
                  border: `1px solid ${
                    growthAnalysis.trend === 'up'
                      ? 'rgba(16, 185, 129, 0.25)'
                      : growthAnalysis.trend === 'down'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(59, 130, 246, 0.2)'
                  }`,
                }}
              >
                {growthAnalysis.trend === 'up' && <ArrowUpRight size={13} />}
                {growthAnalysis.trend === 'down' && <TrendingDown size={13} />}
                {growthAnalysis.trend === 'steady' && <Minus size={13} />}
                <span>
                  {growthAnalysis.trend === 'up'
                    ? t('growth.statusRising')
                    : growthAnalysis.trend === 'down'
                    ? t('growth.statusNeedsFocus')
                    : t('growth.statusSteady')}
                </span>
              </span>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>
              {t('growth.subtitle')}
            </p>
          </div>
        </div>

        {/* Level XP Pill & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Current Level Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
              }}
            >
              L{levelInfo.level}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {levelInfo.badge}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{levelInfo.totalHours}h {t('analytics.completedSuffix')}</span>
                <span>•</span>
                <span>{levelInfo.levelProgress}% XP</span>
              </div>
            </div>
          </div>

          {/* Timeframe selector (7 / 14 / 30) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              padding: 3,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {([7, 14, 30] as Timeframe[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  backgroundColor: timeframe === tf ? 'var(--bg-surface)' : 'transparent',
                  color: timeframe === tf ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  boxShadow: timeframe === tf ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tf === 7 ? t('growth.timeframe7') : tf === 14 ? t('growth.timeframe14') : t('growth.timeframe30')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Trajectory Status Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: growthAnalysis.trend === 'up'
            ? 'rgba(16, 185, 129, 0.08)'
            : 'rgba(59, 130, 246, 0.06)',
          border: `1px solid ${
            growthAnalysis.trend === 'up'
              ? 'rgba(16, 185, 129, 0.2)'
              : 'rgba(59, 130, 246, 0.18)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles
            size={18}
            style={{
              color: growthAnalysis.trend === 'up' ? 'var(--status-success)' : 'var(--accent-primary)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {growthAnalysis.trend === 'up'
              ? t('growth.trendUp').replace('{percent}', String(growthAnalysis.percentChange || 15))
              : growthAnalysis.trend === 'down'
              ? t('growth.trendDown')
              : t('growth.trendSteady')}
          </span>
        </div>

        {/* Metric Switcher: Score % vs Hours */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
            {t('growth.levelStatusNotice')}:
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => setMetricMode('growth')}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: metricMode === 'growth' ? 'var(--accent-primary)' : 'transparent',
                color: metricMode === 'growth' ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              {t('growth.metricGrowth')}
            </button>
            <button
              onClick={() => setMetricMode('hours')}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '3px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: metricMode === 'hours' ? 'var(--accent-primary)' : 'transparent',
                color: metricMode === 'hours' ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              {t('growth.metricHours')}
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Curve Chart */}
      <div style={{ position: 'relative', width: '100%', marginTop: 6 }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: 'auto', overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Area Gradient */}
            <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#6366F1" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>

            {/* Line Glow */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3B82F6" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padTop + chartH * (1 - ratio);
            const valLabel = metricMode === 'growth' 
              ? `${Math.round(ratio * 100)}%`
              : `${Math.round((ratio * maxVal) / 60)}h`;
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.6"
                />
                <text
                  x={isRTL ? svgWidth - padRight + 6 : padLeft - 8}
                  y={y + 3}
                  textAnchor={isRTL ? 'start' : 'end'}
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                  fill="var(--text-muted)"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaD && (
            <path
              d={areaD}
              fill="url(#growthAreaGradient)"
              style={{ transition: 'd 0.3s ease' }}
            />
          )}

          {/* The Glowing Trend Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              style={{ transition: 'd 0.3s ease' }}
            />
          )}

          {/* Data Points */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;
            const isToday = p.data.date === todayStr;

            return (
              <g key={p.data.date}>
                {/* Click / Hover Target */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="transparent"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onTouchStart={() => setHoveredIndex(idx)}
                />

                {/* Outer Ring */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? 7 : isToday ? 5 : 4}
                  fill="var(--bg-surface)"
                  stroke={isToday ? '#10B981' : '#3B82F6'}
                  strokeWidth={isHovered ? 3 : 2}
                  style={{ transition: 'all 0.15s ease', cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                />

                {/* Inner Dot */}
                {(isHovered || isToday) && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 3.5 : 2.5}
                    fill={isToday ? '#10B981' : '#3B82F6'}
                  />
                )}

                {/* X-axis Day labels */}
                {timeframe <= 14 || idx % 2 === 0 ? (
                  <text
                    x={p.x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isToday ? '700' : '500'}
                    fontFamily="var(--font-sans)"
                    fill={isToday ? 'var(--accent-primary)' : 'var(--text-muted)'}
                  >
                    {p.data.dayLabel}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {activePoint && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: isRTL ? 'auto' : 12,
              left: isRTL ? 12 : 'auto',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              zIndex: 10,
              pointerEvents: 'none',
            }}
            className="animate-scale-in"
          >
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {activePoint.data.formattedDate} {activePoint.data.date === todayStr ? `(${t('header.today')})` : ''}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {metricMode === 'growth' 
                  ? `${activePoint.data.score}% ${t('growth.performanceScore')}`
                  : formatMinutesDuration(activePoint.data.completedMinutes || activePoint.data.studyMinutes)}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 12 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={12} style={{ color: '#6366F1' }} />
                <span>{t('growth.studiedHours')}: <strong>{formatMinutesDuration(activePoint.data.studyMinutes)}</strong></span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                <CheckCircle2 size={12} style={{ color: 'var(--status-success)' }} />
                <span>{t('growth.tasksCompleted')}: <strong>{activePoint.data.completedTasks}/{activePoint.data.totalTasks}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Footer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {/* Total Focus & Study Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <BookOpen size={13} style={{ color: '#6366F1' }} />
            {t('growth.totalStudied')}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {formatMinutesDuration(growthAnalysis.totalStudyMins)}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {timeframe} {t('analytics.days')}
          </span>
        </div>

        {/* Growth Rate vs previous period */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <TrendingUp size={13} style={{ color: 'var(--status-success)' }} />
            {t('growth.growthRate')}
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: growthAnalysis.trend === 'up' ? 'var(--status-success)' : 'var(--text-primary)',
            }}
          >
            {growthAnalysis.trend === 'up' ? `+${growthAnalysis.percentChange}%` : `${growthAnalysis.percentChange}%`}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {t('growth.compareLastWeek')}
          </span>
        </div>

        {/* Daily Average */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} style={{ color: 'var(--accent-primary)' }} />
            {t('growth.dailyAverage')}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {formatMinutesDuration(growthAnalysis.avgDailyMins)}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            / {t('analytics.days')}
          </span>
        </div>

        {/* Peak Performance Day */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Award size={13} style={{ color: '#F59E0B' }} />
            {t('growth.peakDay')}
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
            {growthAnalysis.peakDay?.dayLabel || '—'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
            {growthAnalysis.peakDay ? `${growthAnalysis.peakDay.score}% • ${formatMinutesDuration(growthAnalysis.peakDay.completedMinutes)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
