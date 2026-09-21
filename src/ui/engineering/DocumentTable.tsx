import { useMemo, useState } from 'react';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { stageIndex } from '../../data/engineering/stages';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { StageChip } from './StageChip';

type SortKey = 'risk' | 'id' | 'stage' | 'rev' | 'code' | 'transmittal';

const COLUMNS: { key: SortKey; labelKey: MessageKey; className?: string }[] = [
  { key: 'id', labelKey: 'eng.table.document' },
  { key: 'stage', labelKey: 'eng.table.stage' },
  { key: 'rev', labelKey: 'eng.table.rev' },
  { key: 'code', labelKey: 'eng.table.code', className: 'text-right' },
  { key: 'transmittal', labelKey: 'eng.table.transmittal' },
];

const rejected = (m: DocMetrics) => m.doc.code === 3 || m.doc.code === 4;
/** Higher is riskier: overdue, then rejected, then never issued. */
const riskRank = (m: DocMetrics) => (m.overdue ? 3 : rejected(m) ? 2 : m.stage === 'notIssued' ? 1 : 0);

const COMPARE: Record<SortKey, (a: DocMetrics, b: DocMetrics) => number> = {
  risk: (a, b) => riskRank(b) - riskRank(a) || stageIndex(a.stage) - stageIndex(b.stage) || a.doc.id.localeCompare(b.doc.id),
  id: (a, b) => a.doc.id.localeCompare(b.doc.id),
  stage: (a, b) => stageIndex(a.stage) - stageIndex(b.stage),
  rev: (a, b) => a.doc.rev.localeCompare(b.doc.rev),
  code: (a, b) => (a.doc.code ?? 0) - (b.doc.code ?? 0),
  transmittal: (a, b) => (a.doc.transmittal?.date ?? Infinity) - (b.doc.transmittal?.date ?? Infinity),
};

function riskClass(m: DocMetrics): string {
  if (m.overdue || rejected(m)) return 'border-l-2 border-l-critical bg-critical/5';
  if (m.stage === 'notIssued') return 'border-l-2 border-l-warning';
  return 'border-l-2 border-l-transparent';
}

function RiskTags({ m }: { m: DocMetrics }) {
  const { t } = useT();
  return (
    <>
      {m.overdue && <span className="mr-1 text-critical">▲ {t('eng.table.overdue')}</span>}
      {rejected(m) && <span className="mr-1 text-critical">{t('eng.table.rejected')}</span>}
      {riskRank(m) === 0 && <span className="text-good">✓</span>}
    </>
  );
}

/** Document list: sortable table on desktop, cards on phones. Riskiest first by default. */
export function DocumentTable({ docs, onOpen }: { docs: readonly DocMetrics[]; onOpen: (id: string) => void }) {
  const { t } = useT();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'risk', dir: 1 });
  const rows = useMemo(() => [...docs].sort((a, b) => COMPARE[sort.key](a, b) * sort.dir), [docs, sort]);
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
                  {t('eng.table.risk')} {sort.key === 'risk' ? '●' : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.doc.id} onClick={() => onOpen(m.doc.id)} className={`cursor-pointer border-b border-line/60 hover:bg-surface-2 ${riskClass(m)}`}>
                <td className="px-3 py-2">
                  <p className="font-mono text-xs text-ai-1">{m.doc.id}</p>
                  <p className="max-w-md truncate text-ink" title={m.doc.title}>
                    {m.doc.title || '—'}
                  </p>
                  <p className="text-[11px] text-ink-3">
                    {m.doc.facility} · {m.doc.docTypeLabel ?? m.doc.docType}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <StageChip stage={m.stage} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{m.doc.rev || '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{m.doc.code ?? '—'}</td>
                <td className="px-3 py-2 text-xs">
                  <p className="font-mono">{formatDay(m.doc.transmittal?.date)}</p>
                  {m.doc.transmittal?.no && <p className="text-[11px] text-ink-3">{m.doc.transmittal.no}</p>}
                </td>
                <td className="px-3 py-2 text-xs">
                  <RiskTags m={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {rows.map((m) => (
          <li key={m.doc.id}>
            <button type="button" onClick={() => onOpen(m.doc.id)} className={`w-full rounded-xl border border-line bg-surface p-3 text-left ${riskClass(m)}`}>
              <p className="font-mono text-xs text-ai-1">{m.doc.id}</p>
              <p className="truncate text-sm text-ink">{m.doc.title || '—'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <StageChip stage={m.stage} />
                <span className="font-mono text-ink-3">{m.doc.rev}</span>
                <RiskTags m={m} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
