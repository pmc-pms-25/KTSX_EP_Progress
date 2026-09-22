import { useMemo } from 'react';
import { computeKpis, disciplineHealth } from '../../analytics/aggregate';
import { generateInsights } from '../../analytics/insights/registry';
import { phaseProgress } from '../../analytics/phaseProgress';
import { topRisks } from '../../analytics/topRisks';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { Stagger } from '../common/Card';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { useDashboard } from '../hooks/useDashboard';
import { usePackageParam, usePhaseParam } from '../hooks/useFilters';
import { DisciplineGrid } from './DisciplineGrid';
import { FacilityHeatmap } from './FacilityHeatmap';
import { InsightsPanel } from './InsightsPanel';
import { PhaseFunnel } from './PhaseFunnel';
import { PhaseProgressDrawer } from './PhaseProgressDrawer';
import { PhaseTimeline } from './PhaseTimeline';
import { SummaryTiles } from './SummaryTiles';
import { TopRiskTable } from './TopRiskTable';
import { WorkloadChart } from './WorkloadChart';

/** Hidden since 2026-09-21 so Procurement and Engineering share one layout. Set to true to bring them back. */
const SHOW_INSIGHTS = false;
const SHOW_FACILITY_HEATMAP = false;

export function OverviewPage() {
  const { t } = useT();
  const { filtered, filters, setFilters, clearFilters, ctx, disciplineOrder } = useDashboard();
  const cutOff = useApp((s) => s.cutOff);
  const { open } = usePackageParam();
  const { open: openPhase } = usePhaseParam();
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const health = useMemo(() => disciplineHealth(filtered, disciplineOrder), [filtered, disciplineOrder]);
  const progress = useMemo(() => phaseProgress(filtered, cutOff), [filtered, cutOff]);
  const risks = useMemo(() => topRisks(filtered), [filtered]);
  const insights = useMemo(() => (SHOW_INSIGHTS ? generateInsights({ metrics: filtered, ctx }) : []), [filtered, ctx]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryTiles packages={kpis.packages} />
          <TopRiskTable rows={risks} facility={filters.facilities.length === 1 ? filters.facilities[0] : undefined} onOpen={open} />
        </div>
      </ErrorBoundary>
      <ErrorBoundary label={t('phaseTimeline.title')}>
        <PhaseTimeline progress={progress} onSelect={openPhase} />
        <PhaseProgressDrawer progress={progress} />
      </ErrorBoundary>
      {SHOW_INSIGHTS && (
        <ErrorBoundary label="AI Insights">
          <InsightsPanel insights={insights} metrics={filtered} onApply={setFilters} onOpenPackage={open} />
        </ErrorBoundary>
      )}
      <ErrorBoundary label={t('errorBoundary.workloadLabel')}>
        <WorkloadChart metrics={filtered} cutOff={cutOff} />
      </ErrorBoundary>
      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary label="Phase funnel">
          <PhaseFunnel metrics={filtered} onSelectPhase={(p) => setFilters({ phases: [p] })} />
        </ErrorBoundary>
        <ErrorBoundary label="Discipline health">
          <DisciplineGrid health={health.filter((h) => h.lines > 0)} />
        </ErrorBoundary>
      </div>
      {SHOW_FACILITY_HEATMAP && (
        <ErrorBoundary label={t('facilityHeatmap.title')}>
          <FacilityHeatmap metrics={filtered} />
        </ErrorBoundary>
      )}
    </Stagger>
  );
}
