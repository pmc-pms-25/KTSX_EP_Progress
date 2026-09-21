import * as XLSX from 'xlsx';
import { msg } from '../../i18n/message';
import { ParseFailure } from '../../store/moduleStore';
import { isZip } from '../parser/parsePlan';

/** What the Engineering placeholder knows about its workbook until the real parser exists. */
export interface WorkbookSummary {
  sheetName: string;
  sheets: string[];
  rowCount: number;
}

/** Open the workbook and count the non-blank rows of the chosen sheet (first sheet by default). */
export function summarizeWorkbook(buf: ArrayBuffer, sheetName?: string): WorkbookSummary {
  if (!isZip(buf)) throw new ParseFailure('NOT_XLSX', msg('error.parse.notXlsx'));
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    throw new ParseFailure('NOT_XLSX', msg('error.parse.corrupt'));
  }
  const name = sheetName ?? workbook.SheetNames[0];
  const sheet = name ? workbook.Sheets[name] : undefined;
  if (!name || !sheet) {
    throw new ParseFailure('SHEET_NOT_FOUND', msg('error.parse.sheetNotFound', { sheet: name ?? '', sheets: workbook.SheetNames.join(', ') }));
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  return { sheetName: name, sheets: workbook.SheetNames, rowCount: rows.length };
}
