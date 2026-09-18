import { MILESTONES } from '../milestones';
import type { MilestoneKey } from '../types';

export interface MilestoneColumns {
  date: number;
  duration?: number;
}

export interface ColumnMap {
  packageCode: number;
  packageName?: number;
  facility: number;
  itemType?: number;
  rowType: number;
  ros?: number;
  remark?: number;
  deliveryWeeks?: number;
  transportDays?: number;
  buffer?: number;
  milestones: Partial<Record<MilestoneKey, MilestoneColumns>>;
  rosHistory: { label: string; col: number }[];
}

export type HeaderResult =
  | { ok: true; map: ColumnMap; unknownHeaders: string[] }
  | { ok: false; missing: string[] };

/** Trim, collapse whitespace, lowercase. */
export function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

const FIELD_HEADERS = {
  packageCode: 'package code',
  packageName: 'package name',
  facility: 'facility',
  itemType: 'tagged/ bulk',
  rowType: 'date',
  ros: 'ros',
  remark: 'remark',
  deliveryWeeks: 'delivery (weeks)',
  transportDays: 'transportation (days)',
  buffer: 'buffer',
} as const;

const REQUIRED_FIELDS = ['packageCode', 'facility', 'rowType'] as const;

/** Columns present in the sheet that v1 deliberately does not use. */
const IGNORED_HEADERS = new Set(['%', '% mto', "equivalent q'ty", "actual shipped q'ty", "actual received & inspected q'ty"]);

const DURATION_HEADER = 'duration (days)';
const MILESTONE_BY_HEADER = new Map(MILESTONES.map((m) => [normalizeHeader(m.header), m.key]));

function isRosHistoryHeader(h: string): boolean {
  return h.startsWith('old ed') || h.startsWith('ed ');
}

/** Map the header row to column indices by name, not by position. */
export function mapHeaders(headerRow: readonly unknown[]): HeaderResult {
  const fields: Partial<Record<keyof typeof FIELD_HEADERS, number>> = {};
  const milestones: ColumnMap['milestones'] = {};
  const rosHistory: ColumnMap['rosHistory'] = [];
  const unknownHeaders: string[] = [];
  let previousMilestone: MilestoneKey | undefined;

  headerRow.forEach((raw, col) => {
    const h = normalizeHeader(raw);
    if (!h) return;

    if (h === DURATION_HEADER) {
      const target = previousMilestone ? milestones[previousMilestone] : undefined;
      if (target && target.duration === undefined) target.duration = col;
      previousMilestone = undefined;
      return;
    }
    previousMilestone = undefined;

    const milestoneKey = MILESTONE_BY_HEADER.get(h);
    if (milestoneKey) {
      if (!milestones[milestoneKey]) milestones[milestoneKey] = { date: col };
      previousMilestone = milestoneKey;
      return;
    }

    const field = (Object.keys(FIELD_HEADERS) as (keyof typeof FIELD_HEADERS)[]).find((k) => FIELD_HEADERS[k] === h);
    if (field) {
      if (fields[field] === undefined) fields[field] = col;
      return;
    }

    if (isRosHistoryHeader(h)) {
      rosHistory.push({ label: String(raw).trim(), col });
      return;
    }

    if (!IGNORED_HEADERS.has(h)) unknownHeaders.push(String(raw).trim());
  });

  const missing: string[] = REQUIRED_FIELDS.filter((f) => fields[f] === undefined).map((f) => FIELD_HEADERS[f]);
  if (Object.keys(milestones).length === 0) missing.push('(at least one milestone column)');
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    unknownHeaders,
    map: {
      packageCode: fields.packageCode!,
      packageName: fields.packageName,
      facility: fields.facility!,
      itemType: fields.itemType,
      rowType: fields.rowType!,
      ros: fields.ros,
      remark: fields.remark,
      deliveryWeeks: fields.deliveryWeeks,
      transportDays: fields.transportDays,
      buffer: fields.buffer,
      milestones,
      rosHistory,
    },
  };
}
