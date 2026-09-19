import { msg } from '../../../i18n/message';
import { completeness, lineLabel, mostCommon } from '../helpers';
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
      title: msg('insight.slippage.title', { count: slipped.length }),
      detail: msg('insight.slippage.detail', {
        discipline: top.key,
        count: top.count,
        avg,
        max: worst.maxSlip ?? 0,
        line: lineLabel(worst),
      }),
      confidence: completeness(metrics, (m) => m.maxSlip !== undefined),
      evidence: slipped.map((m) => m.line.id),
      filter: { flags: ['slipped'] },
    };
  },
};
