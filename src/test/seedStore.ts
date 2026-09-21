import { procurementStore } from '../modules/procurement/store';
import { appStore } from '../store/appStore';
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
}
