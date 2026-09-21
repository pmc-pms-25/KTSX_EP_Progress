import { useT } from '../../i18n/useT';
import { engineeringStore } from '../../modules/engineering/store';
import { useModule } from '../../store/useModule';
import { Card, Stagger } from '../common/Card';
import { ErrorBoundary } from '../common/ErrorBoundary';

/** Placeholder until the Engineering dashboard is designed: proves the source loads end to end. */
export function EngineeringPage() {
  const { t } = useT();
  const summary = useModule(engineeringStore, (s) => s.data);
  if (!summary) return null;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label={t('engineering.placeholder.title')}>
        <Card title={t('engineering.placeholder.title')}>
          <p className="text-sm text-ink-2">{t('engineering.placeholder.detail', { rows: summary.rowCount, sheet: summary.sheetName })}</p>
        </Card>
      </ErrorBoundary>
    </Stagger>
  );
}
