import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useActiveModule } from '../../modules/registry';
import type { AnyModule } from '../../modules/types';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';
import { MobileNav, Sidebar } from './Sidebar';

function HealthSlot({ module, open, onClose }: { module: AnyModule; open: boolean; onClose: () => void }) {
  const warnings = useModule(module.store, (s) => s.warnings);
  return <DataHealthPanel open={open} onClose={onClose} warnings={warnings} />;
}

export function AppShell() {
  const configStatus = useApp((s) => s.configStatus);
  const configError = useApp((s) => s.configError);
  const theme = useApp((s) => s.theme);
  const lang = useApp((s) => s.lang);
  const appName = useApp((s) => s.config?.appName);
  const module = useActiveModule();
  const [healthOpen, setHealthOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    void appStore.getState().loadConfig();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (appName) document.title = appName;
  }, [appName]);

  // A new page starts at the top; filter and drawer changes (query string only) keep the scroll position.
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header onOpenHealth={() => setHealthOpen(true)} onOpenNav={() => setNavOpen(true)} />
        {module && module.facets.length > 0 && <FilterBar key={module.id} module={module} />}
        <main>
          {configStatus === 'error' && configError ? (
            <ErrorScreen error={configError} onRetry={() => void appStore.getState().loadConfig()} />
          ) : configStatus === 'ready' ? (
            <Outlet />
          ) : (
            <LoadingScreen step="config" />
          )}
        </main>
      </div>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      {module && <HealthSlot key={module.id} module={module} open={healthOpen} onClose={() => setHealthOpen(false)} />}
    </div>
  );
}
