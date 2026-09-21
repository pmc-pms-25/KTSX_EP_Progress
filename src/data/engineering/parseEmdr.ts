import * as XLSX from 'xlsx';
import { msg, type Message } from '../../i18n/message';
import { dayFromExcelSerial, dayFromYMD, formatDay, type Day } from '../../lib/day';
import { ParseFailure } from '../../store/moduleStore';
import { isZip } from '../parser/parsePlan';
import type { DataWarning, WarningCode } from '../types';
import type { ClientCode, EmdrRegister, EngDocument } from './types';

type Row = unknown[];

interface Columns {
  no: number;
  id: number;
  title: number;
  rev: number;
  code?: number;
  planIssue?: number;
  deadlineComment?: number;
  deadlineResponse?: number;
  status?: number;
  remark?: number;
  trNo?: number;
  trDate?: number;
  latest?: number;
}

interface Candidate {
  doc: EngDocument;
  latest: boolean;
}

const UNKNOWN = '—';
const GROUP = /^([A-Z]{2,5})\s*-\s*(.+)$/;
const DATE_TEXT = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;

/** `Plan Issue\n(dd/mm/yyyy)` → `plan issue`, `DOC. No` → `doc no`. */
const norm = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());

const warn = (code: WarningCode, level: DataWarning['level'], message: Message, row?: number): DataWarning =>
  row === undefined ? { level, code, message } : { level, code, message, row };

/** Excel serial or `dd/mm/yyyy` / `dd-mm-yyyy` text; `'bad'` when the cell has something else. */
function readDate(value: unknown): Day | undefined | 'bad' {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return dayFromExcelSerial(value) ?? 'bad';
  const m = DATE_TEXT.exec(String(value));
  if (!m) return 'bad';
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return 'bad';
  const day = dayFromYMD(y, mo, d);
  return new Date(day * 86_400_000).getUTCDate() === d ? day : 'bad';
}

function readCode(value: unknown): ClientCode | undefined {
  const n = Number(text(value));
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : undefined;
}

/** `PIP-Piping and Insulation` → `PIP`. */
const sheetDiscipline = (sheet: string) => /^([A-Z]{2,5})\s*-/.exec(sheet.trim())?.[1] ?? sheet.trim();

/**
 * The header row is the one holding both `DOC. No` and `DOC. TITLE`; `INCOMING TRANSMITTAL` No./Date and
 * `Latest Rev` sit on the row below. Matching on `DOC. No` alone also catches the "Doc. No: " field in the
 * title block above the table, so both labels are required.
 */
function findColumns(rows: Row[]): { header: number; cols: Columns } | undefined {
  const header = rows.findIndex((r) => r.some((c) => norm(c) === 'doc no') && r.some((c) => norm(c) === 'doc title'));
  if (header === -1) return undefined;
  const top = rows[header];
  const sub = rows[header + 1] ?? [];
  const at = (label: string, row: Row = top) => {
    const i = row.findIndex((c) => norm(c) === label);
    return i === -1 ? undefined : i;
  };
  const no = at('no');
  const title = at('doc title');
  const rev = at('rev');
  if (no === undefined || title === undefined || rev === undefined) return undefined;
  const incoming = at('incoming transmittal');
  return {
    header,
    cols: {
      no,
      id: at('doc no')!,
      title,
      rev,
      code: at('code'),
      planIssue: at('plan issue'),
      deadlineComment: at('deadline comment'),
      deadlineResponse: at('deadline response'),
      status: at('status'),
      remark: at('remark'),
      trNo: incoming,
      trDate: incoming === undefined ? undefined : incoming + 1,
      latest: at('latest rev', sub) ?? at('latest rev'),
    },
  };
}

function parseSheet(sheet: string, rows: Row[], warnings: DataWarning[]): Candidate[] | undefined {
  const found = findColumns(rows);
  if (!found) return undefined;
  const { header, cols } = found;
  const out: Candidate[] = [];
  let group: { code: string; label: string } | undefined;

  for (let r = header + 2; r < rows.length; r++) {
    const row = rows[r];
    const id = text(row[cols.id]);
    if (!id) continue;
    if (!(Number(text(row[cols.no])) > 0)) {
      const g = GROUP.exec(id);
      if (g) group = { code: g[1], label: g[2].trim() };
      continue;
    }
    const excelRow = r + 1;
    const date = (col: number | undefined, column: string) => {
      if (col === undefined) return undefined;
      const d = readDate(row[col]);
      if (d !== 'bad') return d;
      warnings.push(warn('BAD_DATE', 'warn', msg('warning.eng.badDate', { id, column, value: text(row[col]) }), excelRow));
      return undefined;
    };

    const parts = id.split('-');
    let [facility, discipline, docType] = [parts[1], parts[2], parts[3]];
    if (parts.length < 4) {
      warnings.push(warn('BAD_DOC_NUMBER', 'warn', msg('warning.eng.badDocNumber', { id, sheet }), excelRow));
      [facility, discipline, docType] = [UNKNOWN, sheetDiscipline(sheet), UNKNOWN];
    }
    const trNo = cols.trNo === undefined ? '' : text(row[cols.trNo]);
    const trDate = date(cols.trDate, 'Incoming Transmittal');
    const status = cols.status === undefined ? '' : text(row[cols.status]);
    const remark = cols.remark === undefined ? '' : text(row[cols.remark]);
    const latestCell = cols.latest === undefined ? undefined : row[cols.latest];

    out.push({
      latest: latestCell === true || text(latestCell).toUpperCase() === 'TRUE',
      doc: {
        id,
        title: text(row[cols.title]),
        facility,
        discipline,
        docType,
        docTypeLabel: group && group.code === docType ? group.label : undefined,
        sheet,
        rev: text(row[cols.rev]),
        status: status || undefined,
        code: cols.code === undefined ? undefined : readCode(row[cols.code]),
        planIssue: date(cols.planIssue, 'Plan Issue'),
        deadlineComment: date(cols.deadlineComment, 'Deadline Comment'),
        deadlineResponse: date(cols.deadlineResponse, 'Deadline Response'),
        transmittal: trNo || trDate !== undefined ? { no: trNo, date: trDate } : undefined,
        remark: remark || undefined,
      },
    });
  }
  return out;
}

/** Latest Rev first, then the later transmittal. */
function better(a: Candidate, b: Candidate): boolean {
  if (a.latest !== b.latest) return a.latest;
  return (a.doc.transmittal?.date ?? -Infinity) > (b.doc.transmittal?.date ?? -Infinity);
}

function dedupe(candidates: Candidate[], warnings: DataWarning[]): EngDocument[] {
  const byId = new Map<string, Candidate>();
  const sheets = new Map<string, string[]>();
  for (const c of candidates) {
    const prev = byId.get(c.doc.id);
    if (!prev) {
      byId.set(c.doc.id, c);
      continue;
    }
    sheets.set(c.doc.id, [...(sheets.get(c.doc.id) ?? [prev.doc.sheet]), c.doc.sheet]);
    if (better(c, prev)) byId.set(c.doc.id, c);
  }
  for (const [id, list] of sheets) {
    warnings.push(warn('DUPLICATE_DOC', 'warn', msg('warning.eng.duplicateDoc', { id, sheets: list.join(', ') })));
  }
  return [...byId.values()].map((c) => c.doc);
}

/** Best effort: the number right of the first `TOTAL` cell that has one, and the first date in the title rows. */
function readSummary(rows: Row[]): { total?: number; cutOff?: Day } {
  let total: number | undefined;
  let cutOff: Day | undefined;
  for (const row of rows) {
    const i = row.findIndex((c) => text(c).toUpperCase() === 'TOTAL');
    if (i === -1 || total !== undefined) continue;
    const n = row.slice(i + 1).find((c) => typeof c === 'number');
    if (typeof n === 'number') total = n;
  }
  for (const row of rows.slice(0, 8)) {
    for (const cell of row) {
      const d = typeof cell === 'string' ? readDate(cell) : undefined;
      if (cutOff === undefined && typeof d === 'number') cutOff = d;
    }
  }
  return { total, cutOff };
}

/** Read every register tab of the EMDR workbook (all tabs but `Summary`) into one de-duplicated register. */
export function parseEmdr(buf: ArrayBuffer): { data: EmdrRegister; warnings: DataWarning[] } {
  if (!isZip(buf)) throw new ParseFailure('NOT_XLSX', msg('error.parse.notXlsx'));
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    throw new ParseFailure('NOT_XLSX', msg('error.parse.corrupt'));
  }

  const warnings: DataWarning[] = [];
  const candidates: Candidate[] = [];
  let registers = 0;
  let summary: { total?: number; cutOff?: Day } = {};
  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name], { header: 1, defval: '', blankrows: true });
    if (name.trim().toLowerCase() === 'summary') {
      summary = readSummary(rows);
      continue;
    }
    const docs = parseSheet(name, rows, warnings);
    if (!docs) {
      warnings.push(warn('SKIPPED_SHEET', 'warn', msg('warning.eng.skippedSheet', { sheet: name })));
      continue;
    }
    registers += 1;
    candidates.push(...docs);
  }

  if (registers === 0) {
    throw new ParseFailure('NO_REGISTER_SHEETS', msg('error.parse.noRegisterSheets', { sheets: workbook.SheetNames.join(', ') }));
  }
  const documents = dedupe(candidates, warnings);
  if (documents.length === 0) throw new ParseFailure('NO_DOCUMENTS', msg('error.parse.noDocuments'));
  if (summary.total !== undefined && summary.total !== documents.length) {
    warnings.push(warn('SUMMARY_MISMATCH', 'warn', msg('warning.eng.summaryMismatch', { summary: summary.total, parsed: documents.length })));
  }
  if (summary.cutOff !== undefined) {
    warnings.push(warn('SHEET_CUTOFF', 'info', msg('warning.eng.sheetCutOff', { date: formatDay(summary.cutOff) })));
  }
  return { data: { documents, sheetCutOff: summary.cutOff, summaryTotal: summary.total }, warnings };
}
