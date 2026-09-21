import { dayFromYMD } from '../../lib/day';
import type { ParseFailure } from '../../store/moduleStore';
import { emdrWorkbook, registerSheet, summarySheet } from '../../test/emdrFixture';
import { parseEmdr } from './parseEmdr';

const failCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as ParseFailure).code;
  }
  return undefined;
};

const book = () =>
  emdrWorkbook({
    Summary: summarySheet(5),
    CPC0: registerSheet([
      { group: 'SPC - Specification' },
      {
        id: 'PQ-CPC0-HVC-SPC-MPC-00001-00',
        title: 'HVAC SPEC',
        rev: 'N01',
        code: 1,
        status: 'Issued for Construction',
        trNo: 'TRM-1',
        trDate: '25/04/2025',
        remark: 'EPCI#1',
      },
      { group: 'LAY - Layout' },
      { id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', title: 'OLD COPY', rev: 'K01', latest: false },
    ]),
    'PIP-Piping and Insulation': registerSheet(
      [
        { group: 'LAY - Layout' },
        { id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', title: 'PIPING LAYOUT', rev: 'L01', code: '2', plan: '01/03/2025', trDate: '10/04/2025' },
        { id: 'PQ-CLQ0-PIP-ISO-MPC-00002-00', title: 'ISO', rev: '0', plan: '31/02/2025' },
        { id: 'PIP-ODD', title: 'Odd number', rev: '0' },
      ],
      { extraColumnAt: 5 },
    ),
    Notes: [['free text only']],
  });

describe('parseEmdr', () => {
  it('reads every register tab, maps columns by label and splits the document number', () => {
    const { data } = parseEmdr(book());
    expect(data.documents.map((d) => d.id)).toEqual([
      'PQ-CPC0-HVC-SPC-MPC-00001-00',
      'PQ-CLQ0-PIP-LAY-MPC-00001-00',
      'PQ-CLQ0-PIP-ISO-MPC-00002-00',
      'PIP-ODD',
    ]);
    expect(data.documents[0]).toEqual({
      id: 'PQ-CPC0-HVC-SPC-MPC-00001-00',
      title: 'HVAC SPEC',
      facility: 'CPC0',
      discipline: 'HVC',
      docType: 'SPC',
      docTypeLabel: 'Specification',
      sheet: 'CPC0',
      rev: 'N01',
      status: 'Issued for Construction',
      code: 1,
      planIssue: undefined,
      deadlineComment: undefined,
      deadlineResponse: undefined,
      transmittal: { no: 'TRM-1', date: dayFromYMD(2025, 4, 25) },
      remark: 'EPCI#1',
    });
  });

  it('keeps the latest revision of a duplicate, in the first-seen position', () => {
    const { data, warnings } = parseEmdr(book());
    const dup = data.documents[1];
    expect(dup.title).toBe('PIPING LAYOUT');
    expect(dup.sheet).toBe('PIP-Piping and Insulation');
    expect(dup.code).toBe(2);
    expect(dup.docTypeLabel).toBe('Layout');
    expect(dup.planIssue).toBe(dayFromYMD(2025, 3, 1));
    expect(dup.transmittal).toEqual({ no: '', date: dayFromYMD(2025, 4, 10) });
    expect(warnings.filter((w) => w.code === 'DUPLICATE_DOC')).toHaveLength(1);
  });

  it('drops bad dates and falls back to the tab name for a malformed number', () => {
    const { data, warnings } = parseEmdr(book());
    expect(data.documents[2].planIssue).toBeUndefined();
    expect(data.documents[2].docTypeLabel).toBeUndefined();
    expect(data.documents[3]).toMatchObject({ facility: '—', discipline: 'PIP', docType: '—' });
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['SKIPPED_SHEET', 'BAD_DATE', 'BAD_DOC_NUMBER', 'SUMMARY_MISMATCH', 'SHEET_CUTOFF']),
    );
  });

  it('reads the Summary total and cut-off', () => {
    const { data } = parseEmdr(book());
    expect(data.summaryTotal).toBe(5);
    expect(data.sheetCutOff).toBe(dayFromYMD(2025, 5, 9));
  });

  it('does not warn about the Summary total when it matches', () => {
    const buf = emdrWorkbook({ Summary: summarySheet(1), PIP: registerSheet([{ id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', rev: 'K01' }]) });
    expect(parseEmdr(buf).warnings.map((w) => w.code)).not.toContain('SUMMARY_MISMATCH');
  });

  it('treats a "NA" transmittal number with no date as no transmittal', () => {
    const buf = emdrWorkbook({
      Summary: summarySheet(1),
      PIP: registerSheet([{ id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', rev: 'K01', trNo: 'NA' }]),
    });
    expect(parseEmdr(buf).data.documents[0].transmittal).toBeUndefined();
  });

  it('fails clearly on bad input', () => {
    expect(failCode(() => parseEmdr(new TextEncoder().encode('nope').buffer as ArrayBuffer))).toBe('NOT_XLSX');
    expect(failCode(() => parseEmdr(emdrWorkbook({ Summary: summarySheet(0), Notes: [['x']] })))).toBe('NO_REGISTER_SHEETS');
    expect(failCode(() => parseEmdr(emdrWorkbook({ PIP: registerSheet([{ group: 'LAY - Layout' }]) })))).toBe('NO_DOCUMENTS');
  });
});
