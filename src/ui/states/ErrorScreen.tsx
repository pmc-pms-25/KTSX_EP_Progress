import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import type { LoadError } from '../../store/moduleStore';

const HINTS: Record<string, MessageKey> = {
  NETWORK: 'error.hint.network',
  ACCESS_DENIED: 'error.hint.accessDenied',
  NOT_FOUND: 'error.hint.notFound',
  CONFIG: 'error.hint.config',
  MISSING_COLUMNS: 'error.hint.missingColumns',
};

export function ErrorScreen({ error, onRetry }: { error: LoadError; onRetry: () => void }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠
      </p>
      <h1 className="mt-3 text-lg font-semibold">{t(error.title)}</h1>
      <p className="mt-2 text-sm text-ink-2">{t(error.detail)}</p>
      {HINTS[error.code] && <p className="mt-2 text-xs text-ink-3">{t(HINTS[error.code])}</p>}
      <p className="mt-1 font-mono text-[10px] text-ink-3">{t('error.codeLabel', { code: error.code })}</p>
      <button type="button" onClick={onRetry} className="mt-5 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1 hover:bg-ai-1/30">
        {t('common.retry')}
      </button>
    </div>
  );
}
