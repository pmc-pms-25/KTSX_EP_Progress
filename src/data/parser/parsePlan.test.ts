import { translate } from '../../i18n/translate';
import { dayFromISO } from '../../lib/day';
import { SHEET_HEADERS, sampleWorkbook, serial, sheetRows, workbookBuffer } from '../../test/fixtures';
import type { Plan } from '../types';
import { parsePlan } from './parsePlan';

const OPTIONS = { projectName: 'Test Project', now: new Date(2026, 8, 18) };

function parseSample(): Plan {
  const result = parsePlan(sampleWorkbook(), OPTIONS);
  if (!result.ok) throw new Error(result.error.message);
  return result.plan;
}

const d = (iso: string) => dayFromISO(iso)!;

describe('parsePlan', () => {
  it('groups PLANNED/FORECAST/ACTUAL rows into lines under their discipline', () => {
    const plan = parseSample();
    expect(plan.project).toBe('Test Project');
    expect(plan.lines).toHaveLength(6);
    expect(plan.disciplines.map((x) => x.name)).toEqual(['MECHANICAL', 'PIPING']);
    const mec = plan.disciplines[0];
    expect(mec.packages.map((p) => p.code)).toEqual(['MEC-001', 'MEC-002', 'UNCODED-15']);
    expect(mec.packages[0].lines.map((l) => l.facility)).toEqual(['PS2K TS', 'PS2R']);
  });

  it('reads plan, forecast and actual dates as timezone-free days', () => {
    const plan = parseSample();
    const slipped = plan.lines.find((l) => l.facility === 'PS2R')!;
    expect(slipped.milestones.trApproval).toEqual({ plan: d('2027-01-01'), forecast: d('2027-01-01'), durationDays: 7 });
    expect(slipped.milestones.received?.forecast).toBe(d('2028-04-20'));
    expect(slipped.ros).toBe(d('2028-04-01'));
    expect(slipped.remark).toBe('Kiểm tra lại ROS');
    const compressor = plan.lines.find((l) => l.packageCode === 'MEC-002')!;
    expect(compressor.itemType).toBe('Bulk');
    expect(compressor.milestones.trApproval?.actual).toBe(d('2026-06-03'));
    expect(compressor.milestones.po?.durationDays).toBeUndefined();
  });

  it('reads ROS history and numeric fields from the PLANNED row', () => {
    const line = parseSample().lines[0];
    expect(line.rosHistory.map((p) => p.label)).toEqual([
      'Old ED (05-Apr-26)',
      'ED End June 2026 (plus 86 days)',
      'ED Mid Aug 2026 (plus 46 days)',
      'ED Mid Oct 2026 (plus 61 days)',
      'ED 01-Nov-2026 (plus 16 days)',
    ]);
    expect(line.rosHistory[0].day).toBe(d('2028-01-01'));
    expect(line.deliveryWeeks).toBe(40);
    expect(line.transportDays).toBe(30);
    expect(line.bufferDays).toBe(10);
    expect(line.sourceRow).toBe(3);
    expect(line.id).toBe('MEC-001|PS2K TS|3');
  });

  it('keeps dirty rows and reports data-quality warnings', () => {
    const plan = parseSample();
    const uncoded = plan.lines.find((l) => !l.hasValidCode)!;
    expect(uncoded.packageCode).toBe('UNCODED-15');
    expect(uncoded.facility).toBe('Unassigned');
    expect(uncoded.milestones.loa?.forecast).toBeDefined();
    expect(plan.warnings.map((w) => w.code)).not.toContain('ORPHAN_ROW');
    const codes = plan.warnings.map((w) => `${w.code}@${w.row}`);
    expect(codes).toEqual(
      expect.arrayContaining(['INVALID_PACKAGE_CODE@15', 'MISSING_FACILITY@15', 'INCOMPLETE_TRIPLET@20', 'INVALID_DATE@20']),
    );
    const pipe = plan.lines.find((l) => l.packageCode === 'PIP-001')!;
    expect(pipe.milestones.mtoPurchase).toBeUndefined();
    expect(pipe.ros).toBe(d('2029-01-01'));
  });

  it('ignores the FORECAST row ROS value (garbage such as 00/Jan/00)', () => {
    const plan = parseSample();
    const invalid = plan.warnings.find((w) => w.code === 'INVALID_DATE')!;
    const text = translate('vi', invalid.message);
    expect(text).toContain('MTO for Purchase');
    expect(text).not.toContain('ROS');
  });

  it('flags FORECAST/ACTUAL rows that do not follow their PLANNED row', () => {
    const rows = sheetRows([{ discipline: 'SAFETY', lines: [{ code: 'SAF-001', facility: 'BF', plan: { loa: '2027-01-01' } }] }]);
    const orphan = [...rows[3]];
    orphan[0] = 'SAF-999';
    rows.splice(4, 0, orphan);
    const result = parsePlan(workbookBuffer(rows), OPTIONS);
    if (!result.ok) throw new Error('expected ok');
    expect(result.plan.warnings.map((w) => w.code)).toContain('ORPHAN_ROW');
  });

  it('warns about a row with content but a blank Date cell, and stays silent on blank separator rows', () => {
    const rows = sheetRows([{ discipline: 'SAFETY', lines: [{ code: 'SAF-001', facility: 'BF', plan: { loa: '2027-01-01' } }] }]);
    rows[2][SHEET_HEADERS.indexOf('Date')] = null; // the PLANNED row, code/facility/dates still present
    const result = parsePlan(workbookBuffer(rows), OPTIONS);
    if (!result.ok) throw new Error('expected ok');
    const warning = result.plan.warnings.find((w) => w.code === 'UNKNOWN_ROW_TYPE');
    expect(warning).toMatchObject({ row: 3, level: 'warn' });
    // The fully blank separator row after each line must not trigger a warning.
    expect(result.plan.warnings.filter((w) => w.code === 'UNKNOWN_ROW_TYPE')).toHaveLength(1);
  });

  it('warns about lines before the first discipline title', () => {
    const rows: unknown[][] = [SHEET_HEADERS, SHEET_HEADERS.map(() => null)];
    rows[1][0] = 'X-1';
    rows[1][2] = 'BF';
    rows[1][4] = 'PLANNED';
    rows[1][5] = serial('2027-01-01');
    const result = parsePlan(workbookBuffer(rows), OPTIONS);
    if (!result.ok) throw new Error('expected ok');
    expect(result.plan.lines[0].discipline).toBe('Unassigned');
    expect(result.plan.warnings.map((w) => w.code)).toContain('NO_DISCIPLINE');
  });

  it('fails clearly on non-XLSX data, unknown sheets, empty sheets and missing columns', () => {
    const html = new TextEncoder().encode('<!doctype html><html>').buffer as ArrayBuffer;
    expect(parsePlan(html, OPTIONS)).toMatchObject({ ok: false, error: { code: 'NOT_XLSX' } });
    const corrupt = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xde, 0xad, 0xbe, 0xef, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05]).buffer as ArrayBuffer;
    const corruptResult = parsePlan(corrupt, OPTIONS);
    expect(corruptResult).toMatchObject({ ok: false, error: { code: 'NOT_XLSX' } });
    if (!corruptResult.ok) {
      expect(translate('vi', corruptResult.error.detail)).toBe('File Excel bị hỏng hoặc không đọc được (có thể tải về chưa trọn vẹn).');
    }
    expect(parsePlan(sampleWorkbook(), { ...OPTIONS, sheetName: 'Nope' })).toMatchObject({
      ok: false,
      error: { code: 'SHEET_NOT_FOUND' },
    });
    expect(parsePlan(workbookBuffer([SHEET_HEADERS]), OPTIONS)).toMatchObject({ ok: false, error: { code: 'EMPTY' } });
    const noCode = workbookBuffer([['Facility', 'Date', 'LOA Effective Date'], ['BF', 'PLANNED', 46460]]);
    const missingColumnsResult = parsePlan(noCode, OPTIONS);
    expect(missingColumnsResult).toMatchObject({ ok: false, error: { code: 'MISSING_COLUMNS' } });
    if (!missingColumnsResult.ok) {
      expect(translate('vi', missingColumnsResult.error.detail)).toContain('package code');
    }
  });
});
