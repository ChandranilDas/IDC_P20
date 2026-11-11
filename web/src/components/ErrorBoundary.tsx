import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public handleReload = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="card"
          style={{
            margin: '1.5rem auto',
            maxWidth: '720px',
            border: '2px solid #ef7755',
            background: '#ffffff',
            padding: '1.5rem',
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <AlertTriangle size={24} color="#ef7755" />
            <h3 style={{ margin: 0, color: '#102c57', fontSize: '1.1rem' }}>
              {this.props.fallbackTitle || 'A Simulation Component Error Occurred'}
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
            An unexpected error interrupted the view. You can safely recover by resetting the component state without losing the rest of your session.
          </p>
          {this.state.error && (
            <pre
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#dc2626',
                overflowX: 'auto',
                marginBottom: '1.25rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm" onClick={this.handleReset}>
              <RefreshCw size={14} /> Reset & Recover
            </button>
            <button className="btn btn-secondary btn-sm" onClick={this.handleReload}>
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
