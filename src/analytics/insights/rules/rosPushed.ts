import { msg } from '../../../i18n/message';
import { completeness, lineLabel } from '../helpers';
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
      title: msg('insight.rosPushed.title', { count: pushed.length }),
      detail: msg('insight.rosPushed.detail', {
        count: maxCount,
        line: lineLabel(worst),
        days: worst.rosPushDays,
        times: worst.rosPushCount,
      }),
      confidence: completeness(metrics, (m) => m.line.rosHistory.length > 1),
      evidence: pushed.map((m) => m.line.id),
    };
  },
};
