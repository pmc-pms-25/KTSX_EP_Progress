import { useMemo } from 'react';
import { applyFilters, vocabularyOf } from '../../analytics/filters';
import type { LineMetrics, MetricsContext } from '../../analytics/lineMetrics';
import { procurementMetrics } from '../../modules/procurement/metrics';
import { procurementStore } from '../../modules/procurement/store';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { useFilters } from './useFilters';

const NO_METRICS: LineMetrics[] = [];

/** Everything a procurement view needs: all metrics, the filtered subset and the search vocabulary. */
export function useDashboard() {
  const plan = useModule(procurementStore, (s) => s.data);
  const cutOff = useApp((s) => s.cutOff);
  const dueSoonDays = useApp((s) => s.config?.dueSoonDays ?? 30);
  const metrics = useMemo(() => (plan ? procurementMetrics(plan, cutOff, dueSoonDays) : NO_METRICS), [plan, cutOff, dueSoonDays]);
  const { filters, setFilters, clear } = useFilters();
  const vocab = useMemo(() => vocabularyOf(metrics), [metrics]);
  const filtered = useMemo(() => applyFilters(metrics, filters, vocab), [metrics, filters, vocab]);
  const ctx: MetricsContext = useMemo(() => ({ cutOff, dueSoonDays }), [cutOff, dueSoonDays]);
  const disciplineOrder = useMemo(() => plan?.disciplines.map((d) => d.name) ?? vocab.disciplines, [plan, vocab]);
  return { metrics, filtered, vocab, filters, setFilters, clearFilters: clear, ctx, disciplineOrder };
}
