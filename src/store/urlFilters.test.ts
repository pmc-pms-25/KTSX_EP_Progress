import { EMPTY_FILTERS } from '../analytics/filters';
import { filtersFromParams, writeFilters } from './urlFilters';

describe('url filters', () => {
  it('round-trips filters through URL params', () => {
    const filters = {
      disciplines: ['INSTRUMENT & TELECOM'],
      facilities: ['PS2K TS', 'BF'],
      itemTypes: ['Bulk' as const],
      phases: ['award' as const],
      flags: ['rosRisk' as const],
      q: 'LOA 2027',
    };
    const params = writeFilters(new URLSearchParams(), filters);
    expect(filtersFromParams(new URLSearchParams(params.toString()))).toEqual(filters);
  });

  it('keeps unrelated params and removes empty facets', () => {
    const start = new URLSearchParams('pkg=MEC-001&f=BF&q=x');
    const next = writeFilters(start, EMPTY_FILTERS);
    expect(next.toString()).toBe('pkg=MEC-001');
  });

  it('drops unknown enum values', () => {
    const f = filtersFromParams(new URLSearchParams('t=Bulk,Weird&p=award,nope&flag=rosRisk,bad'));
    expect(f.itemTypes).toEqual(['Bulk']);
    expect(f.phases).toEqual(['award']);
    expect(f.flags).toEqual(['rosRisk']);
  });
});
