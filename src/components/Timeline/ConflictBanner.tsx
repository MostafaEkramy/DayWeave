import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, Wand2, X } from 'lucide-react';

export const ConflictBanner: React.FC = () => {
  const { conflicts, resolveConflictsAutomatically } = useApp();
  const { t } = useLanguage();

  if (conflicts.length === 0) return null;

  const firstConflict = conflicts[0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px 16px',
        backgroundColor: 'var(--status-danger-bg)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 16,
      }}
      className="animate-fade-in"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={18} color="var(--status-danger)" />
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--status-danger)' }}>
            {t('conflict.detected')} ({conflicts.length})
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>
            "{firstConflict.activityATitle}" {t('conflict.and')} "{firstConflict.activityBTitle}" {t('conflict.overlapBy')} {firstConflict.overlapMinutes}m.
          </span>
        </div>
      </div>

      <button
        onClick={resolveConflictsAutomatically}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: 'var(--status-danger)',
          color: '#FFFFFF',
          padding: '6px 12px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <Wand2 size={13} />
        <span>{t('conflict.autoResolve')}</span>
      </button>
    </div>
  );
};
