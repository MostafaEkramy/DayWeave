import React from 'react';
import { useApp, AppView } from '../../context/AppContext';
import { Clock, CalendarDays, BookmarkCheck, BarChart3 } from 'lucide-react';

interface TabItem {
  id: AppView;
  label: string;
  icon: React.ReactNode;
}

export const Navigation: React.FC = () => {
  const { activeView, setActiveView } = useApp();

  const tabs: TabItem[] = [
    { id: 'timeline', label: 'Daily Timeline', icon: <Clock size={15} /> },
    { id: 'week', label: 'Week View', icon: <CalendarDays size={15} /> },
    { id: 'templates', label: 'Day Templates', icon: <BookmarkCheck size={15} /> },
    { id: 'review', label: 'Daily Review', icon: <BarChart3 size={15} /> },
  ];

  return (
    <nav 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '16px 0 12px 0',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 20,
      }}
    >
      {tabs.map(tab => {
        const isActive = activeView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: isActive ? 'var(--border-medium)' : 'transparent',
              boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
