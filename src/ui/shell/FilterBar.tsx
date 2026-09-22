import { useMemo, useState } from 'react';
import { useT } from '../../i18n/useT';
import { filterKeys } from '../../modules/registry';
import type { AnyModule, FacetOption } from '../../modules/types';
import { useModule } from '../../store/useModule';
import { MultiSelect } from '../common/MultiSelect';
import { useFacetParams } from './useFacetParams';

function ResultCount({ module }: { module: AnyModule }) {
  const { t } = useT();
  const { shown, total, unitKey } = module.useResultCount!();
  return (
    <span className="ml-auto text-xs text-ink-3">
      <span className="font-mono text-ink">{shown}</span> / {total} {t(unitKey, { n: total })}
    </span>
  );
}

/** URL values of each facet that exist among its options; unknown values (e.g. `?flag=bad`) filter nothing, so they are not shown. */
function knownValues(values: Record<string, string[]>, options: Record<string, FacetOption[]>): Record<string, string[]> {
  const known = { ...values };
  for (const [key, opts] of Object.entries(options)) known[key] = values[key].filter((v) => opts.some((o) => o.value === v));
  return known;
}

function Controls({ module, keys, options }: { module: AnyModule; keys: readonly string[]; options: Record<string, FacetOption[]> }) {
  const { t } = useT();
  const { values: raw, setValues, clear } = useFacetParams(keys);
  const values = knownValues(raw, options);
  const empty = keys.every((k) => values[k].length === 0);
  return (
    <>
      {module.facets
        .filter((f) => !f.hidden)
        .map((f) => (
          <MultiSelect
            key={f.key}
            label={t(f.labelKey)}
            options={options[f.key]}
            selected={values[f.key]}
            onChange={(next) => setValues(f.key, next)}
            showValues={f.showValues}
          />
        ))}
      {module.useResultCount ? <ResultCount module={module} /> : <span className="ml-auto" />}
      {!empty && (
        <button type="button" onClick={clear} className="text-xs text-ai-1 underline">
          {t('filter.clear')}
        </button>
      )}
    </>
  );
}

/** Sticky filter row on desktop; a filter button opening a bottom sheet on phones. Drawn from the module's facets. */
export function FilterBar({ module }: { module: AnyModule }) {
  const { t } = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const keys = useMemo(() => filterKeys(module), [module]);
  const facetKeys = useMemo(() => module.facets.map((f) => f.key), [module]);
  const ready = useModule(module.store, (s) => s.status === 'ready');
  const data = useModule(module.store, (s) => s.data);
  const { values: raw } = useFacetParams(facetKeys);
  if (!ready) return null;
  const options = Object.fromEntries(module.facets.map((f) => [f.key, f.options(data, t)]));
  const values = knownValues(raw, options);
  const activeCount = facetKeys.reduce((n, k) => n + values[k].length, 0);

  return (
    // No backdrop-filter here: it would create a stacking context that traps the dropdowns under the cards below.
    <div className="border-b border-line bg-bg/60">
      <div className="mx-auto hidden max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 md:flex">
        <Controls module={module} keys={keys} options={options} />
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
            <Controls module={module} keys={keys} options={options} />
            <button type="button" onClick={() => setSheetOpen(false)} className="mt-2 w-full rounded-lg bg-ai-1/20 py-2 text-sm text-ai-1">
              {t('filter.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
