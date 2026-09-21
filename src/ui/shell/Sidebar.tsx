import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { modules } from '../../modules/registry';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { Drawer } from '../common/Drawer';

/** One link per module; each link reopens the module with the filters it had last time. */
function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useT();
  const lastQuery = useApp((s) => s.lastQuery);
  return (
    <ul className="grid gap-1">
      {modules.map((m) => {
        const label = t(m.labelKey);
        return (
          <li key={m.id}>
            <NavLink
              to={{ pathname: m.path, search: lastQuery[m.id] ?? '' }}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg border-l-2 px-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isActive ? 'border-ai-1 bg-ai-1/10 text-ink' : 'border-transparent text-ink-3 hover:text-ink'
                }`
              }
            >
              <span aria-hidden className="w-4 shrink-0 text-center">
                {m.icon}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

const SIDEBAR_ID = 'app-sidebar';

/** Desktop sidebar; collapses to icons. Hidden on phones (see MobileNav). */
export function Sidebar() {
  const { t } = useT();
  const collapsed = useApp((s) => s.sidebarCollapsed);
  return (
    <nav
      id={SIDEBAR_ID}
      aria-label={t('sidebar.label')}
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-bg py-3 md:flex ${collapsed ? 'w-14 px-1.5' : 'w-56 px-2'}`}
    >
      <NavItems collapsed={collapsed} />
      <button
        type="button"
        onClick={() => appStore.getState().toggleSidebar()}
        aria-expanded={!collapsed}
        aria-controls={SIDEBAR_ID}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        className="mt-auto flex h-9 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
      >
        <span aria-hidden>{collapsed ? '»' : '«'}</span>
      </button>
    </nav>
  );
}

/** The same links in a left drawer, opened from the header's ☰ button on phones. */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <Drawer open={open} onClose={onClose} side="left" width="max-w-[80vw] sm:max-w-xs" title={<h2 className="text-base font-semibold">{t('sidebar.label')}</h2>}>
      <nav aria-label={t('sidebar.label')}>
        <NavItems collapsed={false} onNavigate={onClose} />
      </nav>
    </Drawer>
  );
}
