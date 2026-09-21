import { useMemo } from 'react';
import { engKpis } from '../../analytics/engineering/summaries';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EngKpiStrip } from './EngKpiStrip';

export function EngOverviewPage() {
  const { filtered, filters, setFilters, clearFilters } = useEngDashboard();
  const kpis = useMemo(() => engKpis(filtered), [filtered]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <EngKpiStrip kpis={kpis} filters={filters} onFilter={setFilters} />
      </ErrorBoundary>
    </Stagger>
  );
}
