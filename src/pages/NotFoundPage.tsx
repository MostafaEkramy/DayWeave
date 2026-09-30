import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: 24,
      }}
      className="animate-fade-in"
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
          marginBottom: 16,
        }}
      >
        <Clock size={32} />
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0 }}>
        404
      </h1>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
        Page Not Found
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 360, marginTop: 4 }}>
        The timeline view or page you are looking for does not exist or has been moved.
      </p>

      <button
        onClick={() => navigate('/')}
        className="btn-primary"
        style={{ marginTop: 24, gap: 8, padding: '10px 20px' }}
      >
        <ArrowLeft size={16} />
        <span>Return to Daily Timeline</span>
      </button>
    </div>
  );
};

export default NotFoundPage;
