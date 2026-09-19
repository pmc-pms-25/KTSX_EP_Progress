import { useState } from 'react';
import { isEmptyFilters, type Filters, type Flag } from '../../analytics/filters';
import { LINE_PHASE_LABEL, LINE_PHASE_ORDER } from '../../data/milestones';
import type { ItemType } from '../../data/types';
import { MultiSelect } from '../common/MultiSelect';
import { useDashboard } from '../hooks/useDashboard';

const FLAG_LABEL: Record<Flag, string> = {
  rosRisk: 'Nguy cơ trễ ROS',
  slipped: 'Forecast trễ Plan',
  overdue: 'Có mốc quá hạn',
  dueSoon: 'Có mốc sắp đến hạn',
};

function Controls() {
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
      <MultiSelect label="Phase (kế hoạch)" options={LINE_PHASE_ORDER.map((p) => ({ value: p, label: LINE_PHASE_LABEL[p] }))} selected={filters.phases} onChange={set('phases')} />
      <MultiSelect<Flag> label="Cảnh báo" options={(Object.keys(FLAG_LABEL) as Flag[]).map((f) => ({ value: f, label: FLAG_LABEL[f] }))} selected={filters.flags} onChange={set('flags')} />
      <span className="ml-auto text-xs text-ink-3">
        <span className="font-mono text-ink">{filtered.length}</span> / {metrics.length} dòng
      </span>
      {!isEmptyFilters(filters) && (
        <button type="button" onClick={clearFilters} className="text-xs text-ai-1 underline">
          Xóa bộ lọc
        </button>
      )}
    </>
  );
}

/** Sticky filter row on desktop; a "Bộ lọc" button opening a bottom sheet on phones. */
export function FilterBar() {
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
          Bộ lọc {activeCount > 0 && <span className="rounded bg-ai-1/20 px-1.5 font-mono text-xs text-ai-1">{activeCount}</span>}
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
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
