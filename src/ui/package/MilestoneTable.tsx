import { milestoneSlip, type LineMetrics } from '../../analytics/lineMetrics';
import { MILESTONES } from '../../data/milestones';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { StatusBadge } from '../common/Chip';

/** Plan / Forecast / Actual / Δ for every milestone of one line. */
export function MilestoneTable({ metrics }: { metrics: LineMetrics }) {
  const { t } = useT();
  const rows = MILESTONES.filter((def) => metrics.line.milestones[def.key]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-line text-left text-ink-3">
            <th className="py-1.5 pr-2 font-medium">{t('milestoneTable.milestone')}</th>
            <th className="px-2 font-medium">Plan</th>
            <th className="px-2 font-medium">Forecast</th>
            <th className="px-2 font-medium">Actual</th>
            <th className="px-2 text-right font-medium">{t('milestoneTable.deltaDays')}</th>
            <th className="pl-2 font-medium">{t('milestoneTable.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((def) => {
            const d = metrics.line.milestones[def.key]!;
            const slip = milestoneSlip(d);
            return (
              <tr key={def.key} className="border-b border-line/50">
                <td className="py-1.5 pr-2 text-ink">{def.label}</td>
                <td className="px-2 font-mono text-ink-2">{formatDay(d.plan)}</td>
                <td className="px-2 font-mono text-ink">{formatDay(d.forecast)}</td>
                <td className="px-2 font-mono text-good">{d.actual !== undefined ? formatDay(d.actual) : ''}</td>
                <td className={`px-2 text-right font-mono ${slip && slip > 0 ? 'text-serious' : slip && slip < 0 ? 'text-good' : 'text-ink-3'}`}>
                  {slip ? `${slip > 0 ? '+' : ''}${slip}` : '0'}
                </td>
                <td className="pl-2">
                  <StatusBadge status={metrics.status[def.key] ?? 'noDate'} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
