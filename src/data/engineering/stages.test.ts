import { GATED_STAGES, STAGE_KEYS, STAGE_PLAN_FIELD, stageIndex, stageOf } from './stages';
import type { ClientCode } from './types';

const IFI = 'Issued for Information';
const IFU = 'Issued for Use';
const IFC = 'Issued for Construction';

describe('stageOf', () => {
  // Every rev / status / code combination seen in the EMDR (cut-off 09-05-2025).
  const cases: [string, string | undefined, ClientCode | undefined, string][] = [
    ['0', undefined, undefined, 'notIssued'],
    ['', undefined, undefined, 'notIssued'],
    ['J01', IFI, undefined, 'review'],
    ['K01', IFI, undefined, 'review'],
    ['K02', IFI, undefined, 'review'],
    ['K07', IFI, undefined, 'review'],
    ['K01', IFI, 2, 'commented'],
    ['L01', IFI, undefined, 'commented'],
    ['L02', IFI, undefined, 'commented'],
    ['L01', IFI, 1, 'commented'],
    ['V00', IFI, 1, 'final'],
    ['N01', IFI, undefined, 'final'],
    ['N01', IFC, 2, 'final'],
    ['N02', IFC, undefined, 'final'],
    ['N03', IFC, 1, 'final'],
    ['K01', IFU, 2, 'final'],
    ['L01', IFU, 1, 'final'],
    ['H01', IFU, undefined, 'final'],
    ['H01', undefined, undefined, 'review'],
    ['0', IFI, undefined, 'review'],
  ];

  it.each(cases)('rev %s, status %s, code %s → %s', (rev, status, code, expected) => {
    expect(stageOf({ rev, status, code })).toBe(expected);
  });

  it('ignores case and surrounding spaces in rev and status', () => {
    expect(stageOf({ rev: ' n01 ', status: undefined, code: undefined })).toBe('final');
    expect(stageOf({ rev: 'K01', status: 'issued for construction', code: undefined })).toBe('final');
  });
});

describe('stage tables', () => {
  it('orders the stages and gates the last three', () => {
    expect(STAGE_KEYS).toEqual(['notIssued', 'review', 'commented', 'final']);
    expect(GATED_STAGES).toEqual(['review', 'commented', 'final']);
    expect(stageIndex('commented')).toBe(2);
    expect(STAGE_PLAN_FIELD).toEqual({ review: 'planIssue', commented: 'deadlineComment', final: 'deadlineResponse' });
  });
});
