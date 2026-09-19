import { MILESTONES, MILESTONE_BY_KEY } from '../../../data/milestones';
import type { MilestoneKey } from '../../../data/types';
import { msg } from '../../../i18n/message';
import { formatMonth, monthKey } from '../../../lib/day';
import { effectiveDay } from '../../lineMetrics';
import { completeness, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

/** A month is a peak when it holds at least this multiple of the average active month. */
export const PEAK_RATIO = 2;

export const workloadPeakRule: InsightRule = {
  id: 'workload-peak',
  evaluate({ metrics, ctx }) {
    const hits: { month: string; key: MilestoneKey; lineId: string }[] = [];
    for (const m of metrics) {
      for (const def of MILESTONES) {
        const day = effectiveDay(m.line.milestones[def.key]);
        if (day !== undefined && day >= ctx.cutOff && m.line.milestones[def.key]?.actual === undefined) {
          hits.push({ month: monthKey(day), key: def.key, lineId: m.line.id });
        }
      }
    }
    if (hits.length === 0) return undefined;
    const perMonth = new Map<string, number>();
    for (const h of hits) perMonth.set(h.month, (perMonth.get(h.month) ?? 0) + 1);
    const avg = hits.length / perMonth.size;
    const [peakMonth, peakCount] = [...perMonth].reduce((a, b) => (b[1] > a[1] ? b : a));
    const ratio = peakCount / avg;
    if (ratio < PEAK_RATIO) return undefined;
    const inPeak = hits.filter((h) => h.month === peakMonth);
    const topMilestone = mostCommon(inPeak, (h) => h.key)!;
    return {
      id: 'workload-peak',
      severity: ratio >= 3 ? 'warning' : 'info',
      title: msg('insight.workloadPeak.title', { month: formatMonth(peakMonth), count: peakCount }),
      detail: msg('insight.workloadPeak.detail', {
        ratio: ratio.toFixed(1),
        avg: avg.toFixed(1),
        milestone: MILESTONE_BY_KEY[topMilestone.key as MilestoneKey].label,
        count: topMilestone.count,
      }),
      confidence: completeness(metrics, (m) => Object.keys(m.line.milestones).length > 0),
      evidence: [...new Set(inPeak.map((h) => h.lineId))],
    };
  },
};
