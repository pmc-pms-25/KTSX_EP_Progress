import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { applyEngFilters, EMPTY_ENG_FILTERS, engFiltersFromParams, engVocabulary, writeEngFilters, type EngFilters } from './filters';
import { engineeringMetrics } from './metrics';
import { engineeringStore } from './store';

const NO_METRICS: DocMetrics[] = [];

/** Everything an Engineering view needs: all document metrics, the filtered subset and URL-backed filters. */
export function useEngDashboard() {
  const register = useModule(engineeringStore, (s) => s.data);
  const cutOff = useApp((s) => s.cutOff);
  const metrics = useMemo(() => (register ? engineeringMetrics(register, cutOff) : NO_METRICS), [register, cutOff]);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => engFiltersFromParams(params), [params]);
  const setFilters = useCallback(
    (patch: Partial<EngFilters>) => setParams((prev) => writeEngFilters(prev, { ...engFiltersFromParams(prev), ...patch }), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(() => setParams((prev) => writeEngFilters(prev, EMPTY_ENG_FILTERS), { replace: true }), [setParams]);
  const filtered = useMemo(() => applyEngFilters(metrics, filters), [metrics, filters]);
  const vocab = useMemo(() => engVocabulary(metrics), [metrics]);
  return { register, metrics, filtered, filters, setFilters, clearFilters, cutOff, vocab };
}
