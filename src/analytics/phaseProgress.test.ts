import { computeAllMetrics } from './lineMetrics';
import { phaseGate, phaseProgress, progressTone } from './phaseProgress';
import { makeLine, TEST_CTX } from '../test/planFixture';

const cut = TEST_CTX.cutOff;

function metricsOf(...lines: ReturnType<typeof makeLine>[]) {
  return computeAllMetrics(lines, TEST_CTX);
}

describe('phaseGate', () => {
  it('uses the last milestone of the phase that has a plan date', () => {
    const line = makeLine({ milestones: { loa: { plan: cut - 10 }, po: { plan: cut + 5 } } });
    expect(phaseGate(line, 'award')).toBe('po');
    const noPo = makeLine({ milestones: { loa: { plan: cut - 10 }, po: { actual: cut - 1 } } });
    expect(phaseGate(noPo, 'award')).toBe('loa');
    expect(phaseGate(noPo, 'logistics')).toBeUndefined();
  });
});

describe('phaseProgress', () => {
  const late = makeLine({ packageCode: 'LATE', milestones: { po: { plan: cut - 20 } } });
  const lateLess = makeLine({ packageCode: 'LATE2', milestones: { po: { plan: cut - 3 } } });
  const done = makeLine({ packageCode: 'DONE', milestones: { po: { plan: cut - 30, actual: cut - 25 } } });
  const ahead = makeLine({ packageCode: 'AHEAD', milestones: { po: { plan: cut + 40, actual: cut - 2 } } });
  const pending = makeLine({ packageCode: 'PEND', milestones: { po: { plan: cut + 60 } } });
  const futureActual = makeLine({ packageCode: 'FUT', milestones: { po: { plan: cut - 5, actual: cut + 3 } } });
  const progress = phaseProgress(metricsOf(late, lateLess, done, ahead, pending, futureActual), cut);
  const award = progress.find((p) => p.phase === 'award')!;

  it('returns every phase in process order', () => {
    expect(progress.map((p) => p.phase)).toEqual(['tr', 'rfq', 'evaluation', 'award', 'manufacturing', 'logistics']);
  });

  it('counts Plan as due by cut-off and Actual as completed by cut-off', () => {
    // Due: LATE, LATE2, DONE, FUT. Completed by cut-off: DONE, AHEAD (FUT's actual is after cut-off).
    expect(award).toMatchObject({ plan: 4, actual: 2, total: 6, late: 3 });
    expect(award.ratio).toBeCloseTo(0.5);
  });

  it('classifies each line and sorts the latest first', () => {
    expect(award.lines.map((l) => [l.metrics.line.packageCode, l.state])).toEqual([
      ['LATE', 'late'],
      ['FUT', 'late'],
      ['LATE2', 'late'],
      ['DONE', 'done'],
      ['AHEAD', 'ahead'],
      ['PEND', 'pending'],
    ]);
    expect(award.lines[0]).toMatchObject({ gate: 'po', plan: cut - 20, delayDays: 20 });
    expect(award.lines.find((l) => l.state === 'done')).toMatchObject({ actual: cut - 25, delayDays: 5 });
    expect(award.lines.find((l) => l.state === 'ahead')?.delayDays).toBe(-42);
  });

  it('leaves the ratio undefined when nothing is due', () => {
    const tr = progress.find((p) => p.phase === 'tr')!;
    expect(tr).toMatchObject({ plan: 0, actual: 0, total: 0, lines: [] });
    expect(tr.ratio).toBeUndefined();
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
