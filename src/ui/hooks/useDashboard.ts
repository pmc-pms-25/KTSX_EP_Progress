import { useMemo } from 'react';
import { applyFilters, vocabularyOf } from '../../analytics/filters';
import type { MetricsContext } from '../../analytics/lineMetrics';
import { useApp } from '../../store/useApp';
import { useFilters } from './useFilters';

/** Everything a dashboard view needs: all metrics, the filtered subset and the search vocabulary. */
export function useDashboard() {
  const metrics = useApp((s) => s.metrics);
  const cutOff = useApp((s) => s.cutOff);
  const dueSoonDays = useApp((s) => s.config?.dueSoonDays ?? 30);
  // Select stable references only; derive arrays in useMemo (a new array per selector call loops forever).
  const plan = useApp((s) => s.plan);
  const { filters, setFilters, clear } = useFilters();
  const vocab = useMemo(() => vocabularyOf(metrics), [metrics]);
  const filtered = useMemo(() => applyFilters(metrics, filters, vocab), [metrics, filters, vocab]);
  const ctx: MetricsContext = useMemo(() => ({ cutOff, dueSoonDays }), [cutOff, dueSoonDays]);
  const disciplineOrder = useMemo(() => plan?.disciplines.map((d) => d.name) ?? vocab.disciplines, [plan, vocab]);
  return { metrics, filtered, vocab, filters, setFilters, clearFilters: clear, ctx, disciplineOrder };
}
