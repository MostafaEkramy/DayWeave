import React, { useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { analyzeEnergyAlignment } from '../../services/energyEngine';
import { AlertTriangle, Zap, CheckCircle, Clock, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const NotificationsPopover: React.FC<Props> = ({ onClose }) => {
  const { conflicts, resolveConflictsAutomatically, userEnergy, todayActivities, timeBudget } = useApp();
  const popoverRef = useRef<HTMLDivElement>(null);

  const energyAdvice = analyzeEnergyAlignment(userEnergy, todayActivities);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 340,
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-dropdown)',
        zIndex: 'var(--z-popover)',
        padding: 16,
      }}
      className="animate-fade-in"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>Schedule Status</h4>
        <button className="btn-icon-subtle" onClick={onClose} style={{ width: 22, height: 22 }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Conflicts Alert */}
        {conflicts.length > 0 ? (
          <div 
            style={{
              padding: 10,
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--status-danger)', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
              <AlertTriangle size={14} />
              <span>{conflicts.length} Overlapping Schedule Conflict{conflicts.length > 1 ? 's' : ''}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              "{conflicts[0].activityATitle}" overlaps with "{conflicts[0].activityBTitle}" by {conflicts[0].overlapMinutes}m.
            </p>
            <button 
              onClick={() => {
                resolveConflictsAutomatically();
                onClose();
              }}
              style={{
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: 'var(--status-danger)',
                color: '#FFFFFF',
                padding: '4px 10px',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              Auto-Resolve All Conflicts
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--status-success)' }}>
            <CheckCircle size={15} />
            <span>Zero schedule conflicts detected.</span>
          </div>
        )}

        {/* Energy Advisor */}
        <div 
          style={{
            padding: 10,
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', marginBottom: 4 }}>
            <Zap size={14} color="var(--accent-primary)" />
            <span>{energyAdvice.title}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            {energyAdvice.message}
          </p>
        </div>

        {/* Time Budget summary */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12,
            padding: '8px 10px',
            backgroundColor: 'var(--bg-inset)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
            <Clock size={13} />
            <span>Free buffer time:</span>
          </span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {Math.floor(timeBudget.freeMinutes / 60)}h {timeBudget.freeMinutes % 60}m
          </span>
        </div>
      </div>
    </div>
  );
};
