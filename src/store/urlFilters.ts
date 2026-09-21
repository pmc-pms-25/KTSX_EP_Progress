import { EMPTY_FILTERS, type Filters, type Flag } from '../analytics/filters';
import { LINE_PHASE_ORDER } from '../data/milestones';
import type { ItemType, LinePhase } from '../data/types';

/** URL query key for each filter facet; several values repeat the key (`?discipline=A&discipline=B`). */
export const FILTER_KEYS = { disciplines: 'discipline', facilities: 'facility', itemTypes: 'type', phases: 'phase', flags: 'flag', q: 'q' } as const;

const ITEM_TYPES: ItemType[] = ['Tagged', 'Bulk', 'Unknown'];
const FLAGS: Flag[] = ['slipped', 'rosRisk', 'overdue', 'dueSoon'];

const list = (params: URLSearchParams, key: string) => params.getAll(key).filter(Boolean);

export function filtersFromParams(params: URLSearchParams): Filters {
  return {
    disciplines: list(params, FILTER_KEYS.disciplines),
    facilities: list(params, FILTER_KEYS.facilities),
    itemTypes: list(params, FILTER_KEYS.itemTypes).filter((t): t is ItemType => ITEM_TYPES.includes(t as ItemType)),
    phases: list(params, FILTER_KEYS.phases).filter((p): p is LinePhase => LINE_PHASE_ORDER.includes(p as LinePhase)),
    flags: list(params, FILTER_KEYS.flags).filter((f): f is Flag => FLAGS.includes(f as Flag)),
    q: params.get(FILTER_KEYS.q) ?? '',
  };
}

/** Write filters into `params`, keeping unrelated keys (such as `pkg`). Returns a new instance. */
export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const facet of Object.keys(FILTER_KEYS) as (keyof Filters)[]) {
    const key = FILTER_KEYS[facet];
    next.delete(key);
    if (facet === 'q') {
      if (filters.q.trim()) next.set(key, filters.q.trim());
    } else {
      for (const value of filters[facet] as string[]) next.append(key, value);
    }
  }
  return next;
}

export { EMPTY_FILTERS };
