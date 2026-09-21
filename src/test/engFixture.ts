import type { EmdrRegister, EngDocument } from '../data/engineering/types';
import { dayFromYMD } from '../lib/day';

const d = dayFromYMD;

/** The EMDR's own cut-off. */
export const ENG_CUTOFF = d(2025, 5, 9);

/** A document whose facility / discipline / type come from its number. */
export function doc(id: string, patch: Partial<EngDocument> = {}): EngDocument {
  const [, facility = 'CLQ0', discipline = 'PIP', docType = 'SPC'] = id.split('-');
  return { id, title: `${id} title`, facility, discipline, docType, sheet: discipline, rev: '0', ...patch };
}

/**
 * Six documents, cut-off 09-May-2025:
 * - PIP-00001 final, Code 1, review planned 01-Mar (done), transmittal 25-Apr.
 * - PIP-00002 review, review planned 01-Mar (done), comment due 01-Apr → late 38 days.
 * - PIP-00003 not issued, review planned 01-Jun (not due).
 * - STR-00004 commented, Code 2, transmittal 10-Apr.
 * - STR-00005 commented, Code 3 (rejected).
 * - STR-00006 not issued, review planned 01-Apr → late 38 days.
 */
export function sampleRegister(): EmdrRegister {
  return {
    documents: [
      doc('PQ-CLQ0-PIP-LAY-MPC-00001-00', {
        title: 'PIPING LAYOUT',
        rev: 'N01',
        status: 'Issued for Construction',
        code: 1,
        planIssue: d(2025, 3, 1),
        transmittal: { no: 'TRM-1', date: d(2025, 4, 25) },
      }),
      doc('PQ-CLQ0-PIP-ISO-MPC-00002-00', {
        title: 'ISOMETRIC',
        rev: 'K01',
        status: 'Issued for Information',
        planIssue: d(2025, 3, 1),
        deadlineComment: d(2025, 4, 1),
        transmittal: { no: 'TRM-2', date: d(2025, 2, 27) },
      }),
      doc('PQ-CLQ0-PIP-CAL-MPC-00003-00', { title: 'STRESS CALC', planIssue: d(2025, 6, 1) }),
      doc('PQ-CPC0-STR-DTL-MPC-00004-00', { title: 'BRIDGE DETAILS', rev: 'L01', code: 2, transmittal: { no: 'TRM-3', date: d(2025, 4, 10) } }),
      doc('PQ-CPC0-STR-SPC-MPC-00005-00', { title: 'STEEL SPEC', rev: 'L01', code: 3 }),
      doc('PQ-CPC0-STR-BOD-MPC-00006-00', { title: 'DESIGN BASIS', planIssue: d(2025, 4, 1) }),
    ],
    sheetCutOff: ENG_CUTOFF,
    summaryTotal: 6,
  };
}
