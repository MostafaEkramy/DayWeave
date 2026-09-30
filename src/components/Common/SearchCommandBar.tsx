import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { CATEGORY_DEFINITIONS } from '../../types/activity';
import { formatDateShort } from '../../utils/dateUtils';
import { 
  Search, 
  X, 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Plus, 
  Calendar, 
  BarChart2, 
  BookOpen, 
  Settings, 
  Moon, 
  Sun,
  Globe
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  action: () => void;
}

export const SearchCommandBar: React.FC = () => {
  const { 
    isSearchPaletteOpen, 
    setIsSearchPaletteOpen, 
    activities, 
    setSelectedDate, 
    setIsActivityModalOpen,
    setIsPlannerOpen,
  } = useApp();

  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [energyFilter, setEnergyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Quick Action Commands
  const quickActions: QuickAction[] = useMemo(() => [
    {
      id: 'act-add',
      title: 'New Activity',
      subtitle: 'Create and schedule a new task',
      icon: <Plus size={16} />,
      action: () => { setIsActivityModalOpen(true); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'act-plan',
      title: 'Smart Planner',
      subtitle: 'Auto-organize your day using AI constraints',
      icon: <Sparkles size={16} />,
      action: () => { setIsPlannerOpen(true); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'nav-timeline',
      title: 'Go to Timeline',
      subtitle: '24-hour visual daily schedule',
      icon: <Calendar size={16} />,
      action: () => { navigate('/'); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'nav-week',
      title: 'Go to Week View',
      subtitle: '7-day overview and task matrix',
      icon: <Calendar size={16} />,
      action: () => { navigate('/week'); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'nav-analytics',
      title: 'Go to Analytics',
      subtitle: 'Productivity metrics, heatmap and insights',
      icon: <BarChart2 size={16} />,
      action: () => { navigate('/analytics'); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'nav-review',
      title: 'Daily Review & Journal',
      subtitle: 'Reflect on today and set tomorrow goals',
      icon: <BookOpen size={16} />,
      action: () => { navigate('/review'); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      subtitle: 'Preferences, time window & data backup',
      icon: <Settings size={16} />,
      action: () => { navigate('/settings'); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'theme-toggle',
      title: theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme',
      subtitle: 'Toggle interface visual theme',
      icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />,
      action: () => { toggleTheme(); setIsSearchPaletteOpen(false); },
    },
    {
      id: 'lang-toggle',
      title: language === 'ar' ? 'Switch to English' : 'التحويل إلى العربية',
      subtitle: 'Toggle Arabic / English language & RTL',
      icon: <Globe size={16} />,
      action: () => { setLanguage(language === 'ar' ? 'en' : 'ar'); setIsSearchPaletteOpen(false); },
    },
  ], [navigate, setIsActivityModalOpen, setIsPlannerOpen, setIsSearchPaletteOpen, theme, toggleTheme, language, setLanguage]);

  // Keyboard shortcut listener (Cmd/Ctrl + K and Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchPaletteOpen(!isSearchPaletteOpen);
      } else if (e.key === 'Escape' && isSearchPaletteOpen) {
        setIsSearchPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchPaletteOpen, setIsSearchPaletteOpen]);

  useEffect(() => {
    if (isSearchPaletteOpen) {
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isSearchPaletteOpen]);

  const filteredActivities = useMemo(() => {
    return activities.filter(act => {
      // Query match (title, notes, location)
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(q);
        const matchesNotes = act.notes?.toLowerCase().includes(q);
        const matchesLoc = act.location?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesLoc) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && act.category !== categoryFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && act.priority !== priorityFilter) {
        return false;
      }

      // Energy filter
      if (energyFilter !== 'all' && act.energyLevel !== energyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'completed' && !act.isCompleted) return false;
      if (statusFilter === 'active' && act.isCompleted) return false;

      return true;
    });
  }, [activities, query, categoryFilter, priorityFilter, energyFilter, statusFilter]);

  const matchingActions = useMemo(() => {
    if (!query.trim()) return quickActions.slice(0, 4);
    const q = query.toLowerCase();
    return quickActions.filter(a => a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q));
  }, [query, quickActions]);

  const totalItemsCount = matchingActions.length + filteredActivities.length;

  // Keyboard navigation through list (ArrowUp, ArrowDown, Enter)
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalItemsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalItemsCount) % Math.max(1, totalItemsCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex < matchingActions.length) {
        matchingActions[selectedIndex]?.action();
      } else {
        const actIndex = selectedIndex - matchingActions.length;
        const act = filteredActivities[actIndex];
        if (act) {
          handleSelectActivity(act);
        }
      }
    }
  };

  const handleSelectActivity = (act: typeof activities[0]) => {
    setSelectedDate(act.date);
    navigate('/');
    setIsSearchPaletteOpen(false);
  };

  if (!isSearchPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette and Search"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '10vh',
        zIndex: 'var(--z-modal)',
        paddingLeft: 16,
        paddingRight: 16,
      }}
      onClick={() => setIsSearchPaletteOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search activities, jump to page, or run a command..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleInputKeyDown}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="btn-icon-subtle"
              style={{ width: 24, height: 24 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            backgroundColor: 'var(--bg-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            overflowX: 'auto',
          }}
        >
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: '3px 8px', fontSize: 11, width: 'auto' }}
          >
            <option value="all">All Categories</option>
            <option value="study">Study</option>
            <option value="work">Work</option>
            <option value="health">Health</option>
            <option value="personal">Personal</option>
            <option value="social">Social</option>
            <option value="entertainment">Entertainment</option>
            <option value="rest">Rest</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            style={{ padding: '3px 8px', fontSize: 11, width: 'auto' }}
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as 'all' | 'completed' | 'active')}
            style={{ padding: '3px 8px', fontSize: 11, width: 'auto' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
          </select>
        </div>

        {/* Results List */}
        <div 
          role="listbox"
          style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          {/* Actions Section */}
          {matchingActions.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 10px' }}>
                Quick Actions
              </div>
              {matchingActions.map((act, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <div
                    key={act.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={act.action}
                    onMouseEnter={() => setSelectedIndex(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      flexShrink: 0,
                    }}>
                      {act.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {act.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {act.subtitle}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Activities Section */}
          {filteredActivities.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 10px' }}>
                Scheduled Activities
              </div>
              {filteredActivities.map((act, idx) => {
                const itemGlobalIndex = matchingActions.length + idx;
                const isSelected = selectedIndex === itemGlobalIndex;
                const catMeta = CATEGORY_DEFINITIONS[act.category] || CATEGORY_DEFINITIONS.work;

                return (
                  <div
                    key={act.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectActivity(act)}
                    onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                      transition: 'background-color 0.1s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: act.isCompleted ? 'var(--status-success)' : 'var(--text-muted)' }}>
                        {act.isCompleted ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </span>

                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: catMeta.accentColor,
                        }}
                      />

                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                          {act.title}
                        </span>
                        {act.location && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                            📍 {act.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {formatDateShort(act.date)} at {act.startTime}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          padding: '1px 6px',
                          borderRadius: 3,
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {catMeta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {matchingActions.length === 0 && filteredActivities.length === 0 && (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No commands or activities found matching "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div
          style={{
            padding: '8px 18px',
            backgroundColor: 'var(--bg-subtle)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--text-muted)',
          }}
        >
          <span>Use ↑↓ to navigate • Enter to select</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
