import type { Day } from '../lib/day';

export type MilestoneKey =
  | 'trApproval'
  | 'rfqSubmission'
  | 'rfqApproval'
  | 'rfqIssue'
  | 'bidsDue'
  | 'tbeSubmission'
  | 'tbeApproval'
  | 'mtoPurchase'
  | 'commercialImpact'
  | 'cbeSubmission'
  | 'cbeApproval'
  | 'loa'
  | 'po'
  | 'criticalVd'
  | 'rawMaterialPo'
  | 'spirSubmitted'
  | 'spirApproved'
  | 'mfg50'
  | 'fat'
  | 'shipped'
  | 'received';

export type PhaseKey = 'tr' | 'rfq' | 'evaluation' | 'award' | 'manufacturing' | 'logistics';

/** A line's current phase; `delivered` once every dated milestone has an actual. */
export type LinePhase = PhaseKey | 'delivered';

export type ItemType = 'Tagged' | 'Bulk' | 'Unknown';

export interface MilestoneDates {
  plan?: Day;
  forecast?: Day;
  actual?: Day;
  durationDays?: number;
}

export interface RosHistoryPoint {
  label: string;
  day: Day;
}

/** One Package × Facility row group (PLANNED + FORECAST + ACTUAL). */
export interface Line {
  id: string;
  discipline: string;
  packageCode: string;
  /** False when the sheet had an empty / `0` / `None` code; packageCode is then `UNCODED-<row>`. */
  hasValidCode: boolean;
  packageName: string;
  facility: string;
  itemType: ItemType;
  milestones: Partial<Record<MilestoneKey, MilestoneDates>>;
  ros?: Day;
  rosHistory: RosHistoryPoint[];
  deliveryWeeks?: number;
  transportDays?: number;
  bufferDays?: number;
  remark?: string;
  /** 1-based sheet row of the PLANNED row. */
  sourceRow: number;
}

export interface Package {
  code: string;
  name: string;
  discipline: string;
  lines: Line[];
}

export interface Discipline {
  name: string;
  packages: Package[];
}

export type WarningCode =
  | 'INVALID_PACKAGE_CODE'
  | 'MISSING_FACILITY'
  | 'INCOMPLETE_TRIPLET'
  | 'ORPHAN_ROW'
  | 'UNKNOWN_ROW_TYPE'
  | 'INVALID_DATE'
  | 'UNKNOWN_COLUMN'
  | 'NO_DISCIPLINE';

export interface DataWarning {
  level: 'info' | 'warn' | 'error';
  code: WarningCode;
  message: string;
  row?: number;
}

export interface Plan {
  project: string;
  loadedAt: Date;
  disciplines: Discipline[];
  lines: Line[];
  warnings: DataWarning[];
}
