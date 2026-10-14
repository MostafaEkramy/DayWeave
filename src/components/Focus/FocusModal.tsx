import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { audioService } from '../../services/audioService';
import { ActivityCategory } from '../../types/activity';
import { getTodayDateString } from '../../utils/dateUtils';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Coffee, 
  Volume2, 
  X,
  Timer,
  Clock,
  BookOpen,
  Sparkles,
  RotateCcw,
  Plus
} from 'lucide-react';
import confetti from 'canvas-confetti';

type TimerMode = 'countdown' | 'stopwatch';

export const FocusModal: React.FC = () => {
  const { 
    isFocusModalOpen, 
    setIsFocusModalOpen, 
    focusActivity, 
    setFocusActivity,
    todayActivities,
    addActivity,
    toggleCompleteActivity,
    logFocusSession,
    showToast
  } = useApp();

  const { t, language } = useLanguage();

  // Mode and setup states
  const [timerMode, setTimerMode] = useState<TimerMode>('countdown');
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('study');
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isBreak, setIsBreak] = useState<boolean>(false);

  // Timer values in seconds
  const [durationPreset, setDurationPreset] = useState<number>(45); // in minutes
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('45');
  const [totalSeconds, setTotalSeconds] = useState<number>(45 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // Soundscape
  const [soundType, setSoundType] = useState<'none' | 'rain' | 'brown_noise' | 'cafe_hum'>('none');
  const [volume, setVolume] = useState<number>(0.3);

  // High-accuracy timestamp tracking
  const targetEndTimeRef = useRef<number | null>(null);
  const stopwatchStartRef = useRef<number | null>(null);
  const accumulatedElapsedRef = useRef<number>(0);

  // Initialize or reset session when modal opens or activity changes
  useEffect(() => {
    if (!isFocusModalOpen) return;

    if (focusActivity) {
      // Activity passed from timeline
      const mins = focusActivity.durationMinutes || 45;
      setSessionTitle(focusActivity.title);
      setSelectedCategory(focusActivity.category || 'study');
      setDurationPreset(mins);
      setCustomMinutesInput(String(mins));
      setTimerMode('countdown');

      const totalSecs = mins * 60;
      setTotalSeconds(totalSecs);
      setSecondsRemaining(totalSecs);
      setSecondsElapsed(0);
      accumulatedElapsedRef.current = 0;
      targetEndTimeRef.current = Date.now() + totalSecs * 1000;
      setIsTimerRunning(true);
      setIsBreak(false);
    } else {
      // Free session launcher
      const defaultTitle = language === 'ar' ? 'مذاكرة وتركيز' : 'Study & Focus Session';
      setSessionTitle(defaultTitle);
      setSelectedCategory('study');
      setDurationPreset(45);
      setCustomMinutesInput('45');
      setTimerMode('countdown');
      setIsTimerRunning(false);
      setIsBreak(false);
      setSecondsElapsed(0);
      accumulatedElapsedRef.current = 0;
      const initialSecs = 45 * 60;
      setTotalSeconds(initialSecs);
      setSecondsRemaining(initialSecs);
    }
  }, [isFocusModalOpen, focusActivity, language]);

  // Sync countdown target
  const syncCountdownTarget = useCallback((remainingSecs: number) => {
    targetEndTimeRef.current = Date.now() + remainingSecs * 1000;
  }, []);

  // Timer Tick Interval
  useEffect(() => {
    if (!isFocusModalOpen || !isTimerRunning) return;

    const interval = setInterval(() => {
      const now = Date.now();

      if (timerMode === 'countdown') {
        if (targetEndTimeRef.current !== null) {
          const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current - now) / 1000));
          setSecondsRemaining(remaining);
          const elapsed = Math.max(0, totalSeconds - remaining);
          setSecondsElapsed(elapsed);

          if (remaining <= 0) {
            audioService.playCompletionChime();
            setIsTimerRunning(false);
            targetEndTimeRef.current = null;
            showToast(isBreak ? t('focusModal.breakFinished') : t('focusModal.sessionComplete'));
          }
        }
      } else {
        // Stopwatch mode
        if (stopwatchStartRef.current !== null) {
          const currentRunSecs = Math.floor((now - stopwatchStartRef.current) / 1000);
          const totalElapsed = accumulatedElapsedRef.current + currentRunSecs;
          setSecondsElapsed(totalElapsed);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isFocusModalOpen, isTimerRunning, timerMode, totalSeconds, isBreak, showToast, t]);

  // Start Timer Handler
  const handleStartTimer = (presetMinutes?: number, mode: TimerMode = timerMode) => {
    const mins = presetMinutes || durationPreset;
    setTimerMode(mode);

    if (mode === 'countdown') {
      const secs = mins * 60;
      setTotalSeconds(secs);
      setSecondsRemaining(secs);
      setSecondsElapsed(0);
      accumulatedElapsedRef.current = 0;
      targetEndTimeRef.current = Date.now() + secs * 1000;
    } else {
      setSecondsElapsed(0);
      accumulatedElapsedRef.current = 0;
      stopwatchStartRef.current = Date.now();
    }

    setIsTimerRunning(true);
    setIsBreak(false);
  };

  // Toggle Pause / Resume
  const handleToggleTimer = () => {
    if (isTimerRunning) {
      // Pause
      if (timerMode === 'countdown') {
        targetEndTimeRef.current = null;
      } else if (stopwatchStartRef.current !== null) {
        accumulatedElapsedRef.current += Math.floor((Date.now() - stopwatchStartRef.current) / 1000);
        stopwatchStartRef.current = null;
      }
      setIsTimerRunning(false);
    } else {
      // Resume
      if (timerMode === 'countdown') {
        syncCountdownTarget(secondsRemaining);
      } else {
        stopwatchStartRef.current = Date.now();
      }
      setIsTimerRunning(true);
    }
  };

  // Add Minutes
  const handleAddMinutes = (mins: number) => {
    const addedSecs = mins * 60;
    if (timerMode === 'countdown') {
      setTotalSeconds(prev => prev + addedSecs);
      setSecondsRemaining(prev => {
        const next = prev + addedSecs;
        if (isTimerRunning) {
          syncCountdownTarget(next);
        }
        return next;
      });
    } else {
      accumulatedElapsedRef.current += addedSecs;
      setSecondsElapsed(prev => prev + addedSecs);
    }
  };

  // Take 5m Break
  const handleTakeBreak = () => {
    const breakSecs = 5 * 60;
    setIsBreak(true);
    setTimerMode('countdown');
    setTotalSeconds(breakSecs);
    setSecondsRemaining(breakSecs);
    syncCountdownTarget(breakSecs);
    setIsTimerRunning(true);
    showToast(language === 'ar' ? 'بدأت استراحة ٥ دقائق للراحة والترطيب' : '5-minute relaxation break started.');
  };

  // Complete & Save Session
  const handleCompleteSession = () => {
    audioService.playCompletionChime();
    audioService.stopSoundscape();

    const studiedMinutes = Math.max(1, Math.round(secondsElapsed / 60));

    if (focusActivity) {
      logFocusSession(focusActivity.id, studiedMinutes);
      if (!focusActivity.isCompleted) {
        toggleCompleteActivity(focusActivity.id);
      }
    } else {
      // Create a completed activity for today with this study session
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMins = String(now.getMinutes()).padStart(2, '0');

      addActivity({
        title: sessionTitle || (language === 'ar' ? 'جلسة مذاكرة' : 'Study Session'),
        category: selectedCategory,
        date: getTodayDateString(),
        startTime: `${currentHours}:${currentMins}`,
        durationMinutes: studiedMinutes,
        priority: 'high',
        energyLevel: 'high',
        isCompleted: true,
        isFixedTime: false,
        focusMinutesLogged: studiedMinutes,
        notes: language === 'ar' ? `جلسة تركيز ومذاكرة مكتملة (${studiedMinutes} دقيقة)` : `Completed Focus Session (${studiedMinutes}m)`,
      });
    }

    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.65 },
      colors: ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6'],
    });

    showToast(
      t('focusModal.sessionSavedToast').replace('{minutes}', String(studiedMinutes))
    );

    setIsFocusModalOpen(false);
    setFocusActivity(null);
  };

  const handleClose = () => {
    audioService.stopSoundscape();
    setIsFocusModalOpen(false);
    setFocusActivity(null);
  };

  // Soundscape
  const handleSoundChange = (type: 'none' | 'rain' | 'brown_noise' | 'cafe_hum') => {
    setSoundType(type);
    audioService.playSoundscape(type);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioService.setVolume(v);
  };

  if (!isFocusModalOpen) return null;

  // Format times
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const elapsedMins = Math.floor(secondsElapsed / 60);
  const elapsedSecs = secondsElapsed % 60;
  const elapsedDisplay = `${elapsedMins}${t('common.minutes')} ${elapsedSecs}s`;

  const progressPercent = totalSeconds > 0 
    ? Math.min(100, Math.max(0, (secondsElapsed / totalSeconds) * 100))
    : 0;

  // Has session started (either active or paused with some elapsed time)
  const isSessionStarted = isTimerRunning || secondsElapsed > 0 || focusActivity !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('focusModal.title')}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-app)',
        zIndex: 'var(--z-focus-mode)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 20px',
        overflowY: 'auto',
      }}
      className="animate-fade-in"
    >
      {/* Top Bar: Title & Exit */}
      <div 
        style={{
          width: '100%',
          maxWidth: 780,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span 
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: isBreak ? 'var(--status-success)' : 'var(--accent-primary)',
              backgroundColor: isBreak ? 'var(--status-success-bg)' : 'rgba(37, 99, 235, 0.1)',
              border: `1px solid ${isBreak ? 'rgba(16, 185, 129, 0.25)' : 'rgba(37, 99, 235, 0.25)'}`,
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {isBreak ? <Coffee size={14} /> : <Timer size={14} />}
            <span>{isBreak ? t('focusModal.modeBreak') : t('focusModal.modeFocus')}</span>
          </span>

          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            {selectedCategory.toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleClose}
          className="btn-icon"
          title={t('common.close') + ' (Esc)'}
          aria-label={t('common.close')}
          style={{ width: 36, height: 36, borderRadius: '50%' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Main Center Container */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 20,
          maxWidth: 620,
          width: '100%',
          margin: 'auto 0',
        }}
      >
        {!isSessionStarted ? (
          /* ==========================================================================
             Quick Setup / Pre-Start Screen (When user opens Focus Timer freely)
             ========================================================================== */
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              padding: '28px 24px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              textAlign: 'start',
            }}
            className="animate-scale-in"
          >
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} style={{ color: 'var(--accent-primary)' }} />
                {t('focusModal.startNewSession')}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {t('focusModal.whatWorkingOn')}
              </p>
            </div>

            {/* Task Title Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                {t('focusModal.whatWorkingOn')}
              </label>
              <input
                type="text"
                value={sessionTitle}
                onChange={e => setSessionTitle(e.target.value)}
                placeholder={t('focusModal.taskPlaceholder')}
                className="input-field"
                style={{
                  fontSize: 15,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                }}
                autoFocus
              />
            </div>

            {/* Quick Pick from Today's Scheduled Tasks */}
            {todayActivities.filter(a => !a.isCompleted).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                  {t('focusModal.selectTaskOrType')}
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {todayActivities.filter(a => !a.isCompleted).map(act => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        setFocusActivity(act);
                        setSessionTitle(act.title);
                        setSelectedCategory(act.category);
                        handleStartTimer(act.durationMinutes || 45, 'countdown');
                      }}
                      style={{
                        fontSize: 12,
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                      }}
                    >
                      <BookOpen size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span>{act.title}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({act.durationMinutes}m)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Presets Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                {t('focusModal.durationPresets')}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {[
                  { mins: 25, label: t('focusModal.minutes25'), mode: 'countdown' as TimerMode },
                  { mins: 45, label: t('focusModal.minutes45'), mode: 'countdown' as TimerMode },
                  { mins: 60, label: t('focusModal.minutes60'), mode: 'countdown' as TimerMode },
                  { mins: 90, label: t('focusModal.minutes90'), mode: 'countdown' as TimerMode },
                ].map(p => (
                  <button
                    key={p.mins}
                    type="button"
                    onClick={() => {
                      setDurationPreset(p.mins);
                      setTimerMode('countdown');
                    }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: durationPreset === p.mins && timerMode === 'countdown'
                        ? 'var(--accent-primary)'
                        : 'var(--bg-subtle)',
                      color: durationPreset === p.mins && timerMode === 'countdown' ? '#FFFFFF' : 'var(--text-primary)',
                      border: '1px solid',
                      borderColor: durationPreset === p.mins && timerMode === 'countdown'
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Stopwatch option & Custom Minutes */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTimerMode('stopwatch')}
                  style={{
                    flex: 1,
                    minWidth: 160,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: timerMode === 'stopwatch' ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                    color: timerMode === 'stopwatch' ? '#FFFFFF' : 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <Clock size={14} />
                  <span>{t('focusModal.stopwatchMode')}</span>
                </button>

                {timerMode === 'countdown' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('focusModal.customMinutes')}:</span>
                    <input
                      type="number"
                      min="1"
                      max="300"
                      value={customMinutesInput}
                      onChange={e => {
                        const val = e.target.value;
                        setCustomMinutesInput(val);
                        const n = parseInt(val, 10);
                        if (!isNaN(n) && n > 0) setDurationPreset(n);
                      }}
                      style={{
                        width: 70,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="button"
              onClick={() => handleStartTimer(durationPreset, timerMode)}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              }}
            >
              <Play size={18} />
              <span>{t('focusModal.startTimer')}</span>
            </button>
          </div>
        ) : (
          /* ==========================================================================
             Active Focus / Study Timer Display
             ========================================================================== */
          <>
            {/* Task Title */}
            <div>
              <h1 
                style={{
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {isBreak ? (language === 'ar' ? 'استراحة وهدوء ☕' : 'Rest, breathe, and hydrate') : sessionTitle}
              </h1>
            </div>

            {/* Prominent Live Studied Time Badge (الذي طلبه المستخدم بالضبط) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                color: '#6366F1',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
              }}
            >
              <BookOpen size={15} />
              <span>
                {t('focusModal.studiedSoFar')}: <strong>{elapsedDisplay}</strong>
              </span>
            </div>

            {/* Huge Minimalist Timer Display */}
            <div 
              style={{
                fontSize: 'clamp(68px, 15vw, 118px)',
                fontWeight: 800,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '-0.04em',
                color: 'var(--text-primary)',
                lineHeight: 1,
                userSelect: 'none',
                margin: '12px 0 6px 0',
                textShadow: isTimerRunning ? '0 0 24px rgba(59, 130, 246, 0.2)' : 'none',
              }}
              aria-live="polite"
            >
              {timerMode === 'countdown' ? formatTime(secondsRemaining) : formatTime(secondsElapsed)}
            </div>

            {/* Label under digits */}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
              {timerMode === 'countdown' ? t('focusModal.remainingTime') : t('focusModal.studiedSoFar')}
            </span>

            {/* Sleek Progress Bar (Countdown) */}
            {timerMode === 'countdown' && (
              <div 
                style={{
                  width: '100%',
                  maxWidth: 380,
                  height: 6,
                  backgroundColor: 'var(--border-subtle)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  margin: '4px 0',
                }}
              >
                <div 
                  style={{
                    width: `${progressPercent}%`,
                    height: '100%',
                    backgroundColor: isBreak ? 'var(--status-success)' : 'var(--accent-primary)',
                    transition: 'width 0.5s linear',
                    borderRadius: 3,
                  }}
                />
              </div>
            )}

            {/* Primary Action Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={handleToggleTimer}
                className="btn-primary"
                style={{
                  padding: '13px 30px',
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                aria-label={isTimerRunning ? t('focusModal.pause') : t('focusModal.resume')}
              >
                {isTimerRunning ? <Pause size={18} /> : <Play size={18} />}
                <span>{isTimerRunning ? t('focusModal.pause') : t('focusModal.resume')}</span>
              </button>

              <button
                onClick={handleCompleteSession}
                className="btn-secondary"
                style={{
                  padding: '13px 26px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: 'var(--status-success-bg)',
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                  color: 'var(--status-success)',
                }}
                aria-label={t('focusModal.finishSession')}
              >
                <CheckCircle2 size={18} />
                <span>{t('focusModal.finishSession')}</span>
              </button>
            </div>

            {/* Micro-adjustments: +5m, +15m, Break */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button 
                onClick={() => handleAddMinutes(5)}
                className="btn-ghost"
                style={{ fontSize: 12, padding: '5px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)' }}
              >
                +5m
              </button>
              <button 
                onClick={() => handleAddMinutes(15)}
                className="btn-ghost"
                style={{ fontSize: 12, padding: '5px 12px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)' }}
              >
                +15m
              </button>

              {!isBreak && (
                <button 
                  onClick={handleTakeBreak}
                  className="btn-ghost"
                  style={{ 
                    fontSize: 12, 
                    padding: '5px 12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6,
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                  }}
                >
                  <Coffee size={14} />
                  <span>{t('focusModal.take5mBreak')}</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Bar: Ambient Soundscape Generator */}
      <div 
        style={{
          width: '100%',
          maxWidth: 620,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '12px 18px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Volume2 size={15} />
          <span>{t('focusModal.ambientSound')}:</span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'none', label: t('focusModal.soundOff') },
            { id: 'rain', label: t('focusModal.soundRain') },
            { id: 'brown_noise', label: t('focusModal.soundBrown') },
            { id: 'cafe_hum', label: t('focusModal.soundCafe') },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => handleSoundChange(s.id as 'none' | 'rain' | 'brown_noise' | 'cafe_hum')}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '5px 11px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: soundType === s.id ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                color: soundType === s.id ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {soundType !== 'none' && (
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={e => handleVolumeChange(Number(e.target.value))}
            style={{ width: 80, cursor: 'pointer' }}
            title="Ambient Volume"
            aria-label="Ambient Sound Volume"
          />
        )}
      </div>
    </div>
  );
};
