import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { PackageDrawer } from '../package/PackageDrawer';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';

export function AppShell() {
  const status = useApp((s) => s.status);
  const error = useApp((s) => s.error);
  const theme = useApp((s) => s.theme);
  const appName = useApp((s) => s.config?.appName);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    if (appStore.getState().status === 'idle') void appStore.getState().load();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (appName) document.title = appName;
  }, [appName]);

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Header onOpenHealth={() => setHealthOpen(true)} />
      {status === 'ready' && <FilterBar />}
      <main>
        {status === 'error' && error ? <ErrorScreen error={error} /> : status === 'ready' ? <Outlet /> : <LoadingScreen />}
      </main>
      {status === 'ready' && (
        <>
          <PackageDrawer />
          <DataHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} />
        </>
      )}
    </div>
  );
}
