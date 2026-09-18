import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { computeKpis, summarizePackages } from '../../analytics/aggregate';
import { Card, Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useDashboard } from '../hooks/useDashboard';
import { usePackageParam } from '../hooks/useFilters';
import { KpiStrip } from '../overview/KpiStrip';
import { PackageTable } from './PackageTable';

export function DisciplinePage() {
  const { name = '' } = useParams();
  const [params] = useSearchParams();
  const { filtered, filters, setFilters, clearFilters, ctx, disciplineOrder } = useDashboard();
  const { open } = usePackageParam();
  const lines = useMemo(() => filtered.filter((m) => m.line.discipline === name), [filtered, name]);
  const kpis = useMemo(() => computeKpis(lines), [lines]);
  const packages = useMemo(() => summarizePackages(lines), [lines]);
  const query = params.toString();

  if (!disciplineOrder.includes(name)) {
    return (
      <div className="px-4 py-16 text-center text-sm text-ink-2">
        Không tìm thấy discipline “{name}”.{' '}
        <Link to="/" className="text-ai-1 underline">
          Về tổng quan
        </Link>
      </div>
    );
  }

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <motion.div layoutId={`discipline-${name}`} className="flex flex-wrap items-center gap-3">
        <Link to={{ pathname: '/', search: query ? `?${query}` : '' }} className="text-sm text-ink-3 hover:text-ink">
          ← Tổng quan
        </Link>
        <h1 className="text-xl font-semibold tracking-wide">{name}</h1>
        <nav className="ml-auto flex flex-wrap gap-1 text-xs" aria-label="Discipline khác">
          {disciplineOrder
            .filter((d) => d !== name)
            .map((d) => (
              <Link key={d} to={{ pathname: `/discipline/${encodeURIComponent(d)}`, search: query ? `?${query}` : '' }} className="rounded-full border border-line px-2 py-1 text-ink-3 hover:text-ink">
                {d}
              </Link>
            ))}
        </nav>
      </motion.div>
      {lines.length === 0 ? (
        <EmptyFilterState onClear={clearFilters} />
      ) : (
        <>
          <KpiStrip kpis={kpis} dueSoonDays={ctx.dueSoonDays} activeFlags={filters.flags} onFilter={setFilters} />
          <ErrorBoundary label="Danh sách package">
            <Card title={`Packages (${packages.length})`} subtitle="Mặc định sắp theo rủi ro · bấm một dòng để xem chi tiết">
              <PackageTable packages={packages} onOpen={open} />
            </Card>
          </ErrorBoundary>
        </>
      )}
    </Stagger>
  );
}
