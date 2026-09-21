import { engineeringStore } from '../modules/engineering/store';
import { procurementStore } from '../modules/procurement/store';
import { appStore } from '../store/appStore';
import { ENG_CUTOFF, sampleRegister } from './engFixture';
import { samplePlan, TEST_CTX } from './planFixture';

/** Put the app into a loaded state with the sample plan (UI tests). */
export function seedStore(): void {
  appStore.setState({
    configStatus: 'ready',
    config: { appName: 'PMS - PEIW', projectName: 'Test Project', dataSources: { procurement: { type: 'google-sheet', url: 'x' } }, dueSoonDays: 30 },
    configError: undefined,
    cutOff: TEST_CTX.cutOff,
    lang: 'vi',
    lastQuery: {},
  });
  const plan = samplePlan();
  procurementStore.setState({
    status: 'ready',
    refreshing: false,
    step: 'done',
    data: plan,
    warnings: plan.warnings,
    lastSync: new Date(),
    error: undefined,
    refreshError: undefined,
  });
  engineeringStore.setState({ status: 'idle', refreshing: false, step: 'fetch', data: undefined, warnings: [], error: undefined, refreshError: undefined });
}

/**
 * Put the Engineering module into a loaded state with the sample register (UI tests).
 * Also moves the app-wide cut-off to the register's own cut-off, matching the scenario
 * documented in `engFixture.ts` (`seedStore` alone leaves it at Procurement's cut-off).
 */
export function seedEngineering(): void {
  appStore.setState({ cutOff: ENG_CUTOFF });
  engineeringStore.setState({
    status: 'ready',
    refreshing: false,
    step: 'done',
    data: sampleRegister(),
    warnings: [],
    lastSync: new Date(),
    error: undefined,
    refreshError: undefined,
  });
}
