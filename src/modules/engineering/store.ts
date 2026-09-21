import { summarizeWorkbook, type WorkbookSummary } from '../../data/engineering/loadWorkbookSummary';
import { createDataSource } from '../../data/sources/sources';
import { appStore } from '../../store/appStore';
import { createModuleStore, nextFrame, type ModuleLoader } from '../../store/moduleStore';

export function createEngineeringLoader(createSource = createDataSource): ModuleLoader<WorkbookSummary> {
  return async (source, { signal, onStep }) => {
    onStep('fetch');
    const buf = await createSource(source).load(signal);
    onStep('parse');
    await nextFrame();
    return { data: summarizeWorkbook(buf, source.sheetName), warnings: [] };
  };
}

export const engineeringStore = createModuleStore<WorkbookSummary>({
  moduleId: 'engineering',
  loader: createEngineeringLoader(),
  getConfig: () => appStore.getState().config,
  now: () => new Date(),
});
