import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { audioService } from '../../services/audioService';
import { 
  Play, 
  Pause, 
  CheckCircle2, 
  Coffee, 
  Volume2, 
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const FocusModal: React.FC = () => {
  const { 
    isFocusModalOpen, 
    setIsFocusModalOpen, 
    focusActivity, 
    setFocusActivity,
    toggleCompleteActivity,
    logFocusSession,
    showToast
  } = useApp();

  // Timer state
  const [totalSeconds, setTotalSeconds] = useState<number>(45 * 60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45 * 60);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isBreak, setIsBreak] = useState<boolean>(false);
  const [soundType, setSoundType] = useState<'none' | 'rain' | 'brown_noise' | 'cafe_hum'>('none');
  const [volume, setVolume] = useState<number>(0.3);

  // Accurate timestamp-based timing to eliminate tab throttling drift
  const targetEndTimeRef = useRef<number | null>(null);

  const syncTargetTime = useCallback((secs: number) => {
    targetEndTimeRef.current = Date.now() + secs * 1000;
  }, []);

  useEffect(() => {
    if (focusActivity) {
      const initialSecs = (focusActivity.durationMinutes || 45) * 60;
      setTotalSeconds(initialSecs);
      setSecondsRemaining(initialSecs);
      setIsActive(true);
      setIsBreak(false);
      syncTargetTime(initialSecs);
    }
  }, [focusActivity, syncTargetTime]);

  // High-accuracy interval ticker using Date.now() deltas
  useEffect(() => {
    if (!isFocusModalOpen) return;

    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && targetEndTimeRef.current !== null) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((targetEndTimeRef.current! - Date.now()) / 1000));
        setSecondsRemaining(remaining);

        if (remaining <= 0) {
          audioService.playCompletionChime();
          setIsActive(false);
          targetEndTimeRef.current = null;
          showToast(isBreak ? 'Break finished! Ready to focus.' : 'Focus session complete!');
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isBreak, isFocusModalOpen, showToast]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isFocusModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.code === 'Space' && (e.target as HTMLElement)?.tagName !== 'INPUT' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
        e.preventDefault();
        handleToggleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Soundscape handler
  const handleSoundChange = (type: 'none' | 'rain' | 'brown_noise' | 'cafe_hum') => {
    setSoundType(type);
    audioService.playSoundscape(type);
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    audioService.setVolume(v);
  };

  const handleClose = () => {
    audioService.stopSoundscape();
    setIsFocusModalOpen(false);
    setFocusActivity(null);
  };

  const handleToggleTimer = () => {
    if (isActive) {
      // Pause
      setIsActive(false);
      targetEndTimeRef.current = null;
    } else {
      // Resume
      syncTargetTime(secondsRemaining);
      setIsActive(true);
    }
  };

  const handleAddMinutes = (mins: number) => {
    const additionalSecs = mins * 60;
    setTotalSeconds(prev => prev + additionalSecs);
    setSecondsRemaining(prev => {
      const updated = prev + additionalSecs;
      if (isActive) {
        syncTargetTime(updated);
      }
      return updated;
    });
  };

  const handleTakeBreak = () => {
    const breakSecs = 5 * 60; // 5 min break
    setIsBreak(true);
    setTotalSeconds(breakSecs);
    setSecondsRemaining(breakSecs);
    syncTargetTime(breakSecs);
    setIsActive(true);
    showToast('5-minute relaxation break started.');
  };

  const handleCompleteActivity = () => {
    audioService.playCompletionChime();
    audioService.stopSoundscape();

    if (focusActivity) {
      const elapsedMins = Math.max(1, Math.round((totalSeconds - secondsRemaining) / 60));
      if (elapsedMins > 0) {
        logFocusSession(focusActivity.id, elapsedMins);
      }
      if (!focusActivity.isCompleted) {
        toggleCompleteActivity(focusActivity.id);
      }
    }

    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#2563EB', '#10B981', '#F59E0B'],
    });

    setIsFocusModalOpen(false);
    setFocusActivity(null);
  };

  if (!isFocusModalOpen || !focusActivity) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const progressPercent = totalSeconds > 0 
    ? Math.min(100, Math.max(0, ((totalSeconds - secondsRemaining) / totalSeconds) * 100))
    : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Focus Session Modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--bg-app)',
        zIndex: 'var(--z-focus-mode)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '32px 24px',
      }}
      className="animate-fade-in"
    >
      {/* Top Bar: Title & Exit */}
      <div 
        style={{
          width: '100%',
          maxWidth: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span 
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            {isBreak ? 'Break Mode' : 'Focus Mode'}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {focusActivity.category.toUpperCase()}
          </span>
        </div>

        <button
          onClick={handleClose}
          className="btn-icon"
          title="Exit Focus Mode (Esc)"
          aria-label="Exit Focus Mode"
        >
          <X size={18} />
        </button>
      </div>

      {/* Center Hero: Activity Title & Countdown */}
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 24,
          maxWidth: 640,
        }}
      >
        <h1 
          style={{
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            lineHeight: 1.3,
          }}
        >
          {isBreak ? 'Rest, breathe, and hydrate' : focusActivity.title}
        </h1>

        {focusActivity.notes && !isBreak && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 1.5 }}>
            "{focusActivity.notes}"
          </p>
        )}

        {/* Large Minimal Timer */}
        <div 
          style={{
            fontSize: 'clamp(64px, 14vw, 110px)',
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '-0.04em',
            color: 'var(--text-primary)',
            lineHeight: 1,
            userSelect: 'none',
          }}
          aria-live="polite"
        >
          {timeDisplay}
        </div>

        {/* Progress Bar */}
        <div 
          style={{
            width: '100%',
            maxWidth: 360,
            height: 4,
            backgroundColor: 'var(--border-subtle)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div 
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: isBreak ? 'var(--status-success)' : 'var(--accent-primary)',
              transition: 'width 0.5s linear',
            }}
          />
        </div>

        {/* Primary Timer Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12 }}>
          <button
            onClick={handleToggleTimer}
            className="btn-primary"
            style={{
              padding: '12px 28px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 'var(--radius-sm)',
            }}
            aria-label={isActive ? 'Pause Timer' : 'Resume Timer'}
          >
            {isActive ? <Pause size={18} /> : <Play size={18} />}
            <span>{isActive ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={handleCompleteActivity}
            className="btn-secondary"
            style={{
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 600,
            }}
            aria-label="Complete Activity and log session"
          >
            <CheckCircle2 size={18} color="var(--status-success)" />
            <span>Complete</span>
          </button>
        </div>

        {/* Secondary Micro-Adjustments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <button 
            onClick={() => handleAddMinutes(5)}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '4px 10px' }}
            aria-label="Add 5 minutes to timer"
          >
            +5m
          </button>
          <button 
            onClick={() => handleAddMinutes(15)}
            className="btn-ghost"
            style={{ fontSize: 12, padding: '4px 10px' }}
            aria-label="Add 15 minutes to timer"
          >
            +15m
          </button>
          {!isBreak && (
            <button 
              onClick={handleTakeBreak}
              className="btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
              aria-label="Take 5 minutes break"
            >
              <Coffee size={13} />
              <span>Take 5m Break</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Bar: Ambient Soundscape Generator */}
      <div 
        style={{
          width: '100%',
          maxWidth: 600,
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
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Volume2 size={14} />
          <span>Ambient Sound:</span>
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            { id: 'none', label: 'Off' },
            { id: 'rain', label: 'Gentle Rain' },
            { id: 'brown_noise', label: 'Warm Brown Noise' },
            { id: 'cafe_hum', label: 'Quiet Room' },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => handleSoundChange(s.id as 'none' | 'rain' | 'brown_noise' | 'cafe_hum')}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: soundType === s.id ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                color: soundType === s.id ? '#FFFFFF' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
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
