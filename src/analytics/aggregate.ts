import { KEY_MILESTONES, LINE_PHASE_LABEL, LINE_PHASE_ORDER, MILESTONES, MILESTONE_BY_KEY, phaseIndex } from '../data/milestones';
import type { LinePhase, MilestoneKey } from '../data/types';
import { monthKey, monthRange, type Day, type MonthKey } from '../lib/day';
import { effectiveDay, type LineMetrics, type NextMilestone } from './lineMetrics';

export interface Kpis {
  packages: number;
  lines: number;
  slipped: number;
  rosAtRisk: number;
  /** Milestones due within the due-soon window. */
  dueSoon: number;
  /** Milestones past their target date with no actual. */
  overdue: number;
}

export function computeKpis(metrics: readonly LineMetrics[]): Kpis {
  const packages = new Set<string>();
  const k: Kpis = { packages: 0, lines: metrics.length, slipped: 0, rosAtRisk: 0, dueSoon: 0, overdue: 0 };
  for (const m of metrics) {
    if (m.line.hasValidCode) packages.add(m.line.packageCode);
    if (m.isSlipped) k.slipped += 1;
    if (m.rosAtRisk) k.rosAtRisk += 1;
    k.dueSoon += m.dueSoonCount;
    k.overdue += m.overdueCount;
  }
  k.packages = packages.size;
  return k;
}

export interface PhaseCount {
  phase: LinePhase;
  label: string;
  count: number;
}

export type PhaseBasis = 'schedule' | 'actual';

/** Lines per phase: by schedule (where they should be) or by recorded actuals (where they are). */
export function phaseFunnel(metrics: readonly LineMetrics[], basis: PhaseBasis = 'schedule'): PhaseCount[] {
  const counts = new Map<LinePhase, number>(LINE_PHASE_ORDER.map((p) => [p, 0]));
  for (const m of metrics) {
    const phase = basis === 'schedule' ? m.scheduledPhase : m.currentPhase;
    counts.set(phase, (counts.get(phase) ?? 0) + 1);
  }
  return LINE_PHASE_ORDER.map((phase) => ({ phase, label: LINE_PHASE_LABEL[phase], count: counts.get(phase) ?? 0 }));
}

export type RiskLevel = 'ok' | 'watch' | 'risk';

/** Score thresholds for discipline health; tune here. Score range is 0..4.5. */
export const RISK_THRESHOLDS = { watch: 0.25, risk: 0.75 } as const;

export function riskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.risk) return 'risk';
  if (score >= RISK_THRESHOLDS.watch) return 'watch';
  return 'ok';
}

export interface DisciplineHealth {
  name: string;
  packages: number;
  lines: number;
  slipped: number;
  rosAtRisk: number;
  overdueLines: number;
  score: number;
  level: RiskLevel;
}

/** Health per discipline, in the given order. score = (ROS×2 + overdue×1.5 + slipped×1) / lines. */
export function disciplineHealth(metrics: readonly LineMetrics[], order: readonly string[]): DisciplineHealth[] {
  return order.map((name) => {
    const ms = metrics.filter((m) => m.line.discipline === name);
    const packages = new Set(ms.filter((m) => m.line.hasValidCode).map((m) => m.line.packageCode)).size;
    const slipped = ms.filter((m) => m.isSlipped).length;
    const rosAtRisk = ms.filter((m) => m.rosAtRisk).length;
    const overdueLines = ms.filter((m) => m.overdueCount > 0).length;
    const score = ms.length === 0 ? 0 : (rosAtRisk * 2 + overdueLines * 1.5 + slipped) / ms.length;
    return { name, packages, lines: ms.length, slipped, rosAtRisk, overdueLines, score, level: riskLevel(score) };
  });
}

export interface PackageSummary {
  code: string;
  name: string;
  discipline: string;
  hasValidCode: boolean;
  facilities: string[];
  lines: LineMetrics[];
  /** Earliest recorded-progress phase across the package's lines. */
  currentPhase: LinePhase;
  /** Earliest scheduled phase across the package's lines. */
  scheduledPhase: LinePhase;
  /** Soonest open milestone across lines. */
  next?: NextMilestone & { facility: string };
  maxSlip?: number;
  minRosFloat?: number;
  slipped: boolean;
  rosAtRisk: boolean;
  overdueCount: number;
  /** Sort key: higher = riskier. */
  riskRank: number;
}

export function summarizePackages(metrics: readonly LineMetrics[]): PackageSummary[] {
  const groups = new Map<string, LineMetrics[]>();
  for (const m of metrics) {
    const key = `${m.line.discipline}|${m.line.packageCode}`;
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }
  const summaries = [...groups.values()].map((lines): PackageSummary => {
    const first = lines[0].line;
    let currentPhase = lines[0].currentPhase;
    let scheduledPhase = lines[0].scheduledPhase;
    let next: PackageSummary['next'];
    let maxSlip: number | undefined;
    let minRosFloat: number | undefined;
    let overdueCount = 0;
    for (const m of lines) {
      if (phaseIndex(m.currentPhase) < phaseIndex(currentPhase)) currentPhase = m.currentPhase;
      if (phaseIndex(m.scheduledPhase) < phaseIndex(scheduledPhase)) scheduledPhase = m.scheduledPhase;
      if (m.next && (next === undefined || (m.next.day ?? Infinity) < (next.day ?? Infinity))) {
        next = { ...m.next, facility: m.line.facility };
      }
      if (m.maxSlip !== undefined) maxSlip = maxSlip === undefined ? m.maxSlip : Math.max(maxSlip, m.maxSlip);
      if (m.rosFloat !== undefined) minRosFloat = minRosFloat === undefined ? m.rosFloat : Math.min(minRosFloat, m.rosFloat);
      overdueCount += m.overdueCount;
    }
    const slipped = lines.some((m) => m.isSlipped);
    const rosAtRisk = lines.some((m) => m.rosAtRisk);
    return {
      code: first.packageCode,
      name: first.packageName,
      discipline: first.discipline,
      hasValidCode: first.hasValidCode,
      facilities: [...new Set(lines.map((m) => m.line.facility))],
      lines,
      currentPhase,
      scheduledPhase,
      next,
      maxSlip,
      minRosFloat,
      slipped,
      rosAtRisk,
      overdueCount,
      riskRank: (rosAtRisk ? 4 : 0) + (overdueCount > 0 ? 2 : 0) + (slipped ? 1 : 0),
    };
  });
  return summaries.sort(
    (a, b) =>
      b.riskRank - a.riskRank ||
      (a.minRosFloat ?? Infinity) - (b.minRosFloat ?? Infinity) ||
      a.code.localeCompare(b.code),
  );
}

export interface MonthlySeries {
  key: MilestoneKey;
  label: string;
  counts: number[];
}

export interface MonthlyWorkload {
  months: MonthKey[];
  series: MonthlySeries[];
}

function monthsSpanning(days: Day[]): MonthKey[] {
  if (days.length === 0) return [];
  let min = days[0];
  let max = days[0];
  for (const d of days) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return monthRange(monthKey(min), monthKey(max));
}

/** Count of milestones falling in each month (by effective date), one series per milestone. */
export function monthlyWorkload(metrics: readonly LineMetrics[], keys: readonly MilestoneKey[] = KEY_MILESTONES): MonthlyWorkload {
  const perKey = keys.map((key) => ({
    key,
    days: metrics.map((m) => effectiveDay(m.line.milestones[key])).filter((d): d is Day => d !== undefined),
  }));
  const months = monthsSpanning(perKey.flatMap((p) => p.days));
  const index = new Map(months.map((m, i) => [m, i]));
  return {
    months,
    series: perKey.map(({ key, days }) => {
      const counts = months.map(() => 0);
      for (const d of days) counts[index.get(monthKey(d))!] += 1;
      return { key, label: MILESTONE_BY_KEY[key].short, counts };
    }),
  };
}

export interface FacilityHeatmap {
  facilities: string[];
  months: MonthKey[];
  /** [monthIndex, facilityIndex, count] for non-zero cells. */
  cells: [number, number, number][];
  max: number;
}

/** Milestones due per Facility × Month. `milestone = 'all'` counts every milestone. */
export function facilityHeatmap(metrics: readonly LineMetrics[], milestone: MilestoneKey | 'all' = 'all'): FacilityHeatmap {
  const keys = milestone === 'all' ? MILESTONES.map((m) => m.key) : [milestone];
  const entries: { facility: string; day: Day }[] = [];
  for (const m of metrics) {
    for (const key of keys) {
      const day = effectiveDay(m.line.milestones[key]);
      if (day !== undefined) entries.push({ facility: m.line.facility, day });
    }
  }
  const facilities = [...new Set(entries.map((e) => e.facility))].sort((a, b) => a.localeCompare(b));
  const months = monthsSpanning(entries.map((e) => e.day));
  const mIndex = new Map(months.map((k, i) => [k, i]));
  const fIndex = new Map(facilities.map((f, i) => [f, i]));
  const counts = new Map<string, number>();
  for (const e of entries) {
    const id = `${mIndex.get(monthKey(e.day))}|${fIndex.get(e.facility)}`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const cells: [number, number, number][] = [...counts].map(([id, count]) => {
    const [mi, fi] = id.split('|').map(Number);
    return [mi, fi, count];
  });
  return { facilities, months, cells, max: cells.reduce((mx, c) => Math.max(mx, c[2]), 0) };
}
