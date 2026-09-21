import { computeDocMetrics } from '../../analytics/engineering/docMetrics';
import { ENG_CUTOFF, sampleRegister } from '../../test/engFixture';
import { applyEngFilters, EMPTY_ENG_FILTERS, engFiltersFromParams, engVocabulary, searchWords, writeEngFilters } from './filters';

const metrics = () => computeDocMetrics(sampleRegister().documents, ENG_CUTOFF);
const ids = (list: { doc: { id: string } }[]) => list.map((m) => m.doc.id.split('-')[5]);

const doc = (id: string, docTypeLabel: string) =>
  computeDocMetrics([{ id, title: 't', facility: 'CLQ0', discipline: 'PIP', docType: 'SPC', docTypeLabel, sheet: 'PIP', rev: '0' }], ENG_CUTOFF)[0];

describe('engineering URL filters', () => {
  it('reads known values and drops unknown stages and flags', () => {
    const params = new URLSearchParams('discipline=PIP&discipline=STR&facility=CPC0&type=SPC&phase=final&phase=bogus&flag=rejected&flag=slipped&q=%20spec%20&pkg=X');
    expect(engFiltersFromParams(params)).toEqual({
      disciplines: ['PIP', 'STR'],
      facilities: ['CPC0'],
      docTypes: ['SPC'],
      stages: ['final'],
      flags: ['rejected'],
      q: ' spec ',
    });
  });

  it('writes filters back, keeping unrelated keys', () => {
    const next = writeEngFilters(new URLSearchParams('doc=A&discipline=OLD'), {
      ...EMPTY_ENG_FILTERS,
      disciplines: ['PIP'],
      stages: ['review', 'final'],
      q: '  layout ',
    });
    expect(next.toString()).toBe('doc=A&discipline=PIP&phase=review&phase=final&q=layout');
  });
});

describe('applyEngFilters', () => {
  it('ORs within a facet and ANDs across facets', () => {
    expect(ids(applyEngFilters(metrics(), { ...EMPTY_ENG_FILTERS, disciplines: ['PIP'], stages: ['notIssued', 'final'] }))).toEqual(['00001', '00003']);
    expect(ids(applyEngFilters(metrics(), { ...EMPTY_ENG_FILTERS, facilities: ['CPC0'], docTypes: ['SPC', 'BOD'] }))).toEqual(['00005', '00006']);
  });

  it('applies every flag', () => {
    const flagged = (flag: (typeof EMPTY_ENG_FILTERS.flags)[number]) => ids(applyEngFilters(metrics(), { ...EMPTY_ENG_FILTERS, flags: [flag] }));
    expect(flagged('notIssued')).toEqual(['00003', '00006']);
    expect(flagged('overdue')).toEqual(['00002', '00006']);
    expect(flagged('code1')).toEqual(['00001']);
    expect(flagged('code2')).toEqual(['00004']);
    expect(flagged('rejected')).toEqual(['00005']);
  });

  it('matches every search word against number, title, discipline, facility and type', () => {
    expect(ids(applyEngFilters(metrics(), { ...EMPTY_ENG_FILTERS, q: 'str  spec' }))).toEqual(['00005']);
    expect(ids(applyEngFilters(metrics(), { ...EMPTY_ENG_FILTERS, q: 'clq0 LAYOUT' }))).toEqual(['00001']);
    expect(searchWords('  A  b ')).toEqual(['a', 'b']);
  });

  it('also matches the document-type label', () => {
    const m = doc('PQ-CLQ0-PIP-SPC-MPC-00001-00', 'Specification');
    expect(applyEngFilters([m], { ...EMPTY_ENG_FILTERS, q: 'specification' })).toEqual([m]);
  });
});

describe('engVocabulary', () => {
  it('lists disciplines and facilities alphabetically', () => {
    expect(engVocabulary(metrics())).toEqual({ disciplines: ['PIP', 'STR'], facilities: ['CLQ0', 'CPC0'] });
  });
});
