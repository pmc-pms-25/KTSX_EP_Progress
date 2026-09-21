import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { procurementStore } from '../../modules/procurement/store';
import { useActiveModule } from '../../modules/registry';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';
import { MobileNav, Sidebar } from './Sidebar';

export function AppShell() {
  const configStatus = useApp((s) => s.configStatus);
  const configError = useApp((s) => s.configError);
  const theme = useApp((s) => s.theme);
  const lang = useApp((s) => s.lang);
  const appName = useApp((s) => s.config?.appName);
  const module = useActiveModule();
  // Interim until Task 9: the filter bar and Data Health still speak procurement only.
  const procurementReady = useModule(procurementStore, (s) => s.status === 'ready');
  const warnings = useModule(procurementStore, (s) => s.warnings);
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
        {module?.id === 'procurement' && procurementReady && <FilterBar />}
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
      <DataHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} warnings={warnings} />
    </div>
  );
}
