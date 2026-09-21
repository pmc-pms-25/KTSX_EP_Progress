import { dayFromYMD } from '../../lib/day';
import { doc, ENG_CUTOFF, sampleRegister } from '../../test/engFixture';
import { computeDocMetrics } from './docMetrics';
import { stageProgress } from './stageProgress';
import { disciplineStatus, engKpis, transmittalActivity } from './summaries';

const metrics = () => computeDocMetrics(sampleRegister().documents, ENG_CUTOFF);
const ids = (list: { metrics: { doc: { id: string } } }[]) => list.map((x) => x.metrics.doc.id);

describe('computeDocMetrics', () => {
  it('marks each gated stage done, late or pending against the cut-off', () => {
    const [final, review, notDue, , , lateIssue] = metrics();
    expect(final.stage).toBe('final');
    expect(final.checks.review).toEqual({
      stage: 'review',
      plan: dayFromYMD(2025, 3, 1),
      due: true,
      actual: dayFromYMD(2025, 4, 25),
      state: 'done',
      delayDays: 55,
    });
    expect(review.checks.commented).toMatchObject({ state: 'late', due: true, delayDays: 38 });
    expect(review.overdue).toBe(true);
    expect(notDue.checks.review).toMatchObject({ state: 'pending', due: false });
    expect(notDue.overdue).toBe(false);
    expect(lateIssue.checks.review).toMatchObject({ state: 'late', delayDays: 38 });
    expect(lateIssue.checks.final).toEqual({ stage: 'final', plan: undefined, due: false, state: 'pending' });
  });
});

describe('stageProgress', () => {
  it('counts reached documents and plan vs actual per stage', () => {
    const [review, commented, final] = stageProgress(metrics());
    expect(review).toMatchObject({ stage: 'review', reached: 4, total: 6, planDue: 3, doneDue: 2, late: 1 });
    expect(review.ratio).toBeCloseTo(2 / 3);
    expect(commented).toMatchObject({ stage: 'commented', reached: 3, planDue: 1, doneDue: 0, late: 1, ratio: 0 });
    expect(final).toMatchObject({ stage: 'final', reached: 1, planDue: 0, late: 0, ratio: undefined });
  });

  it('lists late documents first, most days late first, then done, then pending', () => {
    const [review] = stageProgress(metrics());
    expect(ids(review.docs)).toEqual([
      'PQ-CPC0-STR-BOD-MPC-00006-00',
      'PQ-CLQ0-PIP-ISO-MPC-00002-00',
      'PQ-CLQ0-PIP-LAY-MPC-00001-00',
      'PQ-CPC0-STR-DTL-MPC-00004-00',
      'PQ-CPC0-STR-SPC-MPC-00005-00',
      'PQ-CLQ0-PIP-CAL-MPC-00003-00',
    ]);
  });
});

describe('engKpis', () => {
  it('sums the headline numbers', () => {
    expect(engKpis(metrics())).toEqual({
      total: 6,
      issued: 4,
      final: 1,
      code1: 1,
      code2: 1,
      rejected: 1,
      notIssued: 2,
      overdue: 2,
      hasPlanDates: true,
    });
  });

  it('reports when no document has planned dates', () => {
    expect(engKpis(computeDocMetrics([doc('PQ-CLQ0-PIP-LAY-MPC-00001-00')], ENG_CUTOFF)).hasPlanDates).toBe(false);
  });
});

describe('disciplineStatus', () => {
  it('counts stages per discipline and ranks by risk', () => {
    const extra = [
      doc('PQ-CLQ0-ARC-SPC-MPC-00001-00', { rev: 'N01' }),
      doc('PQ-CLQ0-ELE-SPC-MPC-00001-00'),
      doc('PQ-CLQ0-ELE-SPC-MPC-00002-00', { rev: 'K01' }),
    ];
    const status = disciplineStatus(computeDocMetrics([...sampleRegister().documents, ...extra], ENG_CUTOFF));
    expect(status.map((s) => [s.discipline, s.risk])).toEqual([
      ['PIP', 'critical'],
      ['STR', 'critical'],
      ['ELE', 'warning'],
      ['ARC', 'ok'],
    ]);
    expect(status[0]).toMatchObject({
      total: 3,
      byStage: { notIssued: 1, review: 1, commented: 0, final: 1 },
      notIssued: 1,
      overdue: 1,
    });
    expect(status[0].finalRatio).toBeCloseTo(1 / 3);
  });
});

describe('transmittalActivity', () => {
  it('counts documents per ISO week and fills empty weeks', () => {
    const weeks = transmittalActivity(metrics());
    expect(weeks).toHaveLength(9);
    expect(weeks[0]).toEqual({ start: dayFromYMD(2025, 2, 24), count: 1 });
    expect(weeks.map((w) => w.count)).toEqual([1, 0, 0, 0, 0, 0, 1, 0, 1]);
  });

  it('is empty without transmittal dates', () => {
    expect(transmittalActivity(computeDocMetrics([doc('PQ-CLQ0-PIP-LAY-MPC-00001-00')], ENG_CUTOFF))).toEqual([]);
  });
});
