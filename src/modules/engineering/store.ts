import { parseEmdr } from '../../data/engineering/parseEmdr';
import type { EmdrRegister } from '../../data/engineering/types';
import { createDataSource } from '../../data/sources/sources';
import { msg } from '../../i18n/message';
import { appStore } from '../../store/appStore';
import { createModuleStore, nextFrame, type ModuleLoader } from '../../store/moduleStore';

/** Fetch the EMDR workbook and read every register tab. */
export function createEngineeringLoader(createSource = createDataSource): ModuleLoader<EmdrRegister> {
  return async (source, { signal, onStep }) => {
    onStep('fetch');
    const buf = await createSource(source).load(signal);
    onStep('parse');
    await nextFrame();
    const parsed = parseEmdr(buf);
    onStep('analyze', msg('status.documentsLoaded', { count: parsed.data.documents.length }));
    await nextFrame();
    return parsed;
  };
}

export const engineeringStore = createModuleStore<EmdrRegister>({
  moduleId: 'engineering',
  loader: createEngineeringLoader(),
  getConfig: () => appStore.getState().config,
  now: () => new Date(),
});
