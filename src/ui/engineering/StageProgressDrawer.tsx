import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { StageState } from '../../analytics/engineering/docMetrics';
import type { StageDoc, StageProgress } from '../../analytics/engineering/stageProgress';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { Drawer } from '../common/Drawer';
import { useDocParam, useStageParam } from './params';
import { StageChip } from './StageChip';

type Tab = 'late' | 'done' | 'all';

const TABS: { key: Tab; labelKey: MessageKey; match: (d: StageDoc) => boolean }[] = [
  { key: 'late', labelKey: 'phaseDrawer.tab.late', match: (d) => d.check.state === 'late' },
  { key: 'done', labelKey: 'phaseDrawer.tab.done', match: (d) => d.check.state === 'done' },
  { key: 'all', labelKey: 'phaseDrawer.tab.all', match: () => true },
];

const STATE_STYLE: Record<StageState, { labelKey: MessageKey; className: string }> = {
  late: { labelKey: 'phaseDrawer.state.late', className: 'bg-critical/15 text-critical' },
  done: { labelKey: 'phaseDrawer.state.done', className: 'bg-good/15 text-good' },
  pending: { labelKey: 'phaseDrawer.state.pending', className: 'bg-surface-2 text-ink-3' },
};

/** Documents behind one timeline step, opened with `?stage=<stage>`. */
export function StageProgressDrawer({ progress }: { progress: readonly StageProgress[] }) {
  const { t } = useT();
  const { stage, close } = useStageParam();
  const { open: openDoc } = useDocParam();
  const [chosen, setChosen] = useState<Tab | undefined>();
  const current = progress.find((p) => p.stage === stage);
  const tab = chosen ?? (current && current.late > 0 ? 'late' : 'all');
  const match = TABS.find((x) => x.key === tab)!.match;
  const rows = current?.docs.filter(match) ?? [];

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
            <StageChip stage={current.stage} />
            <p className="mt-1 text-xs text-ink-3">
              {t('eng.stageDrawer.summary', { reached: current.reached, total: current.total, late: current.late })}
            </p>
          </div>
        )
      }
    >
      {current && (
        <>
          <div role="tablist" aria-label={t('eng.stageDrawer.tabsLabel')} className="mb-3 flex w-fit rounded-lg border border-line p-0.5 text-xs">
            {TABS.map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setChosen(x.key)}
                className={`rounded-md px-3 py-1 ${tab === x.key ? 'bg-ai-1/20 text-ai-1' : 'text-ink-3 hover:text-ink'}`}
              >
                {t(x.labelKey)} <span className="font-mono">{current.docs.filter(x.match).length}</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t('eng.stageDrawer.empty')}</p>
          ) : (
            <ul key={tab} className="space-y-1.5">
              {rows.map((row, i) => (
                <StageDocRow key={row.metrics.doc.id} row={row} index={i} onOpen={openDoc} />
              ))}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}

function StageDocRow({ row, index, onOpen }: { row: StageDoc; index: number; onOpen: (id: string) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const { doc } = row.metrics;
  const { check } = row;
  const style = STATE_STYLE[check.state];
  const delayTone = check.delayDays === undefined ? 'text-ink-3' : check.delayDays > 0 ? 'text-critical' : 'text-good';

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.2 }}
    >
      <button
        type="button"
        aria-label={doc.id}
        onClick={() => onOpen(doc.id)}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs hover:border-ai-1 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_4rem_5.5rem]"
      >
        <span className="min-w-0">
          <span className="font-mono text-ai-1">{doc.id}</span>
          <span className="block truncate text-ink-2">{doc.title || '—'}</span>
        </span>
        <span className="text-ink-3 sm:text-ink-2">
          <span className="sm:hidden">{t('eng.stageDrawer.plan')}: </span>
          <span className="font-mono">{formatDay(check.plan)}</span>
        </span>
        <span className="font-mono text-good">{check.actual !== undefined ? formatDay(check.actual) : ''}</span>
        <span className={`font-mono sm:text-right ${delayTone}`}>
          {check.delayDays === undefined ? '' : check.delayDays > 0 ? `+${check.delayDays}` : check.delayDays}
        </span>
        <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] sm:justify-self-end ${style.className}`}>{t(style.labelKey)}</span>
      </button>
    </motion.li>
  );
}
