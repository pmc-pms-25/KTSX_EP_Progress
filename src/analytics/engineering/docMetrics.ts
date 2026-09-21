import { GATED_STAGES, STAGE_PLAN_FIELD, stageIndex, stageOf } from '../../data/engineering/stages';
import type { EngDocument, GatedStage, StageKey } from '../../data/engineering/types';
import type { Day } from '../../lib/day';

/** done: stage reached · late: planned date on/before the cut-off, not reached · pending: otherwise. */
export type StageState = 'done' | 'late' | 'pending';

export interface StageCheck {
  stage: GatedStage;
  plan?: Day;
  /** Has a planned date on/before the cut-off. */
  due: boolean;
  /** Incoming transmittal date, when the stage is reached. */
  actual?: Day;
  state: StageState;
  /** late: cut-off − plan; done with both dates: actual − plan. */
  delayDays?: number;
}

export interface DocMetrics {
  doc: EngDocument;
  stage: StageKey;
  checks: Record<GatedStage, StageCheck>;
  /** Late at any stage. */
  overdue: boolean;
}

function check(doc: EngDocument, stage: GatedStage, reached: number, cutOff: Day): StageCheck {
  const plan = doc[STAGE_PLAN_FIELD[stage]];
  const due = plan !== undefined && plan <= cutOff;
  if (reached >= stageIndex(stage)) {
    const actual = doc.transmittal?.date;
    const delayDays = plan !== undefined && actual !== undefined ? actual - plan : undefined;
    return { stage, plan, due, actual, state: 'done', delayDays };
  }
  if (due) return { stage, plan, due, state: 'late', delayDays: cutOff - plan };
  return { stage, plan, due, state: 'pending' };
}

export function docMetrics(doc: EngDocument, cutOff: Day): DocMetrics {
  const stage = stageOf(doc);
  const reached = stageIndex(stage);
  const checks = Object.fromEntries(GATED_STAGES.map((g) => [g, check(doc, g, reached, cutOff)])) as Record<GatedStage, StageCheck>;
  return { doc, stage, checks, overdue: GATED_STAGES.some((g) => checks[g].state === 'late') };
}

export function computeDocMetrics(docs: readonly EngDocument[], cutOff: Day): DocMetrics[] {
  return docs.map((d) => docMetrics(d, cutOff));
}
