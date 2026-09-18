import { SHEET_HEADERS } from '../../test/fixtures';
import { mapHeaders, normalizeHeader } from './headers';

describe('mapHeaders', () => {
  it('normalizes header text', () => {
    expect(normalizeHeader('  Tagged/   Bulk ')).toBe('tagged/ bulk');
    expect(normalizeHeader(null)).toBe('');
  });

  it('maps the production header row by name', () => {
    const result = mapHeaders(SHEET_HEADERS);
    if (!result.ok) throw new Error('expected ok');
    const { map } = result;
    expect(map.packageCode).toBe(0);
    expect(map.rowType).toBe(4);
    expect(map.milestones.trApproval).toEqual({ date: 5, duration: 6 });
    expect(map.milestones.loa).toEqual({ date: 27, duration: 28 });
    expect(map.milestones.po).toEqual({ date: 29 });
    expect(map.milestones.received?.date).toBe(39);
    expect(Object.keys(map.milestones)).toHaveLength(21);
    expect(map.ros).toBe(41);
    expect(map.rosHistory.map((r) => r.col)).toEqual([49, 50, 51, 52, 53]);
    expect(map.rosHistory[0].label).toBe('Old ED (05-Apr-26)');
    expect(result.unknownHeaders).toEqual([]);
  });

  it('does not depend on column position', () => {
    const shuffled = ['Date', 'Facility', 'LOA Effective Date', 'Duration (Days)', 'Package Code', 'Mystery'];
    const result = mapHeaders(shuffled);
    if (!result.ok) throw new Error('expected ok');
    expect(result.map.packageCode).toBe(4);
    expect(result.map.milestones.loa).toEqual({ date: 2, duration: 3 });
    expect(result.unknownHeaders).toEqual(['Mystery']);
  });

  it('does not attach a Duration column that follows a non-milestone column', () => {
    const result = mapHeaders(['Package Code', 'Facility', 'Date', 'RFQ Issue', 'Buffer', 'Duration (Days)']);
    if (!result.ok) throw new Error('expected ok');
    expect(result.map.milestones.rfqIssue).toEqual({ date: 3 });
  });

  it('reports missing required columns', () => {
    const result = mapHeaders(['Package Name', 'RFQ Issue']);
    expect(result).toEqual({ ok: false, missing: ['package code', 'facility', 'date'] });
    const noMilestones = mapHeaders(['Package Code', 'Facility', 'Date']);
    expect(noMilestones).toEqual({ ok: false, missing: ['(at least one milestone column)'] });
  });
});
