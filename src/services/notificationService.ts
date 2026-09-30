export interface NotificationConfig {
  enabled: boolean;
  notifyBeforeMinutes: number; // e.g. 5 or 10 minutes before
  sound: boolean;
}

class NotificationService {
  private _hasPermission: boolean = false;
  private _scheduledTimers: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this._hasPermission = Notification.permission === 'granted';
    }
  }

  public async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this._hasPermission = permission === 'granted';
      return this._hasPermission;
    } catch {
      return false;
    }
  }

  public hasPermission(): boolean {
    return this._hasPermission;
  }

  public sendNotification(title: string, options?: NotificationOptions): boolean {
    if (!this._hasPermission || typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const notif = new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };

      return true;
    } catch (e) {
      console.warn('Failed to send browser notification:', e);
      return false;
    }
  }

  public scheduleActivityReminder(
    title: string,
    startTimeStr: string,
    minutesBefore: number = 5
  ): void {
    if (!this._hasPermission) return;

    const [hours, minutes] = startTimeStr.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes - minutesBefore, 0, 0);

    const diffMs = target.getTime() - now.getTime();
    if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
      const timer = setTimeout(() => {
        this.sendNotification(`Upcoming Task: ${title}`, {
          body: `Starting in ${minutesBefore} minutes at ${startTimeStr}.`,
          tag: `activity-${title}-${startTimeStr}`,
        });
        this._scheduledTimers.delete(timer);
      }, diffMs);

      this._scheduledTimers.add(timer);
    }
  }

  public clearAllScheduled(): void {
    this._scheduledTimers.forEach(t => clearTimeout(t));
    this._scheduledTimers.clear();
  }
}

export const notificationService = new NotificationService();
