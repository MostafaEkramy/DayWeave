import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Clock,
  CalendarDays,
  BookmarkCheck,
  BarChart3,
  Settings,
  TrendingUp,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Sun,
  Moon,
  Layers,
  Languages,
} from 'lucide-react';

interface NavItem {
  path: string;
  labelKey: string;
  shortLabelKey: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', labelKey: 'sidebar.dailyTimeline', shortLabelKey: 'sidebar.dailyTimeline', icon: <Clock size={20} /> },
  { path: '/week', labelKey: 'sidebar.weekView', shortLabelKey: 'sidebar.weekView', icon: <CalendarDays size={20} /> },
  { path: '/templates', labelKey: 'sidebar.templates', shortLabelKey: 'sidebar.templates', icon: <BookmarkCheck size={20} /> },
  { path: '/review', labelKey: 'sidebar.dailyReview', shortLabelKey: 'sidebar.dailyReview', icon: <BarChart3 size={20} /> },
  { path: '/analytics', labelKey: 'sidebar.analytics', shortLabelKey: 'sidebar.analytics', icon: <TrendingUp size={20} /> },
  { path: '/settings', labelKey: 'sidebar.settings', shortLabelKey: 'sidebar.settings', icon: <Settings size={20} /> },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { setIsPlannerOpen, setEditingActivity, setIsActivityModalOpen } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t, toggleLanguage, language } = useLanguage();
  const location = useLocation();

  const handleNewActivity = () => {
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <Layers size={20} />
          </div>
          {!collapsed && (
            <div className="sidebar__logo-text">
              <span className="sidebar__logo-title">{t('brand.name')}</span>
              <span className="sidebar__logo-subtitle">{t('brand.subtitle')}</span>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>

        {/* Quick Actions */}
        <div className="sidebar__actions">
          <button
            className="sidebar__action-btn sidebar__action-btn--primary"
            onClick={handleNewActivity}
            title={t('sidebar.newActivity')}
          >
            <Plus size={18} />
            {!collapsed && <span>{t('sidebar.newActivity')}</span>}
          </button>
          <button
            className="sidebar__action-btn sidebar__action-btn--planner"
            onClick={() => setIsPlannerOpen(true)}
            title={t('sidebar.planMyDay')}
          >
            <Sparkles size={18} />
            {!collapsed && <span>{t('sidebar.planMyDay')}</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="sidebar__nav">
          <div className="sidebar__nav-label">
            {!collapsed && <span>{t('sidebar.navigation')}</span>}
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <span className="sidebar__link-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar__link-label">{t(item.labelKey)}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="sidebar__bottom">
          {/* Language Toggle */}
          <button
            className="sidebar__theme-btn"
            onClick={toggleLanguage}
            title={t('sidebar.language')}
          >
            <Languages size={18} />
            {!collapsed && <span>{t('sidebar.language')}</span>}
          </button>

          {/* Theme Toggle */}
          <button
            className="sidebar__theme-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {!collapsed && <span>{theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {navItems.slice(0, 5).map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={`mobile-bottom-nav__item ${isActive ? 'mobile-bottom-nav__item--active' : ''}`}
            >
              <span className="mobile-bottom-nav__icon">{item.icon}</span>
              <span className="mobile-bottom-nav__label">{t(item.shortLabelKey)}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Floating Action Button (Mobile) */}
      <button
        className="fab"
        onClick={handleNewActivity}
        title={t('sidebar.newActivity')}
        aria-label={t('sidebar.newActivity')}
      >
        <Plus size={24} />
      </button>
    </>
  );
};
