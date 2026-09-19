import { Link } from 'react-router-dom';
import { translate } from '../../i18n/translate';
import { dayFromISO, dayToISO, todayDay } from '../../lib/day';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useDashboard } from '../hooks/useDashboard';
import { AskBox } from './AskBox';

function timeAgo(date: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function Header({ onOpenHealth }: { onOpenHealth: () => void }) {
  const appName = useApp((s) => s.config?.appName ?? 'PMS - PEIW');
  const projectName = useApp((s) => s.config?.projectName ?? '');
  const cutOff = useApp((s) => s.cutOff);
  const theme = useApp((s) => s.theme);
  const plan = useApp((s) => s.plan);
  const refreshing = useApp((s) => s.refreshing);
  const refreshError = useApp((s) => s.refreshError);
  const { filters, setFilters, vocab } = useDashboard();
  const { load, setCutOff, toggleTheme } = appStore.getState();
  const warningCount = plan?.warnings.filter((w) => w.level !== 'info').length ?? 0;

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
              Hôm nay
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            title={refreshError ? translate('vi', refreshError.detail) /* i18n: Batch B */ : 'Tải lại dữ liệu'}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs ${
              refreshError ? 'border-serious/50 text-serious' : 'border-line text-ink-2 hover:text-ink'
            }`}
          >
            <span aria-hidden className={refreshing ? 'animate-spin' : ''}>⟳</span>
            <span className="hidden sm:inline">
              {refreshing ? 'Đang đồng bộ…' : refreshError ? 'Dữ liệu cũ' : plan ? `Đồng bộ ${timeAgo(plan.loadedAt)}` : ''}
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
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </header>
  );
}
