import { MODULE_IDS } from '../config/config';
import { translate } from '../i18n/translate';
import { samplePlan } from '../test/planFixture';
import { procurementModule } from './procurement/module';
import { filterKeys, moduleForPath, modules } from './registry';

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate('en', key, params);

describe('module registry', () => {
  it('lists ENGINEERING then PROCUREMENT, one per module id', () => {
    expect(modules.map((m) => m.id)).toEqual(['engineering', 'procurement']);
    expect([...modules.map((m) => m.id)].sort()).toEqual([...MODULE_IDS].sort());
    expect(modules.map((m) => m.path)).toEqual(['/engineering', '/procurement']);
  });

  it('finds the module of a path by prefix', () => {
    expect(moduleForPath('/procurement')?.id).toBe('procurement');
    expect(moduleForPath('/procurement/discipline/MECHANICAL')?.id).toBe('procurement');
    expect(moduleForPath('/engineering')?.id).toBe('engineering');
    expect(moduleForPath('/procurementx')).toBeUndefined();
    expect(moduleForPath('/')).toBeUndefined();
  });

  it('knows which query keys are filters', () => {
    expect(filterKeys(procurementModule)).toEqual(['discipline', 'facility', 'type', 'phase', 'flag', 'q']);
    expect(filterKeys(modules[0])).toEqual([]);
  });

  it('builds procurement facet options from the plan', () => {
    const plan = samplePlan();
    const options = Object.fromEntries(procurementModule.facets.map((f) => [f.key, f.options(plan, t)]));
    expect(options.discipline.map((o) => o.value)).toContain('MECHANICAL');
    expect(options.facility.map((o) => o.value)).toEqual([...options.facility.map((o) => o.value)].sort((a, b) => a.localeCompare(b)));
    expect(options.type.map((o) => o.value)).toEqual(['Tagged', 'Bulk']);
    expect(options.flag.find((o) => o.value === 'rosRisk')?.label).toBe('ROS at risk');
  });
});
