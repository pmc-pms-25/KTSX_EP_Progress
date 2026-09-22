import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { PhasePackage, PhaseProgress, PhaseState } from '../../analytics/phaseProgress';
import { MILESTONE_BY_KEY } from '../../data/milestones';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { PhaseChip } from '../common/Chip';
import { Drawer } from '../common/Drawer';
import { usePackageParam, usePhaseParam } from '../hooks/useFilters';

type Tab = 'late' | 'done' | 'all';

const TABS: { key: Tab; labelKey: MessageKey; match: (p: PhasePackage) => boolean }[] = [
  { key: 'late', labelKey: 'phaseDrawer.tab.late', match: (p) => p.state === 'late' },
  { key: 'done', labelKey: 'phaseDrawer.tab.done', match: (p) => p.state === 'done' || p.state === 'ahead' },
  { key: 'all', labelKey: 'phaseDrawer.tab.all', match: () => true },
];

const STATE_STYLE: Record<PhaseState, { labelKey: MessageKey; className: string }> = {
  late: { labelKey: 'phaseDrawer.state.late', className: 'bg-critical/15 text-critical' },
  done: { labelKey: 'phaseDrawer.state.done', className: 'bg-good/15 text-good' },
  ahead: { labelKey: 'phaseDrawer.state.ahead', className: 'bg-ai-1/15 text-ai-1' },
  pending: { labelKey: 'phaseDrawer.state.pending', className: 'bg-surface-2 text-ink-3' },
};

/** Packages behind one timeline milestone, opened with `?milestone=<phase>`. */
export function PhaseProgressDrawer({ progress }: { progress: readonly PhaseProgress[] }) {
  const { t } = useT();
  const { phase, close } = usePhaseParam();
  const { open: openPackage } = usePackageParam();
  const [chosen, setChosen] = useState<Tab | undefined>();
  const current = progress.find((p) => p.phase === phase);
  const tab = chosen ?? (current && current.late > 0 ? 'late' : 'all');
  const match = TABS.find((x) => x.key === tab)!.match;
  const rows = current?.packages.filter(match) ?? [];

  return (
    <Drawer
      open={current !== undefined}
      onClose={() => {
        setChosen(undefined);
        close();
      }}
      title={
        current && (
          <div>
            <PhaseChip phase={current.phase} />
            <p className="mt-1 text-xs text-ink-3">
              {t('phaseDrawer.summary', { actual: current.actual, plan: current.plan, total: current.total })}
            </p>
            <p className="text-xs text-ink-3">
              {t('phaseDrawer.gate')}: <span className="text-ink-2">{MILESTONE_BY_KEY[current.gate].label}</span>
            </p>
          </div>
        )
      }
    >
      {current && (
        <>
          <div role="tablist" aria-label={t('phaseDrawer.tabsLabel')} className="mb-3 flex w-fit rounded-lg border border-line p-0.5 text-xs">
            {TABS.map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setChosen(x.key)}
                className={`rounded-md px-3 py-1 ${tab === x.key ? 'bg-ai-1/20 text-ai-1' : 'text-ink-3 hover:text-ink'}`}
              >
                {t(x.labelKey)} <span className="font-mono">{current.packages.filter(x.match).length}</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t('phaseDrawer.empty')}</p>
          ) : (
            <ul key={tab} className="space-y-1.5">
              {rows.map((row, i) => (
                <PhasePackageRow key={row.code} row={row} index={i} onOpen={openPackage} />
              ))}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}

function PhasePackageRow({ row, index, onOpen }: { row: PhasePackage; index: number; onOpen: (code: string) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const style = STATE_STYLE[row.state];
  const delayTone = row.delayDays === undefined ? 'text-ink-3' : row.delayDays > 0 ? 'text-critical' : 'text-good';

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.2 }}
    >
      <button
        type="button"
        aria-label={`${row.code} @ ${row.facilities.join(', ')}`}
        onClick={() => onOpen(row.code)}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs hover:border-ai-1 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_4rem_5.5rem]"
      >
        <span className="min-w-0">
          <span className={`font-mono ${row.hasValidCode ? 'text-ai-1' : 'text-serious'}`}>{row.code}</span>
          <span className="text-ink-3"> @ {row.facilities.join(' · ')}</span>
          <span className="block truncate text-ink-2">{row.name || '—'}</span>
        </span>
        <span className="font-mono text-ink-3 sm:text-ink-2">
          <span className="font-sans sm:hidden">Plan: </span>
          {formatDay(row.plan)}
        </span>
        <span className="font-mono text-good">{row.actual !== undefined ? formatDay(row.actual) : ''}</span>
        <span className={`font-mono sm:text-right ${delayTone}`}>
          {row.delayDays === undefined ? '' : row.delayDays > 0 ? `+${row.delayDays}` : row.delayDays}
        </span>
        <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] sm:justify-self-end ${style.className}`}>{t(style.labelKey)}</span>
      </button>
    </motion.li>
  );
}
