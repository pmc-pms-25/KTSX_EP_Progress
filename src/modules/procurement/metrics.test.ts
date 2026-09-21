import { dayFromISO } from '../../lib/day';
import { samplePlan, TEST_CTX } from '../../test/planFixture';
import { procurementMetrics } from './metrics';

describe('procurementMetrics', () => {
  it('returns the same array for the same inputs', () => {
    const plan = samplePlan();
    const a = procurementMetrics(plan, TEST_CTX.cutOff, 30);
    expect(procurementMetrics(plan, TEST_CTX.cutOff, 30)).toBe(a);
    expect(a).toHaveLength(6);
  });

  it('recomputes when the cut-off changes', () => {
    const plan = samplePlan();
    const overdue = (cutOff: number) => procurementMetrics(plan, cutOff, 30).reduce((n, m) => n + m.overdueCount, 0);
    expect(overdue(dayFromISO('2030-01-01')!)).toBeGreaterThan(overdue(TEST_CTX.cutOff));
  });
});
