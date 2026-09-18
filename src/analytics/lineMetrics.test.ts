import { dayFromISO } from '../lib/day';
import { metricsFor, sampleMetrics, TEST_CTX } from '../test/planFixture';
import { effectiveDay, milestoneSlip, milestoneStatus, targetDay } from './lineMetrics';

const d = (iso: string) => dayFromISO(iso)!;

describe('milestone helpers', () => {
  it('picks effective and target days', () => {
    expect(effectiveDay({ plan: 1, forecast: 2, actual: 3 })).toBe(3);
    expect(effectiveDay({ plan: 1, forecast: 2 })).toBe(2);
    expect(targetDay({ plan: 1, actual: 3 })).toBe(1);
    expect(effectiveDay(undefined)).toBeUndefined();
  });

  it('derives status relative to the cut-off', () => {
    const c = TEST_CTX.cutOff;
    expect(milestoneStatus({ plan: c - 100, actual: c - 90 }, TEST_CTX)).toBe('done');
    expect(milestoneStatus({ plan: c - 1 }, TEST_CTX)).toBe('overdue');
    expect(milestoneStatus({ plan: c - 10, forecast: c + 5 }, TEST_CTX)).toBe('dueSoon');
    expect(milestoneStatus({ plan: c + 30 }, TEST_CTX)).toBe('dueSoon');
    expect(milestoneStatus({ plan: c + 31 }, TEST_CTX)).toBe('future');
    expect(milestoneStatus({}, TEST_CTX)).toBe('noDate');
  });

  it('computes slippage as forecast minus plan', () => {
    expect(milestoneSlip({ plan: 10, forecast: 25 })).toBe(15);
    expect(milestoneSlip({ plan: 10 })).toBeUndefined();
  });
});

describe('computeLineMetrics', () => {
  const metrics = sampleMetrics();

  it('flags a line whose forecast slips past ROS', () => {
    const m = metricsFor(metrics, 'MEC-001', 'PS2R');
    expect(m.isSlipped).toBe(true);
    expect(m.maxSlip).toBe(d('2028-04-20') - d('2028-02-05'));
    expect(m.rosFloat).toBe(d('2028-04-01') - d('2028-04-20'));
    expect(m.rosAtRisk).toBe(true);
    expect(m.currentPhase).toBe('tr');
    expect(m.scheduledPhase).toBe('tr');
    expect(m.next).toEqual({ key: 'trApproval', day: d('2027-01-01'), status: 'future' });
  });

  it('keeps an on-plan line healthy and measures ROS pushes', () => {
    const m = metricsFor(metrics, 'MEC-001', 'PS2K TS');
    expect(m.isSlipped).toBe(false);
    expect(m.rosAtRisk).toBe(false);
    expect(m.rosPushCount).toBe(3);
    expect(m.rosPushDays).toBe(d('2028-06-01') - d('2028-01-01'));
  });

  it('moves past milestones with actuals and counts overdue ones', () => {
    const m = metricsFor(metrics, 'MEC-002');
    expect(m.status.trApproval).toBe('done');
    expect(m.status.rfqSubmission).toBe('done');
    expect(m.next?.key).toBe('rfqApproval');
    expect(m.currentPhase).toBe('tr');
    // By schedule the line should already be at TBE Approval (30-Sep-2026).
    expect(m.scheduledPhase).toBe('evaluation');
    // chain('2026-06-01') → milestones 3..6 fall before 18-Sep-2026 without actuals.
    expect(m.overdueCount).toBe(4);
    expect(m.isAhead).toBe(true);
  });

  it('marks fully actualized lines as delivered', () => {
    const m = metricsFor(metrics, 'PIP-002');
    expect(m.currentPhase).toBe('delivered');
    expect(m.scheduledPhase).toBe('delivered');
    expect(m.next).toBeUndefined();
    expect(m.overdueCount).toBe(0);
  });
});
