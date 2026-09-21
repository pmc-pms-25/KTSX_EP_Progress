import type { AppConfig } from '../../config/config';
import { translate } from '../../i18n/translate';
import { sampleWorkbook } from '../../test/fixtures';
import type { LoadStep } from '../../store/moduleStore';
import { ParseFailure } from '../../store/moduleStore';
import { createProcurementLoader } from './store';

const CONFIG: AppConfig = { appName: 'A', projectName: 'Test Project', dataSources: {}, dueSoonDays: 30 };
const source = { type: 'server' as const, url: '/p.xlsx' };

function ctx(steps: LoadStep[] = []) {
  return { signal: new AbortController().signal, now: new Date(2026, 8, 18), config: CONFIG, onStep: (s: LoadStep) => void steps.push(s) };
}

describe('procurement loader', () => {
  it('fetches and parses the plan, reporting each step', async () => {
    const steps: LoadStep[] = [];
    const loader = createProcurementLoader(() => ({ label: 'Test', load: async () => sampleWorkbook() }));
    const { data, warnings } = await loader(source, ctx(steps));
    expect(data.lines).toHaveLength(6);
    expect(data.project).toBe('Test Project');
    expect(warnings).toBe(data.warnings);
    expect(steps).toEqual(['fetch', 'parse', 'analyze']);
  });

  it('throws a ParseFailure for non-XLSX bytes', async () => {
    const loader = createProcurementLoader(() => ({ label: 'Test', load: async () => new TextEncoder().encode('nope').buffer as ArrayBuffer }));
    const error = await loader(source, ctx()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ParseFailure);
    expect((error as ParseFailure).code).toBe('NOT_XLSX');
    expect(translate('vi', (error as ParseFailure).detail)).toBe('Dữ liệu tải về không phải file Excel (XLSX).');
  });
});
