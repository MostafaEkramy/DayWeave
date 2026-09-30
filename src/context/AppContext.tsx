import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Activity, EnergyLevel } from '../types/activity';
import { ScheduleConflict, TimeBudget, TimeWindow } from '../types/schedule';
import { ScheduleTemplate } from '../types/template';
import { DailyReview } from '../types/review';
import { UserStreak } from '../types/streak';
import { storageService, type SyncStatus } from '../services/storageService';
import { detectConflicts, autoResolveAllConflicts } from '../services/conflictEngine';
import { dynamicRescheduleRemainingDay } from '../services/schedulerEngine';
import { isActivityDueOnDate } from '../services/recurringEngine';
import { notificationService } from '../services/notificationService';
import { getTodayDateString } from '../utils/dateUtils';
import { updateStreakOnDailyActivity } from '../utils/streakUtils';
import { timeToMinutes } from '../utils/timeUtils';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

export type AppView = 'timeline' | 'week' | 'templates' | 'review';

interface AppContextType {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  activities: Activity[];
  todayActivities: Activity[];
  backlog: Activity[];
  userEnergy: EnergyLevel;
  setUserEnergy: (level: EnergyLevel) => void;
  timeWindow: TimeWindow;
  setTimeWindow: (w: TimeWindow) => void;
  streak: UserStreak;
  templates: ScheduleTemplate[];
  reviews: Record<string, DailyReview>;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  conflicts: ScheduleConflict[];
  timeBudget: TimeBudget;
  // Modals & Panels
  isPlannerOpen: boolean;
  setIsPlannerOpen: (open: boolean) => void;
  isActivityModalOpen: boolean;
  setIsActivityModalOpen: (open: boolean) => void;
  editingActivity: Activity | null;
  setEditingActivity: (act: Activity | null) => void;
  isFocusModalOpen: boolean;
  setIsFocusModalOpen: (open: boolean) => void;
  focusActivity: Activity | null;
  setFocusActivity: (act: Activity | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isSearchPaletteOpen: boolean;
  setIsSearchPaletteOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // Actions
  addActivity: (act: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  toggleCompleteActivity: (id: string) => void;
  moveActivity: (id: string, newStartTime: string, newDate?: string) => void;
  resizeActivityDuration: (id: string, newDurationMinutes: number) => void;
  resolveConflictsAutomatically: () => void;
  rescheduleDayAutomatically: () => void;
  applyTemplate: (templateId: string, targetDate: string, mode?: 'replace' | 'merge') => void;
  saveDayAsTemplate: (title: string, description: string, tag: string) => void;
  deleteTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string, updates: Partial<ScheduleTemplate>) => void;
  saveDailyReview: (review: DailyReview) => void;
  logFocusSession: (activityId: string, durationMinutes: number) => void;
  replaceDayActivities: (date: string, newActivities: Activity[]) => void;
  // Backlog actions
  addToBacklog: (task: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'date' | 'startTime'>) => void;
  scheduleBacklogItem: (id: string, targetDate: string, startTime: string) => void;
  deleteBacklogItem: (id: string) => void;
  reloadFromStorage: () => void;
  syncStatus: SyncStatus;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const userId = currentUser ? currentUser.uid : null;

  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activities, setActivities] = useState<Activity[]>(() => storageService.getActivities());
  const [backlog, setBacklog] = useState<Activity[]>(() => storageService.getBacklog());
  const [userEnergy, setUserEnergyState] = useState<EnergyLevel>('high');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>({ startTime: '07:00', endTime: '22:00' });
  const [streak, setStreak] = useState<UserStreak>(() => storageService.getStreak());
  const [templates, setTemplates] = useState<ScheduleTemplate[]>(() => storageService.getTemplates());
  const [reviews, setReviews] = useState<Record<string, DailyReview>>(() => storageService.getReviews());
  const [activeView, setActiveView] = useState<AppView>('timeline');

  // Modals
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [focusActivity, setFocusActivity] = useState<Activity | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => storageService.getSyncStatus());

  useEffect(() => {
    return storageService.subscribeSyncStatus(setSyncStatus);
  }, []);

  const reloadFromStorage = useCallback(() => {
    setActivities(storageService.getActivities());
    setBacklog(storageService.getBacklog());
    setTemplates(storageService.getTemplates());
    setStreak(storageService.getStreak());
    setReviews(storageService.getReviews());
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  // Reload local data whenever the active user changes
  useEffect(() => {
    reloadFromStorage();
  }, [currentUser?.uid, reloadFromStorage]);

  // Real-time Firestore sync listener when authenticated
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;

    const unsubscribe = storageService.subscribeToUserCloudData(currentUser.uid, {
      onActivities: (acts) => setActivities(acts),
      onTemplates: (tmpls) => setTemplates(tmpls),
      onStreak: (st) => setStreak(st),
      onBacklog: (b) => setBacklog(b),
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Initial cloud fetch on login
  useEffect(() => {
    if (!currentUser || currentUser.isAnonymous) return;

    let isMounted = true;
    storageService.loadUserDataFromFirestore(currentUser.uid).then(cloudData => {
      if (!isMounted || !cloudData) return;
      if (cloudData.activities) setActivities(cloudData.activities);
      if (cloudData.templates) setTemplates(cloudData.templates);
      if (cloudData.streak) setStreak(cloudData.streak);
      if (cloudData.reviews) setReviews(cloudData.reviews);
      if (cloudData.backlog) setBacklog(cloudData.backlog);
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Commit helpers
  const commitActivities = (newActivities: Activity[]) => {
    setActivities(newActivities);
    storageService.saveActivities(newActivities, userId);
  };

  const commitBacklog = (newBacklog: Activity[]) => {
    setBacklog(newBacklog);
    storageService.saveBacklog(newBacklog, userId);
  };

  const commitTemplates = (newTemplates: ScheduleTemplate[]) => {
    setTemplates(newTemplates);
    storageService.saveTemplates(newTemplates, userId);
  };

  // Today's activities filtered by selected date (including recurring tasks due on this date)
  const todayActivities = useMemo(() => {
    return activities
      .filter(a => isActivityDueOnDate(a, selectedDate) && !a.isBacklog)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [activities, selectedDate]);

  // Conflict Detection
  const conflicts = useMemo(() => {
    return detectConflicts(todayActivities);
  }, [todayActivities]);

  // Time Budget Calculation
  const timeBudget = useMemo(() => {
    const startMin = timeToMinutes(timeWindow.startTime);
    const endMin = timeToMinutes(timeWindow.endTime);
    const totalAvailableMinutes = Math.max(0, endMin - startMin);

    const totalPlannedMinutes = todayActivities.reduce((sum, act) => sum + act.durationMinutes, 0);
    const completedMinutes = todayActivities
      .filter(act => act.isCompleted)
      .reduce((sum, act) => sum + act.durationMinutes, 0);

    const freeMinutes = Math.max(0, totalAvailableMinutes - totalPlannedMinutes);
    const isOverBudget = totalPlannedMinutes > totalAvailableMinutes;
    const overBudgetMinutes = Math.max(0, totalPlannedMinutes - totalAvailableMinutes);
    const completionPercentage = totalPlannedMinutes > 0 
      ? Math.round((completedMinutes / totalPlannedMinutes) * 100) 
      : 0;

    return {
      availableMinutes: totalAvailableMinutes,
      plannedMinutes: totalPlannedMinutes,
      completedMinutes,
      freeMinutes,
      completionPercentage,
      isOverBudget,
      overBudgetMinutes,
    };
  }, [todayActivities, timeWindow]);

  // User Energy Setter
  const setUserEnergy = (level: EnergyLevel) => {
    setUserEnergyState(level);
  };

  // CRUD Activity Actions
  const addActivity = (actData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAct: Activity = {
      ...actData,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextActivities = [...activities, newAct];
    commitActivities(nextActivities);
    notificationService.scheduleActivityReminder(newAct.title, newAct.startTime, 5);
    showToast(`Activity "${newAct.title}" added.`);
  };

  const updateActivity = (id: string, updates: Partial<Activity>) => {
    const nextActivities = activities.map(a => {
      if (a.id === id) {
        return {
          ...a,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    commitActivities(nextActivities);
    showToast('Activity updated.');
  };

  const deleteActivity = (id: string) => {
    const nextActivities = activities.filter(a => a.id !== id);
    commitActivities(nextActivities);
    showToast('Activity removed.');
  };

  const toggleCompleteActivity = (id: string) => {
    let justCompleted = false;
    let targetActDate = selectedDate;

    const nextActivities = activities.map(a => {
      if (a.id === id) {
        const nextState = !a.isCompleted;
        justCompleted = nextState;
        targetActDate = a.date;
        return {
          ...a,
          isCompleted: nextState,
          completedAt: nextState ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });

    commitActivities(nextActivities);

    if (justCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
      const nextStreak = updateStreakOnDailyActivity(streak, targetActDate);
      setStreak(nextStreak);
      storageService.saveStreak(nextStreak, userId);
      showToast('Task completed! 🎉');
    }
  };

  const moveActivity = (id: string, newStartTime: string, newDate?: string) => {
    const nextActivities = activities.map(a => {
      if (a.id === id) {
        return {
          ...a,
          startTime: newStartTime,
          date: newDate || a.date,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    commitActivities(nextActivities);
  };

  const resizeActivityDuration = (id: string, newDurationMinutes: number) => {
    const nextActivities = activities.map(a => {
      if (a.id === id) {
        return {
          ...a,
          durationMinutes: Math.max(15, newDurationMinutes),
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    commitActivities(nextActivities);
  };

  const resolveConflictsAutomatically = () => {
    if (conflicts.length === 0) return;
    const resolved = autoResolveAllConflicts(todayActivities);
    const otherDays = activities.filter(a => a.date !== selectedDate);
    commitActivities([...otherDays, ...resolved]);
    showToast('Conflicts automatically resolved.');
  };

  const rescheduleDayAutomatically = () => {
    const currentNow = new Date();
    const nowTimeStr = `${currentNow.getHours().toString().padStart(2, '0')}:${currentNow.getMinutes().toString().padStart(2, '0')}`;
    const rescheduled = dynamicRescheduleRemainingDay(todayActivities, nowTimeStr, userEnergy);
    const otherDays = activities.filter(a => a.date !== selectedDate);
    commitActivities([...otherDays, ...rescheduled]);
    showToast('Remaining day dynamically rescheduled.');
  };

  // Backlog Actions
  const addToBacklog = (taskData: Omit<Activity, 'id' | 'createdAt' | 'updatedAt' | 'date' | 'startTime'>) => {
    const newBacklogItem: Activity = {
      ...taskData,
      id: `backlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: '',
      startTime: '',
      isBacklog: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    commitBacklog([...backlog, newBacklogItem]);
    showToast(`Task "${newBacklogItem.title}" saved to Backlog.`);
  };

  const scheduleBacklogItem = (id: string, targetDate: string, startTime: string) => {
    const item = backlog.find(b => b.id === id);
    if (!item) return;

    const scheduled: Activity = {
      ...item,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: targetDate,
      startTime,
      isBacklog: false,
      updatedAt: new Date().toISOString(),
    };

    commitActivities([...activities, scheduled]);
    commitBacklog(backlog.filter(b => b.id !== id));
    showToast(`Task "${scheduled.title}" scheduled on timeline.`);
  };

  const deleteBacklogItem = (id: string) => {
    commitBacklog(backlog.filter(b => b.id !== id));
    showToast('Backlog item removed.');
  };

  // Template Actions
  const applyTemplate = (templateId: string, targetDate: string, mode: 'replace' | 'merge' = 'replace') => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return;

    const newActivities: Activity[] = tmpl.activities.map(item => ({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      date: targetDate,
      title: item.title,
      category: item.category,
      startTime: item.startTime,
      durationMinutes: item.durationMinutes,
      priority: item.priority,
      energyLevel: item.energyLevel,
      notes: item.notes,
      isCompleted: false,
      isFixedTime: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    if (mode === 'replace') {
      const otherDays = activities.filter(a => a.date !== targetDate);
      commitActivities([...otherDays, ...newActivities]);
    } else {
      commitActivities([...activities, ...newActivities]);
    }
    showToast(`Applied "${tmpl.title}" template.`);
  };

  const saveDayAsTemplate = (title: string, description: string, tag: string) => {
    if (todayActivities.length === 0) {
      showToast('No activities on this day to save as a template.');
      return;
    }

    const newTemplate: ScheduleTemplate = {
      id: `tmpl-${Date.now()}`,
      title,
      description,
      tag: tag || 'Custom',
      icon: 'Calendar',
      totalPlannedMinutes: todayActivities.reduce((acc, a) => acc + a.durationMinutes, 0),
      activitiesCount: todayActivities.length,
      createdAt: new Date().toISOString(),
      activities: todayActivities.map(a => ({
        id: `t-item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        title: a.title,
        category: a.category,
        startTime: a.startTime,
        durationMinutes: a.durationMinutes,
        priority: a.priority,
        energyLevel: a.energyLevel,
        notes: a.notes,
      })),
    };

    commitTemplates([...templates, newTemplate]);
    showToast(`Template "${title}" saved to library.`);
  };

  const deleteTemplate = (templateId: string) => {
    commitTemplates(templates.filter(t => t.id !== templateId));
    showToast('Template deleted.');
  };

  const updateTemplate = (templateId: string, updates: Partial<ScheduleTemplate>) => {
    commitTemplates(templates.map(t => t.id === templateId ? { ...t, ...updates } : t));
    showToast('Template updated.');
  };

  const saveDailyReview = (review: DailyReview) => {
    const nextReviews = { ...reviews, [review.date]: review };
    setReviews(nextReviews);
    storageService.saveReview(review, userId);
    showToast('Daily review saved.');
  };

  const logFocusSession = (activityId: string, durationMinutes: number) => {
    const nextActs = activities.map(a => {
      if (a.id === activityId) {
        return {
          ...a,
          focusMinutesLogged: (a.focusMinutesLogged || 0) + durationMinutes,
          updatedAt: new Date().toISOString(),
        };
      }
      return a;
    });
    commitActivities(nextActs);

    const updatedStreak = {
      ...streak,
      totalFocusSessions: streak.totalFocusSessions + 1,
      totalFocusMinutes: streak.totalFocusMinutes + durationMinutes,
    };
    setStreak(updatedStreak);
    storageService.saveStreak(updatedStreak, userId);
  };

  const replaceDayActivities = (date: string, newActivities: Activity[]) => {
    const otherDays = activities.filter(a => a.date !== date);
    commitActivities([...otherDays, ...newActivities]);
  };

  return (
    <AppContext.Provider value={{
      selectedDate,
      setSelectedDate,
      activities,
      todayActivities,
      backlog,
      userEnergy,
      setUserEnergy,
      timeWindow,
      setTimeWindow,
      streak,
      templates,
      reviews,
      activeView,
      setActiveView,
      conflicts,
      timeBudget,
      isPlannerOpen,
      setIsPlannerOpen,
      isActivityModalOpen,
      setIsActivityModalOpen,
      editingActivity,
      setEditingActivity,
      isFocusModalOpen,
      setIsFocusModalOpen,
      focusActivity,
      setFocusActivity,
      isAuthModalOpen,
      setIsAuthModalOpen,
      isSearchPaletteOpen,
      setIsSearchPaletteOpen,
      toastMessage,
      showToast,
      addActivity,
      updateActivity,
      deleteActivity,
      toggleCompleteActivity,
      moveActivity,
      resizeActivityDuration,
      resolveConflictsAutomatically,
      rescheduleDayAutomatically,
      applyTemplate,
      saveDayAsTemplate,
      deleteTemplate,
      updateTemplate,
      saveDailyReview,
      logFocusSession,
      replaceDayActivities,
      addToBacklog,
      scheduleBacklogItem,
      deleteBacklogItem,
      reloadFromStorage,
      syncStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
