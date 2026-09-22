import type { LineMetrics } from './lineMetrics';

/** Lines whose forecast Buffer is below this many days count as a risk (the sheet plans a 10-day Buffer). */
export const RISK_BUFFER_THRESHOLD = 10;

export interface RiskRow {
  metrics: LineMetrics;
  /** Forecast Buffer in days (negative = arrives after the ROS). */
  buffer: number;
}

/**
 * The riskiest open lines by the sheet's forecast Buffer: below the threshold, not yet received,
 * lowest Buffer first, then earliest ROS.
 */
export function topRisks(metrics: readonly LineMetrics[], limit = 10): RiskRow[] {
  const rows: RiskRow[] = [];
  for (const m of metrics) {
    const buffer = m.line.forecastBufferDays;
    if (buffer === undefined || buffer >= RISK_BUFFER_THRESHOLD) continue;
    if (m.line.milestones.received?.actual !== undefined) continue;
    rows.push({ metrics: m, buffer });
  }
  return rows
    .sort(
      (a, b) =>
        a.buffer - b.buffer ||
        (a.metrics.line.ros ?? Infinity) - (b.metrics.line.ros ?? Infinity) ||
        a.metrics.line.packageCode.localeCompare(b.metrics.line.packageCode),
    )
    .slice(0, limit);
}
