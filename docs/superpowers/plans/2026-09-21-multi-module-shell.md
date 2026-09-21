# Multi-module Shell (Engineering + Procurement) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single Procurement dashboard into a multi-module app with a left sidebar (ENGINEERING, PROCUREMENT), one shared look (Header, FilterBar, theme, EN/VI, cut-off) and one data source per module.

**Architecture:** `appStore` keeps only app-wide state (config, theme, lang, cut-off, sidebar, per-module filter memory). Each module gets its own Zustand store built by `createModuleStore(loader)` (load/abort/refresh/error logic moved out of today's `appStore.load()`). A module is described by a `ModuleDefinition` (id, path, label, icon, store, facet schema, optional search/result-count hooks) listed in `src/modules/registry.ts`; Shell components find the active module from the URL path and never import module-specific code. Routes stay centralized in `src/App.tsx`, module pages load lazily.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Tailwind CSS 4, Zustand 5, React Router 7 (hash routing, route `lazy`), SheetJS 0.20.3, Motion 13, Vitest 5 + Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-09-21-multi-module-shell-design.md`

## Global Constraints

- Routes are declared only in `src/App.tsx` (`routes` array, `createHashRouter`).
- Every user-visible string goes through `t('key')` from `useT()`; each new key is added to **both** `src/i18n/en.ts` and `src/i18n/vi.ts` (the `Dictionary` type fails the build otherwise). Plurals use `{param|singular|plural}`.
- Colors only through existing token classes (`bg-bg`, `bg-surface`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, `text-ai-1`, `bg-ai-1/10`, `border-ai-1`…). No new hex colors.
- Pages follow the existing page frame: `<Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">`, blocks wrapped in `<ErrorBoundary label=…>`, content in `<Card>`.
- `localStorage` access is always wrapped in try/catch (see `appStore.ts`).
- URL filter keys: `discipline`, `facility`, `type`, `phase`, `flag`, `q`; multi-values repeat the key. UI-state keys `pkg`, `milestone` are unchanged. Filter changes use `replace`, drawers use `push`.
- Old links (`#/?d=…`, `#/discipline/X`) must keep working (redirect).
- Never commit `*.xlsx` data files.
- Tests: `npx vitest run <path>`; whole suite `npm test`; types `npm run typecheck`; production build `npm run build`.
- Commit after each task; messages in Conventional Commits style ending with the line `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

## Refinements to the spec (decided while planning)

1. `ModuleId` / `MODULE_IDS` live in `src/config/config.ts` (config is the lowest layer that needs them); `src/modules/types.ts` re-exports them.
2. The active module is derived from the URL path (`useActiveModule()` → `moduleForPath(pathname)`), **not** from a React context: Header, Sidebar and FilterBar render outside `ModuleRoute`, so a context would not reach them.
3. `ModuleDefinition.search?.useSearch()` becomes `ModuleDefinition.useSearch?()`. Module hooks are only ever called from small child components keyed by `module.id`, so switching modules remounts them and the rules of hooks hold.
4. Module code lives in folders: `src/modules/<id>/store.ts` (loader + store instance) and `src/modules/<id>/module.ts` (definition). This avoids an import cycle between the store and `useDashboard`.
5. `sidebar.close` is not needed (the shared `Drawer` already uses `common.close`); `sidebar.label` is added for the `<nav>` name.
6. Loader parse failures are thrown as `ParseFailure` (in `src/store/moduleStore.ts`), distinct from the `ParseError` result type of `parsePlan`.

## File Map

| Path | Responsibility |
|---|---|
| `src/config/config.ts` | `MODULE_IDS`, `ModuleId`, `dataSources` parsing with legacy `dataSource` |
| `src/store/urlFilters.ts` | Procurement filters ⇄ URL (new keys, repeated values) |
| `src/ui/shell/legacyUrl.ts` | Old `d,f,t,p` comma params → new params (only place that knows the old format) |
| `src/store/moduleStore.ts` | `createModuleStore`, `ModuleState`, `LoadStep`, `LoadError`, `ParseFailure`, `toLoadError`, `nextFrame` |
| `src/store/useModule.ts` | React hook to select from a module store |
| `src/store/appStore.ts` | App-wide state only |
| `src/modules/procurement/store.ts` | Procurement loader + `procurementStore` |
| `src/modules/procurement/metrics.ts` | Memoized `computeAllMetrics` shared by all components |
| `src/modules/procurement/module.ts` | Procurement `ModuleDefinition` (facets, search, result count) |
| `src/data/engineering/loadWorkbookSummary.ts` | Engineering placeholder parser (sheet + row count) |
| `src/modules/engineering/store.ts`, `module.ts` | Engineering loader/store/definition |
| `src/modules/types.ts`, `src/modules/registry.ts` | Module contract, module list, `moduleForPath`, `filterKeys`, `useActiveModule` |
| `src/ui/engineering/EngineeringPage.tsx` | Placeholder page |
| `src/ui/shell/ModuleRoute.tsx` | Per-module load trigger, state screens, filter memory |
| `src/ui/shell/LegacyRedirect.tsx`, `src/ui/states/NotFound.tsx`, `src/ui/states/UnconfiguredScreen.tsx` | Redirect, 404, unconfigured source |
| `src/ui/shell/Sidebar.tsx` | Desktop sidebar + mobile nav drawer |
| `src/ui/shell/useFacetParams.ts` | Generic facet ⇄ URL hook for the shared FilterBar |
| `src/ui/shell/AppShell.tsx`, `Header.tsx`, `FilterBar.tsx` | Shared shell, reading the active module |
| `src/ui/common/Drawer.tsx` | Gains `side` prop |
| `public/config.json`, `docs/deploy.md`, `README.md` | `dataSources` config docs |

---

### Task 1: Config — `dataSources` per module

**Files:**
- Modify: `src/config/config.ts`
- Modify: `src/config/config.test.ts`
- Modify: `src/i18n/en.ts:19-21`, `src/i18n/vi.ts:21-23`
- Modify (keep compiling): `src/store/appStore.ts`, `src/store/appStore.test.ts`, `src/test/seedStore.ts`
- Modify: `public/config.json`

**Interfaces:**
- Produces: `MODULE_IDS: readonly ['procurement', 'engineering']`, `type ModuleId`, `AppConfig.dataSources: Partial<Record<ModuleId, DataSourceConfig>>` (the `dataSource` field is removed).

- [ ] **Step 1: Write the failing tests** — replace the `parseConfig` describe block in `src/config/config.test.ts` and the `VALID` constant:

```ts
const VALID = {
  appName: 'PMS - PEIW',
  projectName: 'Maydan Mahzam',
  dataSources: {
    procurement: { type: 'google-sheet', url: 'https://example.com/export?format=xlsx', sheetName: 'ALL' },
    engineering: { type: 'server', url: 'data/engineering.xlsx', sheetName: undefined },
  },
  dueSoonDays: 30,
};

describe('parseConfig', () => {
  it('accepts a valid config', () => {
    expect(parseConfig(VALID)).toEqual(VALID);
  });

  it('applies defaults for optional fields', () => {
    expect(parseConfig({ dataSources: { procurement: { type: 'server', url: '/api/data' } } })).toEqual({
      appName: 'PMS - PEIW',
      projectName: 'Procurement Plan',
      dataSources: { procurement: { type: 'server', url: '/api/data', sheetName: undefined } },
      dueSoonDays: 30,
    });
  });

  it('reads the legacy single "dataSource" as the procurement source', () => {
    expect(parseConfig({ dataSource: { type: 'server', url: '/api/data' } }).dataSources).toEqual({
      procurement: { type: 'server', url: '/api/data', sheetName: undefined },
    });
  });

  it('prefers dataSources.procurement over the legacy key', () => {
    const cfg = parseConfig({ dataSource: { type: 'server', url: '/old' }, dataSources: { procurement: { type: 'server', url: '/new' } } });
    expect(cfg.dataSources.procurement?.url).toBe('/new');
  });

  it('ignores unknown module keys and allows a module without a source', () => {
    const cfg = parseConfig({ dataSources: { procurement: { type: 'server', url: '/p' }, weird: { type: 'server', url: '/w' } } });
    expect(cfg.dataSources).toEqual({ procurement: { type: 'server', url: '/p', sheetName: undefined } });
  });

  it('rejects invalid configs with readable messages naming the module', () => {
    expect(() => parseConfig(null)).toThrow(ConfigError);
    expect(() => parseConfig({})).toThrow('dataSources');
    expect(() => parseConfig({ dataSources: {} })).toThrow('dataSources');
    expect(() => parseConfig({ dataSources: { engineering: 'x' } })).toThrow('dataSources.engineering');
    expect(() => parseConfig({ dataSources: { engineering: { type: 'ftp', url: 'x' } } })).toThrow('dataSources.engineering.type');
    expect(() => parseConfig({ dataSource: { type: 'server', url: ' ' } })).toThrow('dataSources.procurement.url');
    expect(() => parseConfig({ ...VALID, dueSoonDays: 0 })).toThrow('dueSoonDays');
  });

  it('translates source errors in Vietnamese', () => {
    try {
      parseConfig({ dataSources: { engineering: { type: 'server', url: '' } } });
    } catch (e) {
      expect(translate('vi', (e as ConfigError).detail)).toBe('Thiếu "dataSources.engineering.url" trong config.json.');
    }
    expect.assertions(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/config/config.test.ts`
Expected: FAIL (`dataSources` undefined / wrong messages).

- [ ] **Step 3: Implement** — in `src/config/config.ts` replace the types and `parseConfig`:

```ts
/** Every module that can have its own data source. Order does not matter here. */
export const MODULE_IDS = ['procurement', 'engineering'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface AppConfig {
  appName: string;
  projectName: string;
  /** A module without an entry shows the "source not configured" screen. */
  dataSources: Partial<Record<ModuleId, DataSourceConfig>>;
  dueSoonDays: number;
}
```

```ts
function parseSource(module: ModuleId, ds: unknown): DataSourceConfig {
  if (!isRecord(ds)) throw new ConfigError(msg('error.config.badSource', { module }));
  if (ds.type !== 'google-sheet' && ds.type !== 'server') {
    throw new ConfigError(msg('error.config.badType', { module }));
  }
  if (typeof ds.url !== 'string' || ds.url.trim() === '') {
    throw new ConfigError(msg('error.config.missingUrl', { module }));
  }
  return {
    type: ds.type,
    url: ds.url.trim(),
    sheetName: typeof ds.sheetName === 'string' && ds.sheetName.trim() ? ds.sheetName.trim() : undefined,
  };
}

/** Validate raw JSON and apply defaults. Throws ConfigError with a readable message. */
export function parseConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) throw new ConfigError(msg('error.config.notObject'));
  // The single `dataSource` key predates modules; it still means the procurement source.
  const entries: Record<string, unknown> = isRecord(raw.dataSources) ? { ...raw.dataSources } : {};
  if (entries.procurement === undefined && raw.dataSource !== undefined) entries.procurement = raw.dataSource;
  if (!MODULE_IDS.some((id) => entries[id] !== undefined)) throw new ConfigError(msg('error.config.missingDataSource'));
  const dataSources: AppConfig['dataSources'] = {};
  for (const id of MODULE_IDS) {
    if (entries[id] !== undefined) dataSources[id] = parseSource(id, entries[id]);
  }
  const dueSoonDays = raw.dueSoonDays ?? DEFAULTS.dueSoonDays;
  if (typeof dueSoonDays !== 'number' || !Number.isInteger(dueSoonDays) || dueSoonDays < 1) {
    throw new ConfigError(msg('error.config.badDueSoon'));
  }
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    appName: str(raw.appName, DEFAULTS.appName),
    projectName: str(raw.projectName, DEFAULTS.projectName),
    dataSources,
    dueSoonDays,
  };
}
```

i18n — replace/add in `src/i18n/en.ts` (config section):

```ts
  'error.config.missingDataSource': 'Missing "dataSources" in config.json.',
  'error.config.badSource': '"dataSources.{module}" must be an object.',
  'error.config.badType': '"dataSources.{module}.type" must be "google-sheet" or "server".',
  'error.config.missingUrl': 'Missing "dataSources.{module}.url" in config.json.',
```

and in `src/i18n/vi.ts`:

```ts
  'error.config.missingDataSource': 'Thiếu "dataSources" trong config.json.',
  'error.config.badSource': '"dataSources.{module}" phải là một object.',
  'error.config.badType': '"dataSources.{module}.type" phải là "google-sheet" hoặc "server".',
  'error.config.missingUrl': 'Thiếu "dataSources.{module}.url" trong config.json.',
```

Keep the rest compiling (these files are rewritten in Task 4):
- `src/store/appStore.ts` in `load()`: replace `deps.createDataSource(config.dataSource)` with
  ```ts
  const source = config.dataSources.procurement;
  if (!source) throw new ConfigError(msg('error.config.missingDataSource'));
  const buf = await deps.createDataSource(source).load(controller.signal);
  ```
  and `sheetName: config.dataSource.sheetName` with `sheetName: source.sheetName`. Import `ConfigError` from `../config/config`.
- `src/store/appStore.test.ts` `CONFIG`: `dataSources: { procurement: { type: 'google-sheet', url: 'https://x' } }`.
- `src/test/seedStore.ts`: `dataSources: { procurement: { type: 'google-sheet', url: 'x' } }`.

`public/config.json`:

```json
{
  "appName": "PMS - PEIW",
  "projectName": "Maydan Mahzam",
  "dataSources": {
    "procurement": {
      "type": "google-sheet",
      "url": "https://docs.google.com/spreadsheets/d/1oygbFq6v3j0NThuZ9Zmf8noHm5jwPr_YSvDvXHT8FPQ/export?format=xlsx",
      "sheetName": "ALL"
    }
  },
  "dueSoonDays": 30,
  "port": 8080
}
```

(No `engineering` entry yet — the Engineering page will show the "not configured" screen until the user adds one.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/config src/store && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config src/i18n src/store src/test/seedStore.ts public/config.json
git commit -m "feat(config): per-module dataSources with legacy dataSource fallback"
```

---

### Task 2: URL filter format — full-word keys, repeated values, legacy converter

**Files:**
- Modify: `src/store/urlFilters.ts`, `src/store/urlFilters.test.ts`
- Create: `src/ui/shell/legacyUrl.ts`, `src/ui/shell/legacyUrl.test.ts`

**Interfaces:**
- Produces: `FILTER_KEYS` (object `{ disciplines: 'discipline', facilities: 'facility', itemTypes: 'type', phases: 'phase', flags: 'flag', q: 'q' }`), unchanged `filtersFromParams(params): Filters`, `writeFilters(params, filters): URLSearchParams`; `migrateLegacyParams(params: URLSearchParams): URLSearchParams`.

- [ ] **Step 1: Write failing tests** — replace `src/store/urlFilters.test.ts`:

```ts
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
```

Create `src/ui/shell/legacyUrl.test.ts`:

```ts
import { migrateLegacyParams } from './legacyUrl';

const migrate = (q: string) => migrateLegacyParams(new URLSearchParams(q)).toString();

describe('migrateLegacyParams', () => {
  it('renames the short keys and splits comma lists into repeated keys', () => {
    expect(migrate('d=MECHANICAL,PIPING&f=BF&t=Bulk&p=award&flag=rosRisk,slipped')).toBe(
      'discipline=MECHANICAL&discipline=PIPING&facility=BF&type=Bulk&phase=award&flag=rosRisk&flag=slipped',
    );
  });

  it('passes other params through untouched', () => {
    expect(migrate('q=LOA+2027&pkg=MEC-001&milestone=tr')).toBe('q=LOA+2027&pkg=MEC-001&milestone=tr');
  });

  it('leaves new-format params as they are', () => {
    expect(migrate('discipline=A&flag=rosRisk&flag=slipped')).toBe('discipline=A&flag=rosRisk&flag=slipped');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/urlFilters.test.ts src/ui/shell/legacyUrl.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** — `src/store/urlFilters.ts`:

```ts
import { EMPTY_FILTERS, type Filters, type Flag } from '../analytics/filters';
import { LINE_PHASE_ORDER } from '../data/milestones';
import type { ItemType, LinePhase } from '../data/types';

/** URL query key for each filter facet; several values repeat the key (`?discipline=A&discipline=B`). */
export const FILTER_KEYS = { disciplines: 'discipline', facilities: 'facility', itemTypes: 'type', phases: 'phase', flags: 'flag', q: 'q' } as const;

const ITEM_TYPES: ItemType[] = ['Tagged', 'Bulk', 'Unknown'];
const FLAGS: Flag[] = ['slipped', 'rosRisk', 'overdue', 'dueSoon'];

const list = (params: URLSearchParams, key: string) => params.getAll(key).filter(Boolean);

export function filtersFromParams(params: URLSearchParams): Filters {
  return {
    disciplines: list(params, FILTER_KEYS.disciplines),
    facilities: list(params, FILTER_KEYS.facilities),
    itemTypes: list(params, FILTER_KEYS.itemTypes).filter((t): t is ItemType => ITEM_TYPES.includes(t as ItemType)),
    phases: list(params, FILTER_KEYS.phases).filter((p): p is LinePhase => LINE_PHASE_ORDER.includes(p as LinePhase)),
    flags: list(params, FILTER_KEYS.flags).filter((f): f is Flag => FLAGS.includes(f as Flag)),
    q: params.get(FILTER_KEYS.q) ?? '',
  };
}

/** Write filters into `params`, keeping unrelated keys (such as `pkg`). Returns a new instance. */
export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const facet of Object.keys(FILTER_KEYS) as (keyof Filters)[]) {
    const key = FILTER_KEYS[facet];
    next.delete(key);
    if (facet === 'q') {
      if (filters.q.trim()) next.set(key, filters.q.trim());
    } else {
      for (const value of filters[facet] as string[]) next.append(key, value);
    }
  }
  return next;
}

export { EMPTY_FILTERS };
```

`src/ui/shell/legacyUrl.ts`:

```ts
/** Short keys with comma-joined values, used by links shared before the multi-module shell. */
const LEGACY_KEYS: Record<string, string> = { d: 'discipline', f: 'facility', t: 'type', p: 'phase', flag: 'flag' };

/** Rewrite old filter params to today's format; every other param passes through. */
export function migrateLegacyParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    const renamed = LEGACY_KEYS[key];
    if (!renamed) {
      next.append(key, value);
      continue;
    }
    for (const part of value.split(',')) if (part) next.append(renamed, part);
  }
  return next;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store src/ui src/analytics`
Expected: PASS (overview/app tests only check `flag=rosRisk`, which keeps its format).

- [ ] **Step 5: Commit**

```bash
git add src/store/urlFilters.ts src/store/urlFilters.test.ts src/ui/shell/legacyUrl.ts src/ui/shell/legacyUrl.test.ts
git commit -m "feat(url): full-word filter keys with repeated values, legacy param converter"
```

---

### Task 3: `createModuleStore` factory

**Files:**
- Create: `src/store/moduleStore.ts`, `src/store/moduleStore.test.ts`

**Interfaces:**
- Consumes: `AppConfig`, `DataSourceConfig`, `ModuleId` (Task 1); `SourceError` (`src/data/sources/sources.ts`); `DataWarning` (`src/data/types.ts`).
- Produces:
  ```ts
  type LoadStep = 'config' | 'fetch' | 'parse' | 'analyze' | 'done';
  interface LoadError { title: Message; detail: Message; code: string }
  class ParseFailure extends Error { code: string; detail: Message }
  function toLoadError(error: unknown): LoadError;
  const nextFrame: () => Promise<void>;
  interface LoadContext { signal: AbortSignal; now: Date; config: AppConfig; onStep(step: LoadStep, detail?: Message): void }
  type ModuleLoader<T> = (source: DataSourceConfig, ctx: LoadContext) => Promise<{ data: T; warnings: DataWarning[] }>;
  type ModuleStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';
  interface ModuleState<T> { status; refreshing; step; stepDetail?; data?: T; warnings: DataWarning[]; lastSync?: Date; error?; refreshError?; load(): Promise<void> }
  type ModuleStore<T> = StoreApi<ModuleState<T>>;
  function createModuleStore<T>(deps: { moduleId: ModuleId; loader: ModuleLoader<T>; getConfig: () => AppConfig | undefined; now: () => Date }): ModuleStore<T>;
  ```

- [ ] **Step 1: Write failing tests** — `src/store/moduleStore.test.ts`:

```ts
import { ConfigError, type AppConfig } from '../config/config';
import { SourceError } from '../data/sources/sources';
import { msg } from '../i18n/message';
import { translate } from '../i18n/translate';
import { createModuleStore, ParseFailure, type ModuleLoader } from './moduleStore';

const CONFIG: AppConfig = {
  appName: 'PMS - PEIW',
  projectName: 'Test',
  dataSources: { procurement: { type: 'server', url: '/p.xlsx' } },
  dueSoonDays: 30,
};
const NOW = new Date(2026, 8, 21, 9, 0);

function make<T>(loader: ModuleLoader<T>, config: AppConfig | undefined = CONFIG, moduleId: 'procurement' | 'engineering' = 'procurement') {
  return createModuleStore<T>({ moduleId, loader, getConfig: () => config, now: () => NOW });
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('createModuleStore', () => {
  it('loads data and warnings through the loader, reporting steps', async () => {
    const steps: string[] = [];
    const store = make(async (source, ctx) => {
      expect(source.url).toBe('/p.xlsx');
      expect(ctx.config).toBe(CONFIG);
      ctx.onStep('parse');
      steps.push(store.getState().step);
      return { data: 'plan', warnings: [] };
    });
    expect(store.getState().status).toBe('idle');
    await store.getState().load();
    const s = store.getState();
    expect(steps).toEqual(['parse']);
    expect(s).toMatchObject({ status: 'ready', step: 'done', data: 'plan', warnings: [], refreshing: false });
    expect(s.lastSync).toEqual(NOW);
  });

  it('is unconfigured without a source and never calls the loader', async () => {
    const loader = vi.fn();
    const store = make(loader, CONFIG, 'engineering');
    await store.getState().load();
    expect(store.getState().status).toBe('unconfigured');
    expect(loader).not.toHaveBeenCalled();
  });

  it('does nothing before the config is loaded', async () => {
    const loader = vi.fn();
    const store = make(loader, undefined);
    await store.getState().load();
    expect(store.getState().status).toBe('idle');
    expect(loader).not.toHaveBeenCalled();
  });

  it('reports source errors when nothing is loaded yet', async () => {
    const store = make(async () => {
      throw new SourceError('ACCESS_DENIED', msg('error.source.accessDenied'), 403);
    });
    await store.getState().load();
    const { status, error } = store.getState();
    expect(status).toBe('error');
    expect(error?.code).toBe('ACCESS_DENIED');
    expect(translate('vi', error!.title)).toBe('Không tải được dữ liệu');
  });

  it('reports parse failures', async () => {
    const store = make(async () => {
      throw new ParseFailure('NOT_XLSX', msg('error.parse.notXlsx'));
    });
    await store.getState().load();
    const { error } = store.getState();
    expect(error?.code).toBe('NOT_XLSX');
    expect(translate('vi', error!.title)).toBe('Dữ liệu không đúng cấu trúc');
  });

  it('reports config errors', async () => {
    const store = make(async () => {
      throw new ConfigError(msg('error.config.notObject'));
    });
    await store.getState().load();
    expect(store.getState().error?.code).toBe('CONFIG');
  });

  it('keeps the previous data when a refresh fails', async () => {
    let fail = false;
    const store = make(async () => {
      if (fail) throw new SourceError('NETWORK', msg('error.source.network'));
      return { data: 'plan', warnings: [] };
    });
    await store.getState().load();
    fail = true;
    const pending = store.getState().load();
    expect(store.getState().refreshing).toBe(true);
    await pending;
    const s = store.getState();
    expect(s).toMatchObject({ status: 'ready', refreshing: false, data: 'plan' });
    expect(s.refreshError?.code).toBe('NETWORK');
  });

  it('lets the latest load win when two overlap', async () => {
    const first = deferred<{ data: string; warnings: [] }>();
    const second = deferred<{ data: string; warnings: [] }>();
    const results = [first, second];
    const store = make(async () => results.shift()!.promise);
    const a = store.getState().load();
    const b = store.getState().load();
    second.resolve({ data: 'new', warnings: [] });
    await b;
    first.resolve({ data: 'old', warnings: [] });
    await a;
    expect(store.getState().data).toBe('new');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/moduleStore.test.ts`
Expected: FAIL ("Cannot find module './moduleStore'").

- [ ] **Step 3: Implement** — `src/store/moduleStore.ts` (logic moved from `appStore.load()`):

```ts
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { AppConfig, ConfigError, DataSourceConfig, ModuleId } from '../config/config';
import { SourceError } from '../data/sources/sources';
import type { DataWarning } from '../data/types';
import { msg, type Message } from '../i18n/message';

export type LoadStep = 'config' | 'fetch' | 'parse' | 'analyze' | 'done';

export interface LoadError {
  title: Message;
  detail: Message;
  code: string;
}

/** Thrown by a loader when the bytes arrived but do not have the expected structure. */
export class ParseFailure extends Error {
  readonly code: string;
  readonly detail: Message;
  constructor(code: string, detail: Message, message: string = code) {
    super(message);
    this.name = 'ParseFailure';
    this.code = code;
    this.detail = detail;
  }
}

export function toLoadError(error: unknown): LoadError {
  if (error instanceof ParseFailure) return { title: msg('error.title.parse'), detail: error.detail, code: error.code };
  if (error instanceof SourceError) return { title: msg('error.title.source'), detail: error.detail, code: error.code };
  if (error instanceof Error && error.name === 'ConfigError') {
    return { title: msg('error.title.config'), detail: (error as ConfigError).detail, code: 'CONFIG' };
  }
  return {
    title: msg('error.title.unknown'),
    detail: msg('error.unknown', { text: error instanceof Error ? error.message : String(error) }),
    code: 'UNKNOWN',
  };
}

/** Yield to the browser so each loading step can paint. */
export const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface LoadContext {
  signal: AbortSignal;
  now: Date;
  config: AppConfig;
  onStep(step: LoadStep, detail?: Message): void;
}

/** Turns a module's configured source into its data. Throws SourceError / ParseFailure / anything else. */
export type ModuleLoader<T> = (source: DataSourceConfig, ctx: LoadContext) => Promise<{ data: T; warnings: DataWarning[] }>;

export type ModuleStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

export interface ModuleState<T> {
  status: ModuleStatus;
  /** True while reloading on top of data that is already shown. */
  refreshing: boolean;
  step: LoadStep;
  /** Extra detail for the current step, e.g. "573 lines". */
  stepDetail?: Message;
  data?: T;
  warnings: DataWarning[];
  lastSync?: Date;
  /** Set when there is nothing to show. */
  error?: LoadError;
  /** Set when a refresh failed but older data is still shown. */
  refreshError?: LoadError;
  load(): Promise<void>;
}

export type ModuleStore<T> = StoreApi<ModuleState<T>>;

export interface ModuleStoreDeps<T> {
  moduleId: ModuleId;
  loader: ModuleLoader<T>;
  getConfig: () => AppConfig | undefined;
  now: () => Date;
}

/** One store per module: loads its own source on demand, keeps old data when a refresh fails. */
export function createModuleStore<T>(deps: ModuleStoreDeps<T>): ModuleStore<T> {
  let inFlight: AbortController | undefined;

  return createStore<ModuleState<T>>()((set, get) => ({
    status: 'idle',
    refreshing: false,
    step: 'fetch',
    warnings: [],

    async load() {
      const config = deps.getConfig();
      if (!config) return;
      const source = config.dataSources[deps.moduleId];
      if (!source) {
        set({ status: 'unconfigured' });
        return;
      }
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const hadData = get().data !== undefined;
      set({ status: hadData ? 'ready' : 'loading', refreshing: hadData, step: 'fetch', stepDetail: undefined, refreshError: undefined });
      try {
        const { data, warnings } = await deps.loader(source, {
          signal: controller.signal,
          now: deps.now(),
          config,
          onStep: (step, detail) => {
            if (!controller.signal.aborted) set({ step, stepDetail: detail });
          },
        });
        if (controller.signal.aborted) return;
        set({ data, warnings, lastSync: deps.now(), status: 'ready', refreshing: false, step: 'done', error: undefined });
      } catch (error) {
        if (controller.signal.aborted) return;
        const loadError = toLoadError(error);
        if (get().data !== undefined) set({ status: 'ready', refreshing: false, refreshError: loadError, step: 'done' });
        else set({ status: 'error', refreshing: false, error: loadError });
      }
    },
  }));
}
```

Note: `ConfigError` is imported as a type only; the runtime check uses `error.name` exactly like today's `appStore`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/moduleStore.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/store/moduleStore.ts src/store/moduleStore.test.ts
git commit -m "feat(store): add createModuleStore factory for per-module data loading"
```

---

### Task 4: Split `appStore`; Procurement gets its own store

**Files:**
- Rewrite: `src/store/appStore.ts`, `src/store/appStore.test.ts`
- Create: `src/store/useModule.ts`
- Create: `src/modules/procurement/store.ts`, `src/modules/procurement/store.test.ts`
- Create: `src/modules/procurement/metrics.ts`, `src/modules/procurement/metrics.test.ts`
- Modify: `src/ui/hooks/useDashboard.ts`, `src/ui/package/PackageDrawer.tsx`, `src/ui/health/DataHealthPanel.tsx`, `src/ui/states/LoadingScreen.tsx`, `src/ui/states/ErrorScreen.tsx`, `src/ui/shell/Header.tsx`, `src/ui/shell/AppShell.tsx`, `src/test/seedStore.ts`, `src/ui/app.test.tsx`

**Interfaces:**
- Consumes: Task 3 exports; `parsePlan`, `createDataSource`.
- Produces:
  - `appStore` state: `configStatus: 'idle' | 'loading' | 'ready' | 'error'`, `config?`, `configError?: LoadError`, `cutOff: Day`, `theme: Theme`, `lang: Lang`, `sidebarCollapsed: boolean`, `lastQuery: Partial<Record<ModuleId, string>>`, actions `loadConfig()`, `setCutOff(day)`, `toggleTheme()`, `setLang(lang)`, `toggleSidebar()`, `setLastQuery(id, query)`. `appStore.ts` re-exports `type LoadError, type LoadStep` from `./moduleStore`.
  - `useModule<T, U>(store: ModuleStore<T>, selector: (s: ModuleState<T>) => U): U`
  - `createProcurementLoader(createSource?): ModuleLoader<Plan>`, `procurementStore: ModuleStore<Plan>`
  - `procurementMetrics(plan: Plan, cutOff: Day, dueSoonDays: number): LineMetrics[]` (same reference for same inputs)
  - `LoadingScreen({ step, detail })`, `ErrorScreen({ error, onRetry })`, `DataHealthPanel({ open, onClose, warnings })`

- [ ] **Step 1: Write failing tests**

Replace `src/store/appStore.test.ts`:

```ts
import { ConfigError, type AppConfig } from '../config/config';
import { msg } from '../i18n/message';
import { translate } from '../i18n/translate';
import { dayFromISO } from '../lib/day';
import { createAppStore, type StoreDeps } from './appStore';

const CONFIG: AppConfig = {
  appName: 'PMS - PEIW',
  projectName: 'Test Project',
  dataSources: { procurement: { type: 'google-sheet', url: 'https://x' } },
  dueSoonDays: 30,
};

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

const blocked = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

function deps(overrides: Partial<StoreDeps> = {}): StoreDeps {
  return { loadConfig: async () => CONFIG, now: () => new Date(2026, 8, 18), storage: memoryStorage(), ...overrides };
}

describe('appStore', () => {
  it('loads the config once', async () => {
    const loadConfig = vi.fn(async () => CONFIG);
    const store = createAppStore(deps({ loadConfig }));
    expect(store.getState().configStatus).toBe('idle');
    await store.getState().loadConfig();
    await store.getState().loadConfig();
    expect(store.getState()).toMatchObject({ configStatus: 'ready', config: CONFIG });
    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(store.getState().cutOff).toBe(dayFromISO('2026-09-18'));
  });

  it('reports config errors and can retry', async () => {
    let fail = true;
    const store = createAppStore(
      deps({
        loadConfig: async () => {
          if (fail) throw new ConfigError(msg('error.config.notObject'));
          return CONFIG;
        },
      }),
    );
    await store.getState().loadConfig();
    const { configStatus, configError } = store.getState();
    expect(configStatus).toBe('error');
    expect(configError?.code).toBe('CONFIG');
    expect(translate('vi', configError!.title)).toBe('Lỗi cấu hình');
    fail = false;
    await store.getState().loadConfig();
    expect(store.getState().configStatus).toBe('ready');
  });

  it('sets the cut-off', () => {
    const store = createAppStore(deps());
    store.getState().setCutOff(dayFromISO('2030-01-01')!);
    expect(store.getState().cutOff).toBe(dayFromISO('2030-01-01'));
  });

  it('toggles and persists the theme (dark by default)', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    expect(store.getState().theme).toBe('dark');
    store.getState().toggleTheme();
    expect(store.getState().theme).toBe('light');
    expect(storage.data['pms-peiw-theme']).toBe('light');
    expect(createAppStore(deps({ storage })).getState().theme).toBe('light');
  });

  it('defaults the language to English and persists a choice', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    expect(store.getState().lang).toBe('en');
    store.getState().setLang('vi');
    expect(storage.data['pms-peiw-lang']).toBe('vi');
    expect(createAppStore(deps({ storage })).getState().lang).toBe('vi');
    expect(createAppStore(deps({ storage: memoryStorage({ 'pms-peiw-lang': 'fr' }) })).getState().lang).toBe('en');
  });

  it('toggles and persists the sidebar (expanded by default)', () => {
    const storage = memoryStorage();
    const store = createAppStore(deps({ storage }));
    expect(store.getState().sidebarCollapsed).toBe(false);
    store.getState().toggleSidebar();
    expect(store.getState().sidebarCollapsed).toBe(true);
    expect(storage.data['pms-peiw-sidebar']).toBe('collapsed');
    expect(createAppStore(deps({ storage })).getState().sidebarCollapsed).toBe(true);
  });

  it('remembers the last filter query per module', () => {
    const store = createAppStore(deps());
    store.getState().setLastQuery('procurement', '?discipline=A');
    store.getState().setLastQuery('engineering', '');
    expect(store.getState().lastQuery).toEqual({ procurement: '?discipline=A', engineering: '' });
  });

  it('survives blocked storage', () => {
    const store = createAppStore(deps({ storage: blocked }));
    expect(store.getState()).toMatchObject({ theme: 'dark', lang: 'en', sidebarCollapsed: false });
    expect(() => {
      store.getState().toggleTheme();
      store.getState().setLang('vi');
      store.getState().toggleSidebar();
    }).not.toThrow();
  });
});
```

Create `src/modules/procurement/store.test.ts`:

```ts
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
```

Create `src/modules/procurement/metrics.test.ts`:

```ts
import { dayFromISO } from '../../lib/day';
import { samplePlan, TEST_CTX } from '../../test/planFixture';
import { procurementMetrics } from './metrics';

describe('procurementMetrics', () => {
  it('returns the same array for the same inputs', () => {
    const plan = samplePlan();
    const a = procurementMetrics(plan, TEST_CTX.cutOff, 30);
    expect(procurementMetrics(plan, TEST_CTX.cutOff, 30)).toBe(a);
    expect(a).toHaveLength(6);
  });

  it('recomputes when the cut-off changes', () => {
    const plan = samplePlan();
    const overdue = (cutOff: number) => procurementMetrics(plan, cutOff, 30).reduce((n, m) => n + m.overdueCount, 0);
    expect(overdue(dayFromISO('2030-01-01')!)).toBeGreaterThan(overdue(TEST_CTX.cutOff));
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/appStore.test.ts src/modules`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/store/appStore.ts` (full rewrite):

```ts
import { createStore } from 'zustand/vanilla';
import { loadConfig as defaultLoadConfig, type AppConfig, type ModuleId } from '../config/config';
import type { Lang } from '../i18n/message';
import { todayDay, type Day } from '../lib/day';
import { toLoadError, type LoadError } from './moduleStore';

export type { LoadError, LoadStep } from './moduleStore';
export type Theme = 'dark' | 'light';

/** App-wide state shared by every module. Module data lives in each module's own store. */
export interface AppState {
  configStatus: 'idle' | 'loading' | 'ready' | 'error';
  config?: AppConfig;
  configError?: LoadError;
  cutOff: Day;
  theme: Theme;
  lang: Lang;
  sidebarCollapsed: boolean;
  /** Last filter query string (e.g. "?discipline=A") per module, so the sidebar can restore it. */
  lastQuery: Partial<Record<ModuleId, string>>;
  loadConfig(): Promise<void>;
  setCutOff(day: Day): void;
  toggleTheme(): void;
  setLang(lang: Lang): void;
  toggleSidebar(): void;
  setLastQuery(id: ModuleId, query: string): void;
}

export interface StoreDeps {
  loadConfig: typeof defaultLoadConfig;
  now: () => Date;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

const THEME_KEY = 'pms-peiw-theme';
const LANG_KEY = 'pms-peiw-lang';
const SIDEBAR_KEY = 'pms-peiw-sidebar';

function safeStorage(): StoreDeps['storage'] {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function read(storage: StoreDeps['storage'], key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(storage: StoreDeps['storage'], key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be blocked; the choice still applies for this session.
  }
}

export function createAppStore(deps: StoreDeps) {
  const storage = deps.storage;

  return createStore<AppState>()((set, get) => ({
    configStatus: 'idle',
    cutOff: todayDay(deps.now()),
    theme: read(storage, THEME_KEY) === 'light' ? 'light' : 'dark',
    lang: read(storage, LANG_KEY) === 'vi' ? 'vi' : 'en',
    sidebarCollapsed: read(storage, SIDEBAR_KEY) === 'collapsed',
    lastQuery: {},

    async loadConfig() {
      const { configStatus } = get();
      if (configStatus === 'loading' || configStatus === 'ready') return;
      set({ configStatus: 'loading', configError: undefined });
      try {
        set({ config: await deps.loadConfig(), configStatus: 'ready' });
      } catch (error) {
        set({ configStatus: 'error', configError: toLoadError(error) });
      }
    },

    setCutOff(day) {
      set({ cutOff: day });
    },

    toggleTheme() {
      const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
      write(storage, THEME_KEY, theme);
      set({ theme });
    },

    setLang(lang) {
      write(storage, LANG_KEY, lang);
      set({ lang });
    },

    toggleSidebar() {
      const sidebarCollapsed = !get().sidebarCollapsed;
      write(storage, SIDEBAR_KEY, sidebarCollapsed ? 'collapsed' : 'expanded');
      set({ sidebarCollapsed });
    },

    setLastQuery(id, query) {
      if (get().lastQuery[id] === query) return;
      set({ lastQuery: { ...get().lastQuery, [id]: query } });
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;

export const appStore: AppStore = createAppStore({
  loadConfig: defaultLoadConfig,
  now: () => new Date(),
  storage: safeStorage(),
});
```

`src/store/useModule.ts`:

```ts
import { useStore } from 'zustand';
import type { ModuleState, ModuleStore } from './moduleStore';

/** Subscribe a component to a slice of a module's store. */
export function useModule<T, U>(store: ModuleStore<T>, selector: (state: ModuleState<T>) => U): U {
  return useStore(store, selector);
}
```

`src/modules/procurement/store.ts`:

```ts
import { parsePlan } from '../../data/parser/parsePlan';
import { createDataSource } from '../../data/sources/sources';
import type { Plan } from '../../data/types';
import { msg } from '../../i18n/message';
import { appStore } from '../../store/appStore';
import { createModuleStore, nextFrame, ParseFailure, type ModuleLoader } from '../../store/moduleStore';

/** Fetch the procurement workbook and parse it into a Plan. */
export function createProcurementLoader(createSource = createDataSource): ModuleLoader<Plan> {
  return async (source, { signal, now, config, onStep }) => {
    onStep('fetch');
    const buf = await createSource(source).load(signal);
    onStep('parse');
    await nextFrame();
    const parsed = parsePlan(buf, { projectName: config.projectName, sheetName: source.sheetName, now });
    if (!parsed.ok) throw new ParseFailure(parsed.error.code, parsed.error.detail, parsed.error.message);
    onStep('analyze', msg('status.linesLoaded', { count: parsed.plan.lines.length }));
    await nextFrame();
    return { data: parsed.plan, warnings: parsed.plan.warnings };
  };
}

export const procurementStore = createModuleStore<Plan>({
  moduleId: 'procurement',
  loader: createProcurementLoader(),
  getConfig: () => appStore.getState().config,
  now: () => new Date(),
});
```

`src/modules/procurement/metrics.ts`:

```ts
import { computeAllMetrics, type LineMetrics } from '../../analytics/lineMetrics';
import type { Plan } from '../../data/types';
import type { Day } from '../../lib/day';

let last: { plan: Plan; cutOff: Day; dueSoonDays: number; metrics: LineMetrics[] } | undefined;

/**
 * Metrics for the current plan and cut-off. Many components ask at once (header, filter bar,
 * page, drawer); a one-entry cache computes once and hands everyone the same array.
 */
export function procurementMetrics(plan: Plan, cutOff: Day, dueSoonDays: number): LineMetrics[] {
  if (last && last.plan === plan && last.cutOff === cutOff && last.dueSoonDays === dueSoonDays) return last.metrics;
  const metrics = computeAllMetrics(plan.lines, { cutOff, dueSoonDays });
  last = { plan, cutOff, dueSoonDays, metrics };
  return metrics;
}
```

`src/ui/hooks/useDashboard.ts`:

```ts
import { useMemo } from 'react';
import { applyFilters, vocabularyOf } from '../../analytics/filters';
import type { LineMetrics, MetricsContext } from '../../analytics/lineMetrics';
import { procurementMetrics } from '../../modules/procurement/metrics';
import { procurementStore } from '../../modules/procurement/store';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { useFilters } from './useFilters';

const NO_METRICS: LineMetrics[] = [];

/** Everything a procurement view needs: all metrics, the filtered subset and the search vocabulary. */
export function useDashboard() {
  const plan = useModule(procurementStore, (s) => s.data);
  const cutOff = useApp((s) => s.cutOff);
  const dueSoonDays = useApp((s) => s.config?.dueSoonDays ?? 30);
  const metrics = useMemo(() => (plan ? procurementMetrics(plan, cutOff, dueSoonDays) : NO_METRICS), [plan, cutOff, dueSoonDays]);
  const { filters, setFilters, clear } = useFilters();
  const vocab = useMemo(() => vocabularyOf(metrics), [metrics]);
  const filtered = useMemo(() => applyFilters(metrics, filters, vocab), [metrics, filters, vocab]);
  const ctx: MetricsContext = useMemo(() => ({ cutOff, dueSoonDays }), [cutOff, dueSoonDays]);
  const disciplineOrder = useMemo(() => plan?.disciplines.map((d) => d.name) ?? vocab.disciplines, [plan, vocab]);
  return { metrics, filtered, vocab, filters, setFilters, clearFilters: clear, ctx, disciplineOrder };
}
```

`src/ui/package/PackageDrawer.tsx`: remove `useApp` import and the `metrics` / `cutOff` selectors; add `import { useDashboard } from '../hooks/useDashboard';` and replace with

```ts
  const { metrics, ctx } = useDashboard();
  const cutOff = ctx.cutOff;
```

`src/ui/health/DataHealthPanel.tsx`: remove `useApp` import; change the signature and grouping:

```tsx
export function DataHealthPanel({ open, onClose, warnings }: { open: boolean; onClose: () => void; warnings: readonly DataWarning[] }) {
  const { t } = useT();
  const groups = useMemo(() => {
    const map = new Map<WarningCode, DataWarning[]>();
    for (const w of warnings) map.set(w.code, [...(map.get(w.code) ?? []), w]);
    return [...map];
  }, [warnings]);
```

`src/ui/states/LoadingScreen.tsx`: remove `useApp`; signature becomes

```tsx
import type { Message } from '../../i18n/message';
// …
export function LoadingScreen({ step, detail }: { step: LoadStep; detail?: Message }) {
  const { t } = useT();
  const current = STEPS.findIndex((s) => s.key === step);
```

(`LoadStep` import stays `from '../../store/appStore'`, which re-exports it.)

`src/ui/states/ErrorScreen.tsx`: remove the `appStore` value import (keep `type LoadError`), take `onRetry`:

```tsx
import { type LoadError } from '../../store/appStore';
// …
export function ErrorScreen({ error, onRetry }: { error: LoadError; onRetry: () => void }) {
// …
      <button type="button" onClick={onRetry} className="mt-5 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1 hover:bg-ai-1/30">
```

`src/ui/shell/Header.tsx` (interim; Task 9 makes it module-aware): replace the `plan`, `refreshing`, `refreshError` selectors, `load` and `warningCount`:

```ts
import { procurementStore } from '../../modules/procurement/store';
import { useModule } from '../../store/useModule';
// …
  const refreshing = useModule(procurementStore, (s) => s.refreshing);
  const refreshError = useModule(procurementStore, (s) => s.refreshError);
  const lastSync = useModule(procurementStore, (s) => s.lastSync);
  const warnings = useModule(procurementStore, (s) => s.warnings);
  const { setCutOff, toggleTheme, setLang } = appStore.getState();
  const { load } = procurementStore.getState();
  // …
  const warningCount = warnings.filter((w) => w.level !== 'info').length;
```

and in the sync label use `lastSync ? t('header.synced', { time: timeAgo(t, lang, lastSync) }) : ''` instead of `plan ? … plan.loadedAt …`.

`src/ui/shell/AppShell.tsx` (interim; Task 7 moves module states into `ModuleRoute`):

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { procurementStore } from '../../modules/procurement/store';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { PackageDrawer } from '../package/PackageDrawer';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';

export function AppShell() {
  const configStatus = useApp((s) => s.configStatus);
  const configError = useApp((s) => s.configError);
  const theme = useApp((s) => s.theme);
  const lang = useApp((s) => s.lang);
  const appName = useApp((s) => s.config?.appName);
  const status = useModule(procurementStore, (s) => s.status);
  const step = useModule(procurementStore, (s) => s.step);
  const stepDetail = useModule(procurementStore, (s) => s.stepDetail);
  const error = useModule(procurementStore, (s) => s.error);
  const warnings = useModule(procurementStore, (s) => s.warnings);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    void appStore.getState().loadConfig();
  }, []);

  useEffect(() => {
    if (configStatus === 'ready' && procurementStore.getState().status === 'idle') void procurementStore.getState().load();
  }, [configStatus]);

  // (keep the existing data-theme, lang, document.title and scroll-to-top effects unchanged)

  let content: ReactNode;
  if (configStatus === 'error' && configError) content = <ErrorScreen error={configError} onRetry={() => void appStore.getState().loadConfig()} />;
  else if (configStatus !== 'ready') content = <LoadingScreen step="config" />;
  else if (status === 'error' && error) content = <ErrorScreen error={error} onRetry={() => void procurementStore.getState().load()} />;
  else if (status === 'ready') content = <Outlet />;
  else content = <LoadingScreen step={step} detail={stepDetail} />;

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Header onOpenHealth={() => setHealthOpen(true)} />
      {status === 'ready' && <FilterBar />}
      <main>{content}</main>
      {status === 'ready' && (
        <>
          <PackageDrawer />
          <DataHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} warnings={warnings} />
        </>
      )}
    </div>
  );
}
```

`src/test/seedStore.ts`:

```ts
import { procurementStore } from '../modules/procurement/store';
import { appStore } from '../store/appStore';
import { samplePlan, TEST_CTX } from './planFixture';

/** Put the app into a loaded state with the sample plan (UI tests). */
export function seedStore(): void {
  appStore.setState({
    configStatus: 'ready',
    config: { appName: 'PMS - PEIW', projectName: 'Test Project', dataSources: { procurement: { type: 'google-sheet', url: 'x' } }, dueSoonDays: 30 },
    configError: undefined,
    cutOff: TEST_CTX.cutOff,
    lang: 'vi',
    lastQuery: {},
  });
  const plan = samplePlan();
  procurementStore.setState({
    status: 'ready',
    refreshing: false,
    step: 'done',
    data: plan,
    warnings: plan.warnings,
    lastSync: new Date(),
    error: undefined,
    refreshError: undefined,
  });
}
```

`src/ui/app.test.tsx` — in "shows the error screen when loading failed", replace the `appStore.setState(...)` call with:

```ts
    act(() => {
      procurementStore.setState({
        status: 'error',
        data: undefined,
        error: { title: msg('error.title.source'), detail: msg('error.source.accessDenied'), code: 'ACCESS_DENIED' },
      });
    });
```

and add `import { procurementStore } from '../modules/procurement/store';`.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "refactor(store): split app-wide state from a procurement module store"
```

---

### Task 5: Engineering placeholder — loader, store, page

**Files:**
- Modify: `src/data/parser/parsePlan.ts:64` (export `isZip`)
- Create: `src/data/engineering/loadWorkbookSummary.ts`, `src/data/engineering/loadWorkbookSummary.test.ts`
- Create: `src/modules/engineering/store.ts`
- Create: `src/ui/engineering/EngineeringPage.tsx`, `src/ui/engineering/engineering.test.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `createModuleStore`, `ParseFailure`, `nextFrame`, `useModule`.
- Produces: `interface WorkbookSummary { sheetName: string; sheets: string[]; rowCount: number }`, `summarizeWorkbook(buf, sheetName?): WorkbookSummary`, `createEngineeringLoader(createSource?)`, `engineeringStore: ModuleStore<WorkbookSummary>`, `EngineeringPage`.

- [ ] **Step 1: Write failing tests**

`src/data/engineering/loadWorkbookSummary.test.ts`:

```ts
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
```

`src/ui/engineering/engineering.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { engineeringStore } from '../../modules/engineering/store';
import { seedStore } from '../../test/seedStore';
import { EngineeringPage } from './EngineeringPage';

beforeEach(seedStore);

describe('EngineeringPage', () => {
  it('shows what was loaded from the engineering source', () => {
    engineeringStore.setState({ status: 'ready', data: { sheetName: 'ENG', sheets: ['ENG'], rowCount: 42 } });
    render(<EngineeringPage />);
    expect(screen.getByText('Đã tải 42 dòng từ sheet “ENG”. Nội dung dashboard Engineering sẽ được thiết kế ở buổi sau.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/data/engineering src/ui/engineering`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/data/parser/parsePlan.ts` line 64 change `function isZip(` to `export function isZip(`.

`src/data/engineering/loadWorkbookSummary.ts`:

```ts
import * as XLSX from 'xlsx';
import { msg } from '../../i18n/message';
import { ParseFailure } from '../../store/moduleStore';
import { isZip } from '../parser/parsePlan';

/** What the Engineering placeholder knows about its workbook until the real parser exists. */
export interface WorkbookSummary {
  sheetName: string;
  sheets: string[];
  rowCount: number;
}

/** Open the workbook and count the non-blank rows of the chosen sheet (first sheet by default). */
export function summarizeWorkbook(buf: ArrayBuffer, sheetName?: string): WorkbookSummary {
  if (!isZip(buf)) throw new ParseFailure('NOT_XLSX', msg('error.parse.notXlsx'));
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    throw new ParseFailure('NOT_XLSX', msg('error.parse.corrupt'));
  }
  const name = sheetName ?? workbook.SheetNames[0];
  const sheet = name ? workbook.Sheets[name] : undefined;
  if (!name || !sheet) {
    throw new ParseFailure('SHEET_NOT_FOUND', msg('error.parse.sheetNotFound', { sheet: name ?? '', sheets: workbook.SheetNames.join(', ') }));
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
  return { sheetName: name, sheets: workbook.SheetNames, rowCount: rows.length };
}
```

`src/modules/engineering/store.ts`:

```ts
import { summarizeWorkbook, type WorkbookSummary } from '../../data/engineering/loadWorkbookSummary';
import { createDataSource } from '../../data/sources/sources';
import { appStore } from '../../store/appStore';
import { createModuleStore, nextFrame, type ModuleLoader } from '../../store/moduleStore';

export function createEngineeringLoader(createSource = createDataSource): ModuleLoader<WorkbookSummary> {
  return async (source, { signal, onStep }) => {
    onStep('fetch');
    const buf = await createSource(source).load(signal);
    onStep('parse');
    await nextFrame();
    return { data: summarizeWorkbook(buf, source.sheetName), warnings: [] };
  };
}

export const engineeringStore = createModuleStore<WorkbookSummary>({
  moduleId: 'engineering',
  loader: createEngineeringLoader(),
  getConfig: () => appStore.getState().config,
  now: () => new Date(),
});
```

`src/ui/engineering/EngineeringPage.tsx`:

```tsx
import { useT } from '../../i18n/useT';
import { engineeringStore } from '../../modules/engineering/store';
import { useModule } from '../../store/useModule';
import { Card, Stagger } from '../common/Card';
import { ErrorBoundary } from '../common/ErrorBoundary';

/** Placeholder until the Engineering dashboard is designed: proves the source loads end to end. */
export function EngineeringPage() {
  const { t } = useT();
  const summary = useModule(engineeringStore, (s) => s.data);
  if (!summary) return null;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label={t('engineering.placeholder.title')}>
        <Card title={t('engineering.placeholder.title')}>
          <p className="text-sm text-ink-2">{t('engineering.placeholder.detail', { rows: summary.rowCount, sheet: summary.sheetName })}</p>
        </Card>
      </ErrorBoundary>
    </Stagger>
  );
}
```

i18n — add a new section at the end of both dictionaries (before `} as const;` in `en.ts`, before `};` in `vi.ts`):

```ts
  // Engineering placeholder page (src/ui/engineering/EngineeringPage.tsx).
  'engineering.placeholder.title': 'Engineering',
  'engineering.placeholder.detail': 'Loaded {rows} {rows|row|rows} from sheet “{sheet}”. The Engineering dashboard content will be designed in a later session.',
```

```ts
  // Engineering placeholder page (src/ui/engineering/EngineeringPage.tsx).
  'engineering.placeholder.title': 'Engineering',
  'engineering.placeholder.detail': 'Đã tải {rows} dòng từ sheet “{sheet}”. Nội dung dashboard Engineering sẽ được thiết kế ở buổi sau.',
```

Also add to `seedStore()` (so UI tests start from a known engineering state):

```ts
  engineeringStore.setState({ status: 'idle', refreshing: false, step: 'fetch', data: undefined, warnings: [], error: undefined, refreshError: undefined });
```

with `import { engineeringStore } from '../modules/engineering/store';`.

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/data src/ui/engineering && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data src/modules/engineering src/ui/engineering src/i18n src/test/seedStore.ts
git commit -m "feat(engineering): placeholder module store and page over its own workbook"
```

---

### Task 6: Module contract and registry

**Files:**
- Create: `src/modules/types.ts`, `src/modules/registry.ts`, `src/modules/registry.test.ts`
- Create: `src/modules/procurement/module.ts`, `src/modules/engineering/module.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `procurementStore`, `engineeringStore`, `useDashboard`, `FILTER_KEYS`.
- Produces:
  ```ts
  type Translate = ReturnType<typeof useT>['t'];
  interface FacetOption { value: string; label: string }
  interface FacetDef<T> { key: string; labelKey: MessageKey; options(data: T, t: Translate): FacetOption[] }
  interface ModuleSearch { value: string; vocab: SearchVocabulary; onChange(q: string): void }
  interface ResultCount { shown: number; total: number; unitKey: MessageKey }
  interface ModuleDefinition<T> { id: ModuleId; path: string; labelKey: MessageKey; icon: string; store: ModuleStore<T>; facets: FacetDef<T>[]; useSearch?(): ModuleSearch; useResultCount?(): ResultCount }
  type AnyModule = ModuleDefinition<any>;
  const modules: readonly AnyModule[];                 // [engineeringModule, procurementModule]
  function moduleForPath(pathname: string): AnyModule | undefined;
  function filterKeys(module: AnyModule): string[];     // facet keys + 'q' when useSearch exists
  function useActiveModule(): AnyModule | undefined;
  const procurementModule: ModuleDefinition<Plan>;
  const engineeringModule: ModuleDefinition<WorkbookSummary>;
  ```

- [ ] **Step 1: Write failing tests** — `src/modules/registry.test.ts`:

```ts
import { MODULE_IDS } from '../config/config';
import { translate } from '../i18n/translate';
import { samplePlan } from '../test/planFixture';
import { procurementModule } from './procurement/module';
import { filterKeys, moduleForPath, modules } from './registry';

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) => translate('en', key, params);

describe('module registry', () => {
  it('lists ENGINEERING then PROCUREMENT, one per module id', () => {
    expect(modules.map((m) => m.id)).toEqual(['engineering', 'procurement']);
    expect([...modules.map((m) => m.id)].sort()).toEqual([...MODULE_IDS].sort());
    expect(modules.map((m) => m.path)).toEqual(['/engineering', '/procurement']);
  });

  it('finds the module of a path by prefix', () => {
    expect(moduleForPath('/procurement')?.id).toBe('procurement');
    expect(moduleForPath('/procurement/discipline/MECHANICAL')?.id).toBe('procurement');
    expect(moduleForPath('/engineering')?.id).toBe('engineering');
    expect(moduleForPath('/procurementx')).toBeUndefined();
    expect(moduleForPath('/')).toBeUndefined();
  });

  it('knows which query keys are filters', () => {
    expect(filterKeys(procurementModule)).toEqual(['discipline', 'facility', 'type', 'phase', 'flag', 'q']);
    expect(filterKeys(modules[0])).toEqual([]);
  });

  it('builds procurement facet options from the plan', () => {
    const plan = samplePlan();
    const options = Object.fromEntries(procurementModule.facets.map((f) => [f.key, f.options(plan, t)]));
    expect(options.discipline.map((o) => o.value)).toContain('MECHANICAL');
    expect(options.facility.map((o) => o.value)).toEqual([...options.facility.map((o) => o.value)].sort((a, b) => a.localeCompare(b)));
    expect(options.type.map((o) => o.value)).toEqual(['Tagged', 'Bulk']);
    expect(options.flag.find((o) => o.value === 'rosRisk')?.label).toBe('ROS at risk');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/modules/registry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/modules/types.ts`:

```ts
import type { SearchVocabulary } from '../analytics/search';
import type { ModuleId } from '../config/config';
import type { MessageKey } from '../i18n/en';
import type { useT } from '../i18n/useT';
import type { ModuleStore } from '../store/moduleStore';

export type { ModuleId };
export type Translate = ReturnType<typeof useT>['t'];

export interface FacetOption {
  value: string;
  label: string;
}

/** One filter dropdown. The shared FilterBar draws it; `key` is its URL query key. */
export interface FacetDef<T> {
  key: string;
  labelKey: MessageKey;
  options(data: T, t: Translate): FacetOption[];
}

export interface ModuleSearch {
  value: string;
  vocab: SearchVocabulary;
  onChange(q: string): void;
}

export interface ResultCount {
  shown: number;
  total: number;
  /** Plural unit taking `{n}`, e.g. 'unit.lines'. */
  unitKey: MessageKey;
}

/**
 * Everything the shared shell needs to know about a dashboard. Routes are not here: they stay in App.tsx.
 * The optional hooks are only called from components keyed by `id`, so switching modules remounts them.
 */
export interface ModuleDefinition<T> {
  id: ModuleId;
  path: string;
  labelKey: MessageKey;
  icon: string;
  store: ModuleStore<T>;
  /** Empty → no filter bar. */
  facets: FacetDef<T>[];
  /** Present → the header shows the AskBox and `q` counts as a filter key. */
  useSearch?(): ModuleSearch;
  /** Present → the filter bar shows "shown / total unit". */
  useResultCount?(): ResultCount;
}

// The shell handles modules of different data types side by side.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyModule = ModuleDefinition<any>;
```

`src/modules/procurement/module.ts`:

```ts
import type { Flag } from '../../analytics/filters';
import { LINE_PHASE_LABEL, LINE_PHASE_ORDER } from '../../data/milestones';
import type { Plan } from '../../data/types';
import type { MessageKey } from '../../i18n/en';
import { FILTER_KEYS } from '../../store/urlFilters';
import { useDashboard } from '../../ui/hooks/useDashboard';
import type { FacetOption, ModuleDefinition } from '../types';
import { procurementStore } from './store';

const FLAG_LABEL_KEY: Record<Flag, MessageKey> = {
  rosRisk: 'filter.flag.rosRisk',
  slipped: 'filter.flag.slipped',
  overdue: 'filter.flag.overdue',
  dueSoon: 'filter.flag.dueSoon',
};

const same = (value: string): FacetOption => ({ value, label: value });
const distinct = (values: string[]) => [...new Set(values)];

export const procurementModule: ModuleDefinition<Plan> = {
  id: 'procurement',
  path: '/procurement',
  labelKey: 'module.procurement',
  icon: '▦',
  store: procurementStore,
  facets: [
    { key: FILTER_KEYS.disciplines, labelKey: 'filter.discipline', options: (plan) => distinct(plan.lines.map((l) => l.discipline)).map(same) },
    {
      key: FILTER_KEYS.facilities,
      labelKey: 'filter.facility',
      options: (plan) => distinct(plan.lines.map((l) => l.facility)).sort((a, b) => a.localeCompare(b)).map(same),
    },
    { key: FILTER_KEYS.itemTypes, labelKey: 'filter.itemType', options: () => ['Tagged', 'Bulk'].map(same) },
    { key: FILTER_KEYS.phases, labelKey: 'filter.phaseLabel', options: () => LINE_PHASE_ORDER.map((p) => ({ value: p, label: LINE_PHASE_LABEL[p] })) },
    {
      key: FILTER_KEYS.flags,
      labelKey: 'filter.flagsLabel',
      options: (_, t) => (Object.keys(FLAG_LABEL_KEY) as Flag[]).map((f) => ({ value: f, label: t(FLAG_LABEL_KEY[f]) })),
    },
  ],
  useSearch() {
    const { filters, setFilters, vocab } = useDashboard();
    return { value: filters.q, vocab, onChange: (q) => setFilters({ q }) };
  },
  useResultCount() {
    const { filtered, metrics } = useDashboard();
    return { shown: filtered.length, total: metrics.length, unitKey: 'unit.lines' };
  },
};
```

`src/modules/engineering/module.ts`:

```ts
import type { WorkbookSummary } from '../../data/engineering/loadWorkbookSummary';
import type { ModuleDefinition } from '../types';
import { engineeringStore } from './store';

/** Placeholder: no filters or search until the Engineering content is designed. */
export const engineeringModule: ModuleDefinition<WorkbookSummary> = {
  id: 'engineering',
  path: '/engineering',
  labelKey: 'module.engineering',
  icon: '⚙',
  store: engineeringStore,
  facets: [],
};
```

`src/modules/registry.ts`:

```ts
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { engineeringModule } from './engineering/module';
import { procurementModule } from './procurement/module';
import type { AnyModule } from './types';

/** Sidebar order. Adding a dashboard = one entry here + its route in App.tsx. */
export const modules: readonly AnyModule[] = [engineeringModule, procurementModule];

export function moduleForPath(pathname: string): AnyModule | undefined {
  return modules.find((m) => pathname === m.path || pathname.startsWith(`${m.path}/`));
}

/** URL keys that belong to a module's filters (remembered per module); drawer keys such as `pkg` are not. */
export function filterKeys(module: AnyModule): string[] {
  return [...module.facets.map((f) => f.key), ...(module.useSearch ? ['q'] : [])];
}

/** The module owning the current page, or undefined (e.g. the 404 page). */
export function useActiveModule(): AnyModule | undefined {
  const { pathname } = useLocation();
  return useMemo(() => moduleForPath(pathname), [pathname]);
}
```

i18n — `en.ts` (new "Modules" section) and `vi.ts`:

```ts
  // Modules and the shared sidebar (src/modules, src/ui/shell/Sidebar.tsx).
  'module.procurement': 'Procurement',
  'module.engineering': 'Engineering',
  'module.unconfigured.title': 'No data source configured',
  'module.unconfigured.detail': 'Add "dataSources.{id}" to config.json to load the {module} dashboard.',
  'sidebar.label': 'Dashboards',
  'sidebar.collapse': 'Collapse sidebar',
  'sidebar.expand': 'Expand sidebar',
  'sidebar.open': 'Open menu',
  'notFound.title': 'Page not found.',
  'notFound.back': 'Back to the dashboard',
  'filter.discipline': 'Discipline',
  'filter.facility': 'Facility',
  'filter.itemType': 'Tagged/Bulk',
```

```ts
  // Modules and the shared sidebar (src/modules, src/ui/shell/Sidebar.tsx).
  'module.procurement': 'Procurement',
  'module.engineering': 'Engineering',
  'module.unconfigured.title': 'Chưa cấu hình nguồn dữ liệu',
  'module.unconfigured.detail': 'Thêm "dataSources.{id}" vào config.json để tải dashboard {module}.',
  'sidebar.label': 'Dashboard',
  'sidebar.collapse': 'Thu gọn thanh bên',
  'sidebar.expand': 'Mở rộng thanh bên',
  'sidebar.open': 'Mở menu',
  'notFound.title': 'Không tìm thấy trang.',
  'notFound.back': 'Về dashboard',
  'filter.discipline': 'Discipline',
  'filter.facility': 'Facility',
  'filter.itemType': 'Tagged/Bulk',
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/modules && npm run typecheck`
Expected: PASS. (If `tsc` reports the eslint comment as unused, delete it — the project has no ESLint.)

- [ ] **Step 5: Commit**

```bash
git add src/modules src/i18n
git commit -m "feat(modules): module contract, registry and procurement/engineering definitions"
```

---

### Task 7: Routing — `/procurement`, `/engineering`, `ModuleRoute`, redirects, 404

**Files:**
- Create: `src/ui/shell/ModuleRoute.tsx`, `src/ui/shell/LegacyRedirect.tsx`, `src/ui/states/NotFound.tsx`, `src/ui/states/UnconfiguredScreen.tsx`
- Create: `src/ui/shell/routing.test.tsx`
- Modify: `src/App.tsx`, `src/ui/shell/AppShell.tsx`, `src/ui/overview/DisciplineGrid.tsx:26`, `src/ui/discipline/DisciplinePage.tsx:27,40,47`
- Modify tests: `src/ui/app.test.tsx`, `src/ui/discipline/discipline.test.tsx`

**Interfaces:**
- Consumes: `modules`, `filterKeys`, `AnyModule`, `procurementModule`, `engineeringModule`, `migrateLegacyParams`, `appStore.setLastQuery`, `useModule`.
- Produces: `ModuleRoute({ module, overlay? })`, `filterQuery(search: string, keys: readonly string[]): string` (returns `''` or `'?…'`), `LegacyRedirect`, `NotFound`, `UnconfiguredScreen({ module })`.

- [ ] **Step 1: Write failing tests** — `src/ui/shell/routing.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../App';
import { engineeringStore } from '../../modules/engineering/store';
import { appStore } from '../../store/appStore';
import { seedStore } from '../../test/seedStore';
import { filterQuery } from './ModuleRoute';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('routing', () => {
  it('sends the root to procurement for now', async () => {
    const router = renderAt('/');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement'));
    expect(await screen.findByText('AI Insights')).toBeInTheDocument();
  });

  it('translates old filter links', async () => {
    const router = renderAt('/?d=MECHANICAL,PIPING&pkg=MEC-001');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement'));
    expect(router.state.location.search).toBe('?discipline=MECHANICAL&discipline=PIPING&pkg=MEC-001');
  });

  it('translates old discipline links', async () => {
    const router = renderAt('/discipline/MECHANICAL?f=BF');
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement/discipline/MECHANICAL'));
    expect(router.state.location.search).toBe('?facility=BF');
  });

  it('shows a 404 page for unknown paths', async () => {
    renderAt('/nope');
    expect(await screen.findByText('Không tìm thấy trang.')).toBeInTheDocument();
  });

  it('does not load the engineering source while on procurement', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    expect(engineeringStore.getState().status).toBe('idle');
  });

  it('explains a module without a configured source', async () => {
    renderAt('/engineering');
    expect(await screen.findByText('Chưa cấu hình nguồn dữ liệu')).toBeInTheDocument();
    expect(screen.getByText('Thêm "dataSources.engineering" vào config.json để tải dashboard Engineering.')).toBeInTheDocument();
  });

  it('remembers only the filter keys of the module', async () => {
    renderAt('/procurement?discipline=MECHANICAL&pkg=MEC-001');
    await screen.findByText('AI Insights');
    expect(appStore.getState().lastQuery.procurement).toBe('?discipline=MECHANICAL');
  });
});

describe('filterQuery', () => {
  it('keeps listed keys in order and drops the rest', () => {
    expect(filterQuery('?pkg=X&discipline=A&q=loa&discipline=B', ['discipline', 'q'])).toBe('?discipline=A&q=loa&discipline=B');
    expect(filterQuery('?pkg=X', ['discipline'])).toBe('');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/shell/routing.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/ui/states/UnconfiguredScreen.tsx`:

```tsx
import { useT } from '../../i18n/useT';
import type { AnyModule } from '../../modules/types';

export function UnconfiguredScreen({ module }: { module: AnyModule }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        {module.icon}
      </p>
      <h1 className="mt-3 text-lg font-semibold">{t('module.unconfigured.title')}</h1>
      <p className="mt-2 text-sm text-ink-2">{t('module.unconfigured.detail', { id: module.id, module: t(module.labelKey) })}</p>
    </div>
  );
}
```

`src/ui/states/NotFound.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/useT';

export function NotFound() {
  const { t } = useT();
  return (
    <div className="px-4 py-16 text-center text-sm text-ink-2">
      {t('notFound.title')}{' '}
      <Link to="/" className="text-ai-1 underline">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
```

`src/ui/shell/LegacyRedirect.tsx`:

```tsx
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { procurementModule } from '../../modules/procurement/module';
import { migrateLegacyParams } from './legacyUrl';

/** `#/` and `#/discipline/:name` from before the module shell; `#/` becomes the index page later. */
export function LegacyRedirect() {
  const { name } = useParams();
  const { search } = useLocation();
  const query = migrateLegacyParams(new URLSearchParams(search)).toString();
  const base = procurementModule.path;
  const pathname = name === undefined ? base : `${base}/discipline/${encodeURIComponent(name)}`;
  return <Navigate replace to={{ pathname, search: query ? `?${query}` : '' }} />;
}
```

`src/ui/shell/ModuleRoute.tsx`:

```tsx
import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { filterKeys } from '../../modules/registry';
import type { AnyModule } from '../../modules/types';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { UnconfiguredScreen } from '../states/UnconfiguredScreen';

/** The query string reduced to `keys` (same order), as "" or "?…". */
export function filterQuery(search: string, keys: readonly string[]): string {
  const next = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(search)) if (keys.includes(key)) next.append(key, value);
  const query = next.toString();
  return query ? `?${query}` : '';
}

/** Layout route of one module: loads its source on first visit, shows its state, remembers its filters. */
export function ModuleRoute({ module, overlay }: { module: AnyModule; overlay?: ReactNode }) {
  const configReady = useApp((s) => s.configStatus === 'ready');
  const status = useModule(module.store, (s) => s.status);
  const step = useModule(module.store, (s) => s.step);
  const stepDetail = useModule(module.store, (s) => s.stepDetail);
  const error = useModule(module.store, (s) => s.error);
  const { search } = useLocation();

  useEffect(() => {
    if (configReady && module.store.getState().status === 'idle') void module.store.getState().load();
  }, [configReady, module]);

  useEffect(() => {
    appStore.getState().setLastQuery(module.id, filterQuery(search, filterKeys(module)));
  }, [search, module]);

  if (status === 'unconfigured') return <UnconfiguredScreen module={module} />;
  if (status === 'error' && error) return <ErrorScreen error={error} onRetry={() => void module.store.getState().load()} />;
  if (status !== 'ready') return <LoadingScreen step={step} detail={stepDetail} />;
  return (
    <>
      <Outlet />
      {overlay}
    </>
  );
}
```

`src/App.tsx`:

```tsx
import { MotionConfig } from 'motion/react';
import { createHashRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { engineeringModule } from './modules/engineering/module';
import { procurementModule } from './modules/procurement/module';
import { PackageDrawer } from './ui/package/PackageDrawer';
import { AppShell } from './ui/shell/AppShell';
import { LegacyRedirect } from './ui/shell/LegacyRedirect';
import { ModuleRoute } from './ui/shell/ModuleRoute';
import { NotFound } from './ui/states/NotFound';

/** Hash routing: works from any static host path without server rewrites. Module pages load lazily. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      // Until the index page exists, the root (and old links) go to Procurement.
      { index: true, element: <LegacyRedirect /> },
      { path: 'discipline/:name', element: <LegacyRedirect /> },
      {
        path: 'procurement',
        element: <ModuleRoute module={procurementModule} overlay={<PackageDrawer />} />,
        children: [
          { index: true, lazy: () => import('./ui/overview/OverviewPage').then((m) => ({ Component: m.OverviewPage })) },
          { path: 'discipline/:name', lazy: () => import('./ui/discipline/DisciplinePage').then((m) => ({ Component: m.DisciplinePage })) },
        ],
      },
      {
        path: 'engineering',
        element: <ModuleRoute module={engineeringModule} />,
        children: [{ index: true, lazy: () => import('./ui/engineering/EngineeringPage').then((m) => ({ Component: m.EngineeringPage })) }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return (
    // Motion follows the OS "reduce motion" setting for every animated component.
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  );
}
```

`src/ui/shell/AppShell.tsx` — module states now live in `ModuleRoute`; the shell only handles config. Replace the interim body from Task 4:

```tsx
import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { procurementStore } from '../../modules/procurement/store';
import { useActiveModule } from '../../modules/registry';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';

export function AppShell() {
  const configStatus = useApp((s) => s.configStatus);
  const configError = useApp((s) => s.configError);
  const theme = useApp((s) => s.theme);
  const lang = useApp((s) => s.lang);
  const appName = useApp((s) => s.config?.appName);
  const module = useActiveModule();
  // Interim until Task 9: the filter bar and Data Health still speak procurement only.
  const procurementReady = useModule(procurementStore, (s) => s.status === 'ready');
  const warnings = useModule(procurementStore, (s) => s.warnings);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    void appStore.getState().loadConfig();
  }, []);

  // (keep the existing data-theme, lang, document.title and scroll-to-top effects unchanged)

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Header onOpenHealth={() => setHealthOpen(true)} />
      {module?.id === 'procurement' && procurementReady && <FilterBar />}
      <main>
        {configStatus === 'error' && configError ? (
          <ErrorScreen error={configError} onRetry={() => void appStore.getState().loadConfig()} />
        ) : configStatus === 'ready' ? (
          <Outlet />
        ) : (
          <LoadingScreen step="config" />
        )}
      </main>
      <DataHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} warnings={warnings} />
    </div>
  );
}
```

Internal links:
- `src/ui/overview/DisciplineGrid.tsx:26` → ``pathname: `${procurementModule.path}/discipline/${encodeURIComponent(h.name)}` `` with `import { procurementModule } from '../../modules/procurement/module';`
- `src/ui/discipline/DisciplinePage.tsx`: import `procurementModule` the same way; the not-found link `to="/"` → `to={procurementModule.path}`; the back link `pathname: '/'` → `pathname: procurementModule.path`; the discipline nav ``pathname: `/discipline/${…}` `` → ``pathname: `${procurementModule.path}/discipline/${encodeURIComponent(d)}` ``.

Test updates:
- `src/ui/discipline/discipline.test.tsx` `renderAt`: route paths become `'/procurement/discipline/:name'` and `'/procurement'`; every `renderAt('/discipline/…')` becomes `renderAt('/procurement/discipline/…')`.
- `src/ui/app.test.tsx`: pages are lazy now, so make each test `async` and wait for the first page element. Replace `renderAt('/')` with `await renderPage('/procurement')`:

  ```tsx
  async function renderPage(path: string) {
    const router = renderAt(path);
    await screen.findByText('AI Insights');
    return router;
  }
  ```

  In "drills into a discipline": expect `'/procurement/discipline/MECHANICAL'` and add `await screen.findByRole('table')` before querying the table. In "shows the error screen": call `renderAt('/procurement')` (no wait for AI Insights) and use `await screen.findByText('Không tải được dữ liệu')`. In "scrolls to the top…", after clicking the MECHANICAL link add `await screen.findByRole('table')` before asserting `scrollTo`.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(routing): /procurement and /engineering module routes with lazy pages and legacy redirects"
```

---

### Task 8: Sidebar (desktop + mobile)

**Files:**
- Modify: `src/ui/common/Drawer.tsx`
- Create: `src/ui/shell/Sidebar.tsx`, `src/ui/shell/sidebar.test.tsx`
- Modify: `src/ui/shell/AppShell.tsx`, `src/ui/shell/Header.tsx`

**Interfaces:**
- Consumes: `modules`, `appStore.toggleSidebar`, `lastQuery`.
- Produces: `Drawer` prop `side?: 'left' | 'right'` (default `'right'`); `Sidebar()`; `MobileNav({ open, onClose })`; `Header` prop `onOpenNav: () => void`.

- [ ] **Step 1: Write failing tests** — `src/ui/shell/sidebar.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../App';
import { appStore } from '../../store/appStore';
import { seedStore } from '../../test/seedStore';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const sidebar = () => screen.getAllByRole('navigation', { name: 'Dashboard' })[0];

beforeEach(() => {
  seedStore();
  appStore.setState({ sidebarCollapsed: false });
});

describe('Sidebar', () => {
  it('lists ENGINEERING then PROCUREMENT and marks the active module by path prefix', async () => {
    renderAt('/procurement/discipline/MECHANICAL');
    await screen.findByRole('table');
    const links = within(sidebar()).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['⚙Engineering', '▦Procurement']);
    expect(links[1]).toHaveAttribute('aria-current', 'page');
    expect(links[0]).not.toHaveAttribute('aria-current');
  });

  it('restores the filters of a module when coming back to it', async () => {
    const router = renderAt('/procurement?discipline=MECHANICAL&pkg=MEC-001');
    await screen.findByText('AI Insights');
    fireEvent.click(within(sidebar()).getByRole('link', { name: /Engineering/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/engineering'));
    fireEvent.click(within(sidebar()).getByRole('link', { name: /Procurement/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/procurement'));
    expect(router.state.location.search).toBe('?discipline=MECHANICAL');
  });

  it('collapses to icons and remembers it', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn thanh bên' }));
    expect(appStore.getState().sidebarCollapsed).toBe(true);
    const link = within(sidebar()).getByRole('link', { name: 'Procurement' });
    expect(link).toHaveAttribute('title', 'Procurement');
    expect(link.textContent).toBe('▦');
    expect(screen.getByRole('button', { name: 'Mở rộng thanh bên' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens as a drawer from the header menu button on phones and closes after choosing', async () => {
    const router = renderAt('/procurement');
    await screen.findByText('AI Insights');
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('link', { name: /Engineering/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/engineering'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/shell/sidebar.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/ui/common/Drawer.tsx`: add `side?: 'left' | 'right';` to `DrawerProps` (doc comment: `/** Edge the sheet slides from; right by default. */`), destructure `side = 'right'`, and change the `motion.aside`:

```tsx
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={`absolute inset-y-0 ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} flex w-full flex-col border-line bg-bg shadow-2xl ${width}`}
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? '-100%' : '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
```

Update the component doc comment to `/** Side sheet (full screen on phones), closes on Escape or backdrop click. */`.

`src/ui/shell/Sidebar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';
import { useT } from '../../i18n/useT';
import { modules } from '../../modules/registry';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { Drawer } from '../common/Drawer';

/** One link per module; each link reopens the module with the filters it had last time. */
function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { t } = useT();
  const lastQuery = useApp((s) => s.lastQuery);
  return (
    <ul className="grid gap-1">
      {modules.map((m) => {
        const label = t(m.labelKey);
        return (
          <li key={m.id}>
            <NavLink
              to={{ pathname: m.path, search: lastQuery[m.id] ?? '' }}
              onClick={onNavigate}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-lg border-l-2 px-3 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  isActive ? 'border-ai-1 bg-ai-1/10 text-ink' : 'border-transparent text-ink-3 hover:text-ink'
                }`
              }
            >
              <span aria-hidden className="w-4 shrink-0 text-center">
                {m.icon}
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}

/** Desktop sidebar; collapses to icons. Hidden on phones (see MobileNav). */
export function Sidebar() {
  const { t } = useT();
  const collapsed = useApp((s) => s.sidebarCollapsed);
  return (
    <nav
      aria-label={t('sidebar.label')}
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-bg py-3 md:flex ${collapsed ? 'w-14 px-1.5' : 'w-56 px-2'}`}
    >
      <NavItems collapsed={collapsed} />
      <button
        type="button"
        onClick={() => appStore.getState().toggleSidebar()}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
        className="mt-auto flex h-9 items-center justify-center rounded-lg text-ink-3 hover:text-ink"
      >
        <span aria-hidden>{collapsed ? '»' : '«'}</span>
      </button>
    </nav>
  );
}

/** The same links in a left drawer, opened from the header's ☰ button on phones. */
export function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <Drawer open={open} onClose={onClose} side="left" width="max-w-[80vw] sm:max-w-xs" title={<h2 className="text-base font-semibold">{t('sidebar.label')}</h2>}>
      <nav aria-label={t('sidebar.label')}>
        <NavItems collapsed={false} onNavigate={onClose} />
      </nav>
    </Drawer>
  );
}
```

`src/ui/shell/AppShell.tsx` — wrap the layout (keep everything else):

```tsx
  const [navOpen, setNavOpen] = useState(false);
  // …
  return (
    <div className="flex min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Sidebar />
      <div className="min-w-0 flex-1">
        <Header onOpenHealth={() => setHealthOpen(true)} onOpenNav={() => setNavOpen(true)} />
        {/* FilterBar and <main> exactly as before */}
      </div>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
      {/* DataHealthPanel as before */}
    </div>
  );
```

with `import { MobileNav, Sidebar } from './Sidebar';`.

`src/ui/shell/Header.tsx`: signature `export function Header({ onOpenHealth, onOpenNav }: { onOpenHealth: () => void; onOpenNav: () => void })`; insert as the first child of the inner flex row, before the logo `<Link>`:

```tsx
        <button
          type="button"
          onClick={onOpenNav}
          aria-label={t('sidebar.open')}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink md:hidden"
        >
          <span aria-hidden>☰</span>
        </button>
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(shell): left sidebar with per-module filter memory, collapsible, drawer on phones"
```

---

### Task 9: Shell reads the active module — Header, Data Health, schema-driven FilterBar

**Files:**
- Create: `src/ui/shell/useFacetParams.ts`
- Rewrite: `src/ui/shell/FilterBar.tsx`
- Modify: `src/ui/shell/Header.tsx`, `src/ui/shell/AppShell.tsx`
- Create: `src/ui/shell/shell.test.tsx`

**Interfaces:**
- Consumes: `useActiveModule`, `filterKeys`, `AnyModule`, `useModule`, `MultiSelect`, `AskBox`.
- Produces: `useFacetParams(keys: readonly string[]): { values: Record<string, string[]>; setValues(key: string, next: string[]): void; clear(): void }`; `FilterBar({ module })`.

- [ ] **Step 1: Write failing tests** — `src/ui/shell/shell.test.tsx`:

```tsx
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createMemoryRouter, MemoryRouter, RouterProvider, useLocation } from 'react-router-dom';
import { routes } from '../../App';
import { engineeringStore } from '../../modules/engineering/store';
import { procurementStore } from '../../modules/procurement/store';
import { seedStore } from '../../test/seedStore';
import { useFacetParams } from './useFacetParams';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

const ENG_READY = { status: 'ready' as const, data: { sheetName: 'ENG', sheets: ['ENG'], rowCount: 3 }, warnings: [] };

beforeEach(seedStore);

describe('shared shell per module', () => {
  it('names the active module in the header subtitle', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    expect(screen.getByText('Test Project · Procurement')).toBeInTheDocument();
  });

  it('hides the AskBox and the filter bar on a module without search or facets', async () => {
    engineeringStore.setState(ENG_READY);
    renderAt('/engineering');
    await screen.findByText(/Đã tải 3 dòng/);
    expect(screen.getByText('Test Project · Engineering')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Ask PMS - PEIW/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Discipline/ })).not.toBeInTheDocument();
  });

  it('draws the procurement facets with translated labels and the result count', async () => {
    renderAt('/procurement');
    await screen.findByText('AI Insights');
    for (const label of ['Discipline', 'Facility', 'Tagged/Bulk', 'Phase (kế hoạch)', 'Cảnh báo']) {
      expect(screen.getAllByRole('button', { name: new RegExp(label.replace(/[()]/g, '\\$&')) }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText((_, el) => el?.textContent === '6 / 6 dòng').length).toBeGreaterThan(0);
  });

  it('refreshes the store of the active module', async () => {
    const original = engineeringStore.getState().load;
    const load = vi.fn(async () => {});
    engineeringStore.setState({ ...ENG_READY, load });
    try {
      renderAt('/engineering');
      await screen.findByText(/Đã tải 3 dòng/);
      fireEvent.click(screen.getByTitle('Tải lại dữ liệu'));
      expect(load).toHaveBeenCalledTimes(1);
    } finally {
      engineeringStore.setState({ load: original });
    }
  });

  it('counts Data Health warnings of the active module only', async () => {
    engineeringStore.setState(ENG_READY);
    renderAt('/engineering');
    await screen.findByText(/Đã tải 3 dòng/);
    expect(procurementStore.getState().warnings.length).toBeGreaterThan(0);
    expect(screen.getByTitle('Data Health').textContent).not.toMatch(/\d/);
  });
});

describe('useFacetParams', () => {
  function wrapper(initial: string) {
    return ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
  }

  it('reads repeated keys, writes them back and clears only its keys', async () => {
    const { result } = renderHook(
      () => ({ facets: useFacetParams(['discipline', 'q']), location: useLocation() }),
      { wrapper: wrapper('/procurement?discipline=A&discipline=B&pkg=X&q=loa') },
    );
    expect(result.current.facets.values).toEqual({ discipline: ['A', 'B'], q: ['loa'] });
    act(() => result.current.facets.setValues('discipline', ['C', 'D, E']));
    await waitFor(() => expect(result.current.location.search).toBe('?pkg=X&q=loa&discipline=C&discipline=D%2C+E'));
    act(() => result.current.facets.clear());
    await waitFor(() => expect(result.current.location.search).toBe('?pkg=X'));
  });
});
```

(The labels are the current `vi.ts` values: `filter.phaseLabel` = "Phase (kế hoạch)", `filter.flagsLabel` = "Cảnh báo", `header.reloadData` = "Tải lại dữ liệu".)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ui/shell/shell.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`src/ui/shell/useFacetParams.ts`:

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Facet values in the URL: several values repeat the key; changes replace history (Back skips them). */
export function useFacetParams(keys: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => Object.fromEntries(keys.map((k) => [k, params.getAll(k).filter(Boolean)])), [params, keys]);

  const setValues = useCallback(
    (key: string, next: string[]) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete(key);
          for (const v of next) p.append(key, v);
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );

  const clear = useCallback(
    () =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const k of keys) p.delete(k);
          return p;
        },
        { replace: true },
      ),
    [keys, setParams],
  );

  return { values, setValues, clear };
}
```

`src/ui/shell/FilterBar.tsx` (full rewrite, same markup and classes as today):

```tsx
import { useMemo, useState } from 'react';
import { useT } from '../../i18n/useT';
import { filterKeys } from '../../modules/registry';
import type { AnyModule } from '../../modules/types';
import { useModule } from '../../store/useModule';
import { MultiSelect } from '../common/MultiSelect';
import { useFacetParams } from './useFacetParams';

function ResultCount({ module }: { module: AnyModule }) {
  const { t } = useT();
  const { shown, total, unitKey } = module.useResultCount!();
  return (
    <span className="ml-auto text-xs text-ink-3">
      <span className="font-mono text-ink">{shown}</span> / {total} {t(unitKey, { n: total })}
    </span>
  );
}

function Controls({ module, keys }: { module: AnyModule; keys: readonly string[] }) {
  const { t } = useT();
  const data = useModule(module.store, (s) => s.data);
  const { values, setValues, clear } = useFacetParams(keys);
  const empty = keys.every((k) => values[k].length === 0);
  return (
    <>
      {module.facets.map((f) => (
        <MultiSelect key={f.key} label={t(f.labelKey)} options={f.options(data, t)} selected={values[f.key]} onChange={(next) => setValues(f.key, next)} />
      ))}
      {module.useResultCount ? <ResultCount module={module} /> : <span className="ml-auto" />}
      {!empty && (
        <button type="button" onClick={clear} className="text-xs text-ai-1 underline">
          {t('filter.clear')}
        </button>
      )}
    </>
  );
}

/** Sticky filter row on desktop; a filter button opening a bottom sheet on phones. Drawn from the module's facets. */
export function FilterBar({ module }: { module: AnyModule }) {
  const { t } = useT();
  const [sheetOpen, setSheetOpen] = useState(false);
  const keys = useMemo(() => filterKeys(module), [module]);
  const facetKeys = useMemo(() => module.facets.map((f) => f.key), [module]);
  const ready = useModule(module.store, (s) => s.status === 'ready');
  const { values } = useFacetParams(facetKeys);
  if (!ready) return null;
  const activeCount = facetKeys.reduce((n, k) => n + values[k].length, 0);

  return (
    // No backdrop-filter here: it would create a stacking context that traps the dropdowns under the cards below.
    <div className="border-b border-line bg-bg/60">
      <div className="mx-auto hidden max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 md:flex">
        <Controls module={module} keys={keys} />
      </div>
      <div className="flex items-center justify-between px-4 py-2 md:hidden">
        <button type="button" onClick={() => setSheetOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm">
          {t('filter.title')} {activeCount > 0 && <span className="rounded bg-ai-1/20 px-1.5 font-mono text-xs text-ai-1">{activeCount}</span>}
        </button>
      </div>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 rounded-t-2xl border-t border-line bg-bg p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <Controls module={module} keys={keys} />
            <button type="button" onClick={() => setSheetOpen(false)} className="mt-2 w-full rounded-lg bg-ai-1/20 py-2 text-sm text-ai-1">
              {t('filter.done')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

Copy any markup of today's `FilterBar.tsx` that sits after the bottom sheet (closing tags) verbatim — the only behavioral changes are the facet source and the result count.

`src/ui/shell/Header.tsx` — make the module-specific parts slots keyed by module (the rest of the header stays as is):

```tsx
import { useActiveModule } from '../../modules/registry';
import type { AnyModule } from '../../modules/types';
import { useModule } from '../../store/useModule';

function SearchSlot({ module }: { module: AnyModule }) {
  const { value, vocab, onChange } = module.useSearch!();
  return <AskBox value={value} vocab={vocab} onChange={onChange} />;
}

/** Refresh + Data Health for the module on screen. */
function ModuleStatus({ module, onOpenHealth }: { module: AnyModule; onOpenHealth: () => void }) {
  const { t, lang } = useT();
  const refreshing = useModule(module.store, (s) => s.refreshing);
  const refreshError = useModule(module.store, (s) => s.refreshError);
  const lastSync = useModule(module.store, (s) => s.lastSync);
  const warnings = useModule(module.store, (s) => s.warnings);
  const warningCount = warnings.filter((w) => w.level !== 'info').length;
  return (
    <>
      <button
        type="button"
        onClick={() => void module.store.getState().load()}
        title={refreshError ? t(refreshError.detail) : t('header.reloadData')}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs ${
          refreshError ? 'border-serious/50 text-serious' : 'border-line text-ink-2 hover:text-ink'
        }`}
      >
        <span aria-hidden className={refreshing ? 'animate-spin' : ''}>⟳</span>
        <span className="hidden sm:inline">
          {refreshing
            ? t('header.syncing')
            : refreshError
              ? t('header.staleData')
              : lastSync
                ? t('header.synced', { time: timeAgo(t, lang, lastSync) })
                : ''}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpenHealth}
        title="Data Health"
        className="relative flex h-9 items-center rounded-lg border border-line px-2.5 text-xs text-ink-2 hover:text-ink"
      >
        <span aria-hidden>⚕</span>
        <span className="ml-1 hidden sm:inline">Data Health</span>
        {warningCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 rounded-full bg-serious px-1.5 font-mono text-[10px] text-white">{warningCount}</span>
        )}
      </button>
    </>
  );
}
```

(These are today's two buttons verbatim; only `onClick` of refresh and the sync label source changed.)

In `Header`:
- remove the `useDashboard` import/call, the `procurementStore` import and the interim selectors from Task 4;
- `const module = useActiveModule();`
- subtitle: `{projectName}{module ? ` · ${t(module.labelKey)}` : ''}` (replaces `· Procurement Intelligence`);
- AskBox wrapper: render the existing `<div className="order-last w-full lg:order-none …">` only when `module?.useSearch`, containing `<SearchSlot key={module.id} module={module} />`;
- replace the refresh + Data Health buttons with `{module && <ModuleStatus key={module.id} module={module} onOpenHealth={onOpenHealth} />}` placed where the refresh button was (after the "Today" button).

`src/ui/shell/AppShell.tsx` — drop the interim procurement imports/selectors from Task 7 and read the active module:

```tsx
import { useModule } from '../../store/useModule';
import type { AnyModule } from '../../modules/types';

function HealthSlot({ module, open, onClose }: { module: AnyModule; open: boolean; onClose: () => void }) {
  const warnings = useModule(module.store, (s) => s.warnings);
  return <DataHealthPanel open={open} onClose={onClose} warnings={warnings} />;
}
```

and in the JSX:

```tsx
        {module && module.facets.length > 0 && <FilterBar key={module.id} module={module} />}
        {/* … */}
      {module && <HealthSlot key={module.id} module={module} open={healthOpen} onClose={() => setHealthOpen(false)} />}
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run typecheck`
Expected: PASS, including the unchanged `app.test.tsx` cases ("1 / 6 dòng" after the KPI click, Data Health grouped warnings, language switch).

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat(shell): header, data health and a schema-driven filter bar follow the active module"
```

---

### Task 10: Docs and final verification

**Files:**
- Modify: `docs/deploy.md` (config.json table), `README.md:34`

- [ ] **Step 1: Update docs**

In `docs/deploy.md` replace the three `dataSource.*` rows with:

```markdown
| `dataSources.<module>` | Nguồn dữ liệu của từng dashboard: `procurement`, `engineering`. Thiếu nguồn nào thì dashboard đó hiện "Chưa cấu hình nguồn dữ liệu" |
| `dataSources.<module>.type` | `google-sheet` (trình duyệt tải trực tiếp) hoặc `server` (file đặt trên server, ví dụ `data/engineering.xlsx` cạnh `index.html`) |
| `dataSources.<module>.url` | Link Google Sheet (link edit hoặc `export?format=xlsx` đều được) hoặc đường dẫn file trên server |
| `dataSources.<module>.sheetName` | Tên sheet dữ liệu (mặc định sheet đầu tiên) |
```

and add below the table:

```markdown
Ví dụ:

```json
"dataSources": {
  "procurement": { "type": "google-sheet", "url": "https://docs.google.com/spreadsheets/d/<id>/edit", "sheetName": "ALL" },
  "engineering": { "type": "server", "url": "data/engineering.xlsx" }
}
```

Key cũ `dataSource` (một nguồn) vẫn được hiểu là nguồn của Procurement.
```

In `README.md:34` change to: ``Đổi nguồn dữ liệu: sửa `dataSources` trong `config.json` (mỗi dashboard một nguồn).``

- [ ] **Step 2: Full verification**

Run: `npm run typecheck && npm test && npm run build`
Expected: all green; the build output lists separate chunks for `OverviewPage`, `DisciplinePage` and `EngineeringPage`.

- [ ] **Step 3: Manual check in the real app** (use the `run` skill / `npm run dev`)

- `#/` → `#/procurement`, overview renders; `#/?d=MECHANICAL` → `#/procurement?discipline=MECHANICAL`.
- Sidebar: ENGINEERING, PROCUREMENT; active state; collapse survives reload.
- Pick a Discipline filter on Procurement → go to Engineering → back: filter restored.
- Engineering without a source → "Chưa cấu hình nguồn dữ liệu"; add a test `engineering` source in `public/config.json` locally (do not commit a data file) → "Đã tải N dòng…".
- Dark/light and EN/VI on both modules; phone width (≤ 390px): ☰ opens the left drawer, filter bottom sheet still works.

- [ ] **Step 4: Commit**

```bash
git add docs/deploy.md README.md
git commit -m "docs: document per-module dataSources"
```
