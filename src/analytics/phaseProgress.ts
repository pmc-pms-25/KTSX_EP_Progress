import { LINE_PHASE_LABEL, PHASES, PHASE_GATE } from '../data/milestones';
import type { MilestoneKey, PhaseKey } from '../data/types';
import type { Day } from '../lib/day';
import type { LineMetrics } from './lineMetrics';

/** late: due, not completed · done: due and completed · ahead: completed before it was due · pending: not yet due. */
export type PhaseState = 'late' | 'done' | 'ahead' | 'pending';

/** One Package × Facility line of a package, at the phase's headline milestone. */
export interface PhaseLine {
  metrics: LineMetrics;
  plan: Day;
  /** Actual date, only when on/before the cut-off. */
  actual?: Day;
}

/** One package in a phase; a package spread over several facilities is judged by the facilities that are due. */
export interface PhasePackage {
  code: string;
  name: string;
  hasValidCode: boolean;
  /** Distinct facilities with a plan date for the phase's milestone, in sheet order (a facility can repeat in the sheet). */
  facilities: string[];
  lines: PhaseLine[];
  /** late: earliest plan still open · done: earliest due plan · ahead / pending: earliest plan. */
  plan: Day;
  /** Latest actual of the facilities that decided completion (done / ahead only). */
  actual?: Day;
  state: PhaseState;
  /** late: cut-off − plan; done/ahead: largest actual − plan (negative = early); pending: undefined. */
  delayDays?: number;
}

export interface PhaseProgress {
  phase: PhaseKey;
  label: string;
  /** Milestone that marks the phase complete. */
  gate: MilestoneKey;
  /** Packages with at least one facility planned on/before the cut-off. */
  plan: number;
  /** Packages completed on/before the cut-off (may exceed `plan` when work finishes early). */
  actual: number;
  /** Packages due but not completed. */
  late: number;
  /** Packages with a plan date for the phase's milestone. */
  total: number;
  /** actual / plan; undefined when nothing is due yet. */
  ratio?: number;
  /** Late first (most days late first), then done, ahead and pending. */
  packages: PhasePackage[];
}

export type ProgressTone = 'good' | 'warning' | 'critical' | 'none';

const STATE_ORDER: Record<PhaseState, number> = { late: 0, done: 1, ahead: 2, pending: 3 };

const min = (days: Day[]) => Math.min(...days);
const max = (days: Day[]) => Math.max(...days);

function judge(code: string, lines: PhaseLine[], cutOff: Day): PhasePackage {
  const { line } = lines[0].metrics;
  const base = { code, name: line.packageName, hasValidCode: line.hasValidCode, facilities: [...new Set(lines.map((l) => l.metrics.line.facility))], lines };
  const due = lines.filter((l) => l.plan <= cutOff);
  const decisive = due.length > 0 ? due : lines;
  const open = decisive.filter((l) => l.actual === undefined);
  if (open.length === 0) {
    return {
      ...base,
      plan: min(decisive.map((l) => l.plan)),
      actual: max(decisive.map((l) => l.actual!)),
      state: due.length > 0 ? 'done' : 'ahead',
      delayDays: max(decisive.map((l) => l.actual! - l.plan)),
    };
  }
  if (due.length > 0) {
    const plan = min(open.map((l) => l.plan));
    return { ...base, plan, state: 'late', delayDays: cutOff - plan };
  }
  return { ...base, plan: min(lines.map((l) => l.plan)), state: 'pending' };
}

function compare(a: PhasePackage, b: PhasePackage): number {
  return (
    STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
    (a.state === 'late' ? b.delayDays! - a.delayDays! : a.plan - b.plan) ||
    a.code.localeCompare(b.code)
  );
}

/** Packages planned vs completed at each phase's headline milestone, as of the cut-off. */
export function phaseProgress(metrics: readonly LineMetrics[], cutOff: Day): PhaseProgress[] {
  return PHASES.map(({ key }) => {
    const gate = PHASE_GATE[key];
    const byPackage = new Map<string, PhaseLine[]>();
    for (const m of metrics) {
      const dates = m.line.milestones[gate];
      if (dates?.plan === undefined) continue;
      const actual = dates.actual !== undefined && dates.actual <= cutOff ? dates.actual : undefined;
      const list = byPackage.get(m.line.packageCode) ?? [];
      list.push({ metrics: m, plan: dates.plan, actual });
      byPackage.set(m.line.packageCode, list);
    }
    const packages = [...byPackage].map(([code, lines]) => judge(code, lines, cutOff)).sort(compare);
    const plan = packages.filter((p) => p.state === 'late' || p.state === 'done').length;
    const actual = packages.filter((p) => p.state === 'done' || p.state === 'ahead').length;
    return {
      phase: key,
      label: LINE_PHASE_LABEL[key],
      gate,
      plan,
      actual,
      late: packages.filter((p) => p.state === 'late').length,
      total: packages.length,
      ratio: plan > 0 ? actual / plan : undefined,
      packages,
    };
  });
}

export function progressTone(ratio: number | undefined): ProgressTone {
  if (ratio === undefined) return 'none';
  if (ratio >= 0.95) return 'good';
  if (ratio >= 0.8) return 'warning';
  return 'critical';
}
