import { completeness, fmt, lineLabel } from '../helpers';
import type { InsightRule } from '../types';

export const rosPushedRule: InsightRule = {
  id: 'ros-pushed',
  evaluate({ metrics }) {
    const pushed = metrics.filter((m) => m.rosPushCount > 0);
    if (pushed.length === 0) return undefined;
    const worst = pushed.reduce((a, b) => (b.rosPushDays > a.rosPushDays ? b : a));
    const maxCount = Math.max(...pushed.map((m) => m.rosPushCount));
    return {
      id: 'ros-pushed',
      severity: 'info',
      title: `ROS đã bị dời trên ${fmt(pushed.length)} dòng`,
      detail: `Nhiều nhất ${fmt(maxCount)} lần điều chỉnh. Dời xa nhất: ${lineLabel(worst)}, tổng ${fmt(worst.rosPushDays)} ngày qua ${fmt(worst.rosPushCount)} lần.`,
      confidence: completeness(metrics, (m) => m.line.rosHistory.length > 1),
      evidence: pushed.map((m) => m.line.id),
    };
  },
};
