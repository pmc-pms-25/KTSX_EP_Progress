import { STAGES } from '../../data/engineering/stages';
import type { EmdrRegister, EngDocument } from '../../data/engineering/types';
import type { MessageKey } from '../../i18n/en';
import { FILTER_KEYS } from '../../store/urlFilters';
import type { FacetOption, ModuleDefinition } from '../types';
import { ENG_FLAGS, searchWords, type EngFlag } from './filters';
import { engineeringStore } from './store';
import { useEngDashboard } from './useEngDashboard';

const FLAG_LABEL_KEY: Record<EngFlag, MessageKey> = {
  notIssued: 'eng.flag.notIssued',
  overdue: 'eng.flag.overdue',
  code1: 'eng.flag.code1',
  code2: 'eng.flag.code2',
  rejected: 'eng.flag.rejected',
};

const same = (value: string): FacetOption => ({ value, label: value });
const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

/** `SPC · Specification` when the register names the type. */
function docTypeOptions(docs: readonly EngDocument[]): FacetOption[] {
  const labels = new Map<string, string | undefined>();
  for (const d of docs) if (!labels.get(d.docType)) labels.set(d.docType, d.docTypeLabel);
  return sorted([...labels.keys()]).map((value) => ({ value, label: labels.get(value) ? `${value} · ${labels.get(value)}` : value }));
}

export const engineeringModule: ModuleDefinition<EmdrRegister> = {
  id: 'engineering',
  path: '/engineering',
  labelKey: 'module.engineering',
  icon: '⚙',
  store: engineeringStore,
  facets: [
    { key: FILTER_KEYS.disciplines, labelKey: 'filter.discipline', options: (r) => sorted(r.documents.map((d) => d.discipline)).map(same) },
    { key: FILTER_KEYS.facilities, labelKey: 'filter.facility', options: (r) => sorted(r.documents.map((d) => d.facility)).map(same) },
    { key: FILTER_KEYS.itemTypes, labelKey: 'eng.filter.docType', options: (r) => docTypeOptions(r.documents) },
    { key: FILTER_KEYS.phases, labelKey: 'eng.filter.stage', options: (_, t) => STAGES.map((s) => ({ value: s.key, label: t(s.labelKey) })) },
    { key: FILTER_KEYS.flags, labelKey: 'filter.flagsLabel', options: (_, t) => ENG_FLAGS.map((f) => ({ value: f, label: t(FLAG_LABEL_KEY[f]) })) },
  ],
  useSearch() {
    const { filters, setFilters, vocab } = useEngDashboard();
    return {
      value: filters.q,
      vocab,
      onChange: (q) => setFilters({ q }),
      describe: (q) => searchWords(q).map((w) => `"${w}"`),
      placeholderKey: 'eng.ask.placeholder',
    };
  },
  useResultCount() {
    const { filtered, metrics } = useEngDashboard();
    return { shown: filtered.length, total: metrics.length, unitKey: 'unit.documents' };
  },
};
