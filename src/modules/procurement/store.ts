import { parsePlan } from '../../data/parser/parsePlan';
import { createDataSource } from '../../data/sources/sources';
import type { Plan } from '../../data/types';
import { msg } from '../../i18n/message';
import { appStore } from '../../store/appStore';
import { createModuleStore, nextFrame, ParseFailure, type ModuleLoader } from '../../store/moduleStore';

/** Fetch the procurement workbook and parse it into a Plan. */
export function createProcurementLoader(createSource = createDataSource): ModuleLoader<Plan> {
  return async (source, { signal, now, config, onStep }) => {
    onStep('fetch');
    const buf = await createSource(source).load(signal);
    onStep('parse');
    await nextFrame();
    const parsed = parsePlan(buf, { projectName: config.projectName, sheetName: source.sheetName, now });
    if (!parsed.ok) throw new ParseFailure(parsed.error.code, parsed.error.detail, parsed.error.message);
    onStep('analyze', msg('status.linesLoaded', { count: parsed.plan.lines.length }));
    await nextFrame();
    return { data: parsed.plan, warnings: parsed.plan.warnings };
  };
}

export const procurementStore = createModuleStore<Plan>({
  moduleId: 'procurement',
  loader: createProcurementLoader(),
  getConfig: () => appStore.getState().config,
  now: () => new Date(),
});
