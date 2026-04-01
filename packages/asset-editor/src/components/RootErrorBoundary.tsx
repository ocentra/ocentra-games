import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { WindowControls } from '@/components/WindowControls';

interface State {
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            background: '#0f1117',
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 4px 0 0' }}>
            <WindowControls />
          </div>
          <div style={{ flex: 1, padding: 24 }}>
          <h1 style={{ color: '#f87171', margin: '0 0 1rem' }}>Asset Editor error</h1>
          <pre
            style={{
              background: '#1a1d27',
              padding: 16,
              borderRadius: 8,
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message}
          </pre>
          {this.state.errorInfo?.componentStack && (
            <>
              <h2 style={{ margin: '1.5rem 0 0.5rem', fontSize: 12, color: '#94a3b8' }}>Component stack</h2>
              <pre
                style={{
                  background: '#1a1d27',
                  padding: 16,
                  borderRadius: 8,
                  overflow: 'auto',
                  margin: 0,
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.errorInfo.componentStack}
              </pre>
            </>
          )}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                background: '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Refresh
            </button>
          </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
