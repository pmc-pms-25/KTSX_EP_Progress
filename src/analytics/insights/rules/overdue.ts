import { MILESTONE_BY_KEY } from '../../../data/milestones';
import type { MilestoneKey } from '../../../data/types';
import { fmt, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

export const overdueRule: InsightRule = {
  id: 'overdue',
  evaluate({ metrics }) {
    const lines = metrics.filter((m) => m.overdueCount > 0);
    if (lines.length === 0) return undefined;
    const keys = lines.flatMap((m) => (Object.entries(m.status) as [MilestoneKey, string][]).filter(([, s]) => s === 'overdue').map(([k]) => k));
    const top = mostCommon(keys, (k) => k)!;
    return {
      id: 'overdue',
      severity: 'warning',
      title: `${fmt(keys.length)} mốc đã qua hạn nhưng chưa có Actual`,
      detail: `Trên ${fmt(lines.length)} dòng; nhiều nhất là ${MILESTONE_BY_KEY[top.key as MilestoneKey].label} (${fmt(top.count)}). Kiểm tra việc cập nhật dòng ACTUAL trong sheet.`,
      confidence: 1,
      evidence: lines.map((m) => m.line.id),
      filter: { flags: ['overdue'] },
    };
  },
};
