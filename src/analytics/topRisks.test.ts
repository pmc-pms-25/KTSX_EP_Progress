import { computeAllMetrics } from './lineMetrics';
import { RISK_BUFFER_THRESHOLD, topRisks } from './topRisks';
import { makeLine, sampleMetrics, TEST_CTX } from '../test/planFixture';

const cut = TEST_CTX.cutOff;

function metricsOf(...lines: ReturnType<typeof makeLine>[]) {
  return computeAllMetrics(lines, TEST_CTX);
}

describe('topRisks', () => {
  it('keeps only open lines whose forecast Buffer is below the threshold, lowest first', () => {
    const rows = topRisks(
      metricsOf(
        makeLine({ packageCode: 'A', forecastBufferDays: 3 }),
        makeLine({ packageCode: 'B', forecastBufferDays: -40 }),
        makeLine({ packageCode: 'C', forecastBufferDays: RISK_BUFFER_THRESHOLD }),
        makeLine({ packageCode: 'D', forecastBufferDays: 0 }),
        makeLine({ packageCode: 'E' }),
        makeLine({ packageCode: 'F', forecastBufferDays: -90, milestones: { received: { plan: cut - 5, actual: cut - 1 } } }),
      ),
    );
    expect(rows.map((r) => [r.metrics.line.packageCode, r.buffer])).toEqual([
      ['B', -40],
      ['D', 0],
      ['A', 3],
    ]);
  });

  it('breaks ties by the earlier ROS, then by package code', () => {
    const rows = topRisks(
      metricsOf(
        makeLine({ packageCode: 'LATE-ROS', forecastBufferDays: -5, ros: cut + 90 }),
        makeLine({ packageCode: 'NO-ROS', forecastBufferDays: -5 }),
        makeLine({ packageCode: 'B-EARLY', forecastBufferDays: -5, ros: cut + 10 }),
        makeLine({ packageCode: 'A-EARLY', forecastBufferDays: -5, ros: cut + 10 }),
      ),
    );
    expect(rows.map((r) => r.metrics.line.packageCode)).toEqual(['A-EARLY', 'B-EARLY', 'LATE-ROS', 'NO-ROS']);
  });

  it('returns at most the requested number of lines', () => {
    const lines = Array.from({ length: 14 }, (_, i) => makeLine({ forecastBufferDays: -i }));
    const rows = topRisks(metricsOf(...lines));
    expect(rows).toHaveLength(10);
    expect(rows[0].buffer).toBe(-13);
    expect(topRisks(metricsOf(...lines), 3)).toHaveLength(3);
  });

  it('finds the late line in the sample plan and skips the delivered one', () => {
    expect(topRisks(sampleMetrics()).map((r) => [r.metrics.line.packageCode, r.metrics.line.facility, r.buffer])).toEqual([
      ['MEC-001', 'PS2R', -19],
    ]);
  });
});
