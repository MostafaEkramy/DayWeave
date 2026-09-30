import { Activity } from '../types/activity';
import { ScheduleTemplate } from '../types/template';
import { UserStreak } from '../types/streak';
import { DailyReview } from '../types/review';
import { UserPreferences, UserProfileData } from '../types/user';
import { getInitialActivities, INITIAL_TEMPLATES, INITIAL_STREAK } from '../utils/sampleData';
import { getTodayDateString } from '../utils/dateUtils';
import { db, doc, setDoc, getDoc, getDocs, deleteDoc, collection, onSnapshot, isFirebaseConfigured } from './firebase';

/** Base key names (without user prefix) */
const BASE_KEYS = {
  ACTIVITIES: 'pmd_activities_v1',
  TEMPLATES: 'pmd_templates_v1',
  STREAK: 'pmd_streak_v1',
  REVIEWS: 'pmd_reviews_v1',
  PREFERENCES: 'pmd_preferences_v1',
  USER_ENERGY: 'pmd_user_energy_v1',
  PROFILE: 'pmd_profile_v1',
  BACKLOG: 'pmd_backlog_v1',
  PENDING_SYNC: 'pmd_pending_sync_queue_v1',
};

/** Key used to remember which user was last active (so we can scope on reload). */
const ACTIVE_USER_KEY = 'pmd_active_user';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  defaultWakeTime: '07:00',
  defaultSleepTime: '22:00',
  defaultEnergyLevel: 'medium',
  breakDurationMinutes: 15,
  enableSounds: true,
  soundVolume: 0.4,
  autoDetectConflicts: true,
};

export interface UserCloudData {
  activities?: Activity[];
  templates?: ScheduleTemplate[];
  streak?: UserStreak;
  reviews?: Record<string, DailyReview>;
  preferences?: UserPreferences;
  profile?: UserProfileData;
  backlog?: Activity[];
  updatedAt?: string;
}

export interface ExportDataPayload {
  schemaVersion: number;
  exportedAt: string;
  activities: Activity[];
  templates: ScheduleTemplate[];
  streak: UserStreak;
  reviews: Record<string, DailyReview>;
  preferences: UserPreferences;
  profile?: UserProfileData | null;
  backlog?: Activity[];
}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'sync_failed';

type SyncStatusListener = (status: SyncStatus) => void;

interface PendingSyncItem {
  uid: string;
  path: string[];
  data: Record<string, unknown>;
  timestamp: number;
}

class StorageService {
  /**
   * The uid of the currently active user.
   * `null` means "guest / anonymous" — we use the base keys directly.
   */
  private _activeUid: string | null = null;
  private _syncStatus: SyncStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'synced' : 'offline';
  private _pendingSyncs = 0;
  private _syncListeners = new Set<SyncStatusListener>();
  private _activeSubscriptions: (() => void)[] = [];

  constructor() {
    // Restore from previous session so initial reads are scoped correctly
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_USER_KEY) : null;
    if (saved) this._activeUid = saved;

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.setSyncStatus('syncing');
        this.flushPendingSyncQueue();
      });
      window.addEventListener('offline', () => this.setSyncStatus('offline'));
    }
  }

  public getSyncStatus(): SyncStatus {
    return this._syncStatus;
  }

  public subscribeSyncStatus(listener: SyncStatusListener): () => void {
    this._syncListeners.add(listener);
    listener(this._syncStatus);
    return () => this._syncListeners.delete(listener);
  }

  private setSyncStatus(status: SyncStatus): void {
    this._syncStatus = status;
    this._syncListeners.forEach(fn => fn(status));
  }

  private getPendingQueue(): PendingSyncItem[] {
    try {
      const raw = localStorage.getItem(BASE_KEYS.PENDING_SYNC);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private savePendingQueue(queue: PendingSyncItem[]): void {
    try {
      localStorage.setItem(BASE_KEYS.PENDING_SYNC, JSON.stringify(queue));
    } catch (e) {
      console.warn('Error saving pending sync queue:', e);
    }
  }

  private queueForOfflineSync(item: PendingSyncItem): void {
    const queue = this.getPendingQueue();
    // Keep max 100 items to avoid storage explosion
    const updated = [...queue.filter(q => !(q.uid === item.uid && q.path.join('/') === item.path.join('/'))), item].slice(-100);
    this.savePendingQueue(updated);
  }

  public async flushPendingSyncQueue(): Promise<void> {
    if (!db || !isFirebaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      this.setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced');
      return;
    }

    const queue = this.getPendingQueue();
    if (queue.length === 0) {
      this.setSyncStatus('synced');
      return;
    }

    this.setSyncStatus('syncing');
    const remaining: PendingSyncItem[] = [];

    for (const item of queue) {
      try {
        if (item.path.length >= 2) {
          const docRef = doc(db, item.path[0], ...item.path.slice(1));
          await setDoc(docRef, item.data, { merge: true });
        }
      } catch (err) {
        console.warn('Error flushing sync item:', item.path, err);
        remaining.push(item);
      }
    }

    this.savePendingQueue(remaining);
    this.setSyncStatus(remaining.length > 0 ? 'sync_failed' : 'synced');
  }

  private async pushToFirestore(
    uid: string,
    path: string[],
    data: Record<string, unknown>
  ): Promise<void> {
    if (!db || !uid || !isFirebaseConfigured) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.setSyncStatus('offline');
      this.queueForOfflineSync({ uid, path, data, timestamp: Date.now() });
      return;
    }

    this._pendingSyncs += 1;
    this.setSyncStatus('syncing');

    try {
      if (path.length >= 2) {
        const userDocRef = doc(db, path[0], ...path.slice(1));
        await setDoc(userDocRef, data, { merge: true });
      }
      this._pendingSyncs = Math.max(0, this._pendingSyncs - 1);
      this.setSyncStatus(this._pendingSyncs > 0 ? 'syncing' : 'synced');
    } catch (err) {
      console.warn('Firestore sync error:', err);
      this.queueForOfflineSync({ uid, path, data, timestamp: Date.now() });
      this._pendingSyncs = Math.max(0, this._pendingSyncs - 1);
      this.setSyncStatus('sync_failed');
    }
  }

  // ---------- User scoping ----------

  /** Call this when a user signs in so all subsequent reads/writes are scoped to them. */
  public setActiveUser(uid: string | null): void {
    this._activeUid = uid;
    if (uid) {
      localStorage.setItem(ACTIVE_USER_KEY, uid);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }

  public getActiveUser(): string | null {
    return this._activeUid;
  }

  /** Returns the localStorage key scoped to the active user. */
  private key(base: string): string {
    if (this._activeUid) {
      return `${base}__${this._activeUid}`;
    }
    return base; // guest / fallback
  }

  // --- Activities ---
  public getActivities(): Activity[] {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.ACTIVITIES));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading activities from localStorage:', e);
    }
    // Logged-in users start fresh; guests get sample data
    if (this._activeUid) {
      this.saveActivities([]);
      return [];
    }
    const initial = getInitialActivities();
    this.saveActivities(initial);
    return initial;
  }

  public saveActivities(activities: Activity[], userId?: string | null): void {
    try {
      localStorage.setItem(this.key(BASE_KEYS.ACTIVITIES), JSON.stringify(activities));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'schedules', 'current'], {
          activities,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Error saving activities to localStorage:', e);
    }
  }

  // --- Backlog (Unscheduled Tasks) ---
  public getBacklog(): Activity[] {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.BACKLOG));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading backlog from localStorage:', e);
    }
    return [];
  }

  public saveBacklog(backlog: Activity[], userId?: string | null): void {
    try {
      localStorage.setItem(this.key(BASE_KEYS.BACKLOG), JSON.stringify(backlog));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'userData', 'backlog'], {
          backlog,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Error saving backlog to localStorage:', e);
    }
  }

  // --- Templates ---
  public getTemplates(): ScheduleTemplate[] {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.TEMPLATES));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading templates:', e);
    }
    // Logged-in users start fresh; guests get sample templates
    if (this._activeUid) {
      this.saveTemplates([]);
      return [];
    }
    this.saveTemplates(INITIAL_TEMPLATES);
    return INITIAL_TEMPLATES;
  }

  public saveTemplates(templates: ScheduleTemplate[], userId?: string | null): void {
    try {
      localStorage.setItem(this.key(BASE_KEYS.TEMPLATES), JSON.stringify(templates));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'userData', 'templates'], {
          templates,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Error saving templates:', e);
    }
  }

  // --- Streaks & Achievements ---
  public getStreak(): UserStreak {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.STREAK));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading streak:', e);
    }
    // Logged-in users start from zero; guests get sample streak
    if (this._activeUid) {
      const fresh: UserStreak = {
        currentStreakDays: 0,
        longestStreakDays: 0,
        totalCompletedActivities: 0,
        totalFocusSessions: 0,
        totalFocusMinutes: 0,
        lastActiveDate: getTodayDateString(),
        achievements: [],
      };
      this.saveStreak(fresh);
      return fresh;
    }
    this.saveStreak(INITIAL_STREAK);
    return INITIAL_STREAK;
  }

  public saveStreak(streak: UserStreak, userId?: string | null): void {
    try {
      localStorage.setItem(this.key(BASE_KEYS.STREAK), JSON.stringify(streak));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'userData', 'streak'], {
          streak,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Error saving streak:', e);
    }
  }

  // --- Daily Reviews ---
  public getReviews(): Record<string, DailyReview> {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.REVIEWS));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading reviews:', e);
    }
    return {};
  }

  public saveReview(review: DailyReview, userId?: string | null): void {
    try {
      const existing = this.getReviews();
      existing[review.date] = review;
      localStorage.setItem(this.key(BASE_KEYS.REVIEWS), JSON.stringify(existing));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'reviews', review.date], review as unknown as Record<string, unknown>);
      }
    } catch (e) {
      console.warn('Error saving review:', e);
    }
  }

  // --- Preferences ---
  public getPreferences(): UserPreferences {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.PREFERENCES));
      if (data) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Error reading preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  }

  public savePreferences(prefs: UserPreferences, userId?: string | null): void {
    try {
      localStorage.setItem(this.key(BASE_KEYS.PREFERENCES), JSON.stringify(prefs));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'userData', 'preferences'], prefs as unknown as Record<string, unknown>);
      }
    } catch (e) {
      console.warn('Error saving preferences:', e);
    }
  }

  // --- User Profile ---
  public getProfile(): UserProfileData | null {
    try {
      const data = localStorage.getItem(this.key(BASE_KEYS.PROFILE));
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Error reading profile:', e);
    }
    return null;
  }

  public saveProfile(profile: UserProfileData, userId?: string | null): void {
    try {
      localStorage.setItem(this.key(BASE_KEYS.PROFILE), JSON.stringify(profile));
      const uid = userId ?? this._activeUid;
      if (uid) {
        this.pushToFirestore(uid, ['users', uid, 'userData', 'profile'], profile as unknown as Record<string, unknown>);
      }
    } catch (e) {
      console.warn('Error saving profile:', e);
    }
  }

  // --- Real-time Listeners Cleanup ---
  public clearSubscriptions(): void {
    this._activeSubscriptions.forEach(unsub => {
      try { unsub(); } catch {}
    });
    this._activeSubscriptions = [];
  }

  // --- Real-time Firestore Sync Listeners ---
  public subscribeToUserCloudData(
    userId: string,
    callbacks: {
      onActivities?: (activities: Activity[]) => void;
      onTemplates?: (templates: ScheduleTemplate[]) => void;
      onStreak?: (streak: UserStreak) => void;
      onBacklog?: (backlog: Activity[]) => void;
    }
  ): () => void {
    this.clearSubscriptions();
    if (!db || !userId || !isFirebaseConfigured) return () => {};

    try {
      // 1. Current Schedule Listener
      const schedRef = doc(db, 'users', userId, 'schedules', 'current');
      const unsubSched = onSnapshot(schedRef, snap => {
        if (snap.exists() && snap.data()?.activities && callbacks.onActivities) {
          const acts = snap.data().activities as Activity[];
          localStorage.setItem(this.key(BASE_KEYS.ACTIVITIES), JSON.stringify(acts));
          callbacks.onActivities(acts);
        }
      }, err => console.warn('Realtime schedule sync error:', err));
      this._activeSubscriptions.push(unsubSched);

      // 2. Templates Listener
      const tmplRef = doc(db, 'users', userId, 'userData', 'templates');
      const unsubTmpl = onSnapshot(tmplRef, snap => {
        if (snap.exists() && snap.data()?.templates && callbacks.onTemplates) {
          const tmpls = snap.data().templates as ScheduleTemplate[];
          localStorage.setItem(this.key(BASE_KEYS.TEMPLATES), JSON.stringify(tmpls));
          callbacks.onTemplates(tmpls);
        }
      }, err => console.warn('Realtime templates sync error:', err));
      this._activeSubscriptions.push(unsubTmpl);

      // 3. Streak Listener
      const streakRef = doc(db, 'users', userId, 'userData', 'streak');
      const unsubStreak = onSnapshot(streakRef, snap => {
        if (snap.exists() && snap.data()?.streak && callbacks.onStreak) {
          const st = snap.data().streak as UserStreak;
          localStorage.setItem(this.key(BASE_KEYS.STREAK), JSON.stringify(st));
          callbacks.onStreak(st);
        }
      }, err => console.warn('Realtime streak sync error:', err));
      this._activeSubscriptions.push(unsubStreak);

      // 4. Backlog Listener
      const backlogRef = doc(db, 'users', userId, 'userData', 'backlog');
      const unsubBacklog = onSnapshot(backlogRef, snap => {
        if (snap.exists() && snap.data()?.backlog && callbacks.onBacklog) {
          const b = snap.data().backlog as Activity[];
          localStorage.setItem(this.key(BASE_KEYS.BACKLOG), JSON.stringify(b));
          callbacks.onBacklog(b);
        }
      }, err => console.warn('Realtime backlog sync error:', err));
      this._activeSubscriptions.push(unsubBacklog);

    } catch (e) {
      console.warn('Failed to setup Firestore realtime subscriptions:', e);
    }

    return () => this.clearSubscriptions();
  }

  // --- Full Firestore Sync on Login ---
  public async loadUserDataFromFirestore(userId: string): Promise<UserCloudData | null> {
    if (!db || !userId || !isFirebaseConfigured) return null;

    // Scope all reads/writes to this user
    this.setActiveUser(userId);

    try {
      const result: UserCloudData = {};

      // 1. Fetch current activities schedule
      const schedRef = doc(db, 'users', userId, 'schedules', 'current');
      const schedSnap = await getDoc(schedRef);
      if (schedSnap.exists() && schedSnap.data()?.activities) {
        result.activities = schedSnap.data().activities;
        localStorage.setItem(this.key(BASE_KEYS.ACTIVITIES), JSON.stringify(result.activities));
      }

      // 2. Fetch templates
      const tmplRef = doc(db, 'users', userId, 'userData', 'templates');
      const tmplSnap = await getDoc(tmplRef);
      if (tmplSnap.exists() && tmplSnap.data()?.templates) {
        result.templates = tmplSnap.data().templates;
        localStorage.setItem(this.key(BASE_KEYS.TEMPLATES), JSON.stringify(result.templates));
      }

      // 3. Fetch streak
      const streakRef = doc(db, 'users', userId, 'userData', 'streak');
      const streakSnap = await getDoc(streakRef);
      if (streakSnap.exists() && streakSnap.data()?.streak) {
        result.streak = streakSnap.data().streak;
        localStorage.setItem(this.key(BASE_KEYS.STREAK), JSON.stringify(result.streak));
      }

      // 4. Fetch backlog
      const backlogRef = doc(db, 'users', userId, 'userData', 'backlog');
      const backlogSnap = await getDoc(backlogRef);
      if (backlogSnap.exists() && backlogSnap.data()?.backlog) {
        result.backlog = backlogSnap.data().backlog;
        localStorage.setItem(this.key(BASE_KEYS.BACKLOG), JSON.stringify(result.backlog));
      }

      // 5. Fetch reviews collection
      const reviewsCol = collection(db, 'users', userId, 'reviews');
      const reviewsSnap = await getDocs(reviewsCol);
      if (!reviewsSnap.empty) {
        const revMap: Record<string, DailyReview> = {};
        reviewsSnap.forEach(d => {
          revMap[d.id] = d.data() as DailyReview;
        });
        result.reviews = revMap;
        localStorage.setItem(this.key(BASE_KEYS.REVIEWS), JSON.stringify(revMap));
      }

      // 6. Fetch preferences
      const prefRef = doc(db, 'users', userId, 'userData', 'preferences');
      const prefSnap = await getDoc(prefRef);
      if (prefSnap.exists()) {
        result.preferences = { ...DEFAULT_PREFERENCES, ...(prefSnap.data() as UserPreferences) };
        localStorage.setItem(this.key(BASE_KEYS.PREFERENCES), JSON.stringify(result.preferences));
      }

      // 7. Fetch profile data
      const profileRef = doc(db, 'users', userId, 'userData', 'profile');
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        result.profile = profileSnap.data() as UserProfileData;
        localStorage.setItem(this.key(BASE_KEYS.PROFILE), JSON.stringify(result.profile));
      }

      // If nothing was in Firestore for this new user, start them fresh
      const hasAnyData = Boolean(
        result.activities || result.templates || result.streak || result.reviews || result.preferences || result.profile || result.backlog
      );

      if (!hasAnyData) {
        // Fresh empty data for new accounts — no sample data leaking
        const freshActivities: Activity[] = [];
        const freshTemplates: ScheduleTemplate[] = [];
        const freshStreak: UserStreak = {
          currentStreakDays: 0,
          longestStreakDays: 0,
          totalCompletedActivities: 0,
          totalFocusSessions: 0,
          totalFocusMinutes: 0,
          lastActiveDate: getTodayDateString(),
          achievements: [],
        };
        const freshReviews: Record<string, DailyReview> = {};
        const freshPrefs = DEFAULT_PREFERENCES;
        const freshBacklog: Activity[] = [];

        this.saveActivities(freshActivities, userId);
        this.saveTemplates(freshTemplates, userId);
        this.saveStreak(freshStreak, userId);
        this.savePreferences(freshPrefs, userId);
        this.saveBacklog(freshBacklog, userId);

        return {
          activities: freshActivities,
          templates: freshTemplates,
          streak: freshStreak,
          reviews: freshReviews,
          preferences: freshPrefs,
          backlog: freshBacklog,
        };
      }

      return result;
    } catch (err) {
      console.warn('Failed loading Firestore data for user:', err);
      return null;
    }
  }

  // --- Complete Account & User Data Deletion (GDPR/Privacy) ---
  public async deleteAllUserData(userId: string): Promise<boolean> {
    this.clearSubscriptions();

    // 1. Wipe all local storage keys for this user
    try {
      Object.values(BASE_KEYS).forEach(base => {
        localStorage.removeItem(`${base}__${userId}`);
      });
      if (this._activeUid === userId) {
        this.setActiveUser(null);
      }
    } catch (e) {
      console.warn('Error clearing user localStorage:', e);
    }

    // 2. Delete Firestore documents & collections
    if (db && userId && isFirebaseConfigured) {
      try {
        // Delete schedules
        await deleteDoc(doc(db, 'users', userId, 'schedules', 'current')).catch(() => {});
        // Delete userData subdocuments
        await deleteDoc(doc(db, 'users', userId, 'userData', 'templates')).catch(() => {});
        await deleteDoc(doc(db, 'users', userId, 'userData', 'streak')).catch(() => {});
        await deleteDoc(doc(db, 'users', userId, 'userData', 'preferences')).catch(() => {});
        await deleteDoc(doc(db, 'users', userId, 'userData', 'profile')).catch(() => {});
        await deleteDoc(doc(db, 'users', userId, 'userData', 'backlog')).catch(() => {});

        // Delete all reviews
        const reviewsCol = collection(db, 'users', userId, 'reviews');
        const reviewsSnap = await getDocs(reviewsCol).catch(() => null);
        if (reviewsSnap && !reviewsSnap.empty) {
          const deletePromises = reviewsSnap.docs.map(d => deleteDoc(d.ref));
          await Promise.all(deletePromises);
        }
      } catch (err) {
        console.warn('Error deleting user Firestore data:', err);
        return false;
      }
    }

    return true;
  }

  // --- Export / Import with Schema Versioning ---
  public exportAllData(): ExportDataPayload {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      activities: this.getActivities(),
      templates: this.getTemplates(),
      streak: this.getStreak(),
      reviews: this.getReviews(),
      preferences: this.getPreferences(),
      profile: this.getProfile(),
      backlog: this.getBacklog(),
    };
  }

  public importData(data: unknown): { success: boolean; message?: string } {
    if (!data || typeof data !== 'object') {
      return { success: false, message: 'Invalid JSON payload format' };
    }

    const payload = data as Partial<ExportDataPayload>;

    if (!Array.isArray(payload.activities) && !Array.isArray(payload.templates) && !payload.streak) {
      return { success: false, message: 'Missing core data arrays (activities, templates, or streak)' };
    }

    try {
      if (Array.isArray(payload.activities)) {
        this.saveActivities(payload.activities);
      }
      if (Array.isArray(payload.templates)) {
        this.saveTemplates(payload.templates);
      }
      if (payload.streak && typeof payload.streak === 'object') {
        this.saveStreak(payload.streak as UserStreak);
      }
      if (payload.reviews && typeof payload.reviews === 'object') {
        Object.values(payload.reviews).forEach(r => this.saveReview(r));
      }
      if (payload.preferences && typeof payload.preferences === 'object') {
        this.savePreferences(payload.preferences as UserPreferences);
      }
      if (payload.profile && typeof payload.profile === 'object') {
        this.saveProfile(payload.profile as UserProfileData);
      }
      if (Array.isArray(payload.backlog)) {
        this.saveBacklog(payload.backlog);
      }
      return { success: true };
    } catch (err) {
      return { success: false, message: (err as Error).message || 'Failed to import data' };
    }
  }
}

export const storageService = new StorageService();
