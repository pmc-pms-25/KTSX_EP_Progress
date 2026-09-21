import { GATED_STAGES } from '../../data/engineering/stages';
import type { GatedStage } from '../../data/engineering/types';
import type { DocMetrics, StageCheck, StageState } from './docMetrics';

export interface StageDoc {
  metrics: DocMetrics;
  check: StageCheck;
}

export interface StageProgress {
  stage: GatedStage;
  /** Documents at or beyond this stage. */
  reached: number;
  total: number;
  /** Documents whose planned date for this stage is on/before the cut-off; 0 hides Plan vs Actual. */
  planDue: number;
  /** Of those, how many reached the stage. */
  doneDue: number;
  late: number;
  /** doneDue / planDue; undefined when nothing is due. */
  ratio?: number;
  /** Late (most days late first), then done, then pending. */
  docs: StageDoc[];
}

const ORDER: Record<StageState, number> = { late: 0, done: 1, pending: 2 };

function compare(a: StageDoc, b: StageDoc): number {
  return (
    ORDER[a.check.state] - ORDER[b.check.state] ||
    (a.check.state === 'late' ? b.check.delayDays! - a.check.delayDays! : 0) ||
    a.metrics.doc.id.localeCompare(b.metrics.doc.id)
  );
}

/** Progress of each gated stage as of the cut-off the metrics were computed with. */
export function stageProgress(metrics: readonly DocMetrics[]): StageProgress[] {
  return GATED_STAGES.map((stage) => {
    const docs = metrics.map((m) => ({ metrics: m, check: m.checks[stage] })).sort(compare);
    const planDue = docs.filter((d) => d.check.due).length;
    const doneDue = docs.filter((d) => d.check.due && d.check.state === 'done').length;
    return {
      stage,
      reached: docs.filter((d) => d.check.state === 'done').length,
      total: metrics.length,
      planDue,
      doneDue,
      late: docs.filter((d) => d.check.state === 'late').length,
      ratio: planDue > 0 ? doneDue / planDue : undefined,
      docs,
    };
  });
}
