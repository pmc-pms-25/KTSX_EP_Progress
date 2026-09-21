import { GATED_STAGES, STAGE_KEYS } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import type { Day } from '../../lib/day';
import type { DocMetrics } from './docMetrics';

export interface EngKpis {
  total: number;
  issued: number;
  final: number;
  code1: number;
  code2: number;
  rejected: number;
  notIssued: number;
  overdue: number;
  /** Any document has a planned date: the Overdue tile only makes sense then. */
  hasPlanDates: boolean;
}

export function engKpis(metrics: readonly DocMetrics[]): EngKpis {
  const count = (test: (m: DocMetrics) => boolean) => metrics.filter(test).length;
  return {
    total: metrics.length,
    issued: count((m) => m.stage !== 'notIssued'),
    final: count((m) => m.stage === 'final'),
    code1: count((m) => m.doc.code === 1),
    code2: count((m) => m.doc.code === 2),
    rejected: count((m) => m.doc.code === 3 || m.doc.code === 4),
    notIssued: count((m) => m.stage === 'notIssued'),
    overdue: count((m) => m.overdue),
    hasPlanDates: metrics.some((m) => GATED_STAGES.some((g) => m.checks[g].plan !== undefined)),
  };
}

export type EngRisk = 'ok' | 'warning' | 'critical';

export interface DisciplineStatus {
  discipline: string;
  total: number;
  byStage: Record<StageKey, number>;
  finalRatio: number;
  notIssued: number;
  overdue: number;
  risk: EngRisk;
}

const RISK_RANK: Record<EngRisk, number> = { critical: 0, warning: 1, ok: 2 };

/** critical: something overdue · warning: more than 30% never issued · ok otherwise. Riskiest first, then by code. */
export function disciplineStatus(metrics: readonly DocMetrics[]): DisciplineStatus[] {
  const groups = new Map<string, DocMetrics[]>();
  for (const m of metrics) groups.set(m.doc.discipline, [...(groups.get(m.doc.discipline) ?? []), m]);
  return [...groups]
    .map(([discipline, list]) => {
      const byStage = Object.fromEntries(STAGE_KEYS.map((s) => [s, list.filter((m) => m.stage === s).length])) as Record<StageKey, number>;
      const overdue = list.filter((m) => m.overdue).length;
      const notIssued = byStage.notIssued;
      const risk: EngRisk = overdue > 0 ? 'critical' : notIssued / list.length > 0.3 ? 'warning' : 'ok';
      return { discipline, total: list.length, byStage, finalRatio: byStage.final / list.length, notIssued, overdue, risk };
    })
    .sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || a.discipline.localeCompare(b.discipline));
}

export interface TransmittalWeek {
  /** Monday of the ISO week. */
  start: Day;
  count: number;
}

/** Day 0 (1970-01-01) was a Thursday. */
const weekStart = (day: Day) => day - ((day + 3) % 7);

/** Documents received per week (incoming transmittal date), with empty weeks filled in. */
export function transmittalActivity(metrics: readonly DocMetrics[]): TransmittalWeek[] {
  const counts = new Map<Day, number>();
  for (const m of metrics) {
    const date = m.doc.transmittal?.date;
    if (date === undefined) continue;
    const start = weekStart(date);
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const starts = [...counts.keys()];
  const weeks: TransmittalWeek[] = [];
  for (let start = Math.min(...starts); start <= Math.max(...starts); start += 7) weeks.push({ start, count: counts.get(start) ?? 0 });
  return weeks;
}
