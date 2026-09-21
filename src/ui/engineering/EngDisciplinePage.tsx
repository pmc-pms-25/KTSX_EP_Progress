import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { engKpis } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { engineeringModule } from '../../modules/engineering/module';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Card, Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { DocumentTable } from './DocumentTable';
import { EngKpiStrip } from './EngKpiStrip';
import { useDocParam } from './params';

export function EngDisciplinePage() {
  const { t } = useT();
  const { name = '' } = useParams();
  const [params] = useSearchParams();
  const { filtered, filters, setFilters, clearFilters, vocab } = useEngDashboard();
  const { open } = useDocParam();
  const docs = useMemo(() => filtered.filter((m) => m.doc.discipline === name), [filtered, name]);
  const kpis = useMemo(() => engKpis(docs), [docs]);
  const query = params.toString();
  const search = query ? `?${query}` : '';

  if (!vocab.disciplines.includes(name)) {
    return (
      <div className="px-4 py-16 text-center text-sm text-ink-2">
        {t('discipline.notFound', { name })}{' '}
        <Link to={engineeringModule.path} className="text-ai-1 underline">
          {t('discipline.backToOverview')}
        </Link>
      </div>
    );
  }

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <motion.div layoutId={`eng-discipline-${name}`} className="flex flex-wrap items-center gap-3">
        <Link to={{ pathname: engineeringModule.path, search }} className="text-sm text-ink-3 hover:text-ink">
          ← {t('discipline.backToOverview')}
        </Link>
        <h1 className="text-xl font-semibold tracking-wide">{name}</h1>
        <nav className="ml-auto flex flex-wrap gap-1 text-xs" aria-label={t('discipline.otherDisciplines')}>
          {vocab.disciplines
            .filter((d) => d !== name)
            .map((d) => (
              <Link key={d} to={{ pathname: `${engineeringModule.path}/discipline/${encodeURIComponent(d)}`, search }} className="rounded-full border border-line px-2 py-1 text-ink-3 hover:text-ink">
                {d}
              </Link>
            ))}
        </nav>
      </motion.div>
      {docs.length === 0 ? (
        <EmptyFilterState onClear={clearFilters} />
      ) : (
        <>
          <EngKpiStrip kpis={kpis} filters={filters} onFilter={setFilters} />
          <ErrorBoundary label={t('eng.table.errorLabel')}>
            <Card title={t('eng.table.title', { count: docs.length })} subtitle={t('eng.table.subtitle')}>
              <DocumentTable docs={docs} onOpen={open} />
            </Card>
          </ErrorBoundary>
        </>
      )}
    </Stagger>
  );
}
