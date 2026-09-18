import { parsePlan } from '../data/parser/parsePlan';
import type { Line, Plan } from '../data/types';
import { dayFromISO } from '../lib/day';
import { computeAllMetrics, type LineMetrics, type MetricsContext } from '../analytics/lineMetrics';
import { sampleWorkbook } from './fixtures';

/** Cut-off used across analytics tests: 18-Sep-2026. */
export const TEST_CTX: MetricsContext = { cutOff: dayFromISO('2026-09-18')!, dueSoonDays: 30 };

export function samplePlan(): Plan {
  const result = parsePlan(sampleWorkbook(), { projectName: 'Test Project', now: new Date(2026, 8, 18) });
  if (!result.ok) throw new Error(result.error.message);
  return result.plan;
}

export function sampleMetrics(ctx: MetricsContext = TEST_CTX): LineMetrics[] {
  return computeAllMetrics(samplePlan().lines, ctx);
}

/** Find a line's metrics by package code and facility. */
export function metricsFor(metrics: LineMetrics[], code: string, facility?: string): LineMetrics {
  const found = metrics.find((m) => m.line.packageCode === code && (facility === undefined || m.line.facility === facility));
  if (!found) throw new Error(`no line ${code} ${facility ?? ''}`);
  return found;
}

let syntheticRow = 1000;

/** Build a Line directly (no workbook) for focused analytics tests. */
export function makeLine(patch: Partial<Line> = {}): Line {
  syntheticRow += 1;
  const code = patch.packageCode ?? `SYN-${syntheticRow}`;
  const facility = patch.facility ?? 'BF';
  return {
    id: `${code}|${facility}|${syntheticRow}`,
    discipline: 'MECHANICAL',
    packageCode: code,
    hasValidCode: true,
    packageName: 'Synthetic item',
    facility,
    itemType: 'Tagged',
    milestones: {},
    rosHistory: [],
    sourceRow: syntheticRow,
    ...patch,
  };
}
