import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { formatDateShort, shiftDate, isDateToday, getTodayDateString } from '../../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  Flame,
  User,
} from 'lucide-react';
import { NotificationsPopover } from '../Common/NotificationsPopover';
import { StreakModal } from '../Common/StreakModal';

export const Header: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    setIsSearchPaletteOpen,
    setIsAuthModalOpen,
    streak,
    conflicts,
  } = useApp();

  const { currentUser, isGuest, userProfile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  
  const profilePhoto = userProfile?.photoURL || currentUser?.photoURL || '';

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);

  const handlePrevDay = () => setSelectedDate(shiftDate(selectedDate, -1));
  const handleNextDay = () => setSelectedDate(shiftDate(selectedDate, 1));
  const handleToday = () => setSelectedDate(getTodayDateString());

  const hasConflicts = conflicts.length > 0;

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          {/* Left: Date Navigator */}
          <div className="app-header__date-nav">
            <button
              onClick={handlePrevDay}
              className="btn-icon-subtle"
              title={t('header.previousDay')}
              aria-label={t('header.previousDay')}
            >
              {isRTL ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            <span className="app-header__date-label">
              {formatDateShort(selectedDate, language)}
            </span>

            <button
              onClick={handleNextDay}
              className="btn-icon-subtle"
              title={t('header.nextDay')}
              aria-label={t('header.nextDay')}
            >
              {isRTL ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {!isDateToday(selectedDate) && (
              <button
                onClick={handleToday}
                className="app-header__today-btn"
              >
                {t('header.today')}
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="app-header__actions">
            {/* Search */}
            <button
              className="btn-icon"
              onClick={() => setIsSearchPaletteOpen(true)}
              title={t('header.search') + ' (⌘K)'}
              aria-label={t('header.search')}
            >
              <Search size={16} />
            </button>

            {/* Streak */}
            <button
              onClick={() => setIsStreakModalOpen(true)}
              className="app-header__streak-btn"
              title={`${streak.currentStreakDays} ${t('header.streak')}`}
            >
              <Flame size={15} />
              <span>{streak.currentStreakDays}d</span>
            </button>

            {/* Notifications */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn-icon"
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                title={t('header.notifications')}
                aria-label={t('header.notifications')}
              >
                <Bell size={16} />
                {hasConflicts && (
                  <span className="app-header__notification-dot" />
                )}
              </button>

              {isNotificationsOpen && (
                <NotificationsPopover onClose={() => setIsNotificationsOpen(false)} />
              )}
            </div>

            {/* User */}
            <button
              className="btn-icon"
              onClick={() => setIsAuthModalOpen(true)}
              title={currentUser && !isGuest ? (userProfile?.displayName || currentUser.displayName || currentUser.email || t('header.profile')) : t('header.signIn')}
              aria-label={t('header.profile')}
              style={profilePhoto ? { padding: 0, overflow: 'hidden' } : undefined}
            >
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Profile"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <User size={16} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Streak modal */}
      {isStreakModalOpen && (
        <StreakModal onClose={() => setIsStreakModalOpen(false)} />
      )}
    </>
  );
};
