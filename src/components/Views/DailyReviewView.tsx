import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTitle } from '../../utils/dateUtils';
import { formatMinutesDuration } from '../../utils/timeUtils';
import { calculateEnergyScore } from '../../services/energyEngine';
import { CATEGORY_DEFINITIONS, ActivityCategory } from '../../types/activity';
import { DailyReview } from '../../types/review';
import { 
  CheckCircle2, 
  Clock, 
  Timer, 
  Zap, 
  Smile, 
  Meh, 
  Frown, 
  Save,
} from 'lucide-react';

export const DailyReviewView: React.FC = () => {
  const { 
    selectedDate, 
    todayActivities, 
    userEnergy, 
    reviews, 
    saveDailyReview, 
    showToast 
  } = useApp();
  const { t, language } = useLanguage();

  const existingReview = reviews[selectedDate];

  // Calculated Metrics
  const plannedMinutes = todayActivities.reduce((acc, a) => acc + a.durationMinutes, 0);
  const completedActivities = todayActivities.filter(a => a.isCompleted);
  const completedMinutes = completedActivities.reduce((acc, a) => acc + a.durationMinutes, 0);
  const skippedMinutes = todayActivities.filter(a => !a.isCompleted).reduce((acc, a) => acc + a.durationMinutes, 0);
  const focusMinutes = todayActivities.reduce((acc, a) => acc + (a.focusMinutesLogged || 0), 0);
  const completionRate = plannedMinutes > 0 ? Math.round((completedMinutes / plannedMinutes) * 100) : 0;
  const energyAlignmentScore = calculateEnergyScore(userEnergy, todayActivities);

  // Category Breakdown for SVG Donut
  const categoryMap = new Map<ActivityCategory, number>();
  todayActivities.forEach(a => {
    categoryMap.set(a.category, (categoryMap.get(a.category) || 0) + a.durationMinutes);
  });

  const categoryBreakdown = Array.from(categoryMap.entries()).map(([cat, mins]) => ({
    category: cat,
    minutes: mins,
    percentage: plannedMinutes > 0 ? Math.round((mins / plannedMinutes) * 100) : 0,
  }));

  // Form State
  const [reflection, setReflection] = useState(existingReview?.reflectionNote || '');
  const [mood, setMood] = useState<'productive' | 'steady' | 'tired' | 'overwhelmed'>(
    existingReview?.mood || 'productive'
  );

  // Sync state when selectedDate changes
  React.useEffect(() => {
    const current = reviews[selectedDate];
    setReflection(current?.reflectionNote || '');
    setMood(current?.mood || 'productive');
  }, [selectedDate, reviews]);

  const handleSaveReview = React.useCallback((customReflection?: string, customMood?: 'productive' | 'steady' | 'tired' | 'overwhelmed', showFeedback = true) => {
    const refText = customReflection !== undefined ? customReflection : reflection;
    const moodVal = customMood !== undefined ? customMood : mood;

    const reviewData: DailyReview = {
      id: `rev-${selectedDate}`,
      date: selectedDate,
      plannedMinutes,
      completedMinutes,
      movedMinutes: 0,
      skippedMinutes,
      focusMinutes,
      completionRate,
      energyAlignmentScore,
      categoryBreakdown,
      reflectionNote: refText,
      mood: moodVal,
      createdAt: existingReview?.createdAt || new Date().toISOString(),
    };

    saveDailyReview(reviewData);
    if (showFeedback) {
      showToast(t('review.reviewRecorded'));
    }
  }, [selectedDate, plannedMinutes, completedMinutes, skippedMinutes, focusMinutes, completionRate, energyAlignmentScore, categoryBreakdown, reflection, mood, existingReview, saveDailyReview, showToast, t]);

  // Auto-save on blur or reflection change after 1.5s idle
  React.useEffect(() => {
    if (!reflection && !existingReview) return;
    const timer = setTimeout(() => {
      handleSaveReview(reflection, mood, false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [reflection, mood, handleSaveReview, existingReview]);

  // SVG Donut calculation
  let cumulativePercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
            {t('review.title')} — {formatDateTitle(selectedDate, language)}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('review.subtitle')}
          </p>
        </div>

        <button
          onClick={() => handleSaveReview()}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
        >
          <Save size={15} />
          <span>{t('review.saveReview')}</span>
        </button>
      </div>

      {/* 4 Core Metric Cards */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 12 
        }}
      >
        {/* Planned */}
        <div 
          style={{ 
            padding: 16, 
            backgroundColor: 'var(--bg-surface)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
            <Clock size={14} />
            <span>{t('review.totalPlanned')}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 8 }}>
            {formatMinutesDuration(plannedMinutes)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('review.scheduledBlocks', { count: todayActivities.length })}
          </span>
        </div>

        {/* Completed */}
        <div 
          style={{ 
            padding: 16, 
            backgroundColor: 'var(--bg-surface)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-success)', fontSize: 12, fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            <span>{t('review.completed')}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 8, color: 'var(--status-success)' }}>
            {formatMinutesDuration(completedMinutes)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('review.executionRate', { 
              rate: completionRate, 
              done: completedActivities.length, 
              total: todayActivities.length 
            })}
          </span>
        </div>

        {/* Focus Time */}
        <div 
          style={{ 
            padding: 16, 
            backgroundColor: 'var(--bg-surface)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-primary)', fontSize: 12, fontWeight: 600 }}>
            <Timer size={14} />
            <span>{t('review.focusTime')}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 8, color: 'var(--accent-primary)' }}>
            {formatMinutesDuration(focusMinutes)}
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('review.loggedFocusMode')}
          </span>
        </div>

        {/* Energy Alignment */}
        <div 
          style={{ 
            padding: 16, 
            backgroundColor: 'var(--bg-surface)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border-subtle)' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-warning)', fontSize: 12, fontWeight: 600 }}>
            <Zap size={14} />
            <span>{t('review.energyAlignment')}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', marginTop: 8, color: 'var(--status-warning)' }}>
            {energyAlignmentScore}%
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('review.dayPaceVs', { energy: t('overview.' + userEnergy) || userEnergy })}
          </span>
        </div>
      </div>

      {/* Two-Column Detail: Category Distribution + Evening Reflection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Category Breakdown (Clean SVG Chart) */}
        <div
          style={{
            padding: 20,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{t('review.categoryInvestment')}</h4>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            {/* SVG Donut */}
            <svg width="120" height="120" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--bg-subtle)" strokeWidth="5" />
              {categoryBreakdown.map((item) => {
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
                  />
                );
              })}
            </svg>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 140 }}>
              {categoryBreakdown.map(item => {
                const catMeta = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.work;
                const label = t('categories.' + item.category) || catMeta.label;
                return (
                  <div key={item.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: catMeta.accentColor }} />
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {formatMinutesDuration(item.minutes)} ({item.percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Qualitative Reflection & Mood */}
        <div
          style={{
            padding: 20,
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 700 }}>{t('review.howDidToday')}</h4>

          {/* Mood Selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { id: 'productive', label: t('review.productive'), icon: <Smile size={14} /> },
              { id: 'steady', label: t('review.steady'), icon: <Meh size={14} /> },
              { id: 'tired', label: t('review.tired'), icon: <Frown size={14} /> },
              { id: 'overwhelmed', label: t('review.overwhelmed'), icon: <Zap size={14} /> },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMood(m.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: mood === m.id ? 'var(--accent-primary-subtle)' : 'var(--bg-subtle)',
                  color: mood === m.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: mood === m.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                }}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {t('review.reflectionNotes')}
            </label>
            <textarea
              rows={4}
              placeholder={t('review.reflectionPlaceholder')}
              value={reflection}
              onChange={e => setReflection(e.target.value)}
              style={{ fontSize: 13, lineHeight: 1.5 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
