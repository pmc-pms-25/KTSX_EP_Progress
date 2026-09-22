import { computeAllMetrics } from './lineMetrics';
import { PHASE_GATE } from '../data/milestones';
import { phaseProgress, progressTone } from './phaseProgress';
import { makeLine, TEST_CTX } from '../test/planFixture';

const cut = TEST_CTX.cutOff;

function metricsOf(...lines: ReturnType<typeof makeLine>[]) {
  return computeAllMetrics(lines, TEST_CTX);
}

describe('PHASE_GATE', () => {
  it('names one headline milestone per phase', () => {
    expect(PHASE_GATE).toEqual({
      tr: 'trApproval',
      rfq: 'bidsDue',
      evaluation: 'cbeApproval',
      award: 'loa',
      manufacturing: 'fat',
    });
  });
});

describe('phaseProgress', () => {
  const late = makeLine({ packageCode: 'LATE', milestones: { loa: { plan: cut - 20 } } });
  const lateLess = makeLine({ packageCode: 'LATE2', milestones: { loa: { plan: cut - 3 } } });
  const done = makeLine({ packageCode: 'DONE', milestones: { loa: { plan: cut - 30, actual: cut - 25 } } });
  const ahead = makeLine({ packageCode: 'AHEAD', milestones: { loa: { plan: cut + 40, actual: cut - 2 } } });
  const pending = makeLine({ packageCode: 'PEND', milestones: { loa: { plan: cut + 60 } } });
  const futureActual = makeLine({ packageCode: 'FUT', milestones: { loa: { plan: cut - 5, actual: cut + 3 } } });
  // Only the phase's headline milestone counts: a PO date alone does not put a package in Award.
  const poOnly = makeLine({ packageCode: 'PO-ONLY', milestones: { po: { plan: cut - 50 } } });
  const progress = phaseProgress(metricsOf(late, lateLess, done, ahead, pending, futureActual, poOnly), cut);
  const award = progress.find((p) => p.phase === 'award')!;

  it('returns every phase with a Plan milestone, in process order (Ready Ex-Works and Arrived at Site await the Expediting Report)', () => {
    expect(progress.map((p) => [p.phase, p.gate])).toEqual([
      ['tr', 'trApproval'],
      ['rfq', 'bidsDue'],
      ['evaluation', 'cbeApproval'],
      ['award', 'loa'],
      ['manufacturing', 'fat'],
    ]);
  });

  it('counts packages planned by cut-off as Plan and packages completed by cut-off as Actual', () => {
    // Due: LATE, LATE2, DONE, FUT. Completed by cut-off: DONE, AHEAD (FUT's actual is after cut-off).
    expect(award).toMatchObject({ plan: 4, actual: 2, total: 6, late: 3 });
    expect(award.ratio).toBeCloseTo(0.5);
  });

  it('classifies each package and sorts the latest first', () => {
    expect(award.packages.map((p) => [p.code, p.state])).toEqual([
      ['LATE', 'late'],
      ['FUT', 'late'],
      ['LATE2', 'late'],
      ['DONE', 'done'],
      ['AHEAD', 'ahead'],
      ['PEND', 'pending'],
    ]);
    expect(award.packages[0]).toMatchObject({ plan: cut - 20, delayDays: 20, facilities: ['BF'] });
    expect(award.packages.find((p) => p.state === 'done')).toMatchObject({ actual: cut - 25, delayDays: 5 });
    expect(award.packages.find((p) => p.state === 'ahead')?.delayDays).toBe(-42);
  });

  it('leaves the ratio undefined when nothing is due', () => {
    const tr = progress.find((p) => p.phase === 'tr')!;
    expect(tr).toMatchObject({ plan: 0, actual: 0, total: 0, packages: [] });
    expect(tr.ratio).toBeUndefined();
  });
});

describe('phaseProgress across facilities', () => {
  const line = (code: string, facility: string, plan: number, actual?: number) =>
    makeLine({ packageCode: code, facility, milestones: { trApproval: { plan, actual } } });
  const tr = phaseProgress(
    metricsOf(
      // One facility done, one due without an actual: the package is late, counted once.
      line('SPLIT', 'A', cut - 10, cut - 12),
      line('SPLIT', 'B', cut - 4),
      // The sheet can repeat a facility for one package; it still counts once and is listed once.
      line('SPLIT', 'B', cut - 2, cut - 3),
      // Every due facility done; the facility not yet due does not hold the package back.
      line('DUE-DONE', 'A', cut - 8, cut - 6),
      line('DUE-DONE', 'B', cut + 30),
      // Nothing due; done early only when every facility is done.
      line('EARLY', 'A', cut + 10, cut - 1),
      line('EARLY', 'B', cut + 20, cut - 3),
      line('HALF', 'A', cut + 10, cut - 1),
      line('HALF', 'B', cut + 20),
    ),
    cut,
  ).find((p) => p.phase === 'tr')!;

  it('counts each package once', () => {
    expect(tr).toMatchObject({ plan: 2, actual: 2, late: 1, total: 4 });
  });

  it('judges a package by the facilities that are due', () => {
    const byCode = Object.fromEntries(tr.packages.map((p) => [p.code, p]));
    expect(byCode.SPLIT).toMatchObject({ state: 'late', plan: cut - 4, delayDays: 4, facilities: ['A', 'B'] });
    expect(byCode['DUE-DONE']).toMatchObject({ state: 'done', actual: cut - 6, delayDays: 2 });
    expect(byCode.EARLY).toMatchObject({ state: 'ahead', actual: cut - 1, delayDays: -11 });
    expect(byCode.HALF).toMatchObject({ state: 'pending', plan: cut + 10 });
    expect(byCode.SPLIT.lines.map((l) => [l.metrics.line.facility, l.actual])).toEqual([
      ['A', cut - 12],
      ['B', undefined],
      ['B', cut - 3],
    ]);
  });
});

describe('progressTone', () => {
  it('maps the Actual / Plan ratio to a status tone', () => {
    expect(progressTone(undefined)).toBe('none');
    expect(progressTone(1.2)).toBe('good');
    expect(progressTone(0.95)).toBe('good');
    expect(progressTone(0.8)).toBe('warning');
    expect(progressTone(0.79)).toBe('critical');
  });
});
