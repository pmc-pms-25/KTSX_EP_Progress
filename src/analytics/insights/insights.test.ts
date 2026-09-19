import { translate } from '../../i18n/translate';
import { dayFromISO } from '../../lib/day';
import { makeLine, sampleMetrics, TEST_CTX } from '../../test/planFixture';
import { computeAllMetrics } from '../lineMetrics';
import { generateInsights, INSIGHT_RULES } from './registry';
import { dueSoonRule } from './rules/dueSoon';
import { overdueRule } from './rules/overdue';
import { rosPushedRule } from './rules/rosPushed';
import { rosRiskRule } from './rules/rosRisk';
import { slippageRule } from './rules/slippage';
import { workloadPeakRule } from './rules/workloadPeak';
import type { InsightRule } from './types';

const d = (iso: string) => dayFromISO(iso)!;
const ic = { metrics: sampleMetrics(), ctx: TEST_CTX };

describe('insight rules on the sample plan', () => {
  it('reports ROS risk with the worst line', () => {
    const i = rosRiskRule.evaluate(ic)!;
    expect(i.severity).toBe('critical');
    expect(translate('vi', i.title)).toBe('1 dòng có nguy cơ trễ ROS');
    expect(translate('en', i.title)).toBe('1 line at risk of missing ROS');
    const detail = translate('vi', i.detail);
    expect(detail).toContain('MECHANICAL');
    expect(detail).toContain('MEC-001 @ PS2R');
    expect(detail).toContain('trễ 19 ngày');
    expect(i.evidence).toEqual(['MEC-001|PS2R|7']);
    expect(i.filter).toEqual({ flags: ['rosRisk'] });
    expect(i.confidence).toBe(1);
  });

  it('reports slippage', () => {
    const i = slippageRule.evaluate(ic)!;
    expect(translate('vi', i.title)).toBe('1 dòng có Forecast trễ hơn Plan');
    expect(translate('vi', i.detail)).toContain('lớn nhất 75 ngày');
  });

  it('reports overdue milestones without actuals', () => {
    const i = overdueRule.evaluate(ic)!;
    expect(translate('vi', i.title)).toBe('4 mốc đã qua hạn nhưng chưa có Actual');
    expect(i.evidence).toEqual(['MEC-002|BF|11']);
  });

  it('reports milestones due soon', () => {
    const i = dueSoonRule.evaluate(ic)!;
    expect(translate('vi', i.title)).toBe('1 mốc đến hạn trong 30 ngày tới');
    expect(translate('vi', i.detail)).toContain('TBE (1)');
  });

  it('reports ROS pushes', () => {
    const i = rosPushedRule.evaluate(ic)!;
    expect(translate('vi', i.title)).toBe('ROS đã bị dời trên 1 dòng');
    expect(translate('vi', i.detail)).toContain('152 ngày qua 3 lần');
  });
});

describe('workloadPeakRule', () => {
  const at = (iso: string) => makeLine({ milestones: { loa: { plan: d(iso) } } });

  it('fires when a future month holds at least twice the average', () => {
    const lines = [at('2027-03-02'), at('2027-03-10'), at('2027-03-15'), at('2027-03-20'), at('2027-05-01'), at('2027-07-01')];
    const i = workloadPeakRule.evaluate({ metrics: computeAllMetrics(lines, TEST_CTX), ctx: TEST_CTX })!;
    expect(translate('vi', i.title)).toBe('Đỉnh khối lượng: Mar 2027 có 4 mốc đến hạn');
    const detail = translate('vi', i.detail);
    expect(detail).toContain('Gấp 2.0×');
    expect(detail).toContain('LOA Effective (4)');
    expect(i.evidence).toHaveLength(4);
  });

  it('stays quiet for an even workload or past-only dates', () => {
    const even = [at('2027-03-02'), at('2027-04-02'), at('2027-05-02')];
    expect(workloadPeakRule.evaluate({ metrics: computeAllMetrics(even, TEST_CTX), ctx: TEST_CTX })).toBeUndefined();
    const past = [at('2025-03-02'), at('2025-03-03')];
    expect(workloadPeakRule.evaluate({ metrics: computeAllMetrics(past, TEST_CTX), ctx: TEST_CTX })).toBeUndefined();
  });
});

describe('generateInsights', () => {
  it('orders by severity and respects the limit', () => {
    const all = generateInsights(ic, INSIGHT_RULES, 10);
    expect(all[0].id).toBe('ros-risk');
    expect(all.map((i) => i.severity)).toEqual([...all.map((i) => i.severity)].sort((a, b) => ['critical', 'warning', 'info'].indexOf(a) - ['critical', 'warning', 'info'].indexOf(b)));
    expect(generateInsights(ic, INSIGHT_RULES, 2)).toHaveLength(2);
  });

  it('returns nothing for an empty plan', () => {
    expect(generateInsights({ metrics: [], ctx: TEST_CTX })).toEqual([]);
  });

  it('isolates a failing rule', () => {
    const boom: InsightRule = {
      id: 'boom',
      evaluate() {
        throw new Error('bad rule');
      },
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(generateInsights(ic, [boom, rosRiskRule]).map((i) => i.id)).toEqual(['ros-risk']);
    spy.mockRestore();
  });
});
