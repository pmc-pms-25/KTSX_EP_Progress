import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  error?: Error;
}

/** Contains a widget failure so the rest of the dashboard keeps working. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Widget "${this.props.label}" failed`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-2xl border border-serious/40 bg-surface p-4 text-sm text-ink-2">
          <p className="font-semibold text-serious">Không hiển thị được "{this.props.label}".</p>
          <p className="mt-1 text-xs text-ink-3">{this.state.error.message}</p>
          <button className="mt-2 text-xs text-ai-1 underline" onClick={() => this.setState({ error: undefined })}>
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
