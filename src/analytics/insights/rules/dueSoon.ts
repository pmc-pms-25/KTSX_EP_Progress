import { MILESTONE_BY_KEY } from '../../../data/milestones';
import type { MilestoneKey } from '../../../data/types';
import { fmt } from '../helpers';
import type { InsightRule } from '../types';

export const dueSoonRule: InsightRule = {
  id: 'due-soon',
  evaluate({ metrics, ctx }) {
    const counts = new Map<MilestoneKey, number>();
    const lines = metrics.filter((m) => m.dueSoonCount > 0);
    if (lines.length === 0) return undefined;
    for (const m of lines) {
      for (const [key, s] of Object.entries(m.status) as [MilestoneKey, string][]) {
        if (s === 'dueSoon') counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const top = [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, n]) => `${MILESTONE_BY_KEY[key].short} (${fmt(n)})`)
      .join(', ');
    return {
      id: 'due-soon',
      severity: 'info',
      title: `${fmt(total)} mốc đến hạn trong ${ctx.dueSoonDays} ngày tới`,
      detail: `Trên ${fmt(lines.length)} dòng. Nhiều nhất: ${top}.`,
      confidence: 1,
      evidence: lines.map((m) => m.line.id),
      filter: { flags: ['dueSoon'] },
    };
  },
};
