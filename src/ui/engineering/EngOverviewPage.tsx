import { useMemo } from 'react';
import { stageProgress } from '../../analytics/engineering/stageProgress';
import { disciplineStatus, engKpis } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { DisciplineStatusGrid } from './DisciplineStatusGrid';
import { EngKpiStrip } from './EngKpiStrip';
import { useStageParam } from './params';
import { StageFunnel } from './StageFunnel';
import { StageProgressDrawer } from './StageProgressDrawer';
import { StageTimeline } from './StageTimeline';
import { TransmittalChart } from './TransmittalChart';

/** Same grid and block order as the Procurement overview. */
export function EngOverviewPage() {
  const { t } = useT();
  const { filtered, filters, setFilters, clearFilters } = useEngDashboard();
  const { open: openStage } = useStageParam();
  const kpis = useMemo(() => engKpis(filtered), [filtered]);
  const progress = useMemo(() => stageProgress(filtered), [filtered]);
  const disciplines = useMemo(() => disciplineStatus(filtered), [filtered]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <EngKpiStrip kpis={kpis} filters={filters} onFilter={setFilters} />
      </ErrorBoundary>
      <ErrorBoundary label={t('eng.timeline.title')}>
        <StageTimeline progress={progress} notIssued={kpis.notIssued} onSelect={openStage} />
        <StageProgressDrawer progress={progress} />
      </ErrorBoundary>
      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary label={t('eng.funnel.title')}>
          <StageFunnel metrics={filtered} onSelectStage={(s) => setFilters({ stages: [s] })} />
        </ErrorBoundary>
        <ErrorBoundary label={t('eng.discipline.title')}>
          <DisciplineStatusGrid status={disciplines} />
        </ErrorBoundary>
      </div>
      <ErrorBoundary label={t('eng.transmittal.title')}>
        <TransmittalChart metrics={filtered} />
      </ErrorBoundary>
    </Stagger>
  );
}
