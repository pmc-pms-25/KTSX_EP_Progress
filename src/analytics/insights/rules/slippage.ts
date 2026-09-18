import { completeness, fmt, lineLabel, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

export const slippageRule: InsightRule = {
  id: 'slippage',
  evaluate({ metrics }) {
    const slipped = metrics.filter((m) => m.isSlipped);
    if (slipped.length === 0) return undefined;
    const top = mostCommon(slipped, (m) => m.line.discipline)!;
    const worst = slipped.reduce((a, b) => ((b.maxSlip ?? 0) > (a.maxSlip ?? 0) ? b : a));
    const avg = Math.round(slipped.reduce((sum, m) => sum + (m.maxSlip ?? 0), 0) / slipped.length);
    return {
      id: 'slippage',
      severity: 'warning',
      title: `${fmt(slipped.length)} dòng có Forecast trễ hơn Plan`,
      detail: `${top.key} chiếm ${fmt(top.count)} dòng. Trượt trung bình ${fmt(avg)} ngày, lớn nhất ${fmt(worst.maxSlip ?? 0)} ngày (${lineLabel(worst)}).`,
      confidence: completeness(metrics, (m) => m.maxSlip !== undefined),
      evidence: slipped.map((m) => m.line.id),
      filter: { flags: ['slipped'] },
    };
  },
};
