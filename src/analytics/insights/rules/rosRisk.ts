import { completeness, fmt, lineLabel, mostCommon } from '../helpers';
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
      title: `${fmt(risky.length)} dòng có nguy cơ trễ ROS`,
      detail: `Tập trung nhiều nhất ở ${top.key} (${fmt(top.count)} dòng). Nặng nhất: ${lineLabel(worst)}, hàng về công trường trễ ${fmt(-(worst.rosFloat ?? 0))} ngày so với ROS.`,
      confidence: completeness(metrics, (m) => m.rosFloat !== undefined),
      evidence: risky.map((m) => m.line.id),
      filter: { flags: ['rosRisk'] },
    };
  },
};
