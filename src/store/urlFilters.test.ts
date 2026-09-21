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

  it('writes full-word keys and repeats the key for several values', () => {
    const params = writeFilters(new URLSearchParams(), { ...EMPTY_FILTERS, disciplines: ['A', 'B'], flags: ['rosRisk'] });
    expect(params.toString()).toBe('discipline=A&discipline=B&flag=rosRisk');
  });

  it('keeps values that contain commas', () => {
    const params = writeFilters(new URLSearchParams(), { ...EMPTY_FILTERS, disciplines: ['Electrical, Instrument'] });
    expect(filtersFromParams(new URLSearchParams(params.toString())).disciplines).toEqual(['Electrical, Instrument']);
  });

  it('keeps unrelated params and removes empty facets', () => {
    const start = new URLSearchParams('pkg=MEC-001&facility=BF&q=x');
    expect(writeFilters(start, EMPTY_FILTERS).toString()).toBe('pkg=MEC-001');
  });

  it('drops unknown enum values', () => {
    const f = filtersFromParams(new URLSearchParams('type=Bulk&type=Weird&phase=award&phase=nope&flag=rosRisk&flag=bad'));
    expect(f.itemTypes).toEqual(['Bulk']);
    expect(f.phases).toEqual(['award']);
    expect(f.flags).toEqual(['rosRisk']);
  });
});
