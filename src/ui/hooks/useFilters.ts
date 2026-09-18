import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, type Filters } from '../../analytics/filters';
import { filtersFromParams, writeFilters } from '../../store/urlFilters';

/** Filters live in the URL so every view can be shared as a link. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);

  const setFilters = useCallback(
    (patch: Partial<Filters>) => setParams((prev) => writeFilters(prev, { ...filtersFromParams(prev), ...patch }), { replace: true }),
    [setParams],
  );
  const clear = useCallback(() => setParams((prev) => writeFilters(prev, EMPTY_FILTERS), { replace: true }), [setParams]);

  return { filters, setFilters, clear };
}

/** The package drawer is driven by `?pkg=<code>`. */
export function usePackageParam() {
  const [params, setParams] = useSearchParams();
  const code = params.get('pkg') ?? undefined;
  const open = useCallback(
    (pkg: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('pkg', pkg);
        return next;
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('pkg');
        return next;
      }),
    [setParams],
  );
  return { code, open, close };
}
