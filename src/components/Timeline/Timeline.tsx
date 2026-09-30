import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { Activity, CATEGORY_DEFINITIONS } from '../../types/activity';
import { 
  timeToMinutes, 
  minutesToTime, 
  snapTo15Minutes, 
  getTimelineHours, 
  getCurrentTimeMinutes, 
  formatMinutesDuration 
} from '../../utils/timeUtils';
import { isDateToday } from '../../utils/dateUtils';
import { TimelineCard } from './TimelineCard';
import { TimelineGap } from './TimelineGap';
import { ConflictBanner } from './ConflictBanner';
import { 
  Inbox, 
  Plus, 
  Trash2, 
  Calendar, 
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const HOUR_HEIGHT = 84; // 84px per hour
const PX_PER_MINUTE = HOUR_HEIGHT / 60; // 1.4px per minute

interface DragState {
  activity: Activity;
  initialY: number;
  initialStartMin: number;
  currentStartMin: number;
}

interface ResizeState {
  activity: Activity;
  initialY: number;
  initialDuration: number;
  currentDuration: number;
}

export const Timeline: React.FC = () => {
  const { 
    selectedDate, 
    todayActivities, 
    timeWindow, 
    conflicts, 
    backlog,
    addToBacklog,
    scheduleBacklogItem,
    deleteBacklogItem,
    rescheduleDayAutomatically,
    moveActivity, 
    resizeActivityDuration,
    setIsActivityModalOpen,
    setEditingActivity
  } = useApp();

  const { isRTL } = useLanguage();
  const timelineContainerRef = useRef<HTMLDivElement>(null);

  // Backlog state
  const [isBacklogOpen, setIsBacklogOpen] = useState(true);
  const [newBacklogTitle, setNewBacklogTitle] = useState('');
  const [newBacklogDuration, setNewBacklogDuration] = useState(45);
  const [schedulingBacklogId, setSchedulingBacklogId] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // Parse time window bounds
  const windowStartMin = timeToMinutes(timeWindow.startTime); // default 07:00 = 420
  const windowEndMin = timeToMinutes(timeWindow.endTime);     // default 22:00 = 1320
  const startHour = Math.floor(windowStartMin / 60);
  const endHour = Math.ceil(windowEndMin / 60);
  const hours = getTimelineHours(startHour, endHour);

  // Live real-time indicator
  const [currentMin, setCurrentMin] = useState<number>(getCurrentTimeMinutes());
  const isToday = isDateToday(selectedDate);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentMin(getCurrentTimeMinutes());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Drag-and-drop state
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);

  // Set of conflicted activity IDs
  const conflictedIds = useMemo(() => {
    const set = new Set<string>();
    conflicts.forEach(c => {
      set.add(c.activityAId);
      set.add(c.activityBId);
    });
    return set;
  }, [conflicts]);

  // Compute unoccupied gaps for TimelineGap components
  const gaps = useMemo(() => {
    const sorted = [...todayActivities].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const result: { startMin: number; duration: number }[] = [];
    let cursor = windowStartMin;

    for (const act of sorted) {
      const actStart = timeToMinutes(act.startTime);
      const actEnd = actStart + act.durationMinutes;

      if (actStart > cursor) {
        result.push({
          startMin: cursor,
          duration: actStart - cursor,
        });
      }
      cursor = Math.max(cursor, actEnd);
    }

    if (cursor < windowEndMin) {
      result.push({
        startMin: cursor,
        duration: windowEndMin - cursor,
      });
    }

    return result.filter(g => g.duration >= 15);
  }, [todayActivities, windowStartMin, windowEndMin]);

  // Pointer event handlers for Dragging
  const handleStartDrag = (e: React.PointerEvent, act: Activity) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDragging({
      activity: act,
      initialY: e.clientY,
      initialStartMin: timeToMinutes(act.startTime),
      currentStartMin: timeToMinutes(act.startTime),
    });
  };

  const handleStartResize = (e: React.PointerEvent, act: Activity) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setResizing({
      activity: act,
      initialY: e.clientY,
      initialDuration: act.durationMinutes,
      currentDuration: act.durationMinutes,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging) {
      const deltaY = e.clientY - dragging.initialY;
      const deltaMinutes = Math.round(deltaY / PX_PER_MINUTE);
      const newStart = snapTo15Minutes(
        Math.max(windowStartMin, Math.min(windowEndMin - dragging.activity.durationMinutes, dragging.initialStartMin + deltaMinutes))
      );
      setDragging(prev => prev ? { ...prev, currentStartMin: newStart } : null);
    } else if (resizing) {
      const deltaY = e.clientY - resizing.initialY;
      const deltaMinutes = Math.round(deltaY / PX_PER_MINUTE);
      const newDur = Math.max(15, snapTo15Minutes(resizing.initialDuration + deltaMinutes));
      setResizing(prev => prev ? { ...prev, currentDuration: newDur } : null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (dragging.currentStartMin !== dragging.initialStartMin) {
        moveActivity(dragging.activity.id, minutesToTime(dragging.currentStartMin));
      }
      setDragging(null);
    } else if (resizing) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (resizing.currentDuration !== resizing.initialDuration) {
        resizeActivityDuration(resizing.activity.id, resizing.currentDuration);
      }
      setResizing(null);
    }
  };

  const handleTimelineSlotClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineContainerRef.current) {
      const rect = timelineContainerRef.current.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clickedMinutes = windowStartMin + Math.floor(clickY / PX_PER_MINUTE);
      const snappedStart = snapTo15Minutes(clickedMinutes);

      setEditingActivity({
        id: '',
        date: selectedDate,
        title: '',
        category: 'work',
        startTime: minutesToTime(snappedStart),
        durationMinutes: 60,
        priority: 'medium',
        energyLevel: 'medium',
        isCompleted: false,
        isFixedTime: false,
        createdAt: '',
        updatedAt: '',
      });
      setIsActivityModalOpen(true);
    }
  };

  const handleAddBacklogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBacklogTitle.trim()) return;
    addToBacklog({
      title: newBacklogTitle.trim(),
      category: 'work',
      durationMinutes: newBacklogDuration,
      priority: 'medium',
      energyLevel: 'medium',
      isCompleted: false,
      isFixedTime: false,
    });
    setNewBacklogTitle('');
  };

  const handleConfirmScheduleBacklog = (id: string) => {
    scheduleBacklogItem(id, selectedDate, scheduleTime);
    setSchedulingBacklogId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ConflictBanner />

      {/* Empty Day Welcoming Indicator */}
      {todayActivities.length === 0 && (
        <div 
          className="timeline__empty-banner"
          style={{
            padding: '14px 18px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 20
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {isRTL ? 'الجدول اليومي فارغ' : 'Your day is open'}
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                {isRTL ? 'انقر مرتين على أي ساعة بالأسفل، أو اضغط زر "+ إضافة نشاط" للبدء.' : 'Double-click any time slot below or click "+ Add Activity" to start.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingActivity(null);
              setIsActivityModalOpen(true);
            }}
            className="btn-primary timeline__empty-add-btn"
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            <Plus size={14} />
            <span>{isRTL ? 'إضافة نشاط' : 'Add Activity'}</span>
          </button>
        </div>
      )}

      {/* Main Timeline Card Container */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
          position: 'relative',
          overflow: 'hidden',
          touchAction: dragging || resizing ? 'none' : 'pan-y',
        }}
      >
        <div
          ref={timelineContainerRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDoubleClick={handleTimelineSlotClick}
          style={{
            position: 'relative',
            height: (hours.length - 1) * HOUR_HEIGHT + 40,
            userSelect: dragging || resizing ? 'none' : 'auto',
          }}
        >
          {/* Hour Grid Lines & Labels */}
          {hours.map((hour, index) => {
            const topPx = index * HOUR_HEIGHT;
            const hourStr = `${hour.toString().padStart(2, '0')}:00`;

            return (
              <React.Fragment key={hour}>
                {/* Full Hour Row */}
                <div
                  style={{
                    position: 'absolute',
                    top: topPx,
                    left: 0,
                    right: 0,
                    height: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {/* Time label in gutter */}
                  <div
                    style={{
                      width: 'var(--timeline-gutter-width)',
                      paddingLeft: isRTL ? 0 : 16,
                      paddingRight: isRTL ? 16 : 0,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {hourStr}
                  </div>

                  {/* Horizontal line */}
                  <div
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: 'var(--border-subtle)',
                      opacity: 0.8,
                    }}
                  />
                </div>

                {/* 30-minute dashed half-hour line */}
                {index < hours.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: topPx + HOUR_HEIGHT / 2,
                      left: 'var(--timeline-gutter-width)',
                      right: 0,
                      height: 1,
                      borderTop: '1px dashed var(--border-subtle)',
                      opacity: 0.4,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Real-time Indicator Line */}
          {isToday && currentMin >= windowStartMin && currentMin <= windowEndMin && (
            <div
              style={{
                position: 'absolute',
                top: (currentMin - windowStartMin) * PX_PER_MINUTE,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'var(--accent-primary)',
                zIndex: 20,
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {/* Pulse dot in gutter */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-primary)',
                  marginLeft: isRTL ? undefined : 'calc(var(--timeline-gutter-width) - 4px)',
                  marginRight: isRTL ? 'calc(var(--timeline-gutter-width) - 4px)' : undefined,
                  boxShadow: '0 0 8px var(--accent-primary)',
                }}
              />
            </div>
          )}

          {/* Smart Unoccupied Gaps */}
          {gaps.map((gap, i) => {
            const gapTop = (gap.startMin - windowStartMin) * PX_PER_MINUTE + 2;
            const gapHeight = gap.duration * PX_PER_MINUTE - 4;

            if (gapHeight < 14) return null;

            return (
              <TimelineGap
                key={`gap-${gap.startMin}-${i}`}
                startMinutes={gap.startMin}
                durationMinutes={gap.duration}
                topPx={gapTop}
                heightPx={gapHeight}
              />
            );
          })}

          {/* Activity Cards */}
          {todayActivities.map(act => {
            const isCurrentlyDragged = dragging?.activity.id === act.id;
            const isCurrentlyResized = resizing?.activity.id === act.id;

            const effectiveStartMin = isCurrentlyDragged ? dragging.currentStartMin : timeToMinutes(act.startTime);
            const effectiveDuration = isCurrentlyResized ? resizing.currentDuration : act.durationMinutes;

            const topPx = (effectiveStartMin - windowStartMin) * PX_PER_MINUTE + 2;
            const heightPx = effectiveDuration * PX_PER_MINUTE - 4;

            return (
              <TimelineCard
                key={act.id}
                activity={act}
                topPx={topPx}
                heightPx={heightPx}
                isConflicted={conflictedIds.has(act.id)}
                onStartDrag={handleStartDrag}
                onStartResize={handleStartResize}
              />
            );
          })}

          {/* Drag Feedback Tooltip */}
          {dragging && (
            <div
              style={{
                position: 'fixed',
                top: dragging.initialY - 40,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-app)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              Moving to {minutesToTime(dragging.currentStartMin)} – {minutesToTime(dragging.currentStartMin + dragging.activity.durationMinutes)}
            </div>
          )}

          {/* Resize Feedback Tooltip */}
          {resizing && (
            <div
              style={{
                position: 'fixed',
                top: resizing.initialY + 20,
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'var(--text-primary)',
                color: 'var(--bg-app)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              New Duration: {formatMinutesDuration(resizing.currentDuration)}
            </div>
          )}
        </div>
      </div>

      {/* Task Backlog (Unscheduled Tasks Drawer) */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          padding: 16,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsBacklogOpen(!isBacklogOpen)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Inbox size={18} style={{ color: 'var(--accent-primary)' }} />
            <h4 style={{ fontSize: 14, fontWeight: 700 }}>
              Task Backlog ({backlog.length} unscheduled)
            </h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {todayActivities.length > 2 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); rescheduleDayAutomatically(); }}
                className="btn-ghost"
                style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                title="Dynamically reschedule remaining tasks"
              >
                <RefreshCw size={12} />
                <span>Reschedule Day</span>
              </button>
            )}
            <button className="btn-icon-subtle" style={{ width: 24, height: 24 }}>
              {isBacklogOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {isBacklogOpen && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }} className="animate-fade-in">
            {/* Quick Add to Backlog Input */}
            <form onSubmit={handleAddBacklogSubmit} style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
              <input
                type="text"
                placeholder="Add an unscheduled task to backlog..."
                value={newBacklogTitle}
                onChange={e => setNewBacklogTitle(e.target.value)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  width: 'auto',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                }}
              />
              <select
                value={newBacklogDuration}
                onChange={e => setNewBacklogDuration(Number(e.target.value))}
                style={{
                  flexShrink: 0,
                  width: 'auto',
                  minWidth: 72,
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                }}
              >
                <option value={15}>15m</option>
                <option value={30}>30m</option>
                <option value={45}>45m</option>
                <option value={60}>1h</option>
                <option value={90}>1.5h</option>
                <option value={120}>2h</option>
              </select>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ flexShrink: 0, padding: '8px 16px', fontSize: 13, gap: 6, whiteSpace: 'nowrap' }}
              >
                <Plus size={15} />
                <span>Add</span>
              </button>
            </form>

            {/* Backlog Items List */}
            {backlog.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0', fontStyle: 'italic' }}>
                No unscheduled tasks in your backlog. Add tasks you want to schedule later.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {backlog.map(item => {
                  const isScheduling = schedulingBacklogId === item.id;
                  const cat = CATEGORY_DEFINITIONS[item.category] || CATEGORY_DEFINITIONS.work;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: 13,
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: cat.accentColor,
                          flexShrink: 0,
                        }} />
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                          ({item.durationMinutes}m)
                        </span>
                      </div>

                      {isScheduling ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <input
                            type="time"
                            value={scheduleTime}
                            onChange={e => setScheduleTime(e.target.value)}
                            style={{
                              width: 'auto',
                              flexShrink: 0,
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-xs)',
                              border: '1px solid var(--border-medium)',
                              backgroundColor: 'var(--bg-app)',
                              fontSize: 12,
                            }}
                          />
                          <button
                            onClick={() => handleConfirmScheduleBacklog(item.id)}
                            className="btn-primary"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                          >
                            Place
                          </button>
                          <button
                            onClick={() => setSchedulingBacklogId(null)}
                            className="btn-ghost"
                            style={{ padding: '3px 6px', fontSize: 11 }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => { setSchedulingBacklogId(item.id); setScheduleTime('09:00'); }}
                            className="btn-secondary"
                            style={{ padding: '3px 8px', fontSize: 11, gap: 4, whiteSpace: 'nowrap' }}
                          >
                            <Calendar size={11} />
                            <span>Schedule on Today</span>
                          </button>
                          <button
                            onClick={() => deleteBacklogItem(item.id)}
                            className="btn-icon-subtle"
                            style={{ width: 22, height: 22, color: 'var(--status-danger)' }}
                            title="Delete task from backlog"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
