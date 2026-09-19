import { useMemo } from 'react';
import { computeKpis, disciplineHealth } from '../../analytics/aggregate';
import { generateInsights } from '../../analytics/insights/registry';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { Stagger } from '../common/Card';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { useDashboard } from '../hooks/useDashboard';
import { usePackageParam } from '../hooks/useFilters';
import { DisciplineGrid } from './DisciplineGrid';
import { FacilityHeatmap } from './FacilityHeatmap';
import { InsightsPanel } from './InsightsPanel';
import { KpiStrip } from './KpiStrip';
import { PhaseFunnel } from './PhaseFunnel';
import { WorkloadChart } from './WorkloadChart';

export function OverviewPage() {
  const { t } = useT();
  const { filtered, filters, setFilters, clearFilters, ctx, disciplineOrder } = useDashboard();
  const cutOff = useApp((s) => s.cutOff);
  const { open } = usePackageParam();
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const health = useMemo(() => disciplineHealth(filtered, disciplineOrder), [filtered, disciplineOrder]);
  const insights = useMemo(() => generateInsights({ metrics: filtered, ctx }), [filtered, ctx]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <KpiStrip kpis={kpis} dueSoonDays={ctx.dueSoonDays} activeFlags={filters.flags} onFilter={setFilters} />
      </ErrorBoundary>
      <ErrorBoundary label="AI Insights">
        <InsightsPanel insights={insights} metrics={filtered} onApply={setFilters} onOpenPackage={open} />
      </ErrorBoundary>
      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary label="Phase funnel">
          <PhaseFunnel metrics={filtered} onSelectPhase={(p) => setFilters({ phases: [p] })} />
        </ErrorBoundary>
        <ErrorBoundary label="Discipline health">
          <DisciplineGrid health={health.filter((h) => h.lines > 0)} />
        </ErrorBoundary>
      </div>
      <ErrorBoundary label={t('errorBoundary.workloadLabel')}>
        <WorkloadChart metrics={filtered} cutOff={cutOff} />
      </ErrorBoundary>
      <ErrorBoundary label={t('facilityHeatmap.title')}>
        <FacilityHeatmap metrics={filtered} />
      </ErrorBoundary>
    </Stagger>
  );
}
