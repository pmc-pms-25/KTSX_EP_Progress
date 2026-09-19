import { LINE_PHASE_LABEL, MILESTONES, PHASES } from '../data/milestones';
import type { Line, MilestoneKey, PhaseKey } from '../data/types';
import type { Day } from '../lib/day';
import type { LineMetrics } from './lineMetrics';

/** late: due, no Actual · done: due and completed · ahead: completed before it was due · pending: not yet due. */
export type PhaseLineState = 'late' | 'done' | 'ahead' | 'pending';

export interface PhaseLine {
  metrics: LineMetrics;
  /** Milestone that marks the phase complete for this line. */
  gate: MilestoneKey;
  plan: Day;
  /** Actual date, only when on/before the cut-off. */
  actual?: Day;
  state: PhaseLineState;
  /** late: cut-off − plan; done/ahead: actual − plan (negative = early); pending: undefined. */
  delayDays?: number;
}

export interface PhaseProgress {
  phase: PhaseKey;
  label: string;
  /** Lines whose gate plan date is on/before the cut-off. */
  plan: number;
  /** Lines whose gate has an Actual on/before the cut-off (may exceed `plan` when work finishes early). */
  actual: number;
  /** Lines due but not completed. */
  late: number;
  /** Lines with a planned gate for this phase. */
  total: number;
  /** actual / plan; undefined when nothing is due yet. */
  ratio?: number;
  /** Late first (most days late first), then done, ahead and pending. */
  lines: PhaseLine[];
}

export type ProgressTone = 'good' | 'warning' | 'critical' | 'none';

const STATE_ORDER: Record<PhaseLineState, number> = { late: 0, done: 1, ahead: 2, pending: 3 };

/** The last milestone of `phase` that the line has a plan date for. */
export function phaseGate(line: Line, phase: PhaseKey): MilestoneKey | undefined {
  let gate: MilestoneKey | undefined;
  for (const def of MILESTONES) {
    if (def.phase === phase && line.milestones[def.key]?.plan !== undefined) gate = def.key;
  }
  return gate;
}

function classify(metrics: LineMetrics, phase: PhaseKey, cutOff: Day): PhaseLine | undefined {
  const gate = phaseGate(metrics.line, phase);
  if (!gate) return undefined;
  const dates = metrics.line.milestones[gate]!;
  const plan = dates.plan!;
  const actual = dates.actual !== undefined && dates.actual <= cutOff ? dates.actual : undefined;
  const due = plan <= cutOff;
  if (actual !== undefined) return { metrics, gate, plan, actual, state: due ? 'done' : 'ahead', delayDays: actual - plan };
  if (due) return { metrics, gate, plan, state: 'late', delayDays: cutOff - plan };
  return { metrics, gate, plan, state: 'pending' };
}

function compare(a: PhaseLine, b: PhaseLine): number {
  return (
    STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
    (a.state === 'late' ? b.delayDays! - a.delayDays! : a.plan - b.plan) ||
    a.metrics.line.packageCode.localeCompare(b.metrics.line.packageCode)
  );
}

/** Plan vs Actual completion of each phase as of the cut-off. */
export function phaseProgress(metrics: readonly LineMetrics[], cutOff: Day): PhaseProgress[] {
  return PHASES.map(({ key }) => {
    const lines = metrics.flatMap((m) => classify(m, key, cutOff) ?? []).sort(compare);
    const plan = lines.filter((l) => l.state !== 'pending' && l.state !== 'ahead').length;
    const actual = lines.filter((l) => l.actual !== undefined).length;
    return {
      phase: key,
      label: LINE_PHASE_LABEL[key],
      plan,
      actual,
      late: lines.filter((l) => l.state === 'late').length,
      total: lines.length,
      ratio: plan > 0 ? actual / plan : undefined,
      lines,
    };
  });
}

export function progressTone(ratio: number | undefined): ProgressTone {
  if (ratio === undefined) return 'none';
  if (ratio >= 0.95) return 'good';
  if (ratio >= 0.8) return 'warning';
  return 'critical';
}
