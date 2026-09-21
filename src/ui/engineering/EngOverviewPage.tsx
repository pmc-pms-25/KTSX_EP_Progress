import { useMemo } from 'react';
import { stageProgress } from '../../analytics/engineering/stageProgress';
import { engKpis } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EngKpiStrip } from './EngKpiStrip';
import { useStageParam } from './params';
import { StageProgressDrawer } from './StageProgressDrawer';
import { StageTimeline } from './StageTimeline';

export function EngOverviewPage() {
  const { filtered, filters, setFilters, clearFilters } = useEngDashboard();
  const kpis = useMemo(() => engKpis(filtered), [filtered]);
  const { t } = useT();
  const { open: openStage } = useStageParam();
  const progress = useMemo(() => stageProgress(filtered), [filtered]);

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
    </Stagger>
  );
}
