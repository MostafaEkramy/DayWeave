import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTitle } from '../../utils/dateUtils';
import { formatMinutesDuration } from '../../utils/timeUtils';
import { EnergyLevel } from '../../types/activity';
import { 
  Clock, 
  Battery, 
  BatteryMedium, 
  BatteryLow, 
  Plus, 
  CheckCircle2, 
  Hourglass,
  AlertCircle
} from 'lucide-react';

export const TodayOverview: React.FC = () => {
  const { 
    selectedDate, 
    timeBudget, 
    userEnergy, 
    setUserEnergy, 
    setIsActivityModalOpen, 
    setEditingActivity 
  } = useApp();
  const { t, language } = useLanguage();

  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit', second: undefined }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [language]);

  const handleOpenNewActivity = () => {
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 20,
      }}
    >
      {/* Date & Live Clock */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          {formatDateTitle(selectedDate, language)}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
          <Clock size={13} />
          <span>{t('overview.localTime')}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {currentTimeStr}
          </span>
        </div>
      </div>

      {/* Metrics Row (Planned, Free, Completed, Energy) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
        {/* Planned Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
            {t('overview.planned')}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {formatMinutesDuration(timeBudget.plannedMinutes)}
          </span>
        </div>

        <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-subtle)' }} />

        {/* Free Time */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
            {t('overview.free')}
          </span>
          <span 
            style={{ 
              fontSize: 14, 
              fontWeight: 700, 
              fontFamily: 'var(--font-mono)', 
              color: timeBudget.isOverBudget ? 'var(--status-danger)' : 'var(--status-success)' 
            }}
          >
            {timeBudget.isOverBudget 
              ? `-${formatMinutesDuration(timeBudget.overBudgetMinutes)} ${t('overview.over')}` 
              : formatMinutesDuration(timeBudget.freeMinutes)}
          </span>
        </div>

        <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-subtle)' }} />

        {/* Completed Progress */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
              {t('overview.completed')}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {timeBudget.completionPercentage}%
            </span>
          </div>
          <div style={{ width: '100%', height: 4, backgroundColor: 'var(--bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
            <div 
              style={{ 
                width: `${timeBudget.completionPercentage}%`, 
                height: '100%', 
                backgroundColor: 'var(--accent-primary)',
                transition: 'width 0.3s ease',
              }} 
            />
          </div>
        </div>

        <div style={{ width: 1, height: 28, backgroundColor: 'var(--border-subtle)' }} />

        {/* Energy Level Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.02em' }}>
            {t('overview.energy')}
          </span>
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 2,
              border: '1px solid var(--border-subtle)',
            }}
          >
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
              const isSelected = userEnergy === level;
              return (
                <button
                  key={level}
                  onClick={() => setUserEnergy(level)}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 'var(--radius-xs)',
                    textTransform: 'capitalize',
                    backgroundColor: isSelected ? 'var(--bg-surface)' : 'transparent',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                    border: isSelected ? '1px solid var(--border-subtle)' : '1px solid transparent',
                  }}
                >
                  {t('overview.' + level) || level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Activity Button */}
        <button
          onClick={handleOpenNewActivity}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            padding: '7px 14px',
            marginLeft: 'auto',
          }}
        >
          <Plus size={15} />
          <span>{t('overview.addActivity')}</span>
        </button>
      </div>
    </div>
  );
};
