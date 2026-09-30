import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateTitle } from '../../utils/dateUtils';
import { formatMinutesDuration } from '../../utils/timeUtils';
import { EnergyLevel } from '../../types/activity';
import { Clock, Plus } from 'lucide-react';

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
    <div className="today-overview">
      {/* Date & Live Clock */}
      <div className="today-overview__header">
        <h2 className="today-overview__title">
          {formatDateTitle(selectedDate, language)}
        </h2>
        <div className="today-overview__time">
          <Clock size={13} />
          <span>{t('overview.localTime')}</span>
          <span className="today-overview__time-value">
            {currentTimeStr}
          </span>
        </div>
      </div>

      {/* Metrics Row (Planned, Free, Completed) */}
      <div className="today-overview__metrics">
        {/* Planned Time */}
        <div className="today-overview__metric">
          <span className="today-overview__metric-label">
            {t('overview.planned')}
          </span>
          <span className="today-overview__metric-value">
            {formatMinutesDuration(timeBudget.plannedMinutes)}
          </span>
        </div>

        <div className="today-overview__divider" />

        {/* Free Time */}
        <div className="today-overview__metric">
          <span className="today-overview__metric-label">
            {t('overview.free')}
          </span>
          <span 
            className="today-overview__metric-value"
            style={{ 
              color: timeBudget.isOverBudget ? 'var(--status-danger)' : 'var(--status-success)' 
            }}
          >
            {timeBudget.isOverBudget 
              ? `-${formatMinutesDuration(timeBudget.overBudgetMinutes)} ${t('overview.over')}` 
              : formatMinutesDuration(timeBudget.freeMinutes)}
          </span>
        </div>

        <div className="today-overview__divider" />

        {/* Completed Progress */}
        <div className="today-overview__metric today-overview__metric--progress">
          <div className="today-overview__progress-header">
            <span className="today-overview__metric-label">
              {t('overview.completed')}
            </span>
            <span className="today-overview__progress-pct">
              {timeBudget.completionPercentage}%
            </span>
          </div>
          <div className="today-overview__progress-bar">
            <div 
              className="today-overview__progress-fill"
              style={{ width: `${timeBudget.completionPercentage}%` }} 
            />
          </div>
        </div>
      </div>

      {/* Controls: Energy & Add Activity */}
      <div className="today-overview__controls">
        <div className="today-overview__energy">
          <span className="today-overview__energy-label">
            {t('overview.energy')}
          </span>
          <div className="today-overview__energy-pills">
            {(['low', 'medium', 'high'] as EnergyLevel[]).map((level) => {
              const isSelected = userEnergy === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUserEnergy(level)}
                  className={`today-overview__energy-btn ${isSelected ? 'today-overview__energy-btn--selected' : ''}`}
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
          className="btn-secondary today-overview__add-btn"
        >
          <Plus size={15} />
          <span>{t('overview.addActivity')}</span>
        </button>
      </div>
    </div>
  );
};
