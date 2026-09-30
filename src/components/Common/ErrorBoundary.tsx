import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('DayWeave ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            backgroundColor: 'var(--bg-base, #0f172a)',
            color: 'var(--text-primary, #f8fafc)',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              textAlign: 'center',
              padding: 32,
              borderRadius: 12,
              border: '1px solid var(--border-medium, #334155)',
              backgroundColor: 'var(--bg-surface, #1e293b)',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #94a3b8)', marginBottom: 20 }}>
              {this.state.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
