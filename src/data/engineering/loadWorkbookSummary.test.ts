import { workbookBuffer } from '../../test/fixtures';
import { ParseFailure } from '../../store/moduleStore';
import { summarizeWorkbook } from './loadWorkbookSummary';

const book = workbookBuffer([['Doc No', 'Title'], ['D-1', 'P&ID'], [null, null], ['D-2', 'Layout']], 'ENG');

describe('summarizeWorkbook', () => {
  it('counts the non-blank rows of the first sheet by default', () => {
    expect(summarizeWorkbook(book)).toEqual({ sheetName: 'ENG', sheets: ['ENG'], rowCount: 3 });
  });

  it('reads the configured sheet and rejects an unknown one', () => {
    expect(summarizeWorkbook(book, 'ENG').sheetName).toBe('ENG');
    const error = (() => {
      try {
        summarizeWorkbook(book, 'NOPE');
      } catch (e) {
        return e;
      }
    })();
    expect(error).toBeInstanceOf(ParseFailure);
    expect((error as ParseFailure).code).toBe('SHEET_NOT_FOUND');
  });

  it('rejects non-XLSX bytes', () => {
    expect(() => summarizeWorkbook(new TextEncoder().encode('nope').buffer as ArrayBuffer)).toThrow(ParseFailure);
  });
});
