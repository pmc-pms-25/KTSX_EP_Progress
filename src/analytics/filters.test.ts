import { sampleMetrics } from '../test/planFixture';
import { applyFilters, EMPTY_FILTERS, isEmptyFilters, vocabularyOf, type Filters } from './filters';

const metrics = sampleMetrics();
const vocab = vocabularyOf(metrics);
const run = (patch: Partial<Filters>) => applyFilters(metrics, { ...EMPTY_FILTERS, ...patch }, vocab).map((m) => m.line.id);

describe('applyFilters', () => {
  it('returns everything for empty filters', () => {
    expect(isEmptyFilters(EMPTY_FILTERS)).toBe(true);
    expect(run({})).toHaveLength(6);
  });

  it('filters by facets (OR within, AND across)', () => {
    expect(run({ disciplines: ['PIPING'] })).toHaveLength(2);
    expect(run({ facilities: ['PS2R', 'BF'] })).toEqual(['MEC-001|PS2R|7', 'MEC-002|BF|11']);
    expect(run({ disciplines: ['PIPING'], itemTypes: ['Bulk'] })).toEqual(['PIP-001|PS2L TS|20']);
    expect(run({ phases: ['delivered'] })).toEqual(['PIP-002|WHJs|23']);
    expect(run({ phases: ['evaluation'] })).toEqual(['MEC-002|BF|11']);
  });

  it('filters by flags', () => {
    expect(run({ flags: ['rosRisk'] })).toEqual(['MEC-001|PS2R|7']);
    expect(run({ flags: ['slipped'] })).toEqual(['MEC-001|PS2R|7']);
    expect(run({ flags: ['overdue'] })).toEqual(['MEC-002|BF|11']);
    expect(run({ flags: ['dueSoon'] })).toEqual(['MEC-002|BF|11']);
  });

  it('applies the smart search query', () => {
    expect(run({ q: 'pump' })).toEqual(['MEC-001|PS2K TS|3', 'MEC-001|PS2R|7']);
    expect(run({ q: 'PS2R pump' })).toEqual(['MEC-001|PS2R|7']);
    // Received at site: PS2R forecast 20-Apr-2028 and the uncoded line 04-Jun-2028 fall in Q2; PS2K TS (05-Feb-2028) does not.
    expect(run({ q: 'site Q2-2028' })).toEqual(['MEC-001|PS2R|7', 'UNCODED-15|Unassigned|15']);
    // Next milestone of MEC-002 (RFQ approval) is overdue in Jul-2026.
    expect(run({ q: 'jul-2026' })).toEqual(['MEC-002|BF|11']);
  });

  it('builds the search vocabulary from the data', () => {
    expect(vocab.disciplines).toEqual(['MECHANICAL', 'PIPING']);
    expect(vocab.facilities).toEqual(['BF', 'PS2K TS', 'PS2L TS', 'PS2R', 'Unassigned', 'WHJs']);
  });
});
