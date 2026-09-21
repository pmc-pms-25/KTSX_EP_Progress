import type { Flag } from '../../analytics/filters';
import { LINE_PHASE_LABEL, LINE_PHASE_ORDER } from '../../data/milestones';
import type { Plan } from '../../data/types';
import type { MessageKey } from '../../i18n/en';
import { FILTER_KEYS } from '../../store/urlFilters';
import { useDashboard } from '../../ui/hooks/useDashboard';
import type { FacetOption, ModuleDefinition } from '../types';
import { procurementStore } from './store';

const FLAG_LABEL_KEY: Record<Flag, MessageKey> = {
  rosRisk: 'filter.flag.rosRisk',
  slipped: 'filter.flag.slipped',
  overdue: 'filter.flag.overdue',
  dueSoon: 'filter.flag.dueSoon',
};

const same = (value: string): FacetOption => ({ value, label: value });
const distinct = (values: string[]) => [...new Set(values)];

export const procurementModule: ModuleDefinition<Plan> = {
  id: 'procurement',
  path: '/procurement',
  labelKey: 'module.procurement',
  icon: '▦',
  store: procurementStore,
  facets: [
    { key: FILTER_KEYS.disciplines, labelKey: 'filter.discipline', options: (plan) => distinct(plan.lines.map((l) => l.discipline)).map(same) },
    {
      key: FILTER_KEYS.facilities,
      labelKey: 'filter.facility',
      options: (plan) => distinct(plan.lines.map((l) => l.facility)).sort((a, b) => a.localeCompare(b)).map(same),
    },
    { key: FILTER_KEYS.itemTypes, labelKey: 'filter.itemType', options: () => ['Tagged', 'Bulk'].map(same) },
    { key: FILTER_KEYS.phases, labelKey: 'filter.phaseLabel', options: () => LINE_PHASE_ORDER.map((p) => ({ value: p, label: LINE_PHASE_LABEL[p] })) },
    {
      key: FILTER_KEYS.flags,
      labelKey: 'filter.flagsLabel',
      options: (_, t) => (Object.keys(FLAG_LABEL_KEY) as Flag[]).map((f) => ({ value: f, label: t(FLAG_LABEL_KEY[f]) })),
    },
  ],
  useSearch() {
    const { filters, setFilters, vocab } = useDashboard();
    return { value: filters.q, vocab, onChange: (q) => setFilters({ q }) };
  },
  useResultCount() {
    const { filtered, metrics } = useDashboard();
    return { shown: filtered.length, total: metrics.length, unitKey: 'unit.lines' };
  },
};
