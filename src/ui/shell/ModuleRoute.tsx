import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { filterKeys } from '../../modules/registry';
import type { AnyModule } from '../../modules/types';
import { appStore } from '../../store/appStore';
import { FILTER_KEYS } from '../../store/urlFilters';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { UnconfiguredScreen } from '../states/UnconfiguredScreen';

/** The query string reduced to `keys` (same order), as "" or "?…". */
export function filterQuery(search: string, keys: readonly string[]): string {
  const next = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) if (keys.includes(key)) next.append(key, value);
  const query = next.toString();
  return query ? `?${query}` : '';
}

/** Layout route of one module: loads its source on first visit, applies its default facility, remembers its filters. */
export function ModuleRoute({ module, overlay }: { module: AnyModule; overlay?: ReactNode }) {
  const configReady = useApp((s) => s.configStatus === 'ready');
  const status = useModule(module.store, (s) => s.status);
  const step = useModule(module.store, (s) => s.step);
  const stepDetail = useModule(module.store, (s) => s.stepDetail);
  const error = useModule(module.store, (s) => s.error);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const defaultFacility = useApp((s) => s.config?.dataSources[module.id]?.defaultFacility);

  useEffect(() => {
    if (configReady && module.store.getState().status === 'idle') void module.store.getState().load();
  }, [configReady, module]);

  useEffect(() => {
    if (!configReady) return;
    const keys = filterKeys(module);
    const query = filterQuery(search, keys);
    // First visit this session with no filters: start on the configured facility. Later visits keep the user's choice.
    const firstVisit = appStore.getState().lastQuery[module.id] === undefined;
    if (firstVisit && query === '' && defaultFacility && keys.includes(FILTER_KEYS.facilities)) {
      const next = new URLSearchParams(search);
      next.set(FILTER_KEYS.facilities, defaultFacility);
      navigate({ pathname, search: `?${next}` }, { replace: true });
      return;
    }
    appStore.getState().setLastQuery(module.id, query);
  }, [configReady, search, pathname, module, defaultFacility, navigate]);

  if (status === 'unconfigured') return <UnconfiguredScreen module={module} />;
  if (status === 'error' && error) return <ErrorScreen error={error} onRetry={() => void module.store.getState().load()} />;
  if (status !== 'ready') return <LoadingScreen step={step} detail={stepDetail} />;
  return (
    <>
      <Outlet />
      {overlay}
    </>
  );
}
