import * as XLSX from 'xlsx';

export interface FixtureDoc {
  id: string;
  title?: string;
  rev?: string;
  code?: string | number;
  status?: string;
  plan?: string | number;
  deadlineComment?: string | number;
  deadlineResponse?: string | number;
  trNo?: string;
  trDate?: string | number;
  /** `Latest Rev` column; true by default. */
  latest?: boolean;
  remark?: string;
}

export type FixtureRow = FixtureDoc | { group: string };

/** Same labels and order as the real EMDR tabs (two header rows). */
const HEADER = [
  '', '', 'No.', 'DOC. No', 'DOC. TITLE', 'Rev', 'Code', 'Plan Issue\n(dd/mm/yyyy)', 'Deadline Comment\n(dd/mm/yyyy)',
  'Deadline Response\n(dd/mm/yyyy)', 'CTR No.', 'Status', 'Notes', 'Remark', 'Pages', 'Subcontractor',
  'INCOMING TRANSMITTAL', '', 'OUTGOING TRANSMITTAL', '', '',
];
const SUB = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'No.', 'Date', 'No.', 'Date', 'Latest Rev'];

/** A register tab: title rows, the two header rows, then group and document rows (numbered 1, 2, …). */
export function registerSheet(rows: FixtureRow[], opts: { cutOff?: string; extraColumnAt?: number } = {}): unknown[][] {
  let no = 0;
  const body = rows.map((row, i) => {
    if ('group' in row) return ['', 0, '', row.group];
    no += 1;
    return [
      '', 275_000 + i, no, row.id, row.title ?? '', row.rev ?? '0', row.code ?? '', row.plan ?? '', row.deadlineComment ?? '',
      row.deadlineResponse ?? '', '', row.status ?? '', '', row.remark ?? '', '', '', row.trNo ?? '', row.trDate ?? '', '', '',
      row.latest ?? true,
    ];
  });
  const table = [HEADER, SUB, [], ...body].map((r) => [...r]);
  if (opts.extraColumnAt !== undefined) {
    table.forEach((r, i) => r.splice(opts.extraColumnAt!, 0, i === 0 ? 'Extra' : ''));
  }
  return [
    ['', '', '', '', 'CLQ0-Design Engineering - Living Quarters Platform - General'],
    [15],
    ['', '', '', '', 'ENGINEERING MASTER DELIVERABLE REGISTER\n'],
    [...Array(24).fill(''), `Cut - off: ${opts.cutOff ?? '09-05-2025'}`],
    ...table,
  ];
}

/** The Summary tab: cut-off on row 4, a header row that also says TOTAL, and the TOTAL row. */
export function summarySheet(total: number, cutOff = '09-05-2025'): unknown[][] {
  return [
    ['', '', '', '', 'CLQ0-Design Engineering PROJECT - SUMMARY REPORT'],
    [16],
    [],
    [...Array(15).fill(''), cutOff],
    ['', '', 'No.', 'DISCIPLINE', 'TOTAL', 'SUB CONTRACTOR'],
    ['', '', 1, 'PIP-Piping and Insulation', total, 0],
    ['', '', '', 'TOTAL', total, 0],
  ];
}

export function emdrWorkbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
