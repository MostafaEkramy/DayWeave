import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { SmartPlannerModal } from './components/Planner/SmartPlannerModal';
import { ActivityModal } from './components/Activity/ActivityModal';
import { FocusModal } from './components/Focus/FocusModal';
import { SearchCommandBar } from './components/Common/SearchCommandBar';
import { AuthModal } from './components/Common/AuthModal';
import { NotificationToast } from './components/Common/NotificationToast';
import { getTodayDateString } from './utils/dateUtils';
import { Loader2 } from 'lucide-react';

// Code-splitting via React.lazy for optimized initial bundle
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const WeekPage = lazy(() => import('./pages/WeekPage'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const PageFallback: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 10, color: 'var(--text-muted)' }}>
    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-primary)' }} />
    <span style={{ fontSize: 13, fontWeight: 500 }}>Loading view...</span>
  </div>
);

const AppContent: React.FC = () => {
  const {
    setSelectedDate,
    setIsActivityModalOpen,
    setEditingActivity,
    setIsFocusModalOpen,
    setFocusActivity,
    todayActivities,
  } = useApp();
  const navigate = useNavigate();

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditingActivity(null);
        setIsActivityModalOpen(true);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        setSelectedDate(getTodayDateString());
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        const nextIncomplete = todayActivities.find(a => !a.isCompleted);
        if (nextIncomplete) {
          setFocusActivity(nextIncomplete);
          setIsFocusModalOpen(true);
        }
      } else if (e.key === '1') {
        navigate('/');
      } else if (e.key === '2') {
        navigate('/week');
      } else if (e.key === '3') {
        navigate('/templates');
      } else if (e.key === '4') {
        navigate('/review');
      } else if (e.key === '5') {
        navigate('/analytics');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    todayActivities,
    navigate,
    setSelectedDate,
    setIsActivityModalOpen,
    setEditingActivity,
    setFocusActivity,
    setIsFocusModalOpen,
  ]);

  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-layout__main">
        <Header />

        <main className="main-content">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<TimelinePage />} />
              <Route path="/week" element={<WeekPage />} />
              <Route path="/templates" element={<TemplatesPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Global Modals & Notifications */}
      <SmartPlannerModal />
      <ActivityModal />
      <FocusModal />
      <SearchCommandBar />
      <AuthModal />
      <NotificationToast />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
