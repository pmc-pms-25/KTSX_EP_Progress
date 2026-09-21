import { computeAllMetrics, type LineMetrics } from '../../analytics/lineMetrics';
import type { Plan } from '../../data/types';
import type { Day } from '../../lib/day';

let last: { plan: Plan; cutOff: Day; dueSoonDays: number; metrics: LineMetrics[] } | undefined;

/**
 * Metrics for the current plan and cut-off. Many components ask at once (header, filter bar,
 * page, drawer); a one-entry cache computes once and hands everyone the same array.
 */
export function procurementMetrics(plan: Plan, cutOff: Day, dueSoonDays: number): LineMetrics[] {
  if (last && last.plan === plan && last.cutOff === cutOff && last.dueSoonDays === dueSoonDays) return last.metrics;
  const metrics = computeAllMetrics(plan.lines, { cutOff, dueSoonDays });
  last = { plan, cutOff, dueSoonDays, metrics };
  return metrics;
}
