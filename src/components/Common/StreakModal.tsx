import React from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../../context/AppContext';
import { Flame, Trophy, Timer, CheckCircle, X, Award } from 'lucide-react';
import { formatMinutesDuration } from '../../utils/timeUtils';

interface Props {
  onClose: () => void;
}

export const StreakModal: React.FC<Props> = ({ onClose }) => {
  const { streak } = useApp();

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: 24,
        }}
        className="animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div 
              style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 'var(--radius-sm)', 
                backgroundColor: 'rgba(245, 158, 11, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--status-warning)'
              }}
            >
              <Flame size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Productivity Streak & Milestones</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Consistency over intensity</p>
            </div>
          </div>
          <button className="btn-icon-subtle" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Stats Grid */}
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 12, 
            marginBottom: 20,
            padding: 12,
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CURRENT STREAK</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--status-warning)', marginTop: 2 }}>
              {streak.currentStreakDays} Days
            </div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>COMPLETED</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--status-success)', marginTop: 2 }}>
              {streak.totalCompletedActivities}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>FOCUS LOGGED</span>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)', marginTop: 3 }}>
              {formatMinutesDuration(streak.totalFocusMinutes)}
            </div>
          </div>
        </div>

        {/* Achievements */}
        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 12 }}>
          Achievements
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
          {streak.achievements.map(ach => (
            <div 
              key={ach.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: ach.isUnlocked ? 'var(--bg-surface)' : 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                opacity: ach.isUnlocked ? 1 : 0.65,
              }}
            >
              <div 
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: ach.isUnlocked ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: ach.isUnlocked ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              >
                {ach.isUnlocked ? <Trophy size={16} /> : <Award size={16} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{ach.title}</span>
                  {ach.isUnlocked ? (
                    <span style={{ fontSize: 11, color: 'var(--status-success)', fontWeight: 600 }}>Unlocked</span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ach.currentCount}/{ach.targetCount}</span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{ach.description}</p>
                {!ach.isUnlocked && (
                  <div style={{ width: '100%', height: 4, backgroundColor: 'var(--border-subtle)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${ach.progress}%`, height: '100%', backgroundColor: 'var(--accent-primary)' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
