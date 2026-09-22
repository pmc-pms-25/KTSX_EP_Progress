import type { RiskRow } from '../../analytics/topRisks';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { Card } from '../common/Card';

interface TopRiskTableProps {
  rows: RiskRow[];
  /** Set when the filters narrow to exactly one facility: its column is dropped (the filter bar names it). */
  facility?: string;
  onOpen: (code: string) => void;
}

/** Column headers never wrap; a long one is cut with an ellipsis instead. */
const ONE_LINE = 'truncate whitespace-nowrap';

const bufferTone = (buffer: number) => (buffer < 0 ? 'text-critical' : 'text-warning');

/** A true minus sign (U+2212): a hyphen is short and easy to miss. */
const signed = (days: number) => (days < 0 ? `−${-days}` : String(days));

/** The riskiest Package × Facility lines by forecast Buffer; a row opens its package. */
export function TopRiskTable({ rows, facility, onOpen }: TopRiskTableProps) {
  const { t } = useT();
  const title = t('topRisk.title');
  const cols = facility ? 'grid-cols-[1.5rem_minmax(0,1fr)_6rem_6rem]' : 'grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,6rem)_6rem_6rem]';
  const hideRos = 'max-sm:hidden';
  const colsSm = facility ? 'max-sm:grid-cols-[1.5rem_minmax(0,1fr)_6rem]' : 'max-sm:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,5rem)_6rem]';

  return (
    <div role="region" aria-label={title} className="sm:col-span-2 lg:col-span-3">
      <Card title={title} subtitle={t('topRisk.subtitle')} className="h-full">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-good">{t('topRisk.empty')}</p>
        ) : (
          <div className="text-sm">
            <div className={`grid ${cols} ${colsSm} gap-2 border-b border-line px-2 pb-1.5 text-xs text-ink-3`}>
              <span className={ONE_LINE}>#</span>
              <span className={ONE_LINE}>{t('topRisk.package')}</span>
              {!facility && <span className={ONE_LINE}>{t('topRisk.facility')}</span>}
              <span className={`${ONE_LINE} ${hideRos}`}>{t('topRisk.ros')}</span>
              <span className={`${ONE_LINE} text-right`}>{t('topRisk.buffer')}</span>
            </div>
            <ol>
              {rows.map(({ metrics: { line }, buffer }, i) => (
                <li key={line.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(line.packageCode)}
                    className={`grid w-full ${cols} ${colsSm} items-center gap-2 border-b border-line/60 px-2 py-1.5 text-left hover:bg-surface-2`}
                  >
                    <span className="text-xs text-ink-3">{i + 1}</span>
                    <span className="min-w-0 truncate" title={line.packageName}>
                      <span className={`font-mono text-xs ${line.hasValidCode ? 'text-ai-1' : 'text-serious'}`}>{line.packageCode}</span>
                      <span className="text-ink"> {line.packageName}</span>
                    </span>
                    {!facility && <span className="truncate text-ink-2">{line.facility}</span>}
                    <span className={`font-mono text-xs text-ink-2 ${hideRos}`}>{formatDay(line.ros)}</span>
                    <span className={`text-right font-mono font-semibold tabular-nums ${bufferTone(buffer)}`}>{signed(buffer)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Card>
    </div>
  );
}
