import { dueSoonRule } from './rules/dueSoon';
import { overdueRule } from './rules/overdue';
import { rosPushedRule } from './rules/rosPushed';
import { rosRiskRule } from './rules/rosRisk';
import { slippageRule } from './rules/slippage';
import { workloadPeakRule } from './rules/workloadPeak';
import type { Insight, InsightContext, InsightRule, Severity } from './types';

/** Add a rule: create a file in ./rules and list it here. */
export const INSIGHT_RULES: readonly InsightRule[] = [
  rosRiskRule,
  slippageRule,
  overdueRule,
  workloadPeakRule,
  dueSoonRule,
  rosPushedRule,
];

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** Run rules, drop empty results, order by severity then confidence. A failing rule never breaks the others. */
export function generateInsights(ic: InsightContext, rules: readonly InsightRule[] = INSIGHT_RULES, limit = 5): Insight[] {
  const insights: Insight[] = [];
  for (const rule of rules) {
    try {
      const insight = rule.evaluate(ic);
      if (insight) insights.push(insight);
    } catch (error) {
      console.error(`Insight rule "${rule.id}" failed`, error);
    }
  }
  return insights
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.confidence - a.confidence)
    .slice(0, limit);
}
