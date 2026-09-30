import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Sun, 
  Moon, 
  Sunrise, 
  Sunset,
  Sparkles,
  Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { 
  formatTimeInfo, 
  shiftTime, 
  getSnappedCurrentTime,
  minutesToTime,
  TimeOfDayPeriod
} from '../../utils/timeUtils';

export interface TimePickerProps {
  value: string; // "HH:mm" (24-hour format, e.g. "09:00")
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  showShortcuts?: boolean;
  showSteppers?: boolean;
  step?: 15 | 30;
  align?: 'start' | 'end';
  className?: string;
  style?: React.CSSProperties;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = '09:00',
  onChange,
  id,
  disabled = false,
  showShortcuts = true,
  showSteppers = false,
  step = 15,
  align = 'end',
  className = '',
  style = {},
}) => {
  const { t, language, isRTL } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'slots' | 'custom'>('slots');
  const [slotStep, setSlotStep] = useState<15 | 30>(step);

  const containerRef = useRef<HTMLDivElement>(null);
  const slotsListRef = useRef<HTMLDivElement>(null);
  const activeSlotRef = useRef<HTMLButtonElement>(null);

  const isArabic = language === 'ar';
  const timeInfo = useMemo(() => formatTimeInfo(value, isArabic), [value, isArabic]);

  // Close dropdown on click outside or Esc
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Auto-scroll to selected slot when popover opens or step changes
  useEffect(() => {
    if (isOpen && activeTab === 'slots') {
      const timer = setTimeout(() => {
        if (activeSlotRef.current) {
          activeSlotRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab, slotStep]);

  // Generate slots for 24 hours (every 15 or 30 mins)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let min = 0; min < 1440; min += slotStep) {
      slots.push(minutesToTime(min));
    }
    return slots;
  }, [slotStep]);

  // Quick adjust handler
  const handleShift = (deltaMinutes: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(shiftTime(value, deltaMinutes));
  };

  // Set to current snapped time
  const handleSetNow = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(getSnappedCurrentTime(15));
  };

  // Set hour in custom tab while preserving minutes
  const handleSetHour12 = (selectedHour12: number) => {
    let newH24 = selectedHour12 % 12;
    if (timeInfo.isPM) {
      newH24 += 12;
    }
    const newTime = `${newH24.toString().padStart(2, '0')}:${timeInfo.minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  // Toggle AM / PM in custom tab
  const handleTogglePeriod = (targetPeriod: 'AM' | 'PM') => {
    let newH24 = timeInfo.hour12 % 12;
    if (targetPeriod === 'PM') {
      newH24 += 12;
    }
    const newTime = `${newH24.toString().padStart(2, '0')}:${timeInfo.minutes.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  // Set minute in custom tab
  const handleSetMinute = (newMin: number) => {
    const safeMin = Math.max(0, Math.min(59, newMin));
    const newTime = `${timeInfo.hour24.toString().padStart(2, '0')}:${safeMin.toString().padStart(2, '0')}`;
    onChange(newTime);
  };

  const getPeriodIcon = (period: TimeOfDayPeriod) => {
    switch (period) {
      case 'morning':
        return <Sunrise size={13} style={{ color: '#F59E0B' }} />;
      case 'afternoon':
        return <Sun size={13} style={{ color: '#3B82F6' }} />;
      case 'evening':
        return <Sunset size={13} style={{ color: '#EC4899' }} />;
      case 'night':
        return <Moon size={13} style={{ color: '#8B5CF6' }} />;
    }
  };

  return (
    <div 
      ref={containerRef} 
      className={`time-picker-wrapper ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Main Trigger Bar */}
      <div
        id={id}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-expanded={isOpen}
        aria-label={t('timePicker.selectTime')}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        onKeyDown={e => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(prev => !prev);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid',
          borderColor: isOpen ? 'var(--border-focus)' : 'var(--border-subtle)',
          boxShadow: isOpen ? '0 0 0 1px var(--border-focus)' : 'none',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          userSelect: 'none',
          transition: 'all 0.15s ease',
          gap: 6,
        }}
      >
        {/* Left: Clock Icon + Formatted Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden' }}>
          <Clock size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-primary)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {timeInfo.fullDisplay}
          </span>
        </div>

        {/* Right: Steppers (optional) + Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {showSteppers && (
            <>
              {/* Quick -15 min stepper */}
              <button
                type="button"
                title={isArabic ? 'تقليل ١٥ دقيقة' : '-15 min'}
                disabled={disabled}
                onClick={e => handleShift(-15, e)}
                style={{
                  padding: '2px 5px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  height: 22,
                  lineHeight: 1,
                }}
              >
                -15
              </button>

              {/* Quick +15 min stepper */}
              <button
                type="button"
                title={isArabic ? 'زيادة ١٥ دقيقة' : '+15 min'}
                disabled={disabled}
                onClick={e => handleShift(15, e)}
                style={{
                  padding: '2px 5px',
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  height: 22,
                  lineHeight: 1,
                }}
              >
                +15
              </button>

              <div style={{ width: 1, height: 14, backgroundColor: 'var(--border-subtle)', margin: '0 2px' }} />
            </>
          )}

          {isOpen ? (
            <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </div>

      {/* Quick Shortcuts Row Underneath Input */}
      {showShortcuts && (
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4, 
            marginTop: 5, 
            flexWrap: 'wrap' 
          }}
        >
          <button
            type="button"
            onClick={handleSetNow}
            title={isArabic ? 'تعيين إلى الوقت الحالي' : 'Set to current time'}
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <Sparkles size={10} />
            {t('timePicker.now')}
          </button>

          <button
            type="button"
            onClick={e => handleShift(15, e)}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            +15m
          </button>

          <button
            type="button"
            onClick={e => handleShift(30, e)}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            +30m
          </button>

          <button
            type="button"
            onClick={e => handleShift(60, e)}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            +1h
          </button>

          <button
            type="button"
            onClick={() => onChange('09:00')}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: value === '09:00' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-subtle)',
              color: value === '09:00' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: value === '09:00' ? 'var(--accent-primary)' : 'var(--border-subtle)',
            }}
          >
            09:00
          </button>

          <button
            type="button"
            onClick={() => onChange('14:00')}
            style={{
              fontSize: 10,
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: value === '14:00' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-subtle)',
              color: value === '14:00' ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: '1px solid',
              borderColor: value === '14:00' ? 'var(--accent-primary)' : 'var(--border-subtle)',
            }}
          >
            14:00
          </button>
        </div>
      )}

      {/* Floating Popover Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...(align === 'end'
              ? (isRTL ? { left: 0 } : { right: 0 })
              : (isRTL ? { right: 0 } : { left: 0 })),
            zIndex: 1200,
            width: 300,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-dropdown)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
          className="animate-fade-in"
          onClick={e => e.stopPropagation()}
        >
          {/* Header Preview Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 10px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {getPeriodIcon(timeInfo.timeOfDay)}
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                  {timeInfo.fullDisplay}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  24h: {timeInfo.time24Text}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={handleSetNow}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 7px',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {t('timePicker.now')}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-icon-subtle"
                style={{ width: 22, height: 22 }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 4,
              backgroundColor: 'var(--bg-subtle)',
              padding: 3,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('slots')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: activeTab === 'slots' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'slots' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'slots' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {t('timePicker.quickSlots')}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: activeTab === 'custom' ? 'var(--bg-surface)' : 'transparent',
                color: activeTab === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: activeTab === 'custom' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {t('timePicker.customTime')}
            </button>
          </div>

          {/* TAB 1: Quick Slots List */}
          {activeTab === 'slots' && (
            <div>
              {/* Quick Period Jump Filters & Step Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', gap: 3 }}>
                  <button
                    type="button"
                    title={isArabic ? 'الصباح (08:00)' : 'Morning (08:00)'}
                    onClick={() => onChange('08:00')}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    🌅 {isArabic ? 'صباحاً' : 'AM'}
                  </button>
                  <button
                    type="button"
                    title={isArabic ? 'الظهيرة (12:00)' : 'Afternoon (12:00)'}
                    onClick={() => onChange('12:00')}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    ☀️ {isArabic ? 'ظهراً' : 'Noon'}
                  </button>
                  <button
                    type="button"
                    title={isArabic ? 'المساء (17:00)' : 'Evening (17:00)'}
                    onClick={() => onChange('17:00')}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    🌇 {isArabic ? 'مساءً' : 'PM'}
                  </button>
                </div>

                {/* Step Toggle: 15m vs 30m */}
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setSlotStep(15)}
                    style={{
                      fontSize: 10,
                      fontWeight: slotStep === 15 ? 700 : 500,
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: slotStep === 15 ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: slotStep === 15 ? '#FFFFFF' : 'var(--text-muted)',
                      border: 'none',
                    }}
                  >
                    15m
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotStep(30)}
                    style={{
                      fontSize: 10,
                      fontWeight: slotStep === 30 ? 700 : 500,
                      padding: '2px 5px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: slotStep === 30 ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: slotStep === 30 ? '#FFFFFF' : 'var(--text-muted)',
                      border: 'none',
                    }}
                  >
                    30m
                  </button>
                </div>
              </div>

              {/* Scrollable Slot Items Grid */}
              <div
                ref={slotsListRef}
                style={{
                  maxHeight: 180,
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 4,
                  paddingRight: 2,
                }}
              >
                {timeSlots.map(slot => {
                  const isSelected = slot === value;
                  const itemInfo = formatTimeInfo(slot, isArabic);

                  return (
                    <button
                      key={slot}
                      ref={isSelected ? activeSlotRef : undefined}
                      type="button"
                      onClick={() => {
                        onChange(slot);
                        setIsOpen(false);
                      }}
                      style={{
                        padding: '6px 8px',
                        fontSize: 11,
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                        color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: isRTL ? 'right' : 'left',
                        transition: 'background-color 0.1s ease',
                      }}
                    >
                      <span>{itemInfo.fullDisplay}</span>
                      <span style={{ fontSize: 10, opacity: isSelected ? 0.9 : 0.5 }}>
                        {slot}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Hours & Minutes */}
          {activeTab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* AM / PM Segmented Control */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {isArabic ? 'الفترة' : 'Period'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => handleTogglePeriod('AM')}
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: !timeInfo.isPM ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: !timeInfo.isPM ? '#FFFFFF' : 'var(--text-secondary)',
                      border: '1px solid',
                      borderColor: !timeInfo.isPM ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Sunrise size={14} />
                    {t('timePicker.amLong')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTogglePeriod('PM')}
                    style={{
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: timeInfo.isPM ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                      color: timeInfo.isPM ? '#FFFFFF' : 'var(--text-secondary)',
                      border: '1px solid',
                      borderColor: timeInfo.isPM ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Sunset size={14} />
                    {t('timePicker.pmLong')}
                  </button>
                </div>
              </div>

              {/* Hours Grid (1 to 12) */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {t('timePicker.hours')} (1 - 12)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => {
                    const isSelected = timeInfo.hour12 === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleSetHour12(h)}
                        style={{
                          height: 28,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        }}
                      >
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minutes Presets + Stepper */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                  {t('timePicker.minutes')}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 6 }}>
                  {[0, 15, 30, 45].map(m => {
                    const isSelected = timeInfo.minutes === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleSetMinute(m)}
                        style={{
                          height: 28,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                          color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        }}
                      >
                        :{m.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>

                {/* Fine tuning +/- 5 min */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleShift(-5)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    -5m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShift(-1)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    -1m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShift(1)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    +1m
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShift(5)}
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    +5m
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer Done Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setIsOpen(false)}
              style={{
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Check size={14} />
              {t('timePicker.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
