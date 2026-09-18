import { EMPTY_FILTERS, type Filters, type Flag } from '../analytics/filters';
import { LINE_PHASE_ORDER } from '../data/milestones';
import type { ItemType, LinePhase } from '../data/types';

/** URL query keys for each filter facet. */
const KEYS = { disciplines: 'd', facilities: 'f', itemTypes: 't', phases: 'p', flags: 'flag', q: 'q' } as const;

const ITEM_TYPES: ItemType[] = ['Tagged', 'Bulk', 'Unknown'];
const FLAGS: Flag[] = ['slipped', 'rosRisk', 'overdue', 'dueSoon'];

function list(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  return raw ? raw.split(',').filter(Boolean) : [];
}

export function filtersFromParams(params: URLSearchParams): Filters {
  return {
    disciplines: list(params, KEYS.disciplines),
    facilities: list(params, KEYS.facilities),
    itemTypes: list(params, KEYS.itemTypes).filter((t): t is ItemType => ITEM_TYPES.includes(t as ItemType)),
    phases: list(params, KEYS.phases).filter((p): p is LinePhase => LINE_PHASE_ORDER.includes(p as LinePhase)),
    flags: list(params, KEYS.flags).filter((f): f is Flag => FLAGS.includes(f as Flag)),
    q: params.get(KEYS.q) ?? '',
  };
}

/** Write filters into `params`, keeping unrelated keys (such as `pkg`). Returns a new instance. */
export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const facet of Object.keys(KEYS) as (keyof Filters)[]) {
    const key = KEYS[facet];
    const value = facet === 'q' ? filters.q.trim() : (filters[facet] as string[]).join(',');
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export { EMPTY_FILTERS };
