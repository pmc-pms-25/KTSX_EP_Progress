import { useMemo, useState } from 'react';
import type { PackageSummary } from '../../analytics/aggregate';
import { MILESTONE_BY_KEY, phaseIndex } from '../../data/milestones';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { FloatBadge, PhaseChip, StatusBadge } from '../common/Chip';

type SortKey = 'risk' | 'code' | 'phase' | 'next' | 'slip' | 'float';

const COLUMNS: { key: SortKey; labelKey: MessageKey; className?: string }[] = [
  { key: 'code', labelKey: 'packageTable.package' },
  { key: 'phase', labelKey: 'filter.phaseLabel' },
  { key: 'next', labelKey: 'packageTable.nextMilestone' },
  { key: 'slip', labelKey: 'packageTable.maxSlip', className: 'text-right' },
  { key: 'float', labelKey: 'packageTable.rosFloat', className: 'text-right' },
];

const COMPARE: Record<SortKey, (a: PackageSummary, b: PackageSummary) => number> = {
  risk: (a, b) => b.riskRank - a.riskRank || (a.minRosFloat ?? Infinity) - (b.minRosFloat ?? Infinity),
  code: (a, b) => a.code.localeCompare(b.code),
  phase: (a, b) => phaseIndex(a.scheduledPhase) - phaseIndex(b.scheduledPhase),
  next: (a, b) => (a.next?.day ?? Infinity) - (b.next?.day ?? Infinity),
  slip: (a, b) => (b.maxSlip ?? -Infinity) - (a.maxSlip ?? -Infinity),
  float: (a, b) => (a.minRosFloat ?? Infinity) - (b.minRosFloat ?? Infinity),
};

function riskClass(p: PackageSummary): string {
  if (p.rosAtRisk) return 'border-l-2 border-l-critical bg-critical/5';
  if (p.overdueCount > 0 || p.slipped) return 'border-l-2 border-l-warning';
  return 'border-l-2 border-l-transparent';
}

function RiskTags({ p }: { p: PackageSummary }) {
  const { t } = useT();
  return (
    <>
      {p.rosAtRisk && <span className="mr-1 text-critical">▲ ROS</span>}
      {p.overdueCount > 0 && <span className="mr-1 text-serious">{t('packageTable.overdueCount', { count: p.overdueCount })}</span>}
      {p.slipped && !p.rosAtRisk && <span className="text-warning">{t('packageTable.slipped')}</span>}
      {p.riskRank === 0 && <span className="text-good">✓</span>}
    </>
  );
}

function NextCell({ p }: { p: PackageSummary }) {
  if (!p.next) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-ink">
        {MILESTONE_BY_KEY[p.next.key].short} · <span className="font-mono">{formatDay(p.next.day)}</span>
      </span>
      <StatusBadge status={p.next.status} />
    </div>
  );
}

/** Package list: sortable table on desktop, cards on phones. Riskiest first by default. */
export function PackageTable({ packages, onOpen }: { packages: PackageSummary[]; onOpen: (code: string) => void }) {
  const { t } = useT();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'risk', dir: 1 });
  const rows = useMemo(() => [...packages].sort((a, b) => COMPARE[sort.key](a, b) * sort.dir), [packages, sort]);
  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }));

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.className ?? ''}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => toggle(c.key)} className="hover:text-ink">
                    {t(c.labelKey)} {sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => setSort({ key: 'risk', dir: 1 })} className="hover:text-ink">
                  {t('packageTable.risk')} {sort.key === 'risk' ? '●' : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={`${p.discipline}|${p.code}`} onClick={() => onOpen(p.code)} className={`cursor-pointer border-b border-line/60 hover:bg-surface-2 ${riskClass(p)}`}>
                <td className="px-3 py-2">
                  <p className={`font-mono text-xs ${p.hasValidCode ? 'text-ai-1' : 'text-serious'}`}>{p.code}</p>
                  <p className="max-w-xs truncate text-ink" title={p.name}>
                    {p.name || '—'}
                  </p>
                  <p className="text-[11px] text-ink-3">{p.facilities.join(' · ')}</p>
                </td>
                <td className="px-3 py-2">
                  <PhaseChip phase={p.scheduledPhase} />
                  {p.currentPhase !== p.scheduledPhase && (
                    <p className="mt-1 text-[11px] text-ink-3" title={t('packageTable.actualPhaseTitle')}>
                      Actual: {p.currentPhase === 'delivered' ? 'Delivered' : <PhaseChip phase={p.currentPhase} muted />}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <NextCell p={p} />
                </td>
                <td className="px-3 py-2 text-right font-mono">{p.maxSlip !== undefined && p.maxSlip > 0 ? <span className="text-serious">+{p.maxSlip}d</span> : '—'}</td>
                <td className="px-3 py-2 text-right">
                  <FloatBadge days={p.minRosFloat} />
                </td>
                <td className="px-3 py-2 text-xs">
                  <RiskTags p={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {rows.map((p) => (
          <li key={`${p.discipline}|${p.code}`}>
            <button type="button" onClick={() => onOpen(p.code)} className={`w-full rounded-xl border border-line bg-surface p-3 text-left ${riskClass(p)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ai-1">{p.code}</p>
                  <p className="truncate text-sm text-ink">{p.name || '—'}</p>
                </div>
                <FloatBadge days={p.minRosFloat} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <PhaseChip phase={p.scheduledPhase} />
                <NextCell p={p} />
              </div>
              <div className="mt-2 text-xs">
                <RiskTags p={p} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
