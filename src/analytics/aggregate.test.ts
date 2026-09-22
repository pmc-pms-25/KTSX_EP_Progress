import { computeAllMetrics } from './lineMetrics';
import { dayFromISO } from '../lib/day';
import { makeLine, sampleMetrics, TEST_CTX } from '../test/planFixture';
import {
  computeKpis,
  disciplineHealth,
  facilityHeatmap,
  monthlyWorkload,
  phaseFunnel,
  riskLevel,
  summarizePackages,
} from './aggregate';

const metrics = sampleMetrics();

describe('computeKpis', () => {
  it('counts valid packages, lines, risk and milestone windows', () => {
    expect(computeKpis(metrics)).toEqual({ packages: 4, lines: 6, slipped: 1, rosAtRisk: 1, dueSoon: 1, overdue: 4 });
    expect(computeKpis([])).toEqual({ packages: 0, lines: 0, slipped: 0, rosAtRisk: 0, dueSoon: 0, overdue: 0 });
  });
});

describe('phaseFunnel', () => {
  it('counts lines per current phase in process order', () => {
    const funnel = phaseFunnel(metrics);
    expect(funnel.map((p) => p.phase)).toEqual(['tr', 'rfq', 'evaluation', 'award', 'manufacturing', 'onSailing', 'arrived', 'delivered']);
    expect(funnel.find((p) => p.phase === 'tr')?.count).toBe(4);
    expect(funnel.find((p) => p.phase === 'evaluation')?.count).toBe(1);
    expect(funnel.find((p) => p.phase === 'delivered')).toEqual({ phase: 'delivered', label: 'Delivered', count: 1 });
    const byActual = phaseFunnel(metrics, 'actual');
    expect(byActual.find((p) => p.phase === 'tr')?.count).toBe(5);
    expect(byActual.find((p) => p.phase === 'evaluation')?.count).toBe(0);
  });
});

describe('disciplineHealth', () => {
  it('scores each discipline in the given order', () => {
    const [mech, piping] = disciplineHealth(metrics, ['MECHANICAL', 'PIPING']);
    expect(mech).toMatchObject({ name: 'MECHANICAL', packages: 2, lines: 4, slipped: 1, rosAtRisk: 1, overdueLines: 1 });
    expect(mech.score).toBeCloseTo((2 + 1.5 + 1) / 4);
    expect(mech.level).toBe('risk');
    expect(piping).toMatchObject({ lines: 2, score: 0, level: 'ok' });
  });

  it('maps scores to levels', () => {
    expect(riskLevel(0.1)).toBe('ok');
    expect(riskLevel(0.25)).toBe('watch');
    expect(riskLevel(0.75)).toBe('risk');
  });
});

describe('summarizePackages', () => {
  it('rolls lines up per package and sorts riskiest first', () => {
    const packages = summarizePackages(metrics);
    expect(packages.map((p) => p.code)).toEqual(['MEC-001', 'MEC-002', 'PIP-002', 'UNCODED-15', 'PIP-001']);
    const pump = packages[0];
    expect(pump.facilities).toEqual(['PS2K TS', 'PS2R']);
    expect(pump.rosAtRisk).toBe(true);
    expect(pump.slipped).toBe(true);
    expect(pump.minRosFloat).toBeLessThan(0);
    expect(pump.next?.key).toBe('trApproval');
    expect(packages.find((p) => p.code === 'PIP-002')?.currentPhase).toBe('delivered');
    expect(packages.find((p) => p.code === 'MEC-002')?.scheduledPhase).toBe('evaluation');
    expect(packages.find((p) => p.code === 'UNCODED-15')?.hasValidCode).toBe(false);
  });
});

describe('monthlyWorkload', () => {
  it('counts headline milestones per month over a continuous range', () => {
    const w = monthlyWorkload(metrics);
    expect(w.series.map((s) => s.label)).toEqual(['TR', 'Bids', 'CBE', 'LOA', 'FAT', 'Ship', 'Site']);
    expect(w.months[0]).toBe('2025-01');
    expect(w.months).toContain('2025-12');
    const tr = w.series[0];
    expect(tr.counts.reduce((a, b) => a + b, 0)).toBe(6);
    expect(tr.counts[w.months.indexOf('2027-01')]).toBe(2);
  });

  it('is empty without data', () => {
    expect(monthlyWorkload([])).toEqual({ months: [], series: expect.any(Array) });
    expect(monthlyWorkload([], undefined, TEST_CTX.cutOff).months).toEqual([]);
  });

  it('stretches the range to include the cut-off month, so the cut-off can be drawn', () => {
    const later = computeAllMetrics([makeLine({ milestones: { trApproval: { plan: dayFromISO('2026-12-05')! } } })], TEST_CTX);
    expect(monthlyWorkload(later).months).toEqual(['2026-12']);
    // Cut-off is 18-Sep-2026: the months before the data are added, empty.
    const w = monthlyWorkload(later, undefined, TEST_CTX.cutOff);
    expect(w.months).toEqual(['2026-09', '2026-10', '2026-11', '2026-12']);
    expect(w.series[0].counts).toEqual([0, 0, 0, 1]);
    const earlier = computeAllMetrics([makeLine({ milestones: { trApproval: { plan: dayFromISO('2026-06-10')! } } })], TEST_CTX);
    expect(monthlyWorkload(earlier, undefined, TEST_CTX.cutOff).months).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
  });
});

describe('facilityHeatmap', () => {
  it('counts milestones per facility and month', () => {
    const h = facilityHeatmap(metrics, 'loa');
    expect(h.facilities).toEqual(['BF', 'PS2K TS', 'PS2L TS', 'PS2R', 'Unassigned', 'WHJs']);
    const total = h.cells.reduce((a, c) => a + c[2], 0);
    expect(total).toBe(6);
    expect(h.max).toBe(1);
    const all = facilityHeatmap(metrics);
    expect(all.cells.reduce((a, c) => a + c[2], 0)).toBe(6 * 21 - 1);
  });
});
