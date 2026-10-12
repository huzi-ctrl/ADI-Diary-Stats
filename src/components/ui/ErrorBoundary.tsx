import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('adi_cached_calendar_events');
      localStorage.removeItem('adi_calendar_ics');
      localStorage.removeItem('adi_selected_calendar_id');
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      console.error('Error purging cache:', e);
    }
    window.location.href = window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-dark, #f8fafc)',
            padding: '1.5rem',
            fontFamily: 'var(--font-body, sans-serif)',
          }}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2.5rem',
              borderRadius: '24px',
              textAlign: 'center',
              boxShadow: 'var(--card-shadow, 0 10px 30px rgba(0,0,0,0.06))',
              border: '1px solid var(--border-light, rgba(0,0,0,0.08))',
              background: 'var(--bg-card, #ffffff)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <div>
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  margin: '0 0 0.5rem 0',
                  color: 'var(--text-main, #0f172a)',
                  letterSpacing: '-0.02em',
                }}
              >
                Something went wrong
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--text-muted, #475569)',
                  lineHeight: '1.5',
                }}
              >
                An unexpected error prevented the dashboard from rendering. You can reload the page or clear stale cached calendar data.
              </p>
            </div>

            {this.state.error && (
              <div
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'var(--bg-input, #f1f5f9)',
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.75rem',
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '100px',
                  border: '1px solid rgba(220, 38, 38, 0.15)',
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                width: '100%',
                marginTop: '0.5rem',
                justifyContent: 'center',
              }}
            >
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'var(--accent-primary, #0f172a)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <RefreshCw size={15} />
                Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                <Trash2 size={15} />
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
