import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 'var(--z-toast)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'var(--bg-surface)',
        color: 'var(--text-primary)',
        padding: '10px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-dropdown)',
        fontSize: 13,
        fontWeight: 500,
      }}
      className="animate-fade-in"
    >
      <CheckCircle2 size={16} color="var(--accent-primary)" />
      <span>{toastMessage}</span>
    </div>
  );
};
