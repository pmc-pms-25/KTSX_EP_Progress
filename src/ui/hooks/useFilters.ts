import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, type Filters } from '../../analytics/filters';
import { PHASES } from '../../data/milestones';
import type { PhaseKey } from '../../data/types';
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

/** A drawer driven by a single query key; opening pushes a history entry so Back closes it. */
function useDrawerParam(key: string) {
  const [params, setParams] = useSearchParams();
  const value = params.get(key) ?? undefined;
  const open = useCallback(
    (v: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(key, v);
        return next;
      }),
    [key, setParams],
  );
  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(key);
        return next;
      }),
    [key, setParams],
  );
  return { value, open, close };
}

/** The package drawer is driven by `?pkg=<code>`. */
export function usePackageParam() {
  const { value: code, open, close } = useDrawerParam('pkg');
  return { code, open, close };
}

/** The phase progress drawer is driven by `?milestone=<phase>`; unknown phases read as closed. */
export function usePhaseParam() {
  const { value, open, close } = useDrawerParam('milestone');
  const phase = PHASES.some((p) => p.key === value) ? (value as PhaseKey) : undefined;
  return { phase, open: open as (phase: PhaseKey) => void, close };
}
