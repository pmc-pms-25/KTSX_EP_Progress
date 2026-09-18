import type { ItemType, LinePhase } from '../data/types';
import { effectiveDay, type LineMetrics } from './lineMetrics';
import { parseSearch, type ParsedSearch, type SearchVocabulary } from './search';

export type Flag = 'slipped' | 'rosRisk' | 'overdue' | 'dueSoon';

export interface Filters {
  disciplines: string[];
  facilities: string[];
  itemTypes: ItemType[];
  phases: LinePhase[];
  flags: Flag[];
  q: string;
}

export const EMPTY_FILTERS: Filters = { disciplines: [], facilities: [], itemTypes: [], phases: [], flags: [], q: '' };

export function isEmptyFilters(f: Filters): boolean {
  return (
    f.disciplines.length === 0 &&
    f.facilities.length === 0 &&
    f.itemTypes.length === 0 &&
    f.phases.length === 0 &&
    f.flags.length === 0 &&
    f.q.trim() === ''
  );
}

const FLAG_TEST: Record<Flag, (m: LineMetrics) => boolean> = {
  slipped: (m) => m.isSlipped,
  rosRisk: (m) => m.rosAtRisk,
  overdue: (m) => m.overdueCount > 0,
  dueSoon: (m) => m.dueSoonCount > 0,
};

const inList = <T,>(list: readonly T[], value: T) => list.length === 0 || list.includes(value);

/** The four facets shared by the filter bar and the parsed search query. */
type Facets = Pick<Filters, 'disciplines' | 'facilities' | 'itemTypes' | 'phases'>;

function matchesFacets(m: LineMetrics, f: Facets): boolean {
  const { line } = m;
  return (
    inList(f.disciplines, line.discipline) &&
    inList(f.facilities, line.facility) &&
    inList(f.itemTypes, line.itemType) &&
    inList(f.phases, m.scheduledPhase)
  );
}

function matchesSearch(m: LineMetrics, s: ParsedSearch): boolean {
  const { line } = m;
  if (!matchesFacets(m, s)) return false;
  if (s.milestones.length > 0) {
    const hit = s.milestones.some((key) => {
      const day = effectiveDay(line.milestones[key]);
      if (day === undefined) return false;
      return !s.period || (day >= s.period.from && day <= s.period.to);
    });
    if (!hit) return false;
  } else if (s.period) {
    const day = m.next?.day;
    if (day === undefined || day < s.period.from || day > s.period.to) return false;
  }
  const haystack = `${line.packageCode} ${line.packageName}`.toLowerCase();
  return s.text.every((t) => haystack.includes(t));
}

/**
 * Apply the shared filter bar. Facets are OR within a facet and AND across facets; the search query ANDs on top.
 * Phase filters use the scheduled phase (where the line should be by now).
 */
export function applyFilters(metrics: readonly LineMetrics[], f: Filters, vocab: SearchVocabulary): LineMetrics[] {
  const search = f.q.trim() ? parseSearch(f.q, vocab) : undefined;
  return metrics.filter((m) => {
    if (!matchesFacets(m, f)) return false;
    if (!f.flags.every((flag) => FLAG_TEST[flag](m))) return false;
    return !search || matchesSearch(m, search);
  });
}

/** Distinct facilities and disciplines, in first-seen order (disciplines) and alphabetical order (facilities). */
export function vocabularyOf(metrics: readonly LineMetrics[]): SearchVocabulary {
  const disciplines: string[] = [];
  const facilities = new Set<string>();
  for (const { line } of metrics) {
    if (!disciplines.includes(line.discipline)) disciplines.push(line.discipline);
    facilities.add(line.facility);
  }
  return { disciplines, facilities: [...facilities].sort((a, b) => a.localeCompare(b)) };
}
