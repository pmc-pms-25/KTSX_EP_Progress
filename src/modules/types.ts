import type { SearchVocabulary } from '../analytics/search';
import type { ModuleId } from '../config/config';
import type { MessageKey } from '../i18n/en';
import type { useT } from '../i18n/useT';
import type { ModuleStore } from '../store/moduleStore';

export type { ModuleId };
export type Translate = ReturnType<typeof useT>['t'];

export interface FacetOption {
  value: string;
  label: string;
}

/** One filter dropdown. The shared FilterBar draws it; `key` is its URL query key. */
export interface FacetDef<T> {
  key: string;
  labelKey: MessageKey;
  options(data: T, t: Translate): FacetOption[];
}

export interface ModuleSearch {
  value: string;
  vocab: SearchVocabulary;
  onChange(q: string): void;
  /** Chips for how the query is read; Procurement's parser when absent. */
  describe?(q: string): string[];
  /** Input placeholder; `ask.placeholder` when absent. */
  placeholderKey?: MessageKey;
}

export interface ResultCount {
  shown: number;
  total: number;
  /** Plural unit taking `{n}`, e.g. 'unit.lines'. */
  unitKey: MessageKey;
}

/**
 * Everything the shared shell needs to know about a dashboard. Routes are not here: they stay in App.tsx.
 * The optional hooks are only called from components keyed by `id`, so switching modules remounts them.
 */
export interface ModuleDefinition<T> {
  id: ModuleId;
  path: string;
  labelKey: MessageKey;
  icon: string;
  store: ModuleStore<T>;
  /** Empty → no filter bar. */
  facets: FacetDef<T>[];
  /** Present → the header shows the AskBox and `q` counts as a filter key. */
  useSearch?(): ModuleSearch;
  /** Present → the filter bar shows "shown / total unit". */
  useResultCount?(): ResultCount;
}

// The shell handles modules of different data types side by side.
export type AnyModule = ModuleDefinition<any>;
