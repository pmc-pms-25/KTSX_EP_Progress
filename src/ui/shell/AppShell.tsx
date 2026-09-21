import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { procurementStore } from '../../modules/procurement/store';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { PackageDrawer } from '../package/PackageDrawer';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';

export function AppShell() {
  const configStatus = useApp((s) => s.configStatus);
  const configError = useApp((s) => s.configError);
  const theme = useApp((s) => s.theme);
  const lang = useApp((s) => s.lang);
  const appName = useApp((s) => s.config?.appName);
  const status = useModule(procurementStore, (s) => s.status);
  const step = useModule(procurementStore, (s) => s.step);
  const stepDetail = useModule(procurementStore, (s) => s.stepDetail);
  const error = useModule(procurementStore, (s) => s.error);
  const warnings = useModule(procurementStore, (s) => s.warnings);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    void appStore.getState().loadConfig();
  }, []);

  useEffect(() => {
    if (configStatus === 'ready' && procurementStore.getState().status === 'idle') void procurementStore.getState().load();
  }, [configStatus]);

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

  let content: ReactNode;
  if (configStatus === 'error' && configError) content = <ErrorScreen error={configError} onRetry={() => void appStore.getState().loadConfig()} />;
  else if (configStatus !== 'ready') content = <LoadingScreen step="config" />;
  else if (status === 'error' && error) content = <ErrorScreen error={error} onRetry={() => void procurementStore.getState().load()} />;
  else if (status === 'ready') content = <Outlet />;
  else content = <LoadingScreen step={step} detail={stepDetail} />;

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Header onOpenHealth={() => setHealthOpen(true)} />
      {status === 'ready' && <FilterBar />}
      <main>{content}</main>
      {status === 'ready' && (
        <>
          <PackageDrawer />
          <DataHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} warnings={warnings} />
        </>
      )}
    </div>
  );
}
