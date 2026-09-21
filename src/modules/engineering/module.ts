import type { WorkbookSummary } from '../../data/engineering/loadWorkbookSummary';
import type { ModuleDefinition } from '../types';
import { engineeringStore } from './store';

/** Placeholder: no filters or search until the Engineering content is designed. */
export const engineeringModule: ModuleDefinition<WorkbookSummary> = {
  id: 'engineering',
  path: '/engineering',
  labelKey: 'module.engineering',
  icon: '⚙',
  store: engineeringStore,
  facets: [],
};
