import { useState } from 'react';
import { isEmptyFilters, type Filters, type Flag } from '../../analytics/filters';
import { LINE_PHASE_LABEL, LINE_PHASE_ORDER } from '../../data/milestones';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import type { ItemType } from '../../data/types';
import { MultiSelect } from '../common/MultiSelect';
import { useDashboard } from '../hooks/useDashboard';

const FLAG_LABEL_KEY: Record<Flag, MessageKey> = {
  rosRisk: 'filter.flag.rosRisk',
  slipped: 'filter.flag.slipped',
  overdue: 'filter.flag.overdue',
  dueSoon: 'filter.flag.dueSoon',
};

function Controls() {
  const { t } = useT();
  const { filters, setFilters, clearFilters, vocab, filtered, metrics } = useDashboard();
  const set = <K extends keyof Filters>(key: K) => (value: Filters[K]) => setFilters({ [key]: value } as Partial<Filters>);
  return (
    <>
      <MultiSelect label="Discipline" options={vocab.disciplines.map((d) => ({ value: d, label: d }))} selected={filters.disciplines} onChange={set('disciplines')} />
      <MultiSelect label="Facility" options={vocab.facilities.map((f) => ({ value: f, label: f }))} selected={filters.facilities} onChange={set('facilities')} />
      <MultiSelect<ItemType>
        label="Tagged/Bulk"
        options={[
          { value: 'Tagged', label: 'Tagged' },
          { value: 'Bulk', label: 'Bulk' },
        ]}
        selected={filters.itemTypes}
        onChange={set('itemTypes')}
      />
      <MultiSelect label={t('filter.phaseLabel')} options={LINE_PHASE_ORDER.map((p) => ({ value: p, label: LINE_PHASE_LABEL[p] }))} selected={filters.phases} onChange={set('phases')} />
      <MultiSelect<Flag> label={t('filter.flagsLabel')} options={(Object.keys(FLAG_LABEL_KEY) as Flag[]).map((f) => ({ value: f, label: t(FLAG_LABEL_KEY[f]) }))} selected={filters.flags} onChange={set('flags')} />
      <span className="ml-auto text-xs text-ink-3">
        <span className="font-mono text-ink">{filtered.length}</span> / {metrics.length} {t('unit.lines', { n: metrics.length })}
      </span>
      {!isEmptyFilters(filters) && (
        <button type="button" onClick={clearFilters} className="text-xs text-ai-1 underline">
          {t('filter.clear')}
        </button>
      )}
    </>
  );
}

/** Sticky filter row on desktop; a filter button opening a bottom sheet on phones. */
export function FilterBar() {
  const { t } = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const { filters } = useDashboard();
  const activeCount =
    filters.disciplines.length + filters.facilities.length + filters.itemTypes.length + filters.phases.length + filters.flags.length;

  return (
    // No backdrop-filter here: it would create a stacking context that traps the dropdowns under the cards below.
    <div className="border-b border-line bg-bg/60">
      <div className="mx-auto hidden max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 md:flex">
        <Controls />
      </div>
      <div className="flex items-center justify-between px-4 py-2 md:hidden">
        <button type="button" onClick={() => setSheetOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm">
          {t('filter.title')} {activeCount > 0 && <span className="rounded bg-ai-1/20 px-1.5 font-mono text-xs text-ai-1">{activeCount}</span>}
        </button>
      </div>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 rounded-t-2xl border-t border-line bg-bg p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <Controls />
            <button type="button" onClick={() => setSheetOpen(false)} className="mt-2 w-full rounded-lg bg-ai-1/20 py-2 text-sm text-ai-1">
              {t('filter.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
