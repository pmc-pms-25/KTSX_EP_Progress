import { MILESTONES, MILESTONE_BY_KEY } from '../data/milestones';
import type { Line, LinePhase, MilestoneDates, MilestoneKey } from '../data/types';
import type { Day } from '../lib/day';

export interface MetricsContext {
  cutOff: Day;
  dueSoonDays: number;
}

export type MilestoneStatus = 'done' | 'overdue' | 'dueSoon' | 'future' | 'noDate';

export interface NextMilestone {
  key: MilestoneKey;
  day?: Day;
  status: MilestoneStatus;
}

export interface LineMetrics {
  line: Line;
  status: Partial<Record<MilestoneKey, MilestoneStatus>>;
  /** Largest forecast − plan in days (positive = late). */
  maxSlip?: number;
  /** Smallest forecast − plan in days (negative = ahead). */
  minSlip?: number;
  isSlipped: boolean;
  isAhead: boolean;
  /** ROS − effective "Received at Worksite" date, in days. */
  rosFloat?: number;
  rosAtRisk: boolean;
  /** Phase by recorded progress: phase of the first dated milestone without an actual. */
  currentPhase: LinePhase;
  /** Phase by schedule: phase of the first open milestone whose target is on/after the cut-off. */
  scheduledPhase: LinePhase;
  next?: NextMilestone;
  overdueCount: number;
  dueSoonCount: number;
  /** Number of times the ROS moved later across the ED history. */
  rosPushCount: number;
  /** Total days the ROS moved from the first to the last ED entry. */
  rosPushDays: number;
}

export function effectiveDay(m: MilestoneDates | undefined): Day | undefined {
  return m?.actual ?? m?.forecast ?? m?.plan;
}

/** The date we are working towards: forecast, else plan. */
export function targetDay(m: MilestoneDates | undefined): Day | undefined {
  return m?.forecast ?? m?.plan;
}

export function milestoneStatus(m: MilestoneDates | undefined, ctx: MetricsContext): MilestoneStatus {
  if (m?.actual !== undefined) return 'done';
  const target = targetDay(m);
  if (target === undefined) return 'noDate';
  if (target < ctx.cutOff) return 'overdue';
  if (target <= ctx.cutOff + ctx.dueSoonDays) return 'dueSoon';
  return 'future';
}

export function milestoneSlip(m: MilestoneDates | undefined): number | undefined {
  if (m?.forecast === undefined || m.plan === undefined) return undefined;
  return m.forecast - m.plan;
}

function rosPush(line: Line): { count: number; days: number } {
  const days = line.rosHistory.map((p) => p.day);
  let count = 0;
  for (let i = 1; i < days.length; i += 1) if (days[i] > days[i - 1]) count += 1;
  return { count, days: days.length > 1 ? days[days.length - 1] - days[0] : 0 };
}

export function computeLineMetrics(line: Line, ctx: MetricsContext): LineMetrics {
  const status: LineMetrics['status'] = {};
  let maxSlip: number | undefined;
  let minSlip: number | undefined;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let next: NextMilestone | undefined;
  let scheduled: MilestoneKey | undefined;
  let hasDated = false;

  for (const def of MILESTONES) {
    const m = line.milestones[def.key];
    if (!m) continue;
    hasDated = true;
    const s = milestoneStatus(m, ctx);
    status[def.key] = s;
    if (s === 'overdue') overdueCount += 1;
    if (s === 'dueSoon') dueSoonCount += 1;
    const slip = milestoneSlip(m);
    if (slip !== undefined) {
      maxSlip = maxSlip === undefined ? slip : Math.max(maxSlip, slip);
      minSlip = minSlip === undefined ? slip : Math.min(minSlip, slip);
    }
    if (!next && s !== 'done') next = { key: def.key, day: targetDay(m), status: s };
    if (!scheduled && (s === 'dueSoon' || s === 'future')) scheduled = def.key;
  }

  const received = effectiveDay(line.milestones.received);
  const rosFloat = line.ros !== undefined && received !== undefined ? line.ros - received : undefined;
  const push = rosPush(line);
  let currentPhase: LinePhase = 'tr';
  if (next) currentPhase = MILESTONE_BY_KEY[next.key].phase;
  else if (hasDated) currentPhase = 'delivered';
  let scheduledPhase: LinePhase = 'tr';
  if (scheduled) scheduledPhase = MILESTONE_BY_KEY[scheduled].phase;
  else if (hasDated) scheduledPhase = 'delivered';

  return {
    line,
    status,
    maxSlip,
    minSlip,
    isSlipped: (maxSlip ?? 0) > 0,
    isAhead: (minSlip ?? 0) < 0,
    rosFloat,
    rosAtRisk: rosFloat !== undefined && rosFloat < 0,
    currentPhase,
    scheduledPhase,
    next,
    overdueCount,
    dueSoonCount,
    rosPushCount: push.count,
    rosPushDays: push.days,
  };
}

export function computeAllMetrics(lines: readonly Line[], ctx: MetricsContext): LineMetrics[] {
  return lines.map((line) => computeLineMetrics(line, ctx));
}
