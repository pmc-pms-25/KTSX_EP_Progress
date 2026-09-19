import { Component, type ErrorInfo, type ReactNode } from 'react';
import type { Lang } from '../../i18n/message';
import { translate } from '../../i18n/translate';
import { useT } from '../../i18n/useT';

interface ClassProps {
  label: string;
  lang: Lang;
  children: ReactNode;
}

interface State {
  error?: Error;
}

/**
 * Contains a widget failure so the rest of the dashboard keeps working.
 * Class component (needs getDerivedStateFromError/componentDidCatch), so it can't use
 * useT() itself; it takes `lang` as a prop instead — the wrapper below re-renders this
 * same instance (not a new one, so caught-error state survives) whenever lang changes.
 */
class ErrorBoundaryClass extends Component<ClassProps, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Widget "${this.props.label}" failed`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const { lang, label } = this.props;
      return (
        <div role="alert" className="rounded-2xl border border-serious/40 bg-surface p-4 text-sm text-ink-2">
          <p className="font-semibold text-serious">{translate(lang, 'errorBoundary.failed', { label })}</p>
          <p className="mt-1 text-xs text-ink-3">{this.state.error.message}</p>
          <button className="mt-2 text-xs text-ai-1 underline" onClick={() => this.setState({ error: undefined })}>
            {translate(lang, 'common.retry')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  label: string;
  children: ReactNode;
}

export function ErrorBoundary({ label, children }: Props) {
  const { lang } = useT();
  return (
    <ErrorBoundaryClass label={label} lang={lang}>
      {children}
    </ErrorBoundaryClass>
  );
}
