import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { storageService } from '../services/storageService';
import { notificationService } from '../services/notificationService';
import {
  Settings,
  Clock,
  Sun,
  Moon,
  Download,
  Upload,
  Trash2,
  Bell,
  User,
  Save,
  Globe,
  CheckCircle2
} from 'lucide-react';
import { TimePicker } from '../components/Common/TimePicker';

const SettingsPage: React.FC = () => {
  const { 
    timeWindow, 
    setTimeWindow, 
    showToast, 
    reloadFromStorage,
    setIsAuthModalOpen 
  } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { currentUser, isGuest, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [wakeTime, setWakeTime] = useState(timeWindow.startTime);
  const [sleepTime, setSleepTime] = useState(timeWindow.endTime);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(notificationService.hasPermission());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveTimeWindow = () => {
    setTimeWindow({ startTime: wakeTime, endTime: sleepTime });
    storageService.savePreferences({
      ...storageService.getPreferences(),
      defaultWakeTime: wakeTime,
      defaultSleepTime: sleepTime,
    }, currentUser?.uid);
    showToast(t('settings.timeWindowUpdated'));
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await notificationService.requestPermission();
      setNotificationsEnabled(granted);
      if (granted) {
        showToast(language === 'ar' ? 'تم تفعيل التنبيهات بنجاح' : 'Notifications enabled successfully');
      } else {
        showToast(language === 'ar' ? 'تم رفض إذن التنبيهات في المتصفح' : 'Notifications permission denied in browser');
      }
    } else {
      setNotificationsEnabled(false);
      showToast(language === 'ar' ? 'تم تعطيل التنبيهات' : 'Notifications disabled');
    }
  };

  const handleExportData = () => {
    const data = storageService.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayweave-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(t('settings.exportSuccess'));
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string);
        const res = storageService.importData(raw);
        if (res.success) {
          reloadFromStorage();
          showToast(t('settings.importSuccess'));
        } else {
          showToast(res.message || t('settings.importError'));
        }
      } catch {
        showToast(t('settings.importError'));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteAllData = async () => {
    if (currentUser?.uid) {
      await storageService.deleteAllUserData(currentUser.uid);
    } else {
      localStorage.clear();
    }
    setShowDeleteConfirm(false);
    showToast(t('settings.dataDeleted'));
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="page-container animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto', width: '100%' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          paddingBottom: 16,
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
          }}
        >
          <Settings size={22} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {t('nav.settings')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Customize your schedule boundaries, notifications, and language.
          </p>
        </div>
      </div>

      {/* Language & Localization Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Globe size={18} style={{ color: 'var(--accent-primary)' }} />
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Language & Direction</h3>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setLanguage('en')}
            className={language === 'en' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600 }}
          >
            {language === 'en' && <CheckCircle2 size={15} />}
            <span>English (LTR)</span>
          </button>
          <button
            onClick={() => setLanguage('ar')}
            className={language === 'ar' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600 }}
          >
            {language === 'ar' && <CheckCircle2 size={15} />}
            <span>العربية (RTL)</span>
          </button>
        </div>
      </div>

      {/* Time Window Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('settings.timeWindow')}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('settings.timeWindowDesc')}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('settings.wakeTime')}
            </label>
            <TimePicker value={wakeTime} onChange={setWakeTime} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {t('settings.sleepTime')}
            </label>
            <TimePicker value={sleepTime} onChange={setSleepTime} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: 20 }}>
            <button
              onClick={handleSaveTimeWindow}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
            >
              <Save size={15} />
              <span>{t('settings.saveWindow')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Browser Notifications Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Bell size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Task Reminders</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Get browser notifications 5 minutes before scheduled activities begin.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleNotifications}
          className={notificationsEnabled ? 'btn-primary' : 'btn-secondary'}
          style={{ fontSize: 13, padding: '8px 16px' }}
        >
          {notificationsEnabled ? 'Enabled' : 'Enable Reminders'}
        </button>
      </div>

      {/* Theme Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('settings.theme')}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {theme === 'dark' ? t('settings.darkTheme') : t('settings.lightTheme')}
            </p>
          </div>
        </div>

        <button onClick={toggleTheme} className="btn-secondary" style={{ fontSize: 13 }}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? t('header.lightMode') : t('header.darkMode')}</span>
        </button>
      </div>

      {/* Account Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <User size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('settings.account')}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              {currentUser && !isGuest
                ? `${t('settings.signedInAs')} ${currentUser.email || currentUser.displayName}`
                : t('settings.guestMode')}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (currentUser && !isGuest) {
              setIsAuthModalOpen(true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          className="btn-secondary"
          style={{ fontSize: 13 }}
        >
          {currentUser && !isGuest ? 'Manage Profile & Sync' : t('header.signIn')}
        </button>
      </div>

      {/* Data Management Section */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>{t('settings.dataManagement')}</h3>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            {t('settings.dataManagementDesc')} (Schema v1.0)
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            onClick={handleExportData}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Download size={15} />
            <span>{t('settings.exportJson')}</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Upload size={15} />
            <span>{t('settings.importJson')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportData}
            style={{ display: 'none' }}
          />

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--status-danger)' }}
            >
              <Trash2 size={15} />
              <span>{t('settings.deleteAllData')}</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', backgroundColor: 'var(--status-danger-bg)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 12, color: 'var(--status-danger)', fontWeight: 600 }}>
                {t('settings.confirmDeleteAll')}
              </span>
              <button
                onClick={handleDeleteAllData}
                className="btn-primary"
                style={{ backgroundColor: 'var(--status-danger)', padding: '4px 10px', fontSize: 12 }}
              >
                {t('common.delete')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-ghost"
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
export { SettingsPage };
