import { useT } from '../../i18n/useT';

export function EmptyFilterState({ onClear }: { onClear: () => void }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-3xl" aria-hidden>
        ∅
      </p>
      <p className="mt-2 text-sm text-ink-2">{t('emptyState.message')}</p>
      <button type="button" onClick={onClear} className="mt-4 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1">
        {t('filter.clear')}
      </button>
    </div>
  );
}
