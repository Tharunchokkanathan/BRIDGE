import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { IconAlertTriangle, IconRefresh } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-6 font-sans">
          <div className="max-w-[480px] w-full bg-[var(--surface)] border border-[var(--border)] rounded-[6px] p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[var(--risk-high)]">
              <IconAlertTriangle size={20} />
              <h2 className="text-[14px] font-semibold uppercase tracking-wider font-mono">
                System Render Failure
              </h2>
            </div>

            <p className="text-[13px] text-[var(--ink-muted)] leading-relaxed">
              An unexpected interface error interrupted screen rendering. The application state remains preserved in local memory.
            </p>

            {this.state.error && (
              <div className="bg-[var(--surface-sunken)] p-3 rounded-[4px] border border-[var(--border)] font-mono text-[11px] text-[var(--ink)] overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-[var(--border)]">
              <Button
                variant="primary"
                onClick={this.handleReset}
                icon={<IconRefresh size={15} />}
              >
                Reload Screen
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
