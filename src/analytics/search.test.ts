import { dayFromISO } from '../lib/day';
import { describeSearch, parseSearch } from './search';

const VOCAB = { disciplines: ['MECHANICAL', 'INSTRUMENT & TELECOM'], facilities: ['PS2R', 'PS2K TS', 'PS2K JK', 'BF'] };
const d = (iso: string) => dayFromISO(iso)!;

describe('parseSearch', () => {
  it('recognizes facilities, milestones and periods', () => {
    const r = parseSearch('PS2R LOA 2027', VOCAB);
    expect(r.facilities).toEqual(['PS2R']);
    expect(r.milestones).toEqual(['loa']);
    expect(r.period).toEqual({ from: d('2027-01-01'), to: d('2027-12-31'), label: '2027' });
    expect(r.text).toEqual([]);
  });

  it('matches multi-word vocabulary before splitting', () => {
    const r = parseSearch('ps2k ts instrument & telecom valve', VOCAB);
    expect(r.facilities).toEqual(['PS2K TS']);
    expect(r.disciplines).toEqual(['INSTRUMENT & TELECOM']);
    expect(r.text).toEqual(['valve']);
  });

  it('does not match a vocabulary entry inside a longer word', () => {
    expect(parseSearch('bfx', VOCAB).facilities).toEqual([]);
    expect(parseSearch('bfx', VOCAB).text).toEqual(['bfx']);
  });

  it('parses quarters and months', () => {
    expect(parseSearch('Q2-2027', VOCAB).period).toEqual({ from: d('2027-04-01'), to: d('2027-06-30'), label: 'Q2-2027' });
    expect(parseSearch('mar-2027', VOCAB).period).toEqual({ from: d('2027-03-01'), to: d('2027-03-31'), label: 'Mar-2027' });
    expect(parseSearch('dec/2028', VOCAB).period?.to).toBe(d('2028-12-31'));
  });

  it('recognizes item types and phases', () => {
    const r = parseSearch('bulk manufacturing delivered', VOCAB);
    expect(r.itemTypes).toEqual(['Bulk']);
    expect(r.phases).toEqual(['manufacturing', 'delivered']);
  });

  it('does not duplicate repeated item types, phases or milestones', () => {
    const r = parseSearch('bulk bulk loa loa', VOCAB);
    expect(r.itemTypes).toEqual(['Bulk']);
    expect(r.milestones).toEqual(['loa']);
  });

  it('describes what was understood', () => {
    expect(describeSearch(parseSearch('PS2R LOA Q2-2027 pump', VOCAB))).toEqual(['PS2R', 'LOA', 'Q2-2027', '"pump"']);
  });
});
