import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { engineeringModule } from './engineering/module';
import { procurementModule } from './procurement/module';
import type { AnyModule } from './types';

/** Sidebar order. Adding a dashboard = one entry here + its route in App.tsx. */
export const modules: readonly AnyModule[] = [engineeringModule, procurementModule];

export function moduleForPath(pathname: string): AnyModule | undefined {
  return modules.find((m) => pathname === m.path || pathname.startsWith(`${m.path}/`));
}

/** URL keys that belong to a module's filters (remembered per module); drawer keys such as `pkg` are not. */
export function filterKeys(module: AnyModule): string[] {
  return [...module.facets.map((f) => f.key), ...(module.useSearch ? ['q'] : [])];
}

/** The module owning the current page, or undefined (e.g. the 404 page). */
export function useActiveModule(): AnyModule | undefined {
  const { pathname } = useLocation();
  return useMemo(() => moduleForPath(pathname), [pathname]);
}
