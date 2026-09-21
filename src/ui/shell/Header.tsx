import { Link } from 'react-router-dom';
import { LANGS, type Lang } from '../../i18n/message';
import { locale } from '../../i18n/translate';
import { useT } from '../../i18n/useT';
import { dayFromISO, dayToISO, todayDay } from '../../lib/day';
import { procurementStore } from '../../modules/procurement/store';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { useDashboard } from '../hooks/useDashboard';
import { AskBox } from './AskBox';

function timeAgo(t: ReturnType<typeof useT>['t'], lang: Lang, date: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return t('header.syncedJustNow');
  if (minutes < 60) return t('header.syncedMinutesAgo', { minutes });
  return date.toLocaleTimeString(locale(lang), { hour: '2-digit', minute: '2-digit' });
}

export function Header({ onOpenHealth }: { onOpenHealth: () => void }) {
  const appName = useApp((s) => s.config?.appName ?? 'PMS - PEIW');
  const projectName = useApp((s) => s.config?.projectName ?? '');
  const cutOff = useApp((s) => s.cutOff);
  const theme = useApp((s) => s.theme);
  const refreshing = useModule(procurementStore, (s) => s.refreshing);
  const refreshError = useModule(procurementStore, (s) => s.refreshError);
  const lastSync = useModule(procurementStore, (s) => s.lastSync);
  const warnings = useModule(procurementStore, (s) => s.warnings);
  const { filters, setFilters, vocab } = useDashboard();
  const { setCutOff, toggleTheme, setLang } = appStore.getState();
  const { load } = procurementStore.getState();
  const { t, lang } = useT();
  const warningCount = warnings.filter((w) => w.level !== 'info').length;

  return (
    <header
      className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="ai-border grid h-9 w-9 place-items-center rounded-xl text-lg">
            <span className="ai-text">◈</span>
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide">{appName}</span>
            <span className="block text-[11px] text-ink-3">{projectName} · Procurement Intelligence</span>
          </span>
        </Link>

        <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1 lg:max-w-xl">
          <AskBox value={filters.q} vocab={vocab} onChange={(q) => setFilters({ q })} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-ink-3">
            <span className="hidden sm:inline">Cut-off</span>
            <input
              type="date"
              value={dayToISO(cutOff)}
              onChange={(e) => {
                const day = dayFromISO(e.target.value);
                if (day !== undefined) setCutOff(day);
              }}
              className="h-9 rounded-lg border border-line bg-surface px-2 font-mono text-xs text-ink"
            />
          </label>
          {cutOff !== todayDay() && (
            <button type="button" className="text-xs text-ai-1 underline" onClick={() => setCutOff(todayDay())}>
              {t('header.today')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            title={refreshError ? t(refreshError.detail) : t('header.reloadData')}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs ${
              refreshError ? 'border-serious/50 text-serious' : 'border-line text-ink-2 hover:text-ink'
            }`}
          >
            <span aria-hidden className={refreshing ? 'animate-spin' : ''}>⟳</span>
            <span className="hidden sm:inline">
              {refreshing
                ? t('header.syncing')
                : refreshError
                  ? t('header.staleData')
                  : lastSync
                    ? t('header.synced', { time: timeAgo(t, lang, lastSync) })
                    : ''}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenHealth}
            title="Data Health"
            className="relative flex h-9 items-center rounded-lg border border-line px-2.5 text-xs text-ink-2 hover:text-ink"
          >
            <span aria-hidden>⚕</span>
            <span className="ml-1 hidden sm:inline">Data Health</span>
            {warningCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 rounded-full bg-serious px-1.5 font-mono text-[10px] text-white">{warningCount}</span>
            )}
          </button>
          <div role="group" aria-label={t('header.language')} className="flex rounded-lg border border-line p-0.5 text-xs">
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`rounded-md px-2 py-1 ${lang === l ? 'bg-ai-1/20 text-ai-1' : 'text-ink-3'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('header.themeToLight') : t('header.themeToDark')}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </header>
  );
}
