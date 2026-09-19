import { msg } from '../../../i18n/message';
import { completeness, lineLabel, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

export const rosRiskRule: InsightRule = {
  id: 'ros-risk',
  evaluate({ metrics }) {
    const risky = metrics.filter((m) => m.rosAtRisk);
    if (risky.length === 0) return undefined;
    const worst = risky.reduce((a, b) => ((b.rosFloat ?? 0) < (a.rosFloat ?? 0) ? b : a));
    const top = mostCommon(risky, (m) => m.line.discipline)!;
    return {
      id: 'ros-risk',
      severity: 'critical',
      title: msg('insight.rosRisk.title', { count: risky.length }),
      detail: msg('insight.rosRisk.detail', {
        discipline: top.key,
        count: top.count,
        line: lineLabel(worst),
        days: -(worst.rosFloat ?? 0),
      }),
      confidence: completeness(metrics, (m) => m.rosFloat !== undefined),
      evidence: risky.map((m) => m.line.id),
      filter: { flags: ['rosRisk'] },
    };
  },
};
