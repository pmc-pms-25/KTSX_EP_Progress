import * as XLSX from 'xlsx';
import { dayFromExcelSerial, type Day } from '../../lib/day';
import { MILESTONES } from '../milestones';
import type { DataWarning, Discipline, ItemType, Line, MilestoneDates, Package, Plan } from '../types';
import { mapHeaders, type ColumnMap } from './headers';

export type ParseErrorCode = 'NOT_XLSX' | 'SHEET_NOT_FOUND' | 'EMPTY' | 'MISSING_COLUMNS';

export interface ParseError {
  code: ParseErrorCode;
  message: string;
}

export type ParseResult = { ok: true; plan: Plan } | { ok: false; error: ParseError };

export interface ParseOptions {
  projectName: string;
  /** Sheet to read; defaults to the first sheet. */
  sheetName?: string;
  now?: Date;
}

type Row = unknown[];

interface Group {
  planned: Row;
  forecast?: Row;
  actual?: Row;
  sheetRow: number;
  discipline: string;
  rawCode: string;
  rawFacility: string;
}

const UNASSIGNED = 'Unassigned';
const INVALID_TEXT = new Set(['', '0', 'none', 'null', 'n/a']);

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Identity text with the sheet's placeholders ('', 0, None) collapsed to ''. FORECAST/ACTUAL rows are formulas that turn blanks into 0. */
function identity(value: unknown): string {
  const t = text(value);
  return INVALID_TEXT.has(t.toLowerCase()) ? '' : t;
}

function isBlank(value: unknown): boolean {
  return text(value) === '';
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isZip(buf: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
  return bytes.length === 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
}

function toItemType(value: unknown): ItemType {
  const t = text(value).toLowerCase();
  if (t === 'tagged') return 'Tagged';
  if (t === 'bulk') return 'Bulk';
  return 'Unknown';
}

/** A discipline title row: only the first mapped cell has text. */
function isDisciplineRow(row: Row, map: ColumnMap): boolean {
  if (isBlank(row[map.packageCode])) return false;
  return row.every((cell, i) => i === map.packageCode || isBlank(cell));
}

/** Read a date cell; returns `invalid: true` when the cell has content that is not a date. */
function readDate(value: unknown): { day?: Day; invalid: boolean } {
  if (isBlank(value)) return { invalid: false };
  const day = dayFromExcelSerial(value);
  return day === undefined ? { invalid: true } : { day, invalid: false };
}

function buildLine(group: Group, map: ColumnMap, warnings: DataWarning[]): Line {
  const { planned, forecast, actual, sheetRow } = group;
  const hasValidCode = group.rawCode !== '';
  const packageCode = hasValidCode ? group.rawCode : `UNCODED-${sheetRow}`;
  if (!hasValidCode) {
    warnings.push({
      level: 'warn',
      code: 'INVALID_PACKAGE_CODE',
      row: sheetRow,
      message: `Package Code trống hoặc bằng 0 → gán ${packageCode}`,
    });
  }
  const facility = group.rawFacility || UNASSIGNED;
  if (!group.rawFacility) {
    warnings.push({ level: 'warn', code: 'MISSING_FACILITY', row: sheetRow, message: `${packageCode}: thiếu Facility` });
  }
  if (!forecast || !actual) {
    const missing = [!forecast && 'FORECAST', !actual && 'ACTUAL'].filter(Boolean).join(', ');
    warnings.push({ level: 'warn', code: 'INCOMPLETE_TRIPLET', row: sheetRow, message: `${packageCode} @ ${facility}: thiếu dòng ${missing}` });
  }

  const invalidColumns = new Set<string>();
  const milestones: Line['milestones'] = {};
  for (const m of MILESTONES) {
    const cols = map.milestones[m.key];
    if (!cols) continue;
    const dates: MilestoneDates = {};
    const read = (row: Row | undefined, slot: 'plan' | 'forecast' | 'actual') => {
      if (!row) return;
      const r = readDate(row[cols.date]);
      if (r.invalid) invalidColumns.add(m.label);
      if (r.day !== undefined) dates[slot] = r.day;
    };
    read(planned, 'plan');
    read(forecast, 'forecast');
    read(actual, 'actual');
    const duration = cols.duration !== undefined ? num(planned[cols.duration]) : undefined;
    if (duration !== undefined) dates.durationDays = duration;
    if (dates.plan !== undefined || dates.forecast !== undefined || dates.actual !== undefined) {
      milestones[m.key] = dates;
    }
  }

  const rosCell = map.ros !== undefined ? readDate(planned[map.ros]) : { invalid: false };
  if (rosCell.invalid) invalidColumns.add('ROS');
  if (invalidColumns.size > 0) {
    warnings.push({
      level: 'info',
      code: 'INVALID_DATE',
      row: sheetRow,
      message: `${packageCode} @ ${facility}: ngày không hợp lệ ở ${[...invalidColumns].join(', ')}`,
    });
  }

  const rosHistory = map.rosHistory.flatMap(({ label, col }) => {
    const day = dayFromExcelSerial(planned[col]);
    return day === undefined ? [] : [{ label, day }];
  });
  const remark = map.remark !== undefined ? text(planned[map.remark]) : '';

  return {
    id: `${packageCode}|${facility}|${sheetRow}`,
    discipline: group.discipline,
    packageCode,
    hasValidCode,
    packageName: map.packageName !== undefined ? text(planned[map.packageName]) : '',
    facility,
    itemType: map.itemType !== undefined ? toItemType(planned[map.itemType]) : 'Unknown',
    milestones,
    ros: rosCell.day,
    rosHistory,
    deliveryWeeks: map.deliveryWeeks !== undefined ? num(planned[map.deliveryWeeks]) : undefined,
    transportDays: map.transportDays !== undefined ? num(planned[map.transportDays]) : undefined,
    bufferDays: map.buffer !== undefined ? num(planned[map.buffer]) : undefined,
    remark: remark || undefined,
    sourceRow: sheetRow,
  };
}

function groupDisciplines(lines: Line[]): Discipline[] {
  const disciplines = new Map<string, Map<string, Package>>();
  for (const line of lines) {
    let packages = disciplines.get(line.discipline);
    if (!packages) {
      packages = new Map();
      disciplines.set(line.discipline, packages);
    }
    let pkg = packages.get(line.packageCode);
    if (!pkg) {
      pkg = { code: line.packageCode, name: line.packageName, discipline: line.discipline, lines: [] };
      packages.set(line.packageCode, pkg);
    }
    pkg.lines.push(line);
  }
  return [...disciplines].map(([name, packages]) => ({ name, packages: [...packages.values()] }));
}

/** Parse the procurement workbook into the normalized Plan. Pure: no I/O. */
export function parsePlan(buf: ArrayBuffer, options: ParseOptions): ParseResult {
  if (!isZip(buf)) {
    return { ok: false, error: { code: 'NOT_XLSX', message: 'Dữ liệu tải về không phải file Excel (XLSX).' } };
  }
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    return { ok: false, error: { code: 'NOT_XLSX', message: 'File Excel bị hỏng hoặc không đọc được (có thể tải về chưa trọn vẹn).' } };
  }
  const sheetName = options.sheetName ?? workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return {
      ok: false,
      error: { code: 'SHEET_NOT_FOUND', message: `Không tìm thấy sheet "${sheetName}". Các sheet hiện có: ${workbook.SheetNames.join(', ')}` },
    };
  }
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, raw: true, defval: null, blankrows: true });
  if (rows.length < 2) {
    return { ok: false, error: { code: 'EMPTY', message: `Sheet "${sheetName}" không có dữ liệu.` } };
  }
  const header = mapHeaders(rows[0]);
  if (!header.ok) {
    return {
      ok: false,
      error: { code: 'MISSING_COLUMNS', message: `Thiếu cột bắt buộc: ${header.missing.join(', ')}` },
    };
  }
  const { map } = header;
  const warnings: DataWarning[] = header.unknownHeaders.map((h) => ({
    level: 'info' as const,
    code: 'UNKNOWN_COLUMN' as const,
    message: `Bỏ qua cột không nhận diện: "${h}"`,
  }));

  const groups: Group[] = [];
  let discipline = UNASSIGNED;
  let current: Group | undefined;
  let warnedNoDiscipline = false;

  rows.slice(1).forEach((row, i) => {
    const sheetRow = i + 2;
    const rowType = text(row[map.rowType]).toUpperCase();
    if (!rowType) {
      if (isDisciplineRow(row, map)) {
        discipline = text(row[map.packageCode]);
        current = undefined;
      }
      return;
    }
    const rawCode = identity(row[map.packageCode]);
    const rawFacility = identity(row[map.facility]);
    if (rowType === 'PLANNED') {
      if (discipline === UNASSIGNED && !warnedNoDiscipline) {
        warnedNoDiscipline = true;
        warnings.push({ level: 'warn', code: 'NO_DISCIPLINE', row: sheetRow, message: 'Có dòng dữ liệu nằm trước tiêu đề discipline đầu tiên' });
      }
      current = { planned: row, sheetRow, discipline, rawCode, rawFacility };
      groups.push(current);
      return;
    }
    if (rowType === 'FORECAST' || rowType === 'ACTUAL') {
      const slot = rowType === 'FORECAST' ? 'forecast' : 'actual';
      if (current && !current[slot] && current.rawCode === rawCode && current.rawFacility === rawFacility) {
        current[slot] = row;
      } else {
        warnings.push({ level: 'warn', code: 'ORPHAN_ROW', row: sheetRow, message: `Dòng ${rowType} không đi kèm dòng PLANNED tương ứng (${rawCode || 'trống'})` });
      }
      return;
    }
    warnings.push({ level: 'warn', code: 'UNKNOWN_ROW_TYPE', row: sheetRow, message: `Giá trị cột Date không hợp lệ: "${rowType}"` });
  });

  const lines = groups.map((g) => buildLine(g, map, warnings));
  return {
    ok: true,
    plan: {
      project: options.projectName,
      loadedAt: options.now ?? new Date(),
      disciplines: groupDisciplines(lines),
      lines,
      warnings,
    },
  };
}
