import type { Day } from '../../lib/day';

/** Phase E steps of a deliverable, in order. */
export type StageKey = 'notIssued' | 'review' | 'commented' | 'final';

/** Steps that have a planned date and can therefore be late. */
export type GatedStage = Exclude<StageKey, 'notIssued'>;

/** Client review code: 1 approved, 2 approved with comments, 3–4 rejected / revise. */
export type ClientCode = 1 | 2 | 3 | 4;

/** One deliverable of the Engineering Master Deliverable Register. */
export interface EngDocument {
  /** Document number, unique after de-duplication. */
  id: string;
  title: string;
  /** Second part of the document number, e.g. `CLQ0`. */
  facility: string;
  /** Third part, e.g. `PIP`. */
  discipline: string;
  /** Fourth part, e.g. `ISO`. */
  docType: string;
  /** Label from the group row above the document, e.g. `Isometric`. */
  docTypeLabel?: string;
  /** Workbook tab the row came from. */
  sheet: string;
  rev: string;
  status?: string;
  code?: ClientCode;
  planIssue?: Day;
  deadlineComment?: Day;
  deadlineResponse?: Day;
  transmittal?: { no: string; date?: Day };
  remark?: string;
}

export interface EmdrRegister {
  documents: EngDocument[];
  /** Cut-off written on the Summary tab. */
  sheetCutOff?: Day;
  /** Grand total on the Summary tab. */
  summaryTotal?: number;
}
