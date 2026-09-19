import type { LineMetrics } from '../lineMetrics';

/** Share (0..1, 2 decimals) of lines satisfying `has`. */
export function completeness(metrics: readonly LineMetrics[], has: (m: LineMetrics) => boolean): number {
  if (metrics.length === 0) return 0;
  return Math.round((metrics.filter(has).length / metrics.length) * 100) / 100;
}

/** Most frequent key and its count; ties resolve to the first seen. */
export function mostCommon<T>(items: readonly T[], key: (item: T) => string): { key: string; count: number } | undefined {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  let best: { key: string; count: number } | undefined;
  for (const [k, count] of counts) if (!best || count > best.count) best = { key: k, count };
  return best;
}

export function lineLabel(m: LineMetrics): string {
  return `${m.line.packageCode} @ ${m.line.facility}`;
}
