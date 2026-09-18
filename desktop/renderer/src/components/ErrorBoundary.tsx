import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log technical error internally via IPC or console, never show stack to user
    if (typeof window !== 'undefined' && window.rsInventory) {
      window.rsInventory.logMessage('ERROR', 'Unhandled React Component Crash', {
        name: error.name,
        message: error.message,
        componentStack: errorInfo.componentStack,
      });
    } else {
      console.error('[ErrorBoundary] Unhandled UI crash:', error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false });
  };

  private handleRestart = () => {
    if (typeof window !== 'undefined' && window.rsInventory) {
      window.rsInventory.windowControl('restart');
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-surface-950 px-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-surface-900/80 p-8 shadow-2xl backdrop-blur-xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <AlertTriangle className="h-8 w-8" />
            </div>

            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Application Error</h1>
            <p className="mb-6 text-sm text-slate-400 leading-relaxed">
              Something went wrong.
              <br />
              Please restart RS Inventory.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-surface-800 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-surface-700 active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>

              <button
                type="button"
                onClick={this.handleRestart}
                className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-600/20 transition-all hover:bg-rose-500 active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
                Restart Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
