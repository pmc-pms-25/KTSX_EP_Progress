import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import type { SearchVocabulary } from '../../analytics/search';
import { STAGE_KEYS } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import { FILTER_KEYS } from '../../store/urlFilters';

export type EngFlag = 'notIssued' | 'overdue' | 'code1' | 'code2' | 'rejected';

export const ENG_FLAGS: readonly EngFlag[] = ['notIssued', 'overdue', 'code1', 'code2', 'rejected'];

export interface EngFilters {
  disciplines: string[];
  facilities: string[];
  docTypes: string[];
  stages: StageKey[];
  flags: EngFlag[];
  q: string;
}

export const EMPTY_ENG_FILTERS: EngFilters = { disciplines: [], facilities: [], docTypes: [], stages: [], flags: [], q: '' };

/** Same URL keys as Procurement, so a filter such as `discipline` reads the same in every module. */
const PARAM: Record<keyof EngFilters, string> = {
  disciplines: FILTER_KEYS.disciplines,
  facilities: FILTER_KEYS.facilities,
  docTypes: FILTER_KEYS.itemTypes,
  stages: FILTER_KEYS.phases,
  flags: FILTER_KEYS.flags,
  q: FILTER_KEYS.q,
};

const list = (params: URLSearchParams, key: string) => params.getAll(key).filter(Boolean);

export function engFiltersFromParams(params: URLSearchParams): EngFilters {
  return {
    disciplines: list(params, PARAM.disciplines),
    facilities: list(params, PARAM.facilities),
    docTypes: list(params, PARAM.docTypes),
    stages: list(params, PARAM.stages).filter((s): s is StageKey => STAGE_KEYS.includes(s as StageKey)),
    flags: list(params, PARAM.flags).filter((f): f is EngFlag => ENG_FLAGS.includes(f as EngFlag)),
    q: params.get(PARAM.q) ?? '',
  };
}

/** Write filters into `params`, keeping unrelated keys (such as `doc`). Returns a new instance. */
export function writeEngFilters(params: URLSearchParams, filters: EngFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const facet of Object.keys(PARAM) as (keyof EngFilters)[]) {
    const key = PARAM[facet];
    next.delete(key);
    if (facet === 'q') {
      if (filters.q.trim()) next.set(key, filters.q.trim());
    } else {
      for (const value of filters[facet] as string[]) next.append(key, value);
    }
  }
  return next;
}

const FLAG_TEST: Record<EngFlag, (m: DocMetrics) => boolean> = {
  notIssued: (m) => m.stage === 'notIssued',
  overdue: (m) => m.overdue,
  code1: (m) => m.doc.code === 1,
  code2: (m) => m.doc.code === 2,
  rejected: (m) => m.doc.code === 3 || m.doc.code === 4,
};

export const searchWords = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

const inList = <T,>(values: readonly T[], value: T) => values.length === 0 || values.includes(value);

/** Facets are OR within a facet and AND across facets; flags and search words AND on top. */
export function applyEngFilters(metrics: readonly DocMetrics[], f: EngFilters): DocMetrics[] {
  const words = searchWords(f.q);
  return metrics.filter((m) => {
    const { doc } = m;
    if (!inList(f.disciplines, doc.discipline) || !inList(f.facilities, doc.facility) || !inList(f.docTypes, doc.docType) || !inList(f.stages, m.stage)) {
      return false;
    }
    if (!f.flags.every((flag) => FLAG_TEST[flag](m))) return false;
    const haystack = `${doc.id} ${doc.title} ${doc.discipline} ${doc.facility} ${doc.docType}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

export function engVocabulary(metrics: readonly DocMetrics[]): SearchVocabulary {
  const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return { disciplines: sorted(metrics.map((m) => m.doc.discipline)), facilities: sorted(metrics.map((m) => m.doc.facility)) };
}
