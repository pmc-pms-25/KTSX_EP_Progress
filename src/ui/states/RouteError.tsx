import { useT } from '../../i18n/useT';

/** Root route error element, e.g. a page chunk that no longer exists after a redeploy. Reloading fetches the new build. */
export function RouteError() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠
      </p>
      <h1 className="mt-3 text-lg font-semibold">{t('routeError.title')}</h1>
      <p className="mt-2 text-sm text-ink-2">{t('routeError.detail')}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1 hover:bg-ai-1/30"
      >
        {t('routeError.reload')}
      </button>
    </div>
  );
}
