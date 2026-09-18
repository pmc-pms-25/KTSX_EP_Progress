import { appStore } from '../store/appStore';
import { sampleMetrics, samplePlan, TEST_CTX } from './planFixture';

/** Put the app store into a loaded state with the sample plan (UI tests). */
export function seedStore(): void {
  appStore.setState({
    status: 'ready',
    refreshing: false,
    step: 'done',
    config: { appName: 'PMS - PEIW', projectName: 'Test Project', dataSource: { type: 'google-sheet', url: 'x' }, dueSoonDays: 30 },
    plan: samplePlan(),
    metrics: sampleMetrics(),
    cutOff: TEST_CTX.cutOff,
    error: undefined,
    refreshError: undefined,
  });
}
