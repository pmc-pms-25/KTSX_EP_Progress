# PMS - PEIW Procurement Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive procurement-plan dashboard (Overview → Discipline → Package) that reads the Google Sheet directly from the browser, with rule-based "AI Insights", served by an offline Node server.

**Architecture:** Four layers, each depending only on the one below: `DataSource` (bytes) → `parsePlan` (pure, workbook → `Plan`) → `analytics` (pure selectors: metrics, filters, aggregates, insight rules) → React UI. Filters live in the URL; app state (load pipeline, cut-off, theme) lives in a Zustand store. A Fastify server serves the static build plus an editable `config.json`, bundled into one `server.cjs` so the target server needs no `npm install`.

**Tech Stack:** Vite 8, React 19, TypeScript 7, Tailwind CSS 4, ECharts 6 (tree-shaken), Motion 13, Zustand 5, React Router 7 (hash routing), SheetJS 0.20.3, Vitest 5 + Testing Library + jsdom, Fastify 5, esbuild.

**Spec:** `docs/superpowers/specs/2026-09-18-procurement-dashboard-design.md` (read it with this plan; section 15 of the spec lists the refinements this plan implements).

## Global Constraints

- Node.js ≥ 20 on the target server; **no internet and no `npm install` on the server** — ship `release/` only.
- **No CDN at runtime**: fonts come from `@fontsource-variable/*`, every library is bundled.
- Exact dependency versions as pinned in `package.json` (Task 1). SheetJS comes from `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (the npm `xlsx` package is outdated and vulnerable — never use it).
- Data source: the browser fetches `https://docs.google.com/spreadsheets/d/1oygbFq6v3j0NThuZ9Zmf8noHm5jwPr_YSvDvXHT8FPQ/export?format=xlsx` (CORS verified). Sheet `ALL`, header on row 1.
- **Dates are `Day` integers** (days since 1970-01-01) read from Excel serials — never through `Date` objects, which shift by timezone.
- Map sheet columns **by header name**, never by position.
- App name `PMS - PEIW` comes from `config.json` (`appName`); never hard-code it outside defaults.
- UI copy is **Vietnamese** with English domain terms (Package, Discipline, TR, RFQ, LOA, ROS, Forecast, Actual…).
- **Dark theme by default**, light theme via toggle, persisted in `localStorage` (wrapped in try/catch).
- No download/export feature anywhere in the app.
- Chart colors come only from `src/ui/theme/palette.ts` (validated palette); status colors are never used for series and always ship with an icon or label.
- Respect `prefers-reduced-motion` (CSS animations off, Motion/ECharts animation off).
- Never commit project data: `*.xlsx` stays git-ignored.
- Tests run with `npx vitest run <path>`; the whole suite with `npm test`; types with `npm run typecheck`.

## File Map

| Path | Responsibility |
|---|---|
| `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html` | Toolchain, pinned versions, chunk splitting, test config |
| `public/config.json` | Default runtime config (dev server + release) |
| `src/lib/day.ts` | Timezone-free day arithmetic and formatting |
| `src/data/types.ts` | Domain model: `Plan`, `Discipline`, `Package`, `Line`, `MilestoneDates`, warnings |
| `src/data/milestones.ts` | Milestone & phase catalog (headers, labels, phases, order) |
| `src/data/parser/headers.ts` | Header row → column map (by name) |
| `src/data/parser/parsePlan.ts` | Workbook bytes → `Plan` + data-quality warnings |
| `src/data/sources/sources.ts` | `DataSource` interface, HTTP XLSX source, Google link normalization |
| `src/config/config.ts` | Load + validate `config.json` |
| `src/analytics/lineMetrics.ts` | Per-line status, slippage, ROS float, phases |
| `src/analytics/search.ts` | Smart search query → structured criteria |
| `src/analytics/filters.ts` | Filter model + application |
| `src/analytics/aggregate.ts` | KPIs, phase funnel, discipline health, package summaries, workload, heatmap |
| `src/analytics/insights/*` | Insight types, helpers, one file per rule, registry |
| `src/store/appStore.ts`, `useApp.ts`, `urlFilters.ts` | Load pipeline, cut-off, theme; URL ⇄ filters |
| `src/ui/theme/palette.ts`, `src/index.css` | Design tokens, validated chart palette, AI styling |
| `src/ui/common/*`, `src/ui/charts/EChart.tsx`, `src/ui/hooks/*` | UI primitives and shared hooks |
| `src/ui/overview/*` | Overview page and widgets |
| `src/ui/discipline/*`, `src/ui/package/*` | Discipline page, package table, package drawer |
| `src/ui/shell/*`, `src/ui/states/*`, `src/ui/health/*`, `src/App.tsx`, `src/main.tsx` | App shell, header, filter bar, loading/error, Data Health, routing |
| `server/app.ts`, `server/index.ts`, `scripts/build-release.mjs` | Fastify server and offline release packaging |
| `src/test/*` | Workbook fixture builder, sample plan, store seeding |
| `docs/deploy.md`, `README.md` | Deployment guide and developer overview |

---

### Task 1: Project scaffold and day utilities

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `public/config.json`, `src/test/setup.ts`, `src/main.tsx` (placeholder, replaced in Task 14)
- Create: `src/lib/day.ts`
- Test: `src/lib/day.test.ts`

**Interfaces:**
- Produces: `type Day = number`, `type MonthKey = string` (`YYYY-MM`), `dayFromYMD(y, m, d)`, `dayFromExcelSerial(value: unknown): Day | undefined`, `todayDay(now?: Date)`, `dayToISO(day)`, `dayFromISO(text): Day | undefined`, `formatDay(day | undefined)` (`14-Mar-2027`, `—` when undefined), `monthKey(day)`, `formatMonth(key)` (`Mar 2027`), `monthBounds(key): { from, to }`, `monthRange(from, to): MonthKey[]`, `MONTH_ABBREVIATIONS`.

- [ ] **Step 1: Create the toolchain files**

`package.json`:

```json
{
  "name": "pms-peiw",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "PMS - PEIW: procurement plan dashboard for oil & gas projects",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest",
    "release": "npm run build && node scripts/build-release.mjs",
    "start": "node release/server.cjs"
  },
  "dependencies": {
    "@fastify/static": "10.1.4",
    "@fontsource-variable/inter": "5.3.0",
    "@fontsource-variable/jetbrains-mono": "5.3.0",
    "echarts": "6.1.0",
    "echarts-for-react": "3.0.6",
    "fastify": "5.12.5",
    "motion": "13.4.0",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react-router-dom": "7.18.4",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
    "zustand": "5.0.15"
  },
  "devDependencies": {
    "@tailwindcss/vite": "4.3.3",
    "@testing-library/dom": "10.4.2",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@types/node": "26.6.1",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.1",
    "esbuild": "0.28.2",
    "jsdom": "30.1.0",
    "tailwindcss": "4.3.3",
    "typescript": "7.0.2",
    "vite": "8.3.0",
    "vitest": "5.0.1"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2023","DOM","DOM.Iterable"], "module": "ESNext",
    "moduleResolution": "bundler", "jsx": "react-jsx", "strict": true, "noEmit": true,
    "skipLibCheck": true, "isolatedModules": true, "verbatimModuleSyntax": true,
    "noUnusedLocals": true, "noUnusedParameters": true, "types": ["vite/client","node","vitest/globals"]
  },
  "include": ["src","server","vite.config.ts"]
}
```

`vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Relative asset URLs so the bundle works from any folder on the intranet server.
  base: './',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'xlsx', test: /node_modules[\/]xlsx/ },
            { name: 'echarts', test: /node_modules[\/](echarts|zrender)/ },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
});
```

`index.html`:

```html
<!doctype html>
<html lang="vi" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0f1c" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2322d3ee'/%3E%3Cstop offset='1' stop-color='%23a78bfa'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect x='4' y='4' width='24' height='24' rx='7' transform='rotate(45 16 16)' fill='url(%23g)'/%3E%3C/svg%3E" />
    <title>PMS - PEIW</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`public/config.json`:

```json
{
  "appName": "PMS - PEIW",
  "projectName": "Maydan Mahzam",
  "dataSource": {
    "type": "google-sheet",
    "url": "https://docs.google.com/spreadsheets/d/1oygbFq6v3j0NThuZ9Zmf8noHm5jwPr_YSvDvXHT8FPQ/export?format=xlsx",
    "sheetName": "ALL"
  },
  "dueSoonDays": 30,
  "port": 8080
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

`src/main.tsx` (temporary placeholder so `vite build` has an entry; Task 14 replaces it):

```tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<p>PMS - PEIW</p>);
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: completes without errors; `node_modules/xlsx/package.json` shows version `0.20.3`.

- [ ] **Step 3: Write the failing test**

`src/lib/day.test.ts`:

```ts
import {
  dayFromExcelSerial,
  dayFromISO,
  dayFromYMD,
  dayToISO,
  formatDay,
  formatMonth,
  monthBounds,
  monthKey,
  monthRange,
  todayDay,
} from './day';

describe('day utilities', () => {
  it('converts Excel serials to timezone-free days', () => {
    // 46460 is 14-Mar-2027 in Excel.
    expect(dayToISO(dayFromExcelSerial(46460)!)).toBe('2027-03-14');
    expect(dayFromExcelSerial(46460.75)).toBe(dayFromExcelSerial(46460));
  });

  it('rejects values that are not plausible date serials', () => {
    expect(dayFromExcelSerial(0)).toBeUndefined();
    expect(dayFromExcelSerial(62)).toBeUndefined();
    expect(dayFromExcelSerial('00/Jan/00')).toBeUndefined();
    expect(dayFromExcelSerial('#############')).toBeUndefined();
    expect(dayFromExcelSerial(null)).toBeUndefined();
    expect(dayFromExcelSerial(NaN)).toBeUndefined();
  });

  it('round-trips ISO strings and rejects malformed ones', () => {
    const d = dayFromYMD(2026, 9, 18);
    expect(dayToISO(d)).toBe('2026-09-18');
    expect(dayFromISO('2026-09-18')).toBe(d);
    expect(dayFromISO('2026-02-30')).toBeUndefined();
    expect(dayFromISO('18/09/2026')).toBeUndefined();
  });

  it('uses the local calendar date for today', () => {
    expect(todayDay(new Date(2026, 8, 18, 23, 59))).toBe(dayFromYMD(2026, 9, 18));
  });

  it('formats days and months', () => {
    expect(formatDay(dayFromYMD(2027, 3, 4))).toBe('04-Mar-2027');
    expect(formatDay(undefined)).toBe('—');
    expect(monthKey(dayFromYMD(2027, 3, 31))).toBe('2027-03');
    expect(formatMonth('2027-03')).toBe('Mar 2027');
  });

  it('builds month ranges and bounds', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthRange('2027-02', '2027-01')).toEqual([]);
    const b = monthBounds('2028-02');
    expect(dayToISO(b.from)).toBe('2028-02-01');
    expect(dayToISO(b.to)).toBe('2028-02-29');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run src/lib/day.test.ts`
Expected: FAIL — `Failed to resolve import "./day"`.

- [ ] **Step 5: Implement**

`src/lib/day.ts`:

```ts
/**
 * A calendar day stored as whole days since 1970-01-01.
 * Timezone-free: never convert through local-time Date objects.
 */
export type Day = number;

/** Month bucket, formatted `YYYY-MM`. */
export type MonthKey = string;

const MS_PER_DAY = 86_400_000;
/** Excel serial of 1970-01-01. */
const EXCEL_EPOCH_OFFSET = 25_569;
/** Serials outside 2000-01-01 .. 2100-01-01 are treated as garbage. */
const MIN_SERIAL = 36_526;
const MAX_SERIAL = 73_051;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayFromYMD(year: number, month: number, day: number): Day {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Convert an Excel date serial to a Day; undefined when not a plausible date. */
export function dayFromExcelSerial(value: unknown): Day | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < MIN_SERIAL || value > MAX_SERIAL) return undefined;
  return Math.floor(value) - EXCEL_EPOCH_OFFSET;
}

/** The viewer's local calendar date as a Day. */
export function todayDay(now: Date = new Date()): Day {
  return dayFromYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function parts(day: Day): { y: number; m: number; d: number } {
  const date = new Date(day * MS_PER_DAY);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `2027-03-14` */
export function dayToISO(day: Day): string {
  const { y, m, d } = parts(day);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Parse `YYYY-MM-DD`; undefined when malformed. */
export function dayFromISO(text: string): Day | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  const day = dayFromYMD(y, m, d);
  return dayToISO(day) === text.trim() ? day : undefined;
}

/** `14-Mar-2027` */
export function formatDay(day: Day | undefined): string {
  if (day === undefined) return '—';
  const { y, m, d } = parts(day);
  return `${pad(d)}-${MONTHS[m - 1]}-${y}`;
}

export function monthKey(day: Day): MonthKey {
  const { y, m } = parts(day);
  return `${y}-${pad(m)}`;
}

/** `Mar 2027` */
export function formatMonth(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** First and last Day of a month key. */
export function monthBounds(key: MonthKey): { from: Day; to: Day } {
  const [y, m] = key.split('-').map(Number);
  return { from: dayFromYMD(y, m, 1), to: dayFromYMD(y, m + 1, 1) - 1 };
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export const MONTH_ABBREVIATIONS = MONTHS;
```

- [ ] **Step 6: Run tests, typecheck and build**

Run: `npx vitest run src/lib/day.test.ts && npm run typecheck && npx vite build`
Expected: 6 tests PASS; typecheck prints nothing; build writes `dist/`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html public/config.json src/test/setup.ts src/main.tsx src/lib
git commit -m "chore: scaffold Vite/React/TS project with timezone-free day utilities"
```

---

### Task 2: Domain types and milestone catalog

**Files:**
- Create: `src/data/types.ts`, `src/data/milestones.ts`
- Test: `src/data/milestones.test.ts`

**Interfaces:**
- Consumes: `Day` (Task 1).
- Produces: types `MilestoneKey`, `PhaseKey`, `LinePhase` (`PhaseKey | 'delivered'`), `ItemType`, `MilestoneDates { plan?, forecast?, actual?: Day; durationDays? }`, `RosHistoryPoint`, `Line`, `Package`, `Discipline`, `WarningCode`, `DataWarning`, `Plan`; constants `PHASES`, `LINE_PHASE_ORDER`, `LINE_PHASE_LABEL`, `MILESTONES: MilestoneDef[] { key, label, short, header, phase }`, `MILESTONE_BY_KEY`, `KEY_MILESTONES` (6 headline milestones); `phaseIndex(phase)`.

- [ ] **Step 1: Write the failing test**

`src/data/milestones.test.ts`:

```ts
import { KEY_MILESTONES, LINE_PHASE_ORDER, MILESTONES, MILESTONE_BY_KEY, PHASES, phaseIndex } from './milestones';

describe('milestone catalog', () => {
  it('has unique keys and headers', () => {
    expect(new Set(MILESTONES.map((m) => m.key)).size).toBe(MILESTONES.length);
    expect(new Set(MILESTONES.map((m) => m.header.toLowerCase())).size).toBe(MILESTONES.length);
  });

  it('lists milestones grouped in phase order', () => {
    const phaseOrder = PHASES.map((p) => p.key);
    const indices = MILESTONES.map((m) => phaseOrder.indexOf(m.phase));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(indices.every((i) => i >= 0)).toBe(true);
  });

  it('exposes lookups and the headline milestones', () => {
    expect(MILESTONE_BY_KEY.loa.header).toBe('LOA Effective Date');
    expect(KEY_MILESTONES).toHaveLength(6);
    expect(LINE_PHASE_ORDER.at(-1)).toBe('delivered');
    expect(phaseIndex('award')).toBeLessThan(phaseIndex('logistics'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/milestones.test.ts`
Expected: FAIL — `Failed to resolve import "./milestones"`.

- [ ] **Step 3: Implement the domain types**

`src/data/types.ts`:

```ts
import type { Day } from '../lib/day';

export type MilestoneKey =
  | 'trApproval'
  | 'rfqSubmission'
  | 'rfqApproval'
  | 'rfqIssue'
  | 'bidsDue'
  | 'tbeSubmission'
  | 'tbeApproval'
  | 'mtoPurchase'
  | 'commercialImpact'
  | 'cbeSubmission'
  | 'cbeApproval'
  | 'loa'
  | 'po'
  | 'criticalVd'
  | 'rawMaterialPo'
  | 'spirSubmitted'
  | 'spirApproved'
  | 'mfg50'
  | 'fat'
  | 'shipped'
  | 'received';

export type PhaseKey = 'tr' | 'rfq' | 'evaluation' | 'award' | 'manufacturing' | 'logistics';

/** A line's current phase; `delivered` once every dated milestone has an actual. */
export type LinePhase = PhaseKey | 'delivered';

export type ItemType = 'Tagged' | 'Bulk' | 'Unknown';

export interface MilestoneDates {
  plan?: Day;
  forecast?: Day;
  actual?: Day;
  durationDays?: number;
}

export interface RosHistoryPoint {
  label: string;
  day: Day;
}

/** One Package × Facility row group (PLANNED + FORECAST + ACTUAL). */
export interface Line {
  id: string;
  discipline: string;
  packageCode: string;
  /** False when the sheet had an empty / `0` / `None` code; packageCode is then `UNCODED-<row>`. */
  hasValidCode: boolean;
  packageName: string;
  facility: string;
  itemType: ItemType;
  milestones: Partial<Record<MilestoneKey, MilestoneDates>>;
  ros?: Day;
  rosHistory: RosHistoryPoint[];
  deliveryWeeks?: number;
  transportDays?: number;
  bufferDays?: number;
  remark?: string;
  /** 1-based sheet row of the PLANNED row. */
  sourceRow: number;
}

export interface Package {
  code: string;
  name: string;
  discipline: string;
  lines: Line[];
}

export interface Discipline {
  name: string;
  packages: Package[];
}

export type WarningCode =
  | 'INVALID_PACKAGE_CODE'
  | 'MISSING_FACILITY'
  | 'INCOMPLETE_TRIPLET'
  | 'ORPHAN_ROW'
  | 'UNKNOWN_ROW_TYPE'
  | 'INVALID_DATE'
  | 'UNKNOWN_COLUMN'
  | 'NO_DISCIPLINE';

export interface DataWarning {
  level: 'info' | 'warn' | 'error';
  code: WarningCode;
  message: string;
  row?: number;
}

export interface Plan {
  project: string;
  loadedAt: Date;
  disciplines: Discipline[];
  lines: Line[];
  warnings: DataWarning[];
}
```

- [ ] **Step 4: Implement the catalog**

`src/data/milestones.ts`:

```ts
import type { LinePhase, MilestoneKey, PhaseKey } from './types';

export interface PhaseDef {
  key: PhaseKey;
  label: string;
}

export interface MilestoneDef {
  key: MilestoneKey;
  /** Full label shown in tables. */
  label: string;
  /** Short label for chips, charts and search. */
  short: string;
  /** Exact sheet header (matched after normalization). */
  header: string;
  phase: PhaseKey;
}

/** Phases in process order. Colors live in the UI theme (ui/theme/palette.ts). */
export const PHASES: readonly PhaseDef[] = [
  { key: 'tr', label: 'TR / Pre-RFQ' },
  { key: 'rfq', label: 'RFQ / Bidding' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'award', label: 'Award' },
  { key: 'manufacturing', label: 'Manufacturing' },
  { key: 'logistics', label: 'Logistics' },
];

export const LINE_PHASE_ORDER: readonly LinePhase[] = [...PHASES.map((p) => p.key), 'delivered'];

export const LINE_PHASE_LABEL: Record<LinePhase, string> = {
  ...(Object.fromEntries(PHASES.map((p) => [p.key, p.label])) as Record<PhaseKey, string>),
  delivered: 'Delivered',
};

/** Milestones in process order. Changing a header or phase happens here only. */
export const MILESTONES: readonly MilestoneDef[] = [
  { key: 'trApproval', label: 'MTO / TR Approval', short: 'TR', header: 'MTO/ TR Approval', phase: 'tr' },
  { key: 'rfqSubmission', label: 'RFQ/TP Submission', short: 'RFQ Sub', header: 'RFQ/TP Submission', phase: 'tr' },
  {
    key: 'rfqApproval',
    label: 'RFQ/TP Approval (Bidder List)',
    short: 'RFQ Appr',
    header: 'Approval of RFQ/TP with Bidder List',
    phase: 'tr',
  },
  { key: 'rfqIssue', label: 'RFQ Issue', short: 'RFQ', header: 'RFQ Issue', phase: 'rfq' },
  { key: 'bidsDue', label: 'Bids Due', short: 'Bids', header: 'Bids Due', phase: 'rfq' },
  { key: 'tbeSubmission', label: 'TBE Submission', short: 'TBE Sub', header: 'TBE Submission', phase: 'evaluation' },
  { key: 'tbeApproval', label: 'TBE Approval', short: 'TBE', header: 'TBE Approval', phase: 'evaluation' },
  { key: 'mtoPurchase', label: 'MTO for Purchase', short: 'MTO', header: 'MTO for Purchase', phase: 'evaluation' },
  {
    key: 'commercialImpact',
    label: 'Commercial / Cost Impact',
    short: 'Comm',
    header: 'Commercial/Cost Impact Due Date',
    phase: 'evaluation',
  },
  { key: 'cbeSubmission', label: 'CBE & AR Submission', short: 'CBE Sub', header: 'CBE & AR Submission', phase: 'evaluation' },
  { key: 'cbeApproval', label: 'CBE & AR Approval', short: 'CBE', header: 'CBE & AR Approval', phase: 'evaluation' },
  { key: 'loa', label: 'LOA Effective', short: 'LOA', header: 'LOA Effective Date', phase: 'award' },
  { key: 'po', label: 'PO Effective', short: 'PO', header: 'PO Effective Date', phase: 'award' },
  { key: 'criticalVd', label: 'Critical VD Approval', short: 'VD', header: 'Critical VD Approval', phase: 'manufacturing' },
  {
    key: 'rawMaterialPo',
    label: 'Raw Material / Equipment PO',
    short: 'Raw PO',
    header: 'Raw Material/ Equipment PO Placed',
    phase: 'manufacturing',
  },
  { key: 'spirSubmitted', label: 'SPIR Submitted', short: 'SPIR Sub', header: 'SPIR Submitted', phase: 'manufacturing' },
  { key: 'spirApproved', label: 'SPIR Approved', short: 'SPIR', header: 'SPIR Approved', phase: 'manufacturing' },
  { key: 'mfg50', label: '50% Manufacturing', short: '50% Mfg', header: '50% Manufacturing Completed', phase: 'manufacturing' },
  { key: 'fat', label: 'FAT / Final Inspection', short: 'FAT', header: 'FAT/ Final Inspection Completed', phase: 'manufacturing' },
  { key: 'shipped', label: 'Shipped from Port', short: 'Ship', header: 'Shipped from Port', phase: 'logistics' },
  {
    key: 'received',
    label: 'Received at Worksite',
    short: 'Site',
    header: 'Received and Inspected at Worksite',
    phase: 'logistics',
  },
];

export const MILESTONE_BY_KEY: Record<MilestoneKey, MilestoneDef> = Object.fromEntries(
  MILESTONES.map((m) => [m.key, m]),
) as Record<MilestoneKey, MilestoneDef>;

/** The six headline milestones used by the monthly workload chart (TR, TBE, CBE, LOA, EXW/FAT, Site). */
export const KEY_MILESTONES: readonly MilestoneKey[] = ['trApproval', 'tbeApproval', 'cbeApproval', 'loa', 'fat', 'received'];

export function phaseIndex(phase: LinePhase): number {
  return LINE_PHASE_ORDER.indexOf(phase);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/milestones.test.ts && npm run typecheck`
Expected: 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data
git commit -m "feat: add procurement domain types and milestone catalog"
```

---

### Task 3: Workbook fixture builder and header mapping

**Files:**
- Create: `src/test/fixtures.ts` (test-only helper that writes workbooks shaped like the production sheet)
- Create: `src/data/parser/headers.ts`
- Test: `src/data/parser/headers.test.ts`

**Interfaces:**
- Consumes: `MILESTONES`, `MilestoneKey` (Task 2); `dayFromISO`, `dayToISO` (Task 1).
- Produces (fixtures): `SHEET_HEADERS` (exact 54 production headers), `FixtureLine`, `FixtureSection`, `serial(iso)`, `chain(start, step?)`, `sheetRows(sections)`, `workbookBuffer(rows, sheetName?)`, `SAMPLE_SECTIONS`, `sampleWorkbook()`.
- Produces (parser): `normalizeHeader(value)`, `ColumnMap`, `HeaderResult = { ok: true; map; unknownHeaders } | { ok: false; missing }`, `mapHeaders(headerRow)`.

The sample plan is the backbone of every later test. Its rows (1-based sheet rows): header 1; `MECHANICAL` 2; MEC-001@PS2K TS 3–5; MEC-001@PS2R 7–9; MEC-002@BF 11–13; uncoded line 15–17; `PIPING` 19; PIP-001@PS2L TS 20–21 (no ACTUAL); PIP-002@WHJs 23–25.

- [ ] **Step 1: Create the fixture builder**

`src/test/fixtures.ts`:

```ts
import * as XLSX from 'xlsx';
import { MILESTONES } from '../data/milestones';
import type { MilestoneKey } from '../data/types';
import { dayFromISO, dayToISO } from '../lib/day';

/** Exact header row of the production sheet `ALL` (54 columns). */
export const SHEET_HEADERS: (string | null)[] = [
  'Package Code', 'Package Name', 'Facility', 'Tagged/ Bulk', 'Date',
  'MTO/ TR Approval', 'Duration (Days)', 'RFQ/TP Submission', 'Duration (Days)',
  'Approval of RFQ/TP with Bidder List', 'Duration (Days)', 'RFQ Issue', 'Duration (Days)',
  'Bids Due', 'Duration (Days)', 'TBE Submission', 'Duration (Days)', 'TBE Approval', 'Duration (Days)',
  'MTO for Purchase', 'Duration (Days)', 'Commercial/Cost Impact Due Date', 'Duration (Days)',
  'CBE & AR Submission', 'Duration (Days)', 'CBE & AR Approval', 'Duration (Days)',
  'LOA Effective Date', 'Duration (Days)', 'PO Effective Date', 'Critical VD Approval',
  'Raw Material/ Equipment PO Placed', 'SPIR Submitted', 'SPIR Approved', '50% Manufacturing Completed',
  'FAT/ Final Inspection Completed', 'Delivery (Weeks)', 'Shipped from Port', 'Transportation (Days)',
  'Received and Inspected at Worksite', 'Buffer', 'ROS', 'Remark', '%', '% MTO', "Equivalent Q'ty",
  "Actual Shipped Q'ty", "Actual Received & Inspected Q'ty", null, 'Old ED (05-Apr-26)',
  'ED End June 2026 (plus 86 days)', 'ED Mid Aug 2026 (plus 46 days)', 'ED Mid Oct 2026 (plus 61 days)',
  'ED 01-Nov-2026 (plus 16 days)',
];

type DateMap = Partial<Record<MilestoneKey, string | number>>;

export interface FixtureLine {
  code: unknown;
  /** Code on FORECAST/ACTUAL rows when it differs (the sheet's formulas turn blanks into 0). */
  linkedCode?: unknown;
  name?: string;
  facility: unknown;
  linkedFacility?: unknown;
  type?: string;
  /** ISO dates (converted to Excel serials) or raw cell values such as '#####'. */
  plan?: DateMap;
  forecast?: DateMap;
  actual?: DateMap;
  ros?: string;
  forecastRos?: unknown;
  remark?: string;
  rosHistory?: string[];
  omitForecast?: boolean;
  omitActual?: boolean;
}

export interface FixtureSection {
  discipline: string;
  lines: FixtureLine[];
}

const col = (header: string) => SHEET_HEADERS.indexOf(header);

/** ISO date → Excel serial. */
export function serial(iso: string): number {
  return dayFromISO(iso)! + 25_569;
}

/** Every milestone dated `step` days apart starting at `start`. */
export function chain(start: string, step = 20): Record<MilestoneKey, string> {
  const first = dayFromISO(start)!;
  return Object.fromEntries(MILESTONES.map((m, i) => [m.key, dayToISO(first + i * step)])) as Record<
    MilestoneKey,
    string
  >;
}

function cellValue(v: string | number | undefined): unknown {
  if (v === undefined) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return serial(v);
  return v;
}

function buildRow(line: FixtureLine, rowType: string, dates: DateMap | undefined): unknown[] {
  const row: unknown[] = SHEET_HEADERS.map(() => null);
  const linked = rowType !== 'PLANNED';
  row[col('Package Code')] = linked && 'linkedCode' in line ? line.linkedCode : line.code;
  row[col('Package Name')] = line.name ?? null;
  row[col('Facility')] = linked && 'linkedFacility' in line ? line.linkedFacility : line.facility;
  row[col('Tagged/ Bulk')] = line.type ?? 'Tagged';
  row[col('Date')] = rowType;
  for (const m of MILESTONES) {
    const idx = col(m.header);
    row[idx] = cellValue(dates?.[m.key]);
    if (rowType !== 'ACTUAL' && SHEET_HEADERS[idx + 1] === 'Duration (Days)' && dates?.[m.key] !== undefined) {
      row[idx + 1] = 7;
    }
  }
  if (rowType === 'PLANNED') {
    row[col('ROS')] = line.ros ? serial(line.ros) : null;
    row[col('Remark')] = line.remark ?? null;
    row[col('Delivery (Weeks)')] = 40;
    row[col('Transportation (Days)')] = 30;
    row[col('Buffer')] = 10;
    const edStart = col('Old ED (05-Apr-26)');
    (line.rosHistory ?? []).forEach((iso, i) => {
      row[edStart + i] = serial(iso);
    });
  }
  if (rowType === 'FORECAST') {
    row[col('ROS')] = line.forecastRos ?? (line.ros ? serial(line.ros) : null);
  }
  return row;
}

/** Build the sheet as an array of rows, mimicking the production layout. */
export function sheetRows(sections: FixtureSection[]): unknown[][] {
  const rows: unknown[][] = [SHEET_HEADERS];
  for (const section of sections) {
    const title: unknown[] = SHEET_HEADERS.map(() => null);
    title[0] = section.discipline;
    rows.push(title);
    for (const line of section.lines) {
      rows.push(buildRow(line, 'PLANNED', line.plan));
      if (!line.omitForecast) rows.push(buildRow(line, 'FORECAST', line.forecast ?? line.plan));
      if (!line.omitActual) rows.push(buildRow(line, 'ACTUAL', line.actual));
      rows.push(SHEET_HEADERS.map(() => null));
    }
  }
  return rows;
}

export function workbookBuffer(rows: unknown[][], sheetName = 'ALL'): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

const pumpPlan = chain('2027-01-01');
const pumpSlipForecast = { ...pumpPlan, fat: '2028-02-15', shipped: '2028-03-20', received: '2028-04-20' };
const compressorPlan = chain('2026-06-01');

/**
 * Small but representative plan:
 * - MEC-001 @ PS2K TS: on plan.
 * - MEC-001 @ PS2R: forecast slips late, received after ROS (ROS at risk).
 * - MEC-002 @ BF (Bulk): two actuals recorded, one forecast earlier than plan.
 * - blank code/facility on PLANNED, 0 on FORECAST/ACTUAL (as the sheet's formulas produce): warnings, not orphans.
 * - PIP-001 @ PS2L TS: '#####' date, '00/Jan/00' ROS on FORECAST, no ACTUAL row.
 * - PIP-002 @ WHJs: every milestone has an actual (delivered).
 */
export const SAMPLE_SECTIONS: FixtureSection[] = [
  {
    discipline: 'MECHANICAL',
    lines: [
      {
        code: 'MEC-001',
        name: 'Centrifugal Pump',
        facility: 'PS2K TS',
        plan: pumpPlan,
        ros: '2028-06-01',
        rosHistory: ['2028-01-01', '2028-03-01', '2028-03-01', '2028-05-01', '2028-06-01'],
      },
      {
        code: 'MEC-001',
        name: 'Centrifugal Pump',
        facility: 'PS2R',
        plan: pumpPlan,
        forecast: pumpSlipForecast,
        ros: '2028-04-01',
        remark: 'Kiểm tra lại ROS',
      },
      {
        code: 'MEC-002',
        name: 'Gas Compressor',
        facility: 'BF',
        type: 'Bulk',
        plan: compressorPlan,
        forecast: { ...compressorPlan, bidsDue: '2026-08-10' },
        actual: { trApproval: '2026-06-03', rfqSubmission: '2026-06-22' },
        ros: '2028-01-01',
      },
      {
        code: null,
        linkedCode: 0,
        name: 'Unnamed item',
        facility: null,
        linkedFacility: 0,
        plan: chain('2027-05-01'),
        ros: '2029-01-01',
      },
    ],
  },
  {
    discipline: 'PIPING',
    lines: [
      {
        code: 'PIP-001',
        name: 'Carbon Steel Pipe',
        facility: 'PS2L TS',
        type: 'Bulk',
        plan: { ...chain('2027-02-01'), mtoPurchase: '#############' },
        forecastRos: '00/Jan/00',
        ros: '2029-01-01',
        omitActual: true,
      },
      {
        code: 'PIP-002',
        name: 'Ball Valves',
        facility: 'WHJs',
        plan: chain('2025-01-01', 10),
        actual: chain('2025-01-01', 10),
        ros: '2026-01-01',
      },
    ],
  },
];

export function sampleWorkbook(): ArrayBuffer {
  return workbookBuffer(sheetRows(SAMPLE_SECTIONS));
}
```

- [ ] **Step 2: Write the failing test**

`src/data/parser/headers.test.ts`:

```ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/parser/headers.test.ts`
Expected: FAIL — `Failed to resolve import "./headers"`.

- [ ] **Step 4: Implement**

`src/data/parser/headers.ts`:

```ts
import { MILESTONES } from '../milestones';
import type { MilestoneKey } from '../types';

export interface MilestoneColumns {
  date: number;
  duration?: number;
}

export interface ColumnMap {
  packageCode: number;
  packageName?: number;
  facility: number;
  itemType?: number;
  rowType: number;
  ros?: number;
  remark?: number;
  deliveryWeeks?: number;
  transportDays?: number;
  buffer?: number;
  milestones: Partial<Record<MilestoneKey, MilestoneColumns>>;
  rosHistory: { label: string; col: number }[];
}

export type HeaderResult =
  | { ok: true; map: ColumnMap; unknownHeaders: string[] }
  | { ok: false; missing: string[] };

/** Trim, collapse whitespace, lowercase. */
export function normalizeHeader(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

const FIELD_HEADERS = {
  packageCode: 'package code',
  packageName: 'package name',
  facility: 'facility',
  itemType: 'tagged/ bulk',
  rowType: 'date',
  ros: 'ros',
  remark: 'remark',
  deliveryWeeks: 'delivery (weeks)',
  transportDays: 'transportation (days)',
  buffer: 'buffer',
} as const;

const REQUIRED_FIELDS = ['packageCode', 'facility', 'rowType'] as const;

/** Columns present in the sheet that v1 deliberately does not use. */
const IGNORED_HEADERS = new Set(['%', '% mto', "equivalent q'ty", "actual shipped q'ty", "actual received & inspected q'ty"]);

const DURATION_HEADER = 'duration (days)';
const MILESTONE_BY_HEADER = new Map(MILESTONES.map((m) => [normalizeHeader(m.header), m.key]));

function isRosHistoryHeader(h: string): boolean {
  return h.startsWith('old ed') || h.startsWith('ed ');
}

/** Map the header row to column indices by name, not by position. */
export function mapHeaders(headerRow: readonly unknown[]): HeaderResult {
  const fields: Partial<Record<keyof typeof FIELD_HEADERS, number>> = {};
  const milestones: ColumnMap['milestones'] = {};
  const rosHistory: ColumnMap['rosHistory'] = [];
  const unknownHeaders: string[] = [];
  let previousMilestone: MilestoneKey | undefined;

  headerRow.forEach((raw, col) => {
    const h = normalizeHeader(raw);
    if (!h) return;

    if (h === DURATION_HEADER) {
      const target = previousMilestone ? milestones[previousMilestone] : undefined;
      if (target && target.duration === undefined) target.duration = col;
      previousMilestone = undefined;
      return;
    }
    previousMilestone = undefined;

    const milestoneKey = MILESTONE_BY_HEADER.get(h);
    if (milestoneKey) {
      if (!milestones[milestoneKey]) milestones[milestoneKey] = { date: col };
      previousMilestone = milestoneKey;
      return;
    }

    const field = (Object.keys(FIELD_HEADERS) as (keyof typeof FIELD_HEADERS)[]).find((k) => FIELD_HEADERS[k] === h);
    if (field) {
      if (fields[field] === undefined) fields[field] = col;
      return;
    }

    if (isRosHistoryHeader(h)) {
      rosHistory.push({ label: String(raw).trim(), col });
      return;
    }

    if (!IGNORED_HEADERS.has(h)) unknownHeaders.push(String(raw).trim());
  });

  const missing: string[] = REQUIRED_FIELDS.filter((f) => fields[f] === undefined).map((f) => FIELD_HEADERS[f]);
  if (Object.keys(milestones).length === 0) missing.push('(at least one milestone column)');
  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    unknownHeaders,
    map: {
      packageCode: fields.packageCode!,
      packageName: fields.packageName,
      facility: fields.facility!,
      itemType: fields.itemType,
      rowType: fields.rowType!,
      ros: fields.ros,
      remark: fields.remark,
      deliveryWeeks: fields.deliveryWeeks,
      transportDays: fields.transportDays,
      buffer: fields.buffer,
      milestones,
      rosHistory,
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/parser/headers.test.ts && npm run typecheck`
Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/test/fixtures.ts src/data/parser/headers.ts src/data/parser/headers.test.ts
git commit -m "feat: map procurement sheet headers by name"
```

---

### Task 4: Workbook parser

**Files:**
- Create: `src/data/parser/parsePlan.ts`
- Test: `src/data/parser/parsePlan.test.ts` (the opt-in real-data reconciliation test is added in Task 8, once the analytics it uses exist)

**Interfaces:**
- Consumes: `mapHeaders`, `ColumnMap` (Task 3); `MILESTONES` and domain types (Task 2); `dayFromExcelSerial` (Task 1).
- Produces: `parsePlan(buf: ArrayBuffer, options: { projectName: string; sheetName?: string; now?: Date }): ParseResult`, where `ParseResult = { ok: true; plan: Plan } | { ok: false; error: { code: 'NOT_XLSX' | 'SHEET_NOT_FOUND' | 'EMPTY' | 'MISSING_COLUMNS'; message: string } }`.

Rules implemented (from the real sheet): discipline title rows have text only in the code column; each line is PLANNED + FORECAST + ACTUAL rows; FORECAST/ACTUAL rows are formulas that turn blank code/facility into `0`, so blank, `0`, `None` compare equal; identity, ROS, remark and ROS history come from the PLANNED row only; date cells holding `#####` or `00/Jan/00` are ignored with an `INVALID_DATE` info warning.

- [ ] **Step 1: Write the failing test**

`src/data/parser/parsePlan.test.ts`:

```ts
import { dayFromISO } from '../../lib/day';
import { SHEET_HEADERS, sampleWorkbook, serial, sheetRows, workbookBuffer } from '../../test/fixtures';
import type { Plan } from '../types';
import { parsePlan } from './parsePlan';

const OPTIONS = { projectName: 'Test Project', now: new Date(2026, 8, 18) };

function parseSample(): Plan {
  const result = parsePlan(sampleWorkbook(), OPTIONS);
  if (!result.ok) throw new Error(result.error.message);
  return result.plan;
}

const d = (iso: string) => dayFromISO(iso)!;

describe('parsePlan', () => {
  it('groups PLANNED/FORECAST/ACTUAL rows into lines under their discipline', () => {
    const plan = parseSample();
    expect(plan.project).toBe('Test Project');
    expect(plan.lines).toHaveLength(6);
    expect(plan.disciplines.map((x) => x.name)).toEqual(['MECHANICAL', 'PIPING']);
    const mec = plan.disciplines[0];
    expect(mec.packages.map((p) => p.code)).toEqual(['MEC-001', 'MEC-002', 'UNCODED-15']);
    expect(mec.packages[0].lines.map((l) => l.facility)).toEqual(['PS2K TS', 'PS2R']);
  });

  it('reads plan, forecast and actual dates as timezone-free days', () => {
    const plan = parseSample();
    const slipped = plan.lines.find((l) => l.facility === 'PS2R')!;
    expect(slipped.milestones.trApproval).toEqual({ plan: d('2027-01-01'), forecast: d('2027-01-01'), durationDays: 7 });
    expect(slipped.milestones.received?.forecast).toBe(d('2028-04-20'));
    expect(slipped.ros).toBe(d('2028-04-01'));
    expect(slipped.remark).toBe('Kiểm tra lại ROS');
    const compressor = plan.lines.find((l) => l.packageCode === 'MEC-002')!;
    expect(compressor.itemType).toBe('Bulk');
    expect(compressor.milestones.trApproval?.actual).toBe(d('2026-06-03'));
    expect(compressor.milestones.po?.durationDays).toBeUndefined();
  });

  it('reads ROS history and numeric fields from the PLANNED row', () => {
    const line = parseSample().lines[0];
    expect(line.rosHistory.map((p) => p.label)).toEqual([
      'Old ED (05-Apr-26)',
      'ED End June 2026 (plus 86 days)',
      'ED Mid Aug 2026 (plus 46 days)',
      'ED Mid Oct 2026 (plus 61 days)',
      'ED 01-Nov-2026 (plus 16 days)',
    ]);
    expect(line.rosHistory[0].day).toBe(d('2028-01-01'));
    expect(line.deliveryWeeks).toBe(40);
    expect(line.transportDays).toBe(30);
    expect(line.bufferDays).toBe(10);
    expect(line.sourceRow).toBe(3);
    expect(line.id).toBe('MEC-001|PS2K TS|3');
  });

  it('keeps dirty rows and reports data-quality warnings', () => {
    const plan = parseSample();
    const uncoded = plan.lines.find((l) => !l.hasValidCode)!;
    expect(uncoded.packageCode).toBe('UNCODED-15');
    expect(uncoded.facility).toBe('Unassigned');
    expect(uncoded.milestones.loa?.forecast).toBeDefined();
    expect(plan.warnings.map((w) => w.code)).not.toContain('ORPHAN_ROW');
    const codes = plan.warnings.map((w) => `${w.code}@${w.row}`);
    expect(codes).toEqual(
      expect.arrayContaining(['INVALID_PACKAGE_CODE@15', 'MISSING_FACILITY@15', 'INCOMPLETE_TRIPLET@20', 'INVALID_DATE@20']),
    );
    const pipe = plan.lines.find((l) => l.packageCode === 'PIP-001')!;
    expect(pipe.milestones.mtoPurchase).toBeUndefined();
    expect(pipe.ros).toBe(d('2029-01-01'));
  });

  it('ignores the FORECAST row ROS value (garbage such as 00/Jan/00)', () => {
    const plan = parseSample();
    const invalid = plan.warnings.find((w) => w.code === 'INVALID_DATE')!;
    expect(invalid.message).toContain('MTO for Purchase');
    expect(invalid.message).not.toContain('ROS');
  });

  it('flags FORECAST/ACTUAL rows that do not follow their PLANNED row', () => {
    const rows = sheetRows([{ discipline: 'SAFETY', lines: [{ code: 'SAF-001', facility: 'BF', plan: { loa: '2027-01-01' } }] }]);
    const orphan = [...rows[3]];
    orphan[0] = 'SAF-999';
    rows.splice(4, 0, orphan);
    const result = parsePlan(workbookBuffer(rows), OPTIONS);
    if (!result.ok) throw new Error('expected ok');
    expect(result.plan.warnings.map((w) => w.code)).toContain('ORPHAN_ROW');
  });

  it('warns about lines before the first discipline title', () => {
    const rows: unknown[][] = [SHEET_HEADERS, SHEET_HEADERS.map(() => null)];
    rows[1][0] = 'X-1';
    rows[1][2] = 'BF';
    rows[1][4] = 'PLANNED';
    rows[1][5] = serial('2027-01-01');
    const result = parsePlan(workbookBuffer(rows), OPTIONS);
    if (!result.ok) throw new Error('expected ok');
    expect(result.plan.lines[0].discipline).toBe('Unassigned');
    expect(result.plan.warnings.map((w) => w.code)).toContain('NO_DISCIPLINE');
  });

  it('fails clearly on non-XLSX data, unknown sheets, empty sheets and missing columns', () => {
    const html = new TextEncoder().encode('<!doctype html><html>').buffer as ArrayBuffer;
    expect(parsePlan(html, OPTIONS)).toMatchObject({ ok: false, error: { code: 'NOT_XLSX' } });
    expect(parsePlan(sampleWorkbook(), { ...OPTIONS, sheetName: 'Nope' })).toMatchObject({
      ok: false,
      error: { code: 'SHEET_NOT_FOUND' },
    });
    expect(parsePlan(workbookBuffer([SHEET_HEADERS]), OPTIONS)).toMatchObject({ ok: false, error: { code: 'EMPTY' } });
    const noCode = workbookBuffer([['Facility', 'Date', 'LOA Effective Date'], ['BF', 'PLANNED', 46460]]);
    expect(parsePlan(noCode, OPTIONS)).toMatchObject({
      ok: false,
      error: { code: 'MISSING_COLUMNS', message: expect.stringContaining('package code') },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/parser/parsePlan.test.ts`
Expected: FAIL — `Failed to resolve import "./parsePlan"`.

- [ ] **Step 3: Implement**

`src/data/parser/parsePlan.ts`:

```ts
import * as XLSX from 'xlsx';
import { dayFromExcelSerial, type Day } from '../../lib/day';
import { MILESTONES } from '../milestones';
import type { DataWarning, Discipline, ItemType, Line, MilestoneDates, Package, Plan } from '../types';
import { mapHeaders, type ColumnMap } from './headers';

export type ParseErrorCode = 'NOT_XLSX' | 'SHEET_NOT_FOUND' | 'EMPTY' | 'MISSING_COLUMNS';

export interface ParseError {
  code: ParseErrorCode;
  message: string;
}

export type ParseResult = { ok: true; plan: Plan } | { ok: false; error: ParseError };

export interface ParseOptions {
  projectName: string;
  /** Sheet to read; defaults to the first sheet. */
  sheetName?: string;
  now?: Date;
}

type Row = unknown[];

interface Group {
  planned: Row;
  forecast?: Row;
  actual?: Row;
  sheetRow: number;
  discipline: string;
  rawCode: string;
  rawFacility: string;
}

const UNASSIGNED = 'Unassigned';
const INVALID_TEXT = new Set(['', '0', 'none', 'null', 'n/a']);

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Identity text with the sheet's placeholders ('', 0, None) collapsed to ''. FORECAST/ACTUAL rows are formulas that turn blanks into 0. */
function identity(value: unknown): string {
  const t = text(value);
  return INVALID_TEXT.has(t.toLowerCase()) ? '' : t;
}

function isBlank(value: unknown): boolean {
  return text(value) === '';
}

function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function isZip(buf: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
  return bytes.length === 2 && bytes[0] === 0x50 && bytes[1] === 0x4b; // "PK"
}

function toItemType(value: unknown): ItemType {
  const t = text(value).toLowerCase();
  if (t === 'tagged') return 'Tagged';
  if (t === 'bulk') return 'Bulk';
  return 'Unknown';
}

/** A discipline title row: only the first mapped cell has text. */
function isDisciplineRow(row: Row, map: ColumnMap): boolean {
  if (isBlank(row[map.packageCode])) return false;
  return row.every((cell, i) => i === map.packageCode || isBlank(cell));
}

/** Read a date cell; returns `invalid: true` when the cell has content that is not a date. */
function readDate(value: unknown): { day?: Day; invalid: boolean } {
  if (isBlank(value)) return { invalid: false };
  const day = dayFromExcelSerial(value);
  return day === undefined ? { invalid: true } : { day, invalid: false };
}

function buildLine(group: Group, map: ColumnMap, warnings: DataWarning[]): Line {
  const { planned, forecast, actual, sheetRow } = group;
  const hasValidCode = group.rawCode !== '';
  const packageCode = hasValidCode ? group.rawCode : `UNCODED-${sheetRow}`;
  if (!hasValidCode) {
    warnings.push({
      level: 'warn',
      code: 'INVALID_PACKAGE_CODE',
      row: sheetRow,
      message: `Package Code trống hoặc bằng 0 → gán ${packageCode}`,
    });
  }
  const facility = group.rawFacility || UNASSIGNED;
  if (!group.rawFacility) {
    warnings.push({ level: 'warn', code: 'MISSING_FACILITY', row: sheetRow, message: `${packageCode}: thiếu Facility` });
  }
  if (!forecast || !actual) {
    const missing = [!forecast && 'FORECAST', !actual && 'ACTUAL'].filter(Boolean).join(', ');
    warnings.push({ level: 'warn', code: 'INCOMPLETE_TRIPLET', row: sheetRow, message: `${packageCode} @ ${facility}: thiếu dòng ${missing}` });
  }

  const invalidColumns = new Set<string>();
  const milestones: Line['milestones'] = {};
  for (const m of MILESTONES) {
    const cols = map.milestones[m.key];
    if (!cols) continue;
    const dates: MilestoneDates = {};
    const read = (row: Row | undefined, slot: 'plan' | 'forecast' | 'actual') => {
      if (!row) return;
      const r = readDate(row[cols.date]);
      if (r.invalid) invalidColumns.add(m.label);
      if (r.day !== undefined) dates[slot] = r.day;
    };
    read(planned, 'plan');
    read(forecast, 'forecast');
    read(actual, 'actual');
    const duration = cols.duration !== undefined ? num(planned[cols.duration]) : undefined;
    if (duration !== undefined) dates.durationDays = duration;
    if (dates.plan !== undefined || dates.forecast !== undefined || dates.actual !== undefined) {
      milestones[m.key] = dates;
    }
  }

  const rosCell = map.ros !== undefined ? readDate(planned[map.ros]) : { invalid: false };
  if (rosCell.invalid) invalidColumns.add('ROS');
  if (invalidColumns.size > 0) {
    warnings.push({
      level: 'info',
      code: 'INVALID_DATE',
      row: sheetRow,
      message: `${packageCode} @ ${facility}: ngày không hợp lệ ở ${[...invalidColumns].join(', ')}`,
    });
  }

  const rosHistory = map.rosHistory.flatMap(({ label, col }) => {
    const day = dayFromExcelSerial(planned[col]);
    return day === undefined ? [] : [{ label, day }];
  });
  const remark = map.remark !== undefined ? text(planned[map.remark]) : '';

  return {
    id: `${packageCode}|${facility}|${sheetRow}`,
    discipline: group.discipline,
    packageCode,
    hasValidCode,
    packageName: map.packageName !== undefined ? text(planned[map.packageName]) : '',
    facility,
    itemType: map.itemType !== undefined ? toItemType(planned[map.itemType]) : 'Unknown',
    milestones,
    ros: rosCell.day,
    rosHistory,
    deliveryWeeks: map.deliveryWeeks !== undefined ? num(planned[map.deliveryWeeks]) : undefined,
    transportDays: map.transportDays !== undefined ? num(planned[map.transportDays]) : undefined,
    bufferDays: map.buffer !== undefined ? num(planned[map.buffer]) : undefined,
    remark: remark || undefined,
    sourceRow: sheetRow,
  };
}

function groupDisciplines(lines: Line[]): Discipline[] {
  const disciplines = new Map<string, Map<string, Package>>();
  for (const line of lines) {
    let packages = disciplines.get(line.discipline);
    if (!packages) {
      packages = new Map();
      disciplines.set(line.discipline, packages);
    }
    let pkg = packages.get(line.packageCode);
    if (!pkg) {
      pkg = { code: line.packageCode, name: line.packageName, discipline: line.discipline, lines: [] };
      packages.set(line.packageCode, pkg);
    }
    pkg.lines.push(line);
  }
  return [...disciplines].map(([name, packages]) => ({ name, packages: [...packages.values()] }));
}

/** Parse the procurement workbook into the normalized Plan. Pure: no I/O. */
export function parsePlan(buf: ArrayBuffer, options: ParseOptions): ParseResult {
  if (!isZip(buf)) {
    return { ok: false, error: { code: 'NOT_XLSX', message: 'Dữ liệu tải về không phải file Excel (XLSX).' } };
  }
  const workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  const sheetName = options.sheetName ?? workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    return {
      ok: false,
      error: { code: 'SHEET_NOT_FOUND', message: `Không tìm thấy sheet "${sheetName}". Các sheet hiện có: ${workbook.SheetNames.join(', ')}` },
    };
  }
  const rows = XLSX.utils.sheet_to_json<Row>(sheet, { header: 1, raw: true, defval: null, blankrows: true });
  if (rows.length < 2) {
    return { ok: false, error: { code: 'EMPTY', message: `Sheet "${sheetName}" không có dữ liệu.` } };
  }
  const header = mapHeaders(rows[0]);
  if (!header.ok) {
    return {
      ok: false,
      error: { code: 'MISSING_COLUMNS', message: `Thiếu cột bắt buộc: ${header.missing.join(', ')}` },
    };
  }
  const { map } = header;
  const warnings: DataWarning[] = header.unknownHeaders.map((h) => ({
    level: 'info' as const,
    code: 'UNKNOWN_COLUMN' as const,
    message: `Bỏ qua cột không nhận diện: "${h}"`,
  }));

  const groups: Group[] = [];
  let discipline = UNASSIGNED;
  let current: Group | undefined;
  let warnedNoDiscipline = false;

  rows.slice(1).forEach((row, i) => {
    const sheetRow = i + 2;
    const rowType = text(row[map.rowType]).toUpperCase();
    if (!rowType) {
      if (isDisciplineRow(row, map)) {
        discipline = text(row[map.packageCode]);
        current = undefined;
      }
      return;
    }
    const rawCode = identity(row[map.packageCode]);
    const rawFacility = identity(row[map.facility]);
    if (rowType === 'PLANNED') {
      if (discipline === UNASSIGNED && !warnedNoDiscipline) {
        warnedNoDiscipline = true;
        warnings.push({ level: 'warn', code: 'NO_DISCIPLINE', row: sheetRow, message: 'Có dòng dữ liệu nằm trước tiêu đề discipline đầu tiên' });
      }
      current = { planned: row, sheetRow, discipline, rawCode, rawFacility };
      groups.push(current);
      return;
    }
    if (rowType === 'FORECAST' || rowType === 'ACTUAL') {
      const slot = rowType === 'FORECAST' ? 'forecast' : 'actual';
      if (current && !current[slot] && current.rawCode === rawCode && current.rawFacility === rawFacility) {
        current[slot] = row;
      } else {
        warnings.push({ level: 'warn', code: 'ORPHAN_ROW', row: sheetRow, message: `Dòng ${rowType} không đi kèm dòng PLANNED tương ứng (${rawCode || 'trống'})` });
      }
      return;
    }
    warnings.push({ level: 'warn', code: 'UNKNOWN_ROW_TYPE', row: sheetRow, message: `Giá trị cột Date không hợp lệ: "${rowType}"` });
  });

  const lines = groups.map((g) => buildLine(g, map, warnings));
  return {
    ok: true,
    plan: {
      project: options.projectName,
      loadedAt: options.now ?? new Date(),
      disciplines: groupDisciplines(lines),
      lines,
      warnings,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/data/parser/parsePlan.test.ts && npm run typecheck`
Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/parser/parsePlan.ts src/data/parser/parsePlan.test.ts
git commit -m "feat: parse procurement workbook into normalized plan with data-quality warnings"
```

---

### Task 5: Runtime config and data sources

**Files:**
- Create: `src/config/config.ts`, `src/data/sources/sources.ts`
- Test: `src/config/config.test.ts`, `src/data/sources/sources.test.ts`

**Interfaces:**
- Produces (config): `DataSourceType`, `DataSourceConfig { type; url; sheetName? }`, `AppConfig { appName; projectName; dataSource; dueSoonDays }`, `ConfigError`, `parseConfig(raw): AppConfig`, `loadConfig(fetchImpl?): Promise<AppConfig>`.
- Produces (sources): `DataSource { label; load(signal?): Promise<ArrayBuffer> }`, `SourceErrorCode`, `SourceError { code; status? }`, `toGoogleExportUrl(url)`, `createHttpXlsxSource({ label, url, fetchImpl?, timeoutMs? })`, `createDataSource(config, fetchImpl?)`.

- [ ] **Step 1: Write the failing tests**

`src/config/config.test.ts`:

```ts
import { ConfigError, loadConfig, parseConfig } from './config';

const VALID = {
  appName: 'PMS - PEIW',
  projectName: 'Maydan Mahzam',
  dataSource: { type: 'google-sheet', url: 'https://example.com/export?format=xlsx', sheetName: 'ALL' },
  dueSoonDays: 30,
};

describe('parseConfig', () => {
  it('accepts a valid config', () => {
    expect(parseConfig(VALID)).toEqual(VALID);
  });

  it('applies defaults for optional fields', () => {
    expect(parseConfig({ dataSource: { type: 'server', url: '/api/data' } })).toEqual({
      appName: 'PMS - PEIW',
      projectName: 'Procurement Plan',
      dataSource: { type: 'server', url: '/api/data', sheetName: undefined },
      dueSoonDays: 30,
    });
  });

  it('rejects invalid configs with readable messages', () => {
    expect(() => parseConfig(null)).toThrow(ConfigError);
    expect(() => parseConfig({})).toThrow('dataSource');
    expect(() => parseConfig({ dataSource: { type: 'ftp', url: 'x' } })).toThrow('dataSource.type');
    expect(() => parseConfig({ dataSource: { type: 'server', url: ' ' } })).toThrow('dataSource.url');
    expect(() => parseConfig({ ...VALID, dueSoonDays: 0 })).toThrow('dueSoonDays');
  });
});

describe('loadConfig', () => {
  it('fetches config.json without caching', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(VALID)));
    await expect(loadConfig(fetchImpl)).resolves.toEqual(VALID);
    expect(fetchImpl).toHaveBeenCalledWith('config.json', { cache: 'no-store' });
  });

  it('reports HTTP, network and JSON errors', async () => {
    await expect(loadConfig(async () => new Response('', { status: 404 }))).rejects.toThrow('HTTP 404');
    await expect(
      loadConfig(async () => {
        throw new TypeError('offline');
      }),
    ).rejects.toThrow('Không tải được config.json');
    await expect(loadConfig(async () => new Response('{oops'))).rejects.toThrow('JSON');
  });
});
```

`src/data/sources/sources.test.ts`:

```ts
import { createDataSource, createHttpXlsxSource, SourceError, toGoogleExportUrl } from './sources';

const XLSX_BYTES = new Uint8Array([0x50, 0x4b, 3, 4]);
const xlsxResponse = () => new Response(XLSX_BYTES, { headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } });

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (e) {
    return e instanceof SourceError ? e.code : 'OTHER';
  }
  return undefined;
}

describe('toGoogleExportUrl', () => {
  it('converts edit links to the XLSX export URL', () => {
    expect(toGoogleExportUrl('https://docs.google.com/spreadsheets/d/abc_123-X/edit?gid=0#gid=0')).toBe(
      'https://docs.google.com/spreadsheets/d/abc_123-X/export?format=xlsx',
    );
  });

  it('leaves export, publish and non-Google URLs unchanged', () => {
    const exportUrl = 'https://docs.google.com/spreadsheets/d/abc/export?format=xlsx';
    expect(toGoogleExportUrl(exportUrl)).toBe(exportUrl);
    expect(toGoogleExportUrl('https://docs.google.com/spreadsheets/d/e/abc/pub?output=xlsx')).toContain('/pub?');
    expect(toGoogleExportUrl('/api/data')).toBe('/api/data');
  });
});

describe('createHttpXlsxSource', () => {
  it('returns the workbook bytes', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => xlsxResponse());
    const source = createHttpXlsxSource({ label: 'T', url: 'https://x/file', fetchImpl });
    const buf = await source.load();
    expect(new Uint8Array(buf)).toEqual(XLSX_BYTES);
    expect(fetchImpl).toHaveBeenCalledWith('https://x/file', expect.objectContaining({ cache: 'no-store', credentials: 'omit' }));
  });

  it('classifies HTTP and content failures', async () => {
    const make = (response: Response) => createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: async () => response }).load();
    expect(await codeOf(make(new Response('', { status: 401 })))).toBe('ACCESS_DENIED');
    expect(await codeOf(make(new Response('', { status: 404 })))).toBe('NOT_FOUND');
    expect(await codeOf(make(new Response('', { status: 500 })))).toBe('HTTP');
    expect(await codeOf(make(new Response('<html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })))).toBe(
      'ACCESS_DENIED',
    );
    expect(await codeOf(make(new Response('a,b,c', { headers: { 'content-type': 'text/csv' } })))).toBe('NOT_XLSX');
  });

  it('classifies network failures, timeouts and caller aborts', async () => {
    const failing = createHttpXlsxSource({
      label: 'T',
      url: 'u',
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(await codeOf(failing.load())).toBe('NETWORK');

    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))));
    expect(await codeOf(createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: hanging, timeoutMs: 10 }).load())).toBe('TIMEOUT');

    const controller = new AbortController();
    const pending = createHttpXlsxSource({ label: 'T', url: 'u', fetchImpl: hanging }).load(controller.signal);
    controller.abort();
    expect(await codeOf(pending)).toBe('ABORTED');
  });
});

describe('createDataSource', () => {
  it('builds a Google Sheet source from an edit link', async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => xlsxResponse());
    const source = createDataSource({ type: 'google-sheet', url: 'https://docs.google.com/spreadsheets/d/ID/edit' }, fetchImpl);
    expect(source.label).toBe('Google Sheet');
    await source.load();
    expect(fetchImpl.mock.calls[0][0]).toBe('https://docs.google.com/spreadsheets/d/ID/export?format=xlsx');
  });

  it('builds a server source', () => {
    expect(createDataSource({ type: 'server', url: '/api/data' }).label).toBe('Server');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/config src/data/sources`
Expected: FAIL — `Failed to resolve import "./config"` and `"./sources"`.

- [ ] **Step 3: Implement config**

`src/config/config.ts`:

```ts
export type DataSourceType = 'google-sheet' | 'server';

export interface DataSourceConfig {
  type: DataSourceType;
  url: string;
  sheetName?: string;
}

export interface AppConfig {
  appName: string;
  projectName: string;
  dataSource: DataSourceConfig;
  dueSoonDays: number;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const DEFAULTS = { appName: 'PMS - PEIW', projectName: 'Procurement Plan', dueSoonDays: 30 };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Validate raw JSON and apply defaults. Throws ConfigError with a readable message. */
export function parseConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) throw new ConfigError('config.json phải là một object JSON.');
  const ds = raw.dataSource;
  if (!isRecord(ds)) throw new ConfigError('Thiếu "dataSource" trong config.json.');
  if (ds.type !== 'google-sheet' && ds.type !== 'server') {
    throw new ConfigError('"dataSource.type" phải là "google-sheet" hoặc "server".');
  }
  if (typeof ds.url !== 'string' || ds.url.trim() === '') {
    throw new ConfigError('Thiếu "dataSource.url" trong config.json.');
  }
  const dueSoonDays = raw.dueSoonDays ?? DEFAULTS.dueSoonDays;
  if (typeof dueSoonDays !== 'number' || !Number.isInteger(dueSoonDays) || dueSoonDays < 1) {
    throw new ConfigError('"dueSoonDays" phải là số nguyên dương.');
  }
  const str = (v: unknown, fallback: string) => (typeof v === 'string' && v.trim() ? v.trim() : fallback);
  return {
    appName: str(raw.appName, DEFAULTS.appName),
    projectName: str(raw.projectName, DEFAULTS.projectName),
    dataSource: {
      type: ds.type,
      url: ds.url.trim(),
      sheetName: typeof ds.sheetName === 'string' && ds.sheetName.trim() ? ds.sheetName.trim() : undefined,
    },
    dueSoonDays,
  };
}

/** Load `config.json` next to index.html; never cached. */
export async function loadConfig(fetchImpl: typeof fetch = fetch): Promise<AppConfig> {
  let response: Response;
  try {
    response = await fetchImpl('config.json', { cache: 'no-store' });
  } catch {
    throw new ConfigError('Không tải được config.json từ server.');
  }
  if (!response.ok) throw new ConfigError(`Không tải được config.json (HTTP ${response.status}).`);
  let raw: unknown;
  try {
    raw = await response.json();
  } catch {
    throw new ConfigError('config.json không phải JSON hợp lệ.');
  }
  return parseConfig(raw);
}
```

- [ ] **Step 4: Implement sources**

`src/data/sources/sources.ts`:

```ts
import type { DataSourceConfig } from '../../config/config';

/** Anything that can hand back the workbook bytes. The rest of the app never knows where they came from. */
export interface DataSource {
  readonly label: string;
  load(signal?: AbortSignal): Promise<ArrayBuffer>;
}

export type SourceErrorCode = 'NETWORK' | 'TIMEOUT' | 'ACCESS_DENIED' | 'NOT_FOUND' | 'NOT_XLSX' | 'HTTP' | 'ABORTED';

export class SourceError extends Error {
  readonly code: SourceErrorCode;
  readonly status?: number;
  constructor(code: SourceErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SourceError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

/** Turn a Google Sheets edit/share link into its XLSX export URL; other URLs pass through. */
export function toGoogleExportUrl(url: string): string {
  const match = /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(url);
  if (!match || /\/export\?/.test(url) || /\/pub\?/.test(url)) return url;
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=xlsx`;
}

interface HttpSourceOptions {
  label: string;
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Fetch an XLSX over HTTP with timeout, abort and clear error classification. */
export function createHttpXlsxSource({ label, url, fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: HttpSourceOptions): DataSource {
  return {
    label,
    async load(signal) {
      const controller = new AbortController();
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
      const onAbort = () => controller.abort();
      signal?.addEventListener('abort', onAbort);
      try {
        let response: Response;
        try {
          response = await fetchImpl(url, { signal: controller.signal, cache: 'no-store', credentials: 'omit' });
        } catch {
          if (timedOut) throw new SourceError('TIMEOUT', `Hết thời gian chờ (${timeoutMs / 1000}s) khi tải dữ liệu.`);
          if (signal?.aborted) throw new SourceError('ABORTED', 'Đã hủy tải dữ liệu.');
          throw new SourceError('NETWORK', 'Không kết nối được tới nguồn dữ liệu. Kiểm tra kết nối internet của máy bạn.');
        }
        if (response.status === 401 || response.status === 403) {
          throw new SourceError('ACCESS_DENIED', 'Nguồn dữ liệu từ chối truy cập. Sheet có thể không còn được chia sẻ công khai.', response.status);
        }
        if (response.status === 404) {
          throw new SourceError('NOT_FOUND', 'Không tìm thấy nguồn dữ liệu (HTTP 404). Kiểm tra lại URL trong config.json.', 404);
        }
        if (!response.ok) {
          throw new SourceError('HTTP', `Nguồn dữ liệu trả lỗi HTTP ${response.status}.`, response.status);
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (contentType.includes('text/html')) {
          throw new SourceError('ACCESS_DENIED', 'Nguồn dữ liệu trả về trang web thay vì file Excel. Sheet có thể yêu cầu đăng nhập.');
        }
        const buf = await response.arrayBuffer();
        const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
        if (head.length < 2 || head[0] !== 0x50 || head[1] !== 0x4b) {
          throw new SourceError('NOT_XLSX', 'Dữ liệu tải về không phải file Excel (XLSX).');
        }
        return buf;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
    },
  };
}

export function createDataSource(config: DataSourceConfig, fetchImpl?: typeof fetch): DataSource {
  if (config.type === 'google-sheet') {
    return createHttpXlsxSource({ label: 'Google Sheet', url: toGoogleExportUrl(config.url), fetchImpl });
  }
  return createHttpXlsxSource({ label: 'Server', url: config.url, fetchImpl });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/config src/data/sources && npm run typecheck`
Expected: 5 config tests and 7 source tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/config src/data/sources
git commit -m "feat: add config loader and HTTP XLSX data source with error classification"
```

---

### Task 6: Line metrics

**Files:**
- Create: `src/analytics/lineMetrics.ts`, `src/test/planFixture.ts`
- Test: `src/analytics/lineMetrics.test.ts`

**Interfaces:**
- Consumes: `parsePlan` (Task 4), `sampleWorkbook` (Task 3), `MILESTONES`, `MILESTONE_BY_KEY` (Task 2).
- Produces: `MetricsContext { cutOff: Day; dueSoonDays: number }`, `MilestoneStatus = 'done' | 'overdue' | 'dueSoon' | 'future' | 'noDate'`, `NextMilestone { key; day?; status }`, `LineMetrics { line; status; maxSlip?; minSlip?; isSlipped; isAhead; rosFloat?; rosAtRisk; currentPhase; scheduledPhase; next?; overdueCount; dueSoonCount; rosPushCount; rosPushDays }`, `effectiveDay(m)` (actual → forecast → plan), `targetDay(m)` (forecast → plan), `milestoneStatus(m, ctx)`, `milestoneSlip(m)`, `computeLineMetrics(line, ctx)`, `computeAllMetrics(lines, ctx)`.
- Produces (test helpers): `TEST_CTX` (cut-off 18-Sep-2026, 30 days), `samplePlan()`, `sampleMetrics(ctx?)`, `metricsFor(metrics, code, facility?)`, `makeLine(patch?)`.

`currentPhase` = phase of the first dated milestone without an actual (recorded progress). `scheduledPhase` = phase of the first open milestone whose target is on/after the cut-off (where the line should be now). The real sheet has no ACTUAL values yet, so `scheduledPhase` is what the funnel and phase filter use.

- [ ] **Step 1: Create the sample-plan helpers**

`src/test/planFixture.ts`:

```ts
import { parsePlan } from '../data/parser/parsePlan';
import type { Line, Plan } from '../data/types';
import { dayFromISO } from '../lib/day';
import { computeAllMetrics, type LineMetrics, type MetricsContext } from '../analytics/lineMetrics';
import { sampleWorkbook } from './fixtures';

/** Cut-off used across analytics tests: 18-Sep-2026. */
export const TEST_CTX: MetricsContext = { cutOff: dayFromISO('2026-09-18')!, dueSoonDays: 30 };

export function samplePlan(): Plan {
  const result = parsePlan(sampleWorkbook(), { projectName: 'Test Project', now: new Date(2026, 8, 18) });
  if (!result.ok) throw new Error(result.error.message);
  return result.plan;
}

export function sampleMetrics(ctx: MetricsContext = TEST_CTX): LineMetrics[] {
  return computeAllMetrics(samplePlan().lines, ctx);
}

/** Find a line's metrics by package code and facility. */
export function metricsFor(metrics: LineMetrics[], code: string, facility?: string): LineMetrics {
  const found = metrics.find((m) => m.line.packageCode === code && (facility === undefined || m.line.facility === facility));
  if (!found) throw new Error(`no line ${code} ${facility ?? ''}`);
  return found;
}

let syntheticRow = 1000;

/** Build a Line directly (no workbook) for focused analytics tests. */
export function makeLine(patch: Partial<Line> = {}): Line {
  syntheticRow += 1;
  const code = patch.packageCode ?? `SYN-${syntheticRow}`;
  const facility = patch.facility ?? 'BF';
  return {
    id: `${code}|${facility}|${syntheticRow}`,
    discipline: 'MECHANICAL',
    packageCode: code,
    hasValidCode: true,
    packageName: 'Synthetic item',
    facility,
    itemType: 'Tagged',
    milestones: {},
    rosHistory: [],
    sourceRow: syntheticRow,
    ...patch,
  };
}
```

- [ ] **Step 2: Write the failing test**

`src/analytics/lineMetrics.test.ts`:

```ts
import { dayFromISO } from '../lib/day';
import { metricsFor, sampleMetrics, TEST_CTX } from '../test/planFixture';
import { effectiveDay, milestoneSlip, milestoneStatus, targetDay } from './lineMetrics';

const d = (iso: string) => dayFromISO(iso)!;

describe('milestone helpers', () => {
  it('picks effective and target days', () => {
    expect(effectiveDay({ plan: 1, forecast: 2, actual: 3 })).toBe(3);
    expect(effectiveDay({ plan: 1, forecast: 2 })).toBe(2);
    expect(targetDay({ plan: 1, actual: 3 })).toBe(1);
    expect(effectiveDay(undefined)).toBeUndefined();
  });

  it('derives status relative to the cut-off', () => {
    const c = TEST_CTX.cutOff;
    expect(milestoneStatus({ plan: c - 100, actual: c - 90 }, TEST_CTX)).toBe('done');
    expect(milestoneStatus({ plan: c - 1 }, TEST_CTX)).toBe('overdue');
    expect(milestoneStatus({ plan: c - 10, forecast: c + 5 }, TEST_CTX)).toBe('dueSoon');
    expect(milestoneStatus({ plan: c + 30 }, TEST_CTX)).toBe('dueSoon');
    expect(milestoneStatus({ plan: c + 31 }, TEST_CTX)).toBe('future');
    expect(milestoneStatus({}, TEST_CTX)).toBe('noDate');
  });

  it('computes slippage as forecast minus plan', () => {
    expect(milestoneSlip({ plan: 10, forecast: 25 })).toBe(15);
    expect(milestoneSlip({ plan: 10 })).toBeUndefined();
  });
});

describe('computeLineMetrics', () => {
  const metrics = sampleMetrics();

  it('flags a line whose forecast slips past ROS', () => {
    const m = metricsFor(metrics, 'MEC-001', 'PS2R');
    expect(m.isSlipped).toBe(true);
    expect(m.maxSlip).toBe(d('2028-04-20') - d('2028-02-05'));
    expect(m.rosFloat).toBe(d('2028-04-01') - d('2028-04-20'));
    expect(m.rosAtRisk).toBe(true);
    expect(m.currentPhase).toBe('tr');
    expect(m.scheduledPhase).toBe('tr');
    expect(m.next).toEqual({ key: 'trApproval', day: d('2027-01-01'), status: 'future' });
  });

  it('keeps an on-plan line healthy and measures ROS pushes', () => {
    const m = metricsFor(metrics, 'MEC-001', 'PS2K TS');
    expect(m.isSlipped).toBe(false);
    expect(m.rosAtRisk).toBe(false);
    expect(m.rosPushCount).toBe(3);
    expect(m.rosPushDays).toBe(d('2028-06-01') - d('2028-01-01'));
  });

  it('moves past milestones with actuals and counts overdue ones', () => {
    const m = metricsFor(metrics, 'MEC-002');
    expect(m.status.trApproval).toBe('done');
    expect(m.status.rfqSubmission).toBe('done');
    expect(m.next?.key).toBe('rfqApproval');
    expect(m.currentPhase).toBe('tr');
    // By schedule the line should already be at TBE Approval (30-Sep-2026).
    expect(m.scheduledPhase).toBe('evaluation');
    // chain('2026-06-01') → milestones 3..6 fall before 18-Sep-2026 without actuals.
    expect(m.overdueCount).toBe(4);
    expect(m.isAhead).toBe(true);
  });

  it('marks fully actualized lines as delivered', () => {
    const m = metricsFor(metrics, 'PIP-002');
    expect(m.currentPhase).toBe('delivered');
    expect(m.scheduledPhase).toBe('delivered');
    expect(m.next).toBeUndefined();
    expect(m.overdueCount).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/analytics/lineMetrics.test.ts`
Expected: FAIL — `Failed to resolve import "../analytics/lineMetrics"`.

- [ ] **Step 4: Implement**

`src/analytics/lineMetrics.ts`:

```ts
import { MILESTONES, MILESTONE_BY_KEY } from '../data/milestones';
import type { Line, LinePhase, MilestoneDates, MilestoneKey } from '../data/types';
import type { Day } from '../lib/day';

export interface MetricsContext {
  cutOff: Day;
  dueSoonDays: number;
}

export type MilestoneStatus = 'done' | 'overdue' | 'dueSoon' | 'future' | 'noDate';

export interface NextMilestone {
  key: MilestoneKey;
  day?: Day;
  status: MilestoneStatus;
}

export interface LineMetrics {
  line: Line;
  status: Partial<Record<MilestoneKey, MilestoneStatus>>;
  /** Largest forecast − plan in days (positive = late). */
  maxSlip?: number;
  /** Smallest forecast − plan in days (negative = ahead). */
  minSlip?: number;
  isSlipped: boolean;
  isAhead: boolean;
  /** ROS − effective "Received at Worksite" date, in days. */
  rosFloat?: number;
  rosAtRisk: boolean;
  /** Phase by recorded progress: phase of the first dated milestone without an actual. */
  currentPhase: LinePhase;
  /** Phase by schedule: phase of the first open milestone whose target is on/after the cut-off. */
  scheduledPhase: LinePhase;
  next?: NextMilestone;
  overdueCount: number;
  dueSoonCount: number;
  /** Number of times the ROS moved later across the ED history. */
  rosPushCount: number;
  /** Total days the ROS moved from the first to the last ED entry. */
  rosPushDays: number;
}

export function effectiveDay(m: MilestoneDates | undefined): Day | undefined {
  return m?.actual ?? m?.forecast ?? m?.plan;
}

/** The date we are working towards: forecast, else plan. */
export function targetDay(m: MilestoneDates | undefined): Day | undefined {
  return m?.forecast ?? m?.plan;
}

export function milestoneStatus(m: MilestoneDates | undefined, ctx: MetricsContext): MilestoneStatus {
  if (m?.actual !== undefined) return 'done';
  const target = targetDay(m);
  if (target === undefined) return 'noDate';
  if (target < ctx.cutOff) return 'overdue';
  if (target <= ctx.cutOff + ctx.dueSoonDays) return 'dueSoon';
  return 'future';
}

export function milestoneSlip(m: MilestoneDates | undefined): number | undefined {
  if (m?.forecast === undefined || m.plan === undefined) return undefined;
  return m.forecast - m.plan;
}

function rosPush(line: Line): { count: number; days: number } {
  const days = line.rosHistory.map((p) => p.day);
  let count = 0;
  for (let i = 1; i < days.length; i += 1) if (days[i] > days[i - 1]) count += 1;
  return { count, days: days.length > 1 ? days[days.length - 1] - days[0] : 0 };
}

export function computeLineMetrics(line: Line, ctx: MetricsContext): LineMetrics {
  const status: LineMetrics['status'] = {};
  let maxSlip: number | undefined;
  let minSlip: number | undefined;
  let overdueCount = 0;
  let dueSoonCount = 0;
  let next: NextMilestone | undefined;
  let scheduled: MilestoneKey | undefined;
  let hasDated = false;

  for (const def of MILESTONES) {
    const m = line.milestones[def.key];
    if (!m) continue;
    hasDated = true;
    const s = milestoneStatus(m, ctx);
    status[def.key] = s;
    if (s === 'overdue') overdueCount += 1;
    if (s === 'dueSoon') dueSoonCount += 1;
    const slip = milestoneSlip(m);
    if (slip !== undefined) {
      maxSlip = maxSlip === undefined ? slip : Math.max(maxSlip, slip);
      minSlip = minSlip === undefined ? slip : Math.min(minSlip, slip);
    }
    if (!next && s !== 'done') next = { key: def.key, day: targetDay(m), status: s };
    if (!scheduled && (s === 'dueSoon' || s === 'future')) scheduled = def.key;
  }

  const received = effectiveDay(line.milestones.received);
  const rosFloat = line.ros !== undefined && received !== undefined ? line.ros - received : undefined;
  const push = rosPush(line);
  let currentPhase: LinePhase = 'tr';
  if (next) currentPhase = MILESTONE_BY_KEY[next.key].phase;
  else if (hasDated) currentPhase = 'delivered';
  let scheduledPhase: LinePhase = 'tr';
  if (scheduled) scheduledPhase = MILESTONE_BY_KEY[scheduled].phase;
  else if (hasDated) scheduledPhase = 'delivered';

  return {
    line,
    status,
    maxSlip,
    minSlip,
    isSlipped: (maxSlip ?? 0) > 0,
    isAhead: (minSlip ?? 0) < 0,
    rosFloat,
    rosAtRisk: rosFloat !== undefined && rosFloat < 0,
    currentPhase,
    scheduledPhase,
    next,
    overdueCount,
    dueSoonCount,
    rosPushCount: push.count,
    rosPushDays: push.days,
  };
}

export function computeAllMetrics(lines: readonly Line[], ctx: MetricsContext): LineMetrics[] {
  return lines.map((line) => computeLineMetrics(line, ctx));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/analytics/lineMetrics.test.ts && npm run typecheck`
Expected: 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/analytics/lineMetrics.ts src/analytics/lineMetrics.test.ts src/test/planFixture.ts
git commit -m "feat: compute per-line milestone status, slippage, ROS float and phases"
```

---

### Task 7: Smart search and filters

**Files:**
- Create: `src/analytics/search.ts`, `src/analytics/filters.ts`
- Test: `src/analytics/search.test.ts`, `src/analytics/filters.test.ts`

**Interfaces:**
- Consumes: `LineMetrics`, `effectiveDay` (Task 6); `MILESTONES` (Task 2); `dayFromYMD`, `MONTH_ABBREVIATIONS` (Task 1).
- Produces (search): `SearchVocabulary { disciplines; facilities }`, `Period { from; to; label }`, `ParsedSearch { disciplines; facilities; itemTypes; phases; milestones; period?; text }`, `parseSearch(query, vocab)`, `describeSearch(parsed): string[]`.
- Produces (filters): `Flag = 'slipped' | 'rosRisk' | 'overdue' | 'dueSoon'`, `Filters { disciplines; facilities; itemTypes; phases; flags; q }`, `EMPTY_FILTERS`, `isEmptyFilters(f)`, `applyFilters(metrics, filters, vocab)`, `vocabularyOf(metrics)`.

Search semantics: multi-word vocabulary (`PS2K TS`, `INSTRUMENT & TELECOM`) is matched before splitting on spaces; milestone words (`loa`, `tbe`, `site`, …) combined with a period (`2027`, `Q2-2027`, `Mar-2027`) mean "that milestone falls in the period"; a period alone means "the next open milestone falls in the period"; other words match package code or name.

- [ ] **Step 1: Write the failing tests**

`src/analytics/search.test.ts`:

```ts
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

  it('describes what was understood', () => {
    expect(describeSearch(parseSearch('PS2R LOA Q2-2027 pump', VOCAB))).toEqual(['PS2R', 'LOA', 'Q2-2027', '"pump"']);
  });
});
```

`src/analytics/filters.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/analytics/search.test.ts src/analytics/filters.test.ts`
Expected: FAIL — `Failed to resolve import "./search"` / `"./filters"`.

- [ ] **Step 3: Implement search**

`src/analytics/search.ts`:

```ts
import { MILESTONES } from '../data/milestones';
import type { ItemType, LinePhase, MilestoneKey } from '../data/types';
import { dayFromYMD, MONTH_ABBREVIATIONS, type Day } from '../lib/day';

export interface SearchVocabulary {
  disciplines: readonly string[];
  facilities: readonly string[];
}

export interface Period {
  from: Day;
  to: Day;
  label: string;
}

export interface ParsedSearch {
  disciplines: string[];
  facilities: string[];
  itemTypes: ItemType[];
  phases: LinePhase[];
  milestones: MilestoneKey[];
  period?: Period;
  /** Remaining free-text tokens, matched against package code and name. */
  text: string[];
}

const PHASE_WORDS: Record<string, LinePhase> = {
  'pre-rfq': 'tr',
  bidding: 'rfq',
  evaluation: 'evaluation',
  award: 'award',
  manufacturing: 'manufacturing',
  logistics: 'logistics',
  delivered: 'delivered',
};

const MILESTONE_WORDS: Record<string, MilestoneKey> = {
  tr: 'trApproval',
  rfq: 'rfqIssue',
  bids: 'bidsDue',
  tbe: 'tbeApproval',
  cbe: 'cbeApproval',
  loa: 'loa',
  po: 'po',
  vd: 'criticalVd',
  spir: 'spirApproved',
  fat: 'fat',
  exw: 'fat',
  ship: 'shipped',
  shipped: 'shipped',
  site: 'received',
  received: 'received',
};

const ITEM_TYPE_WORDS: Record<string, ItemType> = { tagged: 'Tagged', bulk: 'Bulk' };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePeriod(token: string): Period | undefined {
  let m = /^(\d{4})$/.exec(token);
  if (m) {
    const y = Number(m[1]);
    return { from: dayFromYMD(y, 1, 1), to: dayFromYMD(y + 1, 1, 1) - 1, label: m[1] };
  }
  m = /^q([1-4])[-/]?(\d{4})$/.exec(token);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    return { from: dayFromYMD(y, q * 3 - 2, 1), to: dayFromYMD(y, q * 3 + 1, 1) - 1, label: `Q${q}-${y}` };
  }
  m = /^([a-z]{3})[-/]?(\d{4})$/.exec(token);
  if (m) {
    const month = MONTH_ABBREVIATIONS.findIndex((a) => a.toLowerCase() === m![1]) + 1;
    if (month === 0) return undefined;
    const y = Number(m[2]);
    return { from: dayFromYMD(y, month, 1), to: dayFromYMD(y, month + 1, 1) - 1, label: `${MONTH_ABBREVIATIONS[month - 1]}-${y}` };
  }
  return undefined;
}

/**
 * Turn a free-text query like "PS2R LOA Q2-2027 pump" into structured criteria.
 * Multi-word vocabulary entries ("PS2K TS", "INSTRUMENT & TELECOM") are matched before splitting on spaces.
 */
export function parseSearch(query: string, vocab: SearchVocabulary): ParsedSearch {
  const result: ParsedSearch = { disciplines: [], facilities: [], itemTypes: [], phases: [], milestones: [], text: [] };
  let rest = ` ${query.toLowerCase().replace(/\s+/g, ' ').trim()} `;

  const phrases = [
    ...vocab.facilities.map((v) => ({ v, kind: 'facilities' as const })),
    ...vocab.disciplines.map((v) => ({ v, kind: 'disciplines' as const })),
  ].sort((a, b) => b.v.length - a.v.length);

  for (const { v, kind } of phrases) {
    const needle = v.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!needle) continue;
    const re = new RegExp(`(?<=\\s)${escapeRegExp(needle)}(?=\\s)`, 'g');
    if (re.test(rest)) {
      if (!result[kind].includes(v)) result[kind].push(v);
      rest = rest.replace(re, ' ');
    }
  }

  for (const token of rest.split(' ').filter(Boolean)) {
    const period = parsePeriod(token);
    if (period) {
      result.period = period;
    } else if (token in ITEM_TYPE_WORDS) {
      result.itemTypes.push(ITEM_TYPE_WORDS[token]);
    } else if (token in PHASE_WORDS) {
      result.phases.push(PHASE_WORDS[token]);
    } else if (token in MILESTONE_WORDS) {
      result.milestones.push(MILESTONE_WORDS[token]);
    } else {
      result.text.push(token);
    }
  }
  return result;
}

/** Human-readable chips for what the query was understood as. */
export function describeSearch(parsed: ParsedSearch): string[] {
  const label = (k: MilestoneKey) => MILESTONES.find((m) => m.key === k)?.short ?? k;
  return [
    ...parsed.disciplines,
    ...parsed.facilities,
    ...parsed.itemTypes,
    ...parsed.phases,
    ...parsed.milestones.map(label),
    ...(parsed.period ? [parsed.period.label] : []),
    ...parsed.text.map((t) => `"${t}"`),
  ];
}
```

- [ ] **Step 4: Implement filters**

`src/analytics/filters.ts`:

```ts
import type { ItemType, LinePhase } from '../data/types';
import { effectiveDay, type LineMetrics } from './lineMetrics';
import { parseSearch, type ParsedSearch, type SearchVocabulary } from './search';

export type Flag = 'slipped' | 'rosRisk' | 'overdue' | 'dueSoon';

export interface Filters {
  disciplines: string[];
  facilities: string[];
  itemTypes: ItemType[];
  phases: LinePhase[];
  flags: Flag[];
  q: string;
}

export const EMPTY_FILTERS: Filters = { disciplines: [], facilities: [], itemTypes: [], phases: [], flags: [], q: '' };

export function isEmptyFilters(f: Filters): boolean {
  return (
    f.disciplines.length === 0 &&
    f.facilities.length === 0 &&
    f.itemTypes.length === 0 &&
    f.phases.length === 0 &&
    f.flags.length === 0 &&
    f.q.trim() === ''
  );
}

const FLAG_TEST: Record<Flag, (m: LineMetrics) => boolean> = {
  slipped: (m) => m.isSlipped,
  rosRisk: (m) => m.rosAtRisk,
  overdue: (m) => m.overdueCount > 0,
  dueSoon: (m) => m.dueSoonCount > 0,
};

const inList = <T,>(list: readonly T[], value: T) => list.length === 0 || list.includes(value);

function matchesSearch(m: LineMetrics, s: ParsedSearch): boolean {
  const { line } = m;
  if (!inList(s.disciplines, line.discipline)) return false;
  if (!inList(s.facilities, line.facility)) return false;
  if (!inList(s.itemTypes, line.itemType)) return false;
  if (!inList(s.phases, m.scheduledPhase)) return false;
  if (s.milestones.length > 0) {
    const hit = s.milestones.some((key) => {
      const day = effectiveDay(line.milestones[key]);
      if (day === undefined) return false;
      return !s.period || (day >= s.period.from && day <= s.period.to);
    });
    if (!hit) return false;
  } else if (s.period) {
    const day = m.next?.day;
    if (day === undefined || day < s.period.from || day > s.period.to) return false;
  }
  const haystack = `${line.packageCode} ${line.packageName}`.toLowerCase();
  return s.text.every((t) => haystack.includes(t));
}

/**
 * Apply the shared filter bar. Facets are OR within a facet and AND across facets; the search query ANDs on top.
 * Phase filters use the scheduled phase (where the line should be by now).
 */
export function applyFilters(metrics: readonly LineMetrics[], f: Filters, vocab: SearchVocabulary): LineMetrics[] {
  const search = f.q.trim() ? parseSearch(f.q, vocab) : undefined;
  return metrics.filter((m) => {
    const { line } = m;
    if (!inList(f.disciplines, line.discipline)) return false;
    if (!inList(f.facilities, line.facility)) return false;
    if (!inList(f.itemTypes, line.itemType)) return false;
    if (!inList(f.phases, m.scheduledPhase)) return false;
    if (!f.flags.every((flag) => FLAG_TEST[flag](m))) return false;
    return !search || matchesSearch(m, search);
  });
}

/** Distinct facilities and disciplines, in first-seen order (disciplines) and alphabetical order (facilities). */
export function vocabularyOf(metrics: readonly LineMetrics[]): SearchVocabulary {
  const disciplines: string[] = [];
  const facilities = new Set<string>();
  for (const { line } of metrics) {
    if (!disciplines.includes(line.discipline)) disciplines.push(line.discipline);
    facilities.add(line.facility);
  }
  return { disciplines, facilities: [...facilities].sort((a, b) => a.localeCompare(b)) };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/analytics/search.test.ts src/analytics/filters.test.ts && npm run typecheck`
Expected: 6 search tests and 5 filter tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/analytics/search.ts src/analytics/search.test.ts src/analytics/filters.ts src/analytics/filters.test.ts
git commit -m "feat: add smart search parsing and shared filter model"
```

---

### Task 8: Aggregates for the dashboard

**Files:**
- Create: `src/analytics/aggregate.ts`
- Test: `src/analytics/aggregate.test.ts`
- Create: `src/data/parser/reconcile.test.ts` (opt-in check of the parser against a real export)

**Interfaces:**
- Consumes: `LineMetrics`, `effectiveDay`, `NextMilestone` (Task 6); catalog (Task 2); `monthKey`, `monthRange` (Task 1).
- Produces: `Kpis { packages; lines; slipped; rosAtRisk; dueSoon; overdue }`, `computeKpis(metrics)`; `PhaseCount`, `PhaseBasis = 'schedule' | 'actual'`, `phaseFunnel(metrics, basis?)`; `RiskLevel`, `RISK_THRESHOLDS`, `riskLevel(score)`, `DisciplineHealth`, `disciplineHealth(metrics, order)`; `PackageSummary { code; name; discipline; hasValidCode; facilities; lines; currentPhase; scheduledPhase; next?; maxSlip?; minRosFloat?; slipped; rosAtRisk; overdueCount; riskRank }`, `summarizePackages(metrics)` (riskiest first); `MonthlyWorkload { months; series[{ key; label; counts }] }`, `monthlyWorkload(metrics, keys?)`; `FacilityHeatmap { facilities; months; cells: [monthIdx, facilityIdx, count][]; max }`, `facilityHeatmap(metrics, milestone?)`.

- [ ] **Step 1: Write the failing test**

`src/analytics/aggregate.test.ts`:

```ts
import { sampleMetrics } from '../test/planFixture';
import {
  computeKpis,
  disciplineHealth,
  facilityHeatmap,
  monthlyWorkload,
  phaseFunnel,
  riskLevel,
  summarizePackages,
} from './aggregate';

const metrics = sampleMetrics();

describe('computeKpis', () => {
  it('counts valid packages, lines, risk and milestone windows', () => {
    expect(computeKpis(metrics)).toEqual({ packages: 4, lines: 6, slipped: 1, rosAtRisk: 1, dueSoon: 1, overdue: 4 });
    expect(computeKpis([])).toEqual({ packages: 0, lines: 0, slipped: 0, rosAtRisk: 0, dueSoon: 0, overdue: 0 });
  });
});

describe('phaseFunnel', () => {
  it('counts lines per current phase in process order', () => {
    const funnel = phaseFunnel(metrics);
    expect(funnel.map((p) => p.phase)).toEqual(['tr', 'rfq', 'evaluation', 'award', 'manufacturing', 'logistics', 'delivered']);
    expect(funnel.find((p) => p.phase === 'tr')?.count).toBe(4);
    expect(funnel.find((p) => p.phase === 'evaluation')?.count).toBe(1);
    expect(funnel.find((p) => p.phase === 'delivered')).toEqual({ phase: 'delivered', label: 'Delivered', count: 1 });
    const byActual = phaseFunnel(metrics, 'actual');
    expect(byActual.find((p) => p.phase === 'tr')?.count).toBe(5);
    expect(byActual.find((p) => p.phase === 'evaluation')?.count).toBe(0);
  });
});

describe('disciplineHealth', () => {
  it('scores each discipline in the given order', () => {
    const [mech, piping] = disciplineHealth(metrics, ['MECHANICAL', 'PIPING']);
    expect(mech).toMatchObject({ name: 'MECHANICAL', packages: 2, lines: 4, slipped: 1, rosAtRisk: 1, overdueLines: 1 });
    expect(mech.score).toBeCloseTo((2 + 1.5 + 1) / 4);
    expect(mech.level).toBe('risk');
    expect(piping).toMatchObject({ lines: 2, score: 0, level: 'ok' });
  });

  it('maps scores to levels', () => {
    expect(riskLevel(0.1)).toBe('ok');
    expect(riskLevel(0.25)).toBe('watch');
    expect(riskLevel(0.75)).toBe('risk');
  });
});

describe('summarizePackages', () => {
  it('rolls lines up per package and sorts riskiest first', () => {
    const packages = summarizePackages(metrics);
    expect(packages.map((p) => p.code)).toEqual(['MEC-001', 'MEC-002', 'PIP-002', 'UNCODED-15', 'PIP-001']);
    const pump = packages[0];
    expect(pump.facilities).toEqual(['PS2K TS', 'PS2R']);
    expect(pump.rosAtRisk).toBe(true);
    expect(pump.slipped).toBe(true);
    expect(pump.minRosFloat).toBeLessThan(0);
    expect(pump.next?.key).toBe('trApproval');
    expect(packages.find((p) => p.code === 'PIP-002')?.currentPhase).toBe('delivered');
    expect(packages.find((p) => p.code === 'MEC-002')?.scheduledPhase).toBe('evaluation');
    expect(packages.find((p) => p.code === 'UNCODED-15')?.hasValidCode).toBe(false);
  });
});

describe('monthlyWorkload', () => {
  it('counts headline milestones per month over a continuous range', () => {
    const w = monthlyWorkload(metrics);
    expect(w.series.map((s) => s.label)).toEqual(['TR', 'TBE', 'CBE', 'LOA', 'FAT', 'Site']);
    expect(w.months[0]).toBe('2025-01');
    expect(w.months).toContain('2025-12');
    const tr = w.series[0];
    expect(tr.counts.reduce((a, b) => a + b, 0)).toBe(6);
    expect(tr.counts[w.months.indexOf('2027-01')]).toBe(2);
  });

  it('is empty without data', () => {
    expect(monthlyWorkload([])).toEqual({ months: [], series: expect.any(Array) });
  });
});

describe('facilityHeatmap', () => {
  it('counts milestones per facility and month', () => {
    const h = facilityHeatmap(metrics, 'loa');
    expect(h.facilities).toEqual(['BF', 'PS2K TS', 'PS2L TS', 'PS2R', 'Unassigned', 'WHJs']);
    const total = h.cells.reduce((a, c) => a + c[2], 0);
    expect(total).toBe(6);
    expect(h.max).toBe(1);
    const all = facilityHeatmap(metrics);
    expect(all.cells.reduce((a, c) => a + c[2], 0)).toBe(6 * 21 - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/analytics/aggregate.test.ts`
Expected: FAIL — `Failed to resolve import "./aggregate"`.

- [ ] **Step 3: Implement**

`src/analytics/aggregate.ts`:

```ts
import { KEY_MILESTONES, LINE_PHASE_LABEL, LINE_PHASE_ORDER, MILESTONES, MILESTONE_BY_KEY, phaseIndex } from '../data/milestones';
import type { LinePhase, MilestoneKey } from '../data/types';
import { monthKey, monthRange, type Day, type MonthKey } from '../lib/day';
import { effectiveDay, type LineMetrics, type NextMilestone } from './lineMetrics';

export interface Kpis {
  packages: number;
  lines: number;
  slipped: number;
  rosAtRisk: number;
  /** Milestones due within the due-soon window. */
  dueSoon: number;
  /** Milestones past their target date with no actual. */
  overdue: number;
}

export function computeKpis(metrics: readonly LineMetrics[]): Kpis {
  const packages = new Set<string>();
  const k: Kpis = { packages: 0, lines: metrics.length, slipped: 0, rosAtRisk: 0, dueSoon: 0, overdue: 0 };
  for (const m of metrics) {
    if (m.line.hasValidCode) packages.add(m.line.packageCode);
    if (m.isSlipped) k.slipped += 1;
    if (m.rosAtRisk) k.rosAtRisk += 1;
    k.dueSoon += m.dueSoonCount;
    k.overdue += m.overdueCount;
  }
  k.packages = packages.size;
  return k;
}

export interface PhaseCount {
  phase: LinePhase;
  label: string;
  count: number;
}

export type PhaseBasis = 'schedule' | 'actual';

/** Lines per phase: by schedule (where they should be) or by recorded actuals (where they are). */
export function phaseFunnel(metrics: readonly LineMetrics[], basis: PhaseBasis = 'schedule'): PhaseCount[] {
  const counts = new Map<LinePhase, number>(LINE_PHASE_ORDER.map((p) => [p, 0]));
  for (const m of metrics) {
    const phase = basis === 'schedule' ? m.scheduledPhase : m.currentPhase;
    counts.set(phase, (counts.get(phase) ?? 0) + 1);
  }
  return LINE_PHASE_ORDER.map((phase) => ({ phase, label: LINE_PHASE_LABEL[phase], count: counts.get(phase) ?? 0 }));
}

export type RiskLevel = 'ok' | 'watch' | 'risk';

/** Score thresholds for discipline health; tune here. Score range is 0..4.5. */
export const RISK_THRESHOLDS = { watch: 0.25, risk: 0.75 } as const;

export function riskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.risk) return 'risk';
  if (score >= RISK_THRESHOLDS.watch) return 'watch';
  return 'ok';
}

export interface DisciplineHealth {
  name: string;
  packages: number;
  lines: number;
  slipped: number;
  rosAtRisk: number;
  overdueLines: number;
  score: number;
  level: RiskLevel;
}

/** Health per discipline, in the given order. score = (ROS×2 + overdue×1.5 + slipped×1) / lines. */
export function disciplineHealth(metrics: readonly LineMetrics[], order: readonly string[]): DisciplineHealth[] {
  return order.map((name) => {
    const ms = metrics.filter((m) => m.line.discipline === name);
    const packages = new Set(ms.filter((m) => m.line.hasValidCode).map((m) => m.line.packageCode)).size;
    const slipped = ms.filter((m) => m.isSlipped).length;
    const rosAtRisk = ms.filter((m) => m.rosAtRisk).length;
    const overdueLines = ms.filter((m) => m.overdueCount > 0).length;
    const score = ms.length === 0 ? 0 : (rosAtRisk * 2 + overdueLines * 1.5 + slipped) / ms.length;
    return { name, packages, lines: ms.length, slipped, rosAtRisk, overdueLines, score, level: riskLevel(score) };
  });
}

export interface PackageSummary {
  code: string;
  name: string;
  discipline: string;
  hasValidCode: boolean;
  facilities: string[];
  lines: LineMetrics[];
  /** Earliest recorded-progress phase across the package's lines. */
  currentPhase: LinePhase;
  /** Earliest scheduled phase across the package's lines. */
  scheduledPhase: LinePhase;
  /** Soonest open milestone across lines. */
  next?: NextMilestone & { facility: string };
  maxSlip?: number;
  minRosFloat?: number;
  slipped: boolean;
  rosAtRisk: boolean;
  overdueCount: number;
  /** Sort key: higher = riskier. */
  riskRank: number;
}

export function summarizePackages(metrics: readonly LineMetrics[]): PackageSummary[] {
  const groups = new Map<string, LineMetrics[]>();
  for (const m of metrics) {
    const key = `${m.line.discipline}|${m.line.packageCode}`;
    const list = groups.get(key);
    if (list) list.push(m);
    else groups.set(key, [m]);
  }
  const summaries = [...groups.values()].map((lines): PackageSummary => {
    const first = lines[0].line;
    let currentPhase = lines[0].currentPhase;
    let scheduledPhase = lines[0].scheduledPhase;
    let next: PackageSummary['next'];
    let maxSlip: number | undefined;
    let minRosFloat: number | undefined;
    let overdueCount = 0;
    for (const m of lines) {
      if (phaseIndex(m.currentPhase) < phaseIndex(currentPhase)) currentPhase = m.currentPhase;
      if (phaseIndex(m.scheduledPhase) < phaseIndex(scheduledPhase)) scheduledPhase = m.scheduledPhase;
      if (m.next && (next === undefined || (m.next.day ?? Infinity) < (next.day ?? Infinity))) {
        next = { ...m.next, facility: m.line.facility };
      }
      if (m.maxSlip !== undefined) maxSlip = maxSlip === undefined ? m.maxSlip : Math.max(maxSlip, m.maxSlip);
      if (m.rosFloat !== undefined) minRosFloat = minRosFloat === undefined ? m.rosFloat : Math.min(minRosFloat, m.rosFloat);
      overdueCount += m.overdueCount;
    }
    const slipped = lines.some((m) => m.isSlipped);
    const rosAtRisk = lines.some((m) => m.rosAtRisk);
    return {
      code: first.packageCode,
      name: first.packageName,
      discipline: first.discipline,
      hasValidCode: first.hasValidCode,
      facilities: [...new Set(lines.map((m) => m.line.facility))],
      lines,
      currentPhase,
      scheduledPhase,
      next,
      maxSlip,
      minRosFloat,
      slipped,
      rosAtRisk,
      overdueCount,
      riskRank: (rosAtRisk ? 4 : 0) + (overdueCount > 0 ? 2 : 0) + (slipped ? 1 : 0),
    };
  });
  return summaries.sort(
    (a, b) =>
      b.riskRank - a.riskRank ||
      (a.minRosFloat ?? Infinity) - (b.minRosFloat ?? Infinity) ||
      a.code.localeCompare(b.code),
  );
}

export interface MonthlySeries {
  key: MilestoneKey;
  label: string;
  counts: number[];
}

export interface MonthlyWorkload {
  months: MonthKey[];
  series: MonthlySeries[];
}

function monthsSpanning(days: Day[]): MonthKey[] {
  if (days.length === 0) return [];
  let min = days[0];
  let max = days[0];
  for (const d of days) {
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return monthRange(monthKey(min), monthKey(max));
}

/** Count of milestones falling in each month (by effective date), one series per milestone. */
export function monthlyWorkload(metrics: readonly LineMetrics[], keys: readonly MilestoneKey[] = KEY_MILESTONES): MonthlyWorkload {
  const perKey = keys.map((key) => ({
    key,
    days: metrics.map((m) => effectiveDay(m.line.milestones[key])).filter((d): d is Day => d !== undefined),
  }));
  const months = monthsSpanning(perKey.flatMap((p) => p.days));
  const index = new Map(months.map((m, i) => [m, i]));
  return {
    months,
    series: perKey.map(({ key, days }) => {
      const counts = months.map(() => 0);
      for (const d of days) counts[index.get(monthKey(d))!] += 1;
      return { key, label: MILESTONE_BY_KEY[key].short, counts };
    }),
  };
}

export interface FacilityHeatmap {
  facilities: string[];
  months: MonthKey[];
  /** [monthIndex, facilityIndex, count] for non-zero cells. */
  cells: [number, number, number][];
  max: number;
}

/** Milestones due per Facility × Month. `milestone = 'all'` counts every milestone. */
export function facilityHeatmap(metrics: readonly LineMetrics[], milestone: MilestoneKey | 'all' = 'all'): FacilityHeatmap {
  const keys = milestone === 'all' ? MILESTONES.map((m) => m.key) : [milestone];
  const entries: { facility: string; day: Day }[] = [];
  for (const m of metrics) {
    for (const key of keys) {
      const day = effectiveDay(m.line.milestones[key]);
      if (day !== undefined) entries.push({ facility: m.line.facility, day });
    }
  }
  const facilities = [...new Set(entries.map((e) => e.facility))].sort((a, b) => a.localeCompare(b));
  const months = monthsSpanning(entries.map((e) => e.day));
  const mIndex = new Map(months.map((k, i) => [k, i]));
  const fIndex = new Map(facilities.map((f, i) => [f, i]));
  const counts = new Map<string, number>();
  for (const e of entries) {
    const id = `${mIndex.get(monthKey(e.day))}|${fIndex.get(e.facility)}`;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const cells: [number, number, number][] = [...counts].map(([id, count]) => {
    const [mi, fi] = id.split('|').map(Number);
    return [mi, fi, count];
  });
  return { facilities, months, cells, max: cells.reduce((mx, c) => Math.max(mx, c[2]), 0) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/analytics/aggregate.test.ts && npm run typecheck`
Expected: 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/aggregate.ts src/analytics/aggregate.test.ts
git commit -m "feat: add KPI, phase, discipline, package, workload and heatmap aggregates"
```

- [ ] **Step 6: Add the opt-in reconciliation test for the parser**

`src/data/parser/reconcile.test.ts`:

```ts
// @vitest-environment node
/**
 * Manual reconciliation against a real export. Skipped unless RECONCILE_FILE points at an .xlsx:
 *   RECONCILE_FILE=path/to/export.xlsx npx vitest run src/data/parser/reconcile.test.ts
 * Prints the headline numbers to compare with the sheet; asserts only structural invariants,
 * because the counts change as the plan evolves.
 */
import fs from 'node:fs';
import { computeKpis } from '../../analytics/aggregate';
import { computeAllMetrics } from '../../analytics/lineMetrics';
import { todayDay } from '../../lib/day';
import { parsePlan } from './parsePlan';

const file = process.env.RECONCILE_FILE;

describe.skipIf(!file)('reconcile against a real export', () => {
  it('parses cleanly and prints the headline numbers', () => {
    const bytes = fs.readFileSync(file!);
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const result = parsePlan(buf, { projectName: 'reconcile' });
    if (!result.ok) throw new Error(result.error.message);
    const { plan } = result;
    const warnings: Record<string, number> = {};
    for (const w of plan.warnings) warnings[w.code] = (warnings[w.code] ?? 0) + 1;
    const kpis = computeKpis(computeAllMetrics(plan.lines, { cutOff: todayDay(), dueSoonDays: 30 }));

    console.log(
      JSON.stringify(
        {
          disciplines: plan.disciplines.map((d) => `${d.name}: ${d.packages.length}`),
          validPackages: kpis.packages,
          lines: kpis.lines,
          slipped: kpis.slipped,
          rosAtRisk: kpis.rosAtRisk,
          warnings,
        },
        null,
        2,
      ),
    );

    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.disciplines.every((d) => d.name !== 'Unassigned')).toBe(true);
    expect(warnings.ORPHAN_ROW ?? 0).toBe(0);
    expect(warnings.INCOMPLETE_TRIPLET ?? 0).toBe(0);
  });
});
```

Run: `npx vitest run src/data/parser/reconcile.test.ts && npm run typecheck`
Expected: 1 test SKIPPED; typecheck clean.

```bash
git add src/data/parser/reconcile.test.ts
git commit -m "test: add opt-in reconciliation against a real sheet export"
```

---

### Task 9: AI Insights (rule registry)

**Files:**
- Create: `src/analytics/insights/types.ts`, `src/analytics/insights/helpers.ts`, `src/analytics/insights/registry.ts`
- Create: `src/analytics/insights/rules/rosRisk.ts`, `slippage.ts`, `overdue.ts`, `workloadPeak.ts`, `dueSoon.ts`, `rosPushed.ts`
- Test: `src/analytics/insights/insights.test.ts`

**Interfaces:**
- Consumes: `LineMetrics`, `MetricsContext`, `effectiveDay` (Task 6); `Filters` (Task 7); catalog (Task 2); `formatMonth`, `monthKey` (Task 1).
- Produces: `Severity`, `Insight { id; severity; title; detail; confidence; evidence: string[] /* line ids */; filter?: Partial<Filters> }`, `InsightContext { metrics; ctx }`, `InsightRule { id; evaluate(ic): Insight | undefined }`, `INSIGHT_RULES`, `generateInsights(ic, rules?, limit = 5)`; `PEAK_RATIO`.

Adding a rule later = one new file in `rules/` plus one line in `INSIGHT_RULES`.

- [ ] **Step 1: Write the failing test**

`src/analytics/insights/insights.test.ts`:

```ts
import { dayFromISO } from '../../lib/day';
import { makeLine, sampleMetrics, TEST_CTX } from '../../test/planFixture';
import { computeAllMetrics } from '../lineMetrics';
import { generateInsights, INSIGHT_RULES } from './registry';
import { dueSoonRule } from './rules/dueSoon';
import { overdueRule } from './rules/overdue';
import { rosPushedRule } from './rules/rosPushed';
import { rosRiskRule } from './rules/rosRisk';
import { slippageRule } from './rules/slippage';
import { workloadPeakRule } from './rules/workloadPeak';
import type { InsightRule } from './types';

const d = (iso: string) => dayFromISO(iso)!;
const ic = { metrics: sampleMetrics(), ctx: TEST_CTX };

describe('insight rules on the sample plan', () => {
  it('reports ROS risk with the worst line', () => {
    const i = rosRiskRule.evaluate(ic)!;
    expect(i.severity).toBe('critical');
    expect(i.title).toBe('1 dòng có nguy cơ trễ ROS');
    expect(i.detail).toContain('MECHANICAL');
    expect(i.detail).toContain('MEC-001 @ PS2R');
    expect(i.detail).toContain('trễ 19 ngày');
    expect(i.evidence).toEqual(['MEC-001|PS2R|7']);
    expect(i.filter).toEqual({ flags: ['rosRisk'] });
    expect(i.confidence).toBe(1);
  });

  it('reports slippage', () => {
    const i = slippageRule.evaluate(ic)!;
    expect(i.title).toBe('1 dòng có Forecast trễ hơn Plan');
    expect(i.detail).toContain('lớn nhất 75 ngày');
  });

  it('reports overdue milestones without actuals', () => {
    const i = overdueRule.evaluate(ic)!;
    expect(i.title).toBe('4 mốc đã qua hạn nhưng chưa có Actual');
    expect(i.evidence).toEqual(['MEC-002|BF|11']);
  });

  it('reports milestones due soon', () => {
    const i = dueSoonRule.evaluate(ic)!;
    expect(i.title).toBe('1 mốc đến hạn trong 30 ngày tới');
    expect(i.detail).toContain('TBE (1)');
  });

  it('reports ROS pushes', () => {
    const i = rosPushedRule.evaluate(ic)!;
    expect(i.title).toBe('ROS đã bị dời trên 1 dòng');
    expect(i.detail).toContain('152 ngày qua 3 lần');
  });
});

describe('workloadPeakRule', () => {
  const at = (iso: string) => makeLine({ milestones: { loa: { plan: d(iso) } } });

  it('fires when a future month holds at least twice the average', () => {
    const lines = [at('2027-03-02'), at('2027-03-10'), at('2027-03-15'), at('2027-03-20'), at('2027-05-01'), at('2027-07-01')];
    const i = workloadPeakRule.evaluate({ metrics: computeAllMetrics(lines, TEST_CTX), ctx: TEST_CTX })!;
    expect(i.title).toBe('Đỉnh khối lượng: Mar 2027 có 4 mốc đến hạn');
    expect(i.detail).toContain('Gấp 2.0×');
    expect(i.detail).toContain('LOA Effective (4)');
    expect(i.evidence).toHaveLength(4);
  });

  it('stays quiet for an even workload or past-only dates', () => {
    const even = [at('2027-03-02'), at('2027-04-02'), at('2027-05-02')];
    expect(workloadPeakRule.evaluate({ metrics: computeAllMetrics(even, TEST_CTX), ctx: TEST_CTX })).toBeUndefined();
    const past = [at('2025-03-02'), at('2025-03-03')];
    expect(workloadPeakRule.evaluate({ metrics: computeAllMetrics(past, TEST_CTX), ctx: TEST_CTX })).toBeUndefined();
  });
});

describe('generateInsights', () => {
  it('orders by severity and respects the limit', () => {
    const all = generateInsights(ic, INSIGHT_RULES, 10);
    expect(all[0].id).toBe('ros-risk');
    expect(all.map((i) => i.severity)).toEqual([...all.map((i) => i.severity)].sort((a, b) => ['critical', 'warning', 'info'].indexOf(a) - ['critical', 'warning', 'info'].indexOf(b)));
    expect(generateInsights(ic, INSIGHT_RULES, 2)).toHaveLength(2);
  });

  it('returns nothing for an empty plan', () => {
    expect(generateInsights({ metrics: [], ctx: TEST_CTX })).toEqual([]);
  });

  it('isolates a failing rule', () => {
    const boom: InsightRule = {
      id: 'boom',
      evaluate() {
        throw new Error('bad rule');
      },
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(generateInsights(ic, [boom, rosRiskRule]).map((i) => i.id)).toEqual(['ros-risk']);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/analytics/insights`
Expected: FAIL — `Failed to resolve import "./registry"`.

- [ ] **Step 3: Implement types and helpers**

`src/analytics/insights/types.ts`:

```ts
import type { Filters } from '../filters';
import type { LineMetrics, MetricsContext } from '../lineMetrics';

export type Severity = 'critical' | 'warning' | 'info';

export interface Insight {
  /** Equals the rule id; stable for React keys and tests. */
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /** 0..1 — share of lines that carry the data this rule depends on. */
  confidence: number;
  /** Line ids backing the insight ("Why?"). */
  evidence: string[];
  /** Filter that reproduces the evidence set, when one exists. */
  filter?: Partial<Filters>;
}

export interface InsightContext {
  metrics: readonly LineMetrics[];
  ctx: MetricsContext;
}

export interface InsightRule {
  id: string;
  evaluate(ic: InsightContext): Insight | undefined;
}
```

`src/analytics/insights/helpers.ts`:

```ts
import type { LineMetrics } from '../lineMetrics';

/** Share (0..1, 2 decimals) of lines satisfying `has`. */
export function completeness(metrics: readonly LineMetrics[], has: (m: LineMetrics) => boolean): number {
  if (metrics.length === 0) return 0;
  return Math.round((metrics.filter(has).length / metrics.length) * 100) / 100;
}

/** Most frequent key and its count; ties resolve to the first seen. */
export function mostCommon<T>(items: readonly T[], key: (item: T) => string): { key: string; count: number } | undefined {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
  let best: { key: string; count: number } | undefined;
  for (const [k, count] of counts) if (!best || count > best.count) best = { key: k, count };
  return best;
}

export function lineLabel(m: LineMetrics): string {
  return `${m.line.packageCode} @ ${m.line.facility}`;
}

export const fmt = (n: number) => n.toLocaleString('vi-VN');
```

- [ ] **Step 4: Implement the rules**

`src/analytics/insights/rules/rosRisk.ts`:

```ts
import { completeness, fmt, lineLabel, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

export const rosRiskRule: InsightRule = {
  id: 'ros-risk',
  evaluate({ metrics }) {
    const risky = metrics.filter((m) => m.rosAtRisk);
    if (risky.length === 0) return undefined;
    const worst = risky.reduce((a, b) => ((b.rosFloat ?? 0) < (a.rosFloat ?? 0) ? b : a));
    const top = mostCommon(risky, (m) => m.line.discipline)!;
    return {
      id: 'ros-risk',
      severity: 'critical',
      title: `${fmt(risky.length)} dòng có nguy cơ trễ ROS`,
      detail: `Tập trung nhiều nhất ở ${top.key} (${fmt(top.count)} dòng). Nặng nhất: ${lineLabel(worst)}, hàng về công trường trễ ${fmt(-(worst.rosFloat ?? 0))} ngày so với ROS.`,
      confidence: completeness(metrics, (m) => m.rosFloat !== undefined),
      evidence: risky.map((m) => m.line.id),
      filter: { flags: ['rosRisk'] },
    };
  },
};
```

`src/analytics/insights/rules/slippage.ts`:

```ts
import { completeness, fmt, lineLabel, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

export const slippageRule: InsightRule = {
  id: 'slippage',
  evaluate({ metrics }) {
    const slipped = metrics.filter((m) => m.isSlipped);
    if (slipped.length === 0) return undefined;
    const top = mostCommon(slipped, (m) => m.line.discipline)!;
    const worst = slipped.reduce((a, b) => ((b.maxSlip ?? 0) > (a.maxSlip ?? 0) ? b : a));
    const avg = Math.round(slipped.reduce((sum, m) => sum + (m.maxSlip ?? 0), 0) / slipped.length);
    return {
      id: 'slippage',
      severity: 'warning',
      title: `${fmt(slipped.length)} dòng có Forecast trễ hơn Plan`,
      detail: `${top.key} chiếm ${fmt(top.count)} dòng. Trượt trung bình ${fmt(avg)} ngày, lớn nhất ${fmt(worst.maxSlip ?? 0)} ngày (${lineLabel(worst)}).`,
      confidence: completeness(metrics, (m) => m.maxSlip !== undefined),
      evidence: slipped.map((m) => m.line.id),
      filter: { flags: ['slipped'] },
    };
  },
};
```

`src/analytics/insights/rules/overdue.ts`:

```ts
import { MILESTONE_BY_KEY } from '../../../data/milestones';
import type { MilestoneKey } from '../../../data/types';
import { fmt, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

export const overdueRule: InsightRule = {
  id: 'overdue',
  evaluate({ metrics }) {
    const lines = metrics.filter((m) => m.overdueCount > 0);
    if (lines.length === 0) return undefined;
    const keys = lines.flatMap((m) => (Object.entries(m.status) as [MilestoneKey, string][]).filter(([, s]) => s === 'overdue').map(([k]) => k));
    const top = mostCommon(keys, (k) => k)!;
    return {
      id: 'overdue',
      severity: 'warning',
      title: `${fmt(keys.length)} mốc đã qua hạn nhưng chưa có Actual`,
      detail: `Trên ${fmt(lines.length)} dòng; nhiều nhất là ${MILESTONE_BY_KEY[top.key as MilestoneKey].label} (${fmt(top.count)}). Kiểm tra việc cập nhật dòng ACTUAL trong sheet.`,
      confidence: 1,
      evidence: lines.map((m) => m.line.id),
      filter: { flags: ['overdue'] },
    };
  },
};
```

`src/analytics/insights/rules/workloadPeak.ts`:

```ts
import { MILESTONES, MILESTONE_BY_KEY } from '../../../data/milestones';
import type { MilestoneKey } from '../../../data/types';
import { formatMonth, monthKey } from '../../../lib/day';
import { effectiveDay } from '../../lineMetrics';
import { completeness, fmt, mostCommon } from '../helpers';
import type { InsightRule } from '../types';

/** A month is a peak when it holds at least this multiple of the average active month. */
export const PEAK_RATIO = 2;

export const workloadPeakRule: InsightRule = {
  id: 'workload-peak',
  evaluate({ metrics, ctx }) {
    const hits: { month: string; key: MilestoneKey; lineId: string }[] = [];
    for (const m of metrics) {
      for (const def of MILESTONES) {
        const day = effectiveDay(m.line.milestones[def.key]);
        if (day !== undefined && day >= ctx.cutOff && m.line.milestones[def.key]?.actual === undefined) {
          hits.push({ month: monthKey(day), key: def.key, lineId: m.line.id });
        }
      }
    }
    if (hits.length === 0) return undefined;
    const perMonth = new Map<string, number>();
    for (const h of hits) perMonth.set(h.month, (perMonth.get(h.month) ?? 0) + 1);
    const avg = hits.length / perMonth.size;
    const [peakMonth, peakCount] = [...perMonth].reduce((a, b) => (b[1] > a[1] ? b : a));
    const ratio = peakCount / avg;
    if (ratio < PEAK_RATIO) return undefined;
    const inPeak = hits.filter((h) => h.month === peakMonth);
    const topMilestone = mostCommon(inPeak, (h) => h.key)!;
    return {
      id: 'workload-peak',
      severity: ratio >= 3 ? 'warning' : 'info',
      title: `Đỉnh khối lượng: ${formatMonth(peakMonth)} có ${fmt(peakCount)} mốc đến hạn`,
      detail: `Gấp ${ratio.toFixed(1)}× trung bình (${avg.toFixed(1)} mốc/tháng). Nhiều nhất là ${MILESTONE_BY_KEY[topMilestone.key as MilestoneKey].label} (${fmt(topMilestone.count)}).`,
      confidence: completeness(metrics, (m) => Object.keys(m.line.milestones).length > 0),
      evidence: [...new Set(inPeak.map((h) => h.lineId))],
    };
  },
};
```

`src/analytics/insights/rules/dueSoon.ts`:

```ts
import { MILESTONE_BY_KEY } from '../../../data/milestones';
import type { MilestoneKey } from '../../../data/types';
import { fmt } from '../helpers';
import type { InsightRule } from '../types';

export const dueSoonRule: InsightRule = {
  id: 'due-soon',
  evaluate({ metrics, ctx }) {
    const counts = new Map<MilestoneKey, number>();
    const lines = metrics.filter((m) => m.dueSoonCount > 0);
    if (lines.length === 0) return undefined;
    for (const m of lines) {
      for (const [key, s] of Object.entries(m.status) as [MilestoneKey, string][]) {
        if (s === 'dueSoon') counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const top = [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key, n]) => `${MILESTONE_BY_KEY[key].short} (${fmt(n)})`)
      .join(', ');
    return {
      id: 'due-soon',
      severity: 'info',
      title: `${fmt(total)} mốc đến hạn trong ${ctx.dueSoonDays} ngày tới`,
      detail: `Trên ${fmt(lines.length)} dòng. Nhiều nhất: ${top}.`,
      confidence: 1,
      evidence: lines.map((m) => m.line.id),
      filter: { flags: ['dueSoon'] },
    };
  },
};
```

`src/analytics/insights/rules/rosPushed.ts`:

```ts
import { completeness, fmt, lineLabel } from '../helpers';
import type { InsightRule } from '../types';

export const rosPushedRule: InsightRule = {
  id: 'ros-pushed',
  evaluate({ metrics }) {
    const pushed = metrics.filter((m) => m.rosPushCount > 0);
    if (pushed.length === 0) return undefined;
    const worst = pushed.reduce((a, b) => (b.rosPushDays > a.rosPushDays ? b : a));
    const maxCount = Math.max(...pushed.map((m) => m.rosPushCount));
    return {
      id: 'ros-pushed',
      severity: 'info',
      title: `ROS đã bị dời trên ${fmt(pushed.length)} dòng`,
      detail: `Nhiều nhất ${fmt(maxCount)} lần điều chỉnh. Dời xa nhất: ${lineLabel(worst)}, tổng ${fmt(worst.rosPushDays)} ngày qua ${fmt(worst.rosPushCount)} lần.`,
      confidence: completeness(metrics, (m) => m.line.rosHistory.length > 1),
      evidence: pushed.map((m) => m.line.id),
    };
  },
};
```

- [ ] **Step 5: Implement the registry**

`src/analytics/insights/registry.ts`:

```ts
import { dueSoonRule } from './rules/dueSoon';
import { overdueRule } from './rules/overdue';
import { rosPushedRule } from './rules/rosPushed';
import { rosRiskRule } from './rules/rosRisk';
import { slippageRule } from './rules/slippage';
import { workloadPeakRule } from './rules/workloadPeak';
import type { Insight, InsightContext, InsightRule, Severity } from './types';

/** Add a rule: create a file in ./rules and list it here. */
export const INSIGHT_RULES: readonly InsightRule[] = [
  rosRiskRule,
  slippageRule,
  overdueRule,
  workloadPeakRule,
  dueSoonRule,
  rosPushedRule,
];

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** Run rules, drop empty results, order by severity then confidence. A failing rule never breaks the others. */
export function generateInsights(ic: InsightContext, rules: readonly InsightRule[] = INSIGHT_RULES, limit = 5): Insight[] {
  const insights: Insight[] = [];
  for (const rule of rules) {
    try {
      const insight = rule.evaluate(ic);
      if (insight) insights.push(insight);
    } catch (error) {
      console.error(`Insight rule "${rule.id}" failed`, error);
    }
  }
  return insights
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.confidence - a.confidence)
    .slice(0, limit);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/analytics/insights && npm run typecheck`
Expected: 10 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/analytics/insights
git commit -m "feat: add rule-based AI insights with evidence and confidence"
```

---

### Task 10: App store and URL filters

**Files:**
- Create: `src/store/appStore.ts`, `src/store/useApp.ts`, `src/store/urlFilters.ts`
- Test: `src/store/appStore.test.ts`, `src/store/urlFilters.test.ts`

**Interfaces:**
- Consumes: `loadConfig`, `AppConfig` (Task 5); `createDataSource`, `SourceError` (Task 5); `parsePlan` (Task 4); `computeAllMetrics` (Task 6); `Filters`, `EMPTY_FILTERS` (Task 7); `todayDay` (Task 1).
- Produces: `LoadStep`, `Theme`, `LoadError { title; message; code }`, `AppState { status; refreshing; step; stepDetail?; config?; plan?; metrics; refreshError?; error?; cutOff; theme; load(); setCutOff(day); toggleTheme() }`, `StoreDeps`, `createAppStore(deps)`, `appStore` (singleton), `useApp(selector)`; `filtersFromParams(params)`, `writeFilters(params, filters)` (URL keys `d`, `f`, `t`, `p`, `flag`, `q`; other keys such as `pkg` are preserved).

- [ ] **Step 1: Write the failing tests**

`src/store/appStore.test.ts`:

```ts
import type { AppConfig } from '../config/config';
import { parsePlan } from '../data/parser/parsePlan';
import { SourceError, type DataSource } from '../data/sources/sources';
import { dayFromISO } from '../lib/day';
import { sampleWorkbook } from '../test/fixtures';
import { createAppStore, type StoreDeps } from './appStore';

const CONFIG: AppConfig = {
  appName: 'PMS - PEIW',
  projectName: 'Test Project',
  dataSource: { type: 'google-sheet', url: 'https://x' },
  dueSoonDays: 30,
};

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v), data };
}

function deps(overrides: Partial<StoreDeps> = {}, load: DataSource['load'] = async () => sampleWorkbook()): StoreDeps {
  return {
    loadConfig: async () => CONFIG,
    createDataSource: () => ({ label: 'Test', load }),
    parsePlan,
    now: () => new Date(2026, 8, 18),
    storage: memoryStorage(),
    ...overrides,
  };
}

describe('appStore', () => {
  it('loads config, fetches, parses and computes metrics', async () => {
    const store = createAppStore(deps());
    expect(store.getState().status).toBe('idle');
    await store.getState().load();
    const s = store.getState();
    expect(s.status).toBe('ready');
    expect(s.step).toBe('done');
    expect(s.stepDetail).toBe('6 dòng');
    expect(s.plan?.lines).toHaveLength(6);
    expect(s.metrics).toHaveLength(6);
    expect(s.cutOff).toBe(dayFromISO('2026-09-18'));
  });

  it('reports source errors when nothing is loaded yet', async () => {
    const store = createAppStore(
      deps({}, async () => {
        throw new SourceError('ACCESS_DENIED', 'denied', 403);
      }),
    );
    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: 'error', error: { code: 'ACCESS_DENIED', message: 'denied' } });
  });

  it('reports parse errors', async () => {
    const store = createAppStore(deps({}, async () => new TextEncoder().encode('nope').buffer as ArrayBuffer));
    await store.getState().load();
    expect(store.getState()).toMatchObject({ status: 'error', error: { code: 'NOT_XLSX', title: 'Dữ liệu không đúng cấu trúc' } });
  });

  it('reports config errors', async () => {
    const configError = Object.assign(new Error('bad config'), { name: 'ConfigError' });
    const store = createAppStore(
      deps({
        loadConfig: async () => {
          throw configError;
        },
      }),
    );
    await store.getState().load();
    expect(store.getState().error).toEqual({ title: 'Lỗi cấu hình', message: 'bad config', code: 'CONFIG' });
  });

  it('keeps the previous plan when a refresh fails', async () => {
    let fail = false;
    const store = createAppStore(
      deps({}, async () => {
        if (fail) throw new SourceError('NETWORK', 'offline');
        return sampleWorkbook();
      }),
    );
    await store.getState().load();
    fail = true;
    const pending = store.getState().load();
    expect(store.getState().refreshing).toBe(true);
    await pending;
    const s = store.getState();
    expect(s.status).toBe('ready');
    expect(s.refreshing).toBe(false);
    expect(s.plan?.lines).toHaveLength(6);
    expect(s.refreshError?.code).toBe('NETWORK');
  });

  it('recomputes metrics when the cut-off changes', async () => {
    const store = createAppStore(deps());
    await store.getState().load();
    const before = store.getState().metrics.reduce((n, m) => n + m.overdueCount, 0);
    store.getState().setCutOff(dayFromISO('2030-01-01')!);
    const after = store.getState().metrics.reduce((n, m) => n + m.overdueCount, 0);
    expect(after).toBeGreaterThan(before);
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

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const store = createAppStore(deps({ storage: blocked }));
    expect(store.getState().theme).toBe('dark');
    expect(() => store.getState().toggleTheme()).not.toThrow();
  });
});
```

`src/store/urlFilters.test.ts`:

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store`
Expected: FAIL — `Failed to resolve import "./appStore"` / `"./urlFilters"`.

- [ ] **Step 3: Implement the store**

`src/store/appStore.ts`:

```ts
import { createStore } from 'zustand/vanilla';
import { computeAllMetrics, type LineMetrics } from '../analytics/lineMetrics';
import { loadConfig as defaultLoadConfig, type AppConfig } from '../config/config';
import { parsePlan as defaultParsePlan } from '../data/parser/parsePlan';
import { createDataSource as defaultCreateDataSource, SourceError } from '../data/sources/sources';
import type { Plan } from '../data/types';
import { todayDay, type Day } from '../lib/day';

export type LoadStep = 'config' | 'fetch' | 'parse' | 'analyze' | 'done';
export type Theme = 'dark' | 'light';

export interface LoadError {
  title: string;
  message: string;
  code: string;
}

export interface AppState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** True while reloading on top of data that is already shown. */
  refreshing: boolean;
  step: LoadStep;
  /** Extra detail for the current step, e.g. "573 dòng". */
  stepDetail?: string;
  config?: AppConfig;
  plan?: Plan;
  metrics: LineMetrics[];
  /** Set when a refresh failed but older data is still shown. */
  refreshError?: LoadError;
  /** Set when there is nothing to show. */
  error?: LoadError;
  cutOff: Day;
  theme: Theme;
  load(): Promise<void>;
  setCutOff(day: Day): void;
  toggleTheme(): void;
}

export interface StoreDeps {
  loadConfig: typeof defaultLoadConfig;
  createDataSource: typeof defaultCreateDataSource;
  parsePlan: typeof defaultParsePlan;
  now: () => Date;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

const THEME_KEY = 'pms-peiw-theme';

function safeStorage(): StoreDeps['storage'] {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function readTheme(storage: StoreDeps['storage']): Theme {
  try {
    return storage?.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function toLoadError(error: unknown): LoadError {
  if (error instanceof SourceError) return { title: 'Không tải được dữ liệu', message: error.message, code: error.code };
  if (error instanceof Error && error.name === 'ConfigError') return { title: 'Lỗi cấu hình', message: error.message, code: 'CONFIG' };
  return { title: 'Lỗi không xác định', message: error instanceof Error ? error.message : String(error), code: 'UNKNOWN' };
}

/** Yield to the browser so each loading step can paint. */
const nextFrame = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function createAppStore(deps: StoreDeps) {
  const storage = deps.storage;
  let inFlight: AbortController | undefined;

  return createStore<AppState>()((set, get) => ({
    status: 'idle',
    refreshing: false,
    step: 'config',
    metrics: [],
    cutOff: todayDay(deps.now()),
    theme: readTheme(storage),

    async load() {
      inFlight?.abort();
      const controller = new AbortController();
      inFlight = controller;
      const hadPlan = get().plan !== undefined;
      set({ status: hadPlan ? 'ready' : 'loading', refreshing: hadPlan, step: 'config', stepDetail: undefined, refreshError: undefined });
      try {
        const config = get().config ?? (await deps.loadConfig());
        set({ config, step: 'fetch', stepDetail: undefined });
        const buf = await deps.createDataSource(config.dataSource).load(controller.signal);
        if (controller.signal.aborted) return;
        set({ step: 'parse' });
        await nextFrame();
        const parsed = deps.parsePlan(buf, { projectName: config.projectName, sheetName: config.dataSource.sheetName, now: deps.now() });
        if (!parsed.ok) throw Object.assign(new Error(parsed.error.message), { name: 'ParseError', code: parsed.error.code });
        set({ step: 'analyze', stepDetail: `${parsed.plan.lines.length} dòng` });
        await nextFrame();
        const metrics = computeAllMetrics(parsed.plan.lines, { cutOff: get().cutOff, dueSoonDays: config.dueSoonDays });
        if (controller.signal.aborted) return;
        set({ plan: parsed.plan, metrics, status: 'ready', refreshing: false, step: 'done', error: undefined });
      } catch (error) {
        if (controller.signal.aborted) return;
        const loadError =
          error instanceof Error && error.name === 'ParseError'
            ? { title: 'Dữ liệu không đúng cấu trúc', message: error.message, code: (error as Error & { code: string }).code }
            : toLoadError(error);
        if (get().plan) set({ status: 'ready', refreshing: false, refreshError: loadError, step: 'done' });
        else set({ status: 'error', refreshing: false, error: loadError });
      }
    },

    setCutOff(day) {
      const { plan, config } = get();
      set({
        cutOff: day,
        metrics: plan && config ? computeAllMetrics(plan.lines, { cutOff: day, dueSoonDays: config.dueSoonDays }) : [],
      });
    },

    toggleTheme() {
      const theme: Theme = get().theme === 'dark' ? 'light' : 'dark';
      try {
        storage?.setItem(THEME_KEY, theme);
      } catch {
        // Storage can be blocked; the theme still applies for this session.
      }
      set({ theme });
    },
  }));
}

export type AppStore = ReturnType<typeof createAppStore>;

export const appStore: AppStore = createAppStore({
  loadConfig: defaultLoadConfig,
  createDataSource: defaultCreateDataSource,
  parsePlan: defaultParsePlan,
  now: () => new Date(),
  storage: safeStorage(),
});
```

`src/store/useApp.ts`:

```ts
import { useStore } from 'zustand';
import { appStore, type AppState } from './appStore';

/** Subscribe a component to a slice of the app store. */
export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(appStore, selector);
}
```

- [ ] **Step 4: Implement URL filters**

`src/store/urlFilters.ts`:

```ts
import { EMPTY_FILTERS, type Filters, type Flag } from '../analytics/filters';
import { LINE_PHASE_ORDER } from '../data/milestones';
import type { ItemType, LinePhase } from '../data/types';

/** URL query keys for each filter facet. */
const KEYS = { disciplines: 'd', facilities: 'f', itemTypes: 't', phases: 'p', flags: 'flag', q: 'q' } as const;

const ITEM_TYPES: ItemType[] = ['Tagged', 'Bulk', 'Unknown'];
const FLAGS: Flag[] = ['slipped', 'rosRisk', 'overdue', 'dueSoon'];

function list(params: URLSearchParams, key: string): string[] {
  const raw = params.get(key);
  return raw ? raw.split(',').filter(Boolean) : [];
}

export function filtersFromParams(params: URLSearchParams): Filters {
  return {
    disciplines: list(params, KEYS.disciplines),
    facilities: list(params, KEYS.facilities),
    itemTypes: list(params, KEYS.itemTypes).filter((t): t is ItemType => ITEM_TYPES.includes(t as ItemType)),
    phases: list(params, KEYS.phases).filter((p): p is LinePhase => LINE_PHASE_ORDER.includes(p as LinePhase)),
    flags: list(params, KEYS.flags).filter((f): f is Flag => FLAGS.includes(f as Flag)),
    q: params.get(KEYS.q) ?? '',
  };
}

/** Write filters into `params`, keeping unrelated keys (such as `pkg`). Returns a new instance. */
export function writeFilters(params: URLSearchParams, filters: Filters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const facet of Object.keys(KEYS) as (keyof Filters)[]) {
    const key = KEYS[facet];
    const value = facet === 'q' ? filters.q.trim() : (filters[facet] as string[]).join(',');
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export { EMPTY_FILTERS };
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/store && npm run typecheck`
Expected: 8 store tests and 3 URL tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/store
git commit -m "feat: add app store (load pipeline, cut-off, theme) and URL filter sync"
```

---

### Task 11: Theme, palette and UI primitives

**Files:**
- Create: `src/index.css`, `src/ui/theme/palette.ts`
- Create: `src/ui/common/Card.tsx`, `AnimatedNumber.tsx`, `Chip.tsx`, `ErrorBoundary.tsx`, `MultiSelect.tsx`, `Drawer.tsx`, `EmptyFilterState.tsx`
- Create: `src/ui/charts/EChart.tsx`, `src/ui/hooks/useFilters.ts`, `src/ui/hooks/useDashboard.ts`, `src/test/seedStore.ts`
- Test: `src/ui/common/primitives.test.tsx`

**Interfaces:**
- Consumes: `useApp`, `appStore`, `Theme` (Task 10); `filtersFromParams`, `writeFilters` (Task 10); `applyFilters`, `vocabularyOf`, `Filters` (Task 7); `MilestoneStatus`, `MetricsContext` (Task 6); catalog (Task 2).
- Produces: CSS tokens usable as Tailwind colors (`bg-bg`, `bg-surface`, `bg-surface-2`, `border-line`, `text-ink`, `text-ink-2`, `text-ink-3`, `text-ai-1`, `text-ai-2`, `text-good`, `text-warning`, `text-serious`, `text-critical`) and classes `ai-border`, `ai-text`, `scan`, `pulse-risk`; `CATEGORICAL`, `phaseColor(phase, theme)`, `STATUS`, `milestoneStatusColor(status, theme)`, `SEQUENTIAL`, `CHART_INK`; components `Card({ title?, subtitle?, actions?, ai?, className? })`, `Stagger`, `cardVariants`, `AnimatedNumber({ value })`, `PhaseChip({ phase, muted? })`, `StatusBadge({ status })`, `FloatBadge({ days })`, `ErrorBoundary({ label })`, `MultiSelect<T>({ label, options, selected, onChange })`, `Drawer({ open, onClose, title, width? })`, `EmptyFilterState({ onClear })`, `EChart({ option, height, ariaLabel, onEvents? })`; hooks `useFilters() → { filters, setFilters(patch), clear }`, `usePackageParam() → { code?, open(code), close() }`, `useDashboard() → { metrics, filtered, vocab, filters, setFilters, clearFilters, ctx, disciplineOrder }`; test helper `seedStore()`.

Palette note: the six categorical slots were checked with the dataviz validator — adjacent CVD ΔE ≥ 8.4 and normal-vision ΔE ≥ 19.3 on both surfaces. In light mode aqua/yellow/magenta are below 3:1 contrast, so every chart ships a legend or direct labels and tooltips.

Pitfall (caught during planning): a Zustand selector that returns a new array/object on each call (for example `s.plan?.disciplines.map(...)`) causes an infinite render loop. Select stable references and derive in `useMemo`, as `useDashboard` does.

- [ ] **Step 1: Write the failing test**

`src/ui/common/primitives.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { FloatBadge } from './Chip';
import { ErrorBoundary } from './ErrorBoundary';
import { MultiSelect } from './MultiSelect';

function Harness() {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <>
      <MultiSelect
        label="Facility"
        options={[
          { value: 'BF', label: 'BF' },
          { value: 'PS2R', label: 'PS2R' },
        ]}
        selected={selected}
        onChange={setSelected}
      />
      <p data-testid="selected">{selected.join(',')}</p>
    </>
  );
}

function Boom(): never {
  throw new Error('kaboom');
}

describe('MultiSelect', () => {
  it('toggles options and clears them', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Facility/ }));
    fireEvent.click(screen.getByLabelText('PS2R'));
    fireEvent.click(screen.getByLabelText('BF'));
    expect(screen.getByTestId('selected').textContent).toBe('PS2R,BF');
    fireEvent.click(screen.getByText('Bỏ chọn tất cả'));
    expect(screen.getByTestId('selected').textContent).toBe('');
  });

  it('closes on Escape', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: /Facility/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  it('contains a failing widget', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary label="Biểu đồ">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Không hiển thị được “Biểu đồ”');
    expect(screen.getByRole('alert')).toHaveTextContent('kaboom');
    spy.mockRestore();
  });
});

describe('FloatBadge', () => {
  it('marks negative float as risk', () => {
    render(<FloatBadge days={-19} />);
    expect(screen.getByText(/-19d/)).toHaveClass('text-critical');
  });

  it('shows a dash without data', () => {
    render(<FloatBadge days={undefined} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/common`
Expected: FAIL — `Failed to resolve import "./Chip"`.

- [ ] **Step 3: Add styles and palette**

`src/index.css`:

```css
@import 'tailwindcss';
@import '@fontsource-variable/inter';
@import '@fontsource-variable/jetbrains-mono';

@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));

:root {
  color-scheme: light;
  --bg: #f4f6fb;
  --surface: rgba(255, 255, 255, 0.86);
  --surface-2: #eef1f7;
  --border: rgba(15, 23, 42, 0.1);
  --text: #0f172a;
  --text-2: #475569;
  --text-3: #64748b;
  --ai-1: #0891b2;
  --ai-2: #7c3aed;
  --dot: rgba(15, 23, 42, 0.07);
  --glow: rgba(8, 145, 178, 0.18);
}

[data-theme='dark'] {
  color-scheme: dark;
  --bg: #0a0f1c;
  --surface: rgba(17, 26, 46, 0.78);
  --surface-2: #16213a;
  --border: rgba(148, 163, 184, 0.14);
  --text: #e2e8f0;
  --text-2: #94a3b8;
  --text-3: #7c8aa5;
  --ai-1: #22d3ee;
  --ai-2: #a78bfa;
  --dot: rgba(148, 163, 184, 0.08);
  --glow: rgba(34, 211, 238, 0.16);
}

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-line: var(--border);
  --color-ink: var(--text);
  --color-ink-2: var(--text-2);
  --color-ink-3: var(--text-3);
  --color-ai-1: var(--ai-1);
  --color-ai-2: var(--ai-2);
  --color-good: #0ca30c;
  --color-warning: #fab219;
  --color-serious: #ec835a;
  --color-critical: #d03b3b;
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, monospace;
}

html,
body,
#root {
  min-height: 100%;
}

body {
  margin: 0;
  background-color: var(--bg);
  background-image: radial-gradient(var(--dot) 1px, transparent 1px);
  background-size: 22px 22px;
  color: var(--text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

/* Animated gradient border for AI surfaces. */
@property --ai-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.ai-border {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--surface-2), var(--surface-2)) padding-box,
    conic-gradient(from var(--ai-angle), var(--ai-1), var(--ai-2), var(--ai-1)) border-box;
  animation: ai-spin 8s linear infinite;
}

@keyframes ai-spin {
  to {
    --ai-angle: 360deg;
  }
}

.ai-text {
  background: linear-gradient(90deg, var(--ai-1), var(--ai-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Light sweep used by the loading skeletons. */
.scan {
  position: relative;
  overflow: hidden;
}

.scan::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, var(--glow), transparent);
  animation: scan 1.6s ease-in-out infinite;
}

@keyframes scan {
  to {
    transform: translateX(100%);
  }
}

/* Risk pulse: at most three times, then still. */
.pulse-risk {
  animation: pulse-risk 1.4s ease-out 3;
}

@keyframes pulse-risk {
  0% {
    box-shadow: 0 0 0 0 rgba(208, 59, 59, 0.45);
  }
  100% {
    box-shadow: 0 0 0 10px rgba(208, 59, 59, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-border,
  .scan::after,
  .pulse-risk {
    animation: none;
  }
}
```

`src/ui/theme/palette.ts`:

```ts
import type { MilestoneStatus } from '../../analytics/lineMetrics';
import type { LinePhase } from '../../data/types';
import type { Theme } from '../../store/appStore';

/**
 * Chart colors. Categorical slots validated with the dataviz palette validator
 * (adjacent CVD ΔE ≥ 8, normal-vision ΔE ≥ 15) on #111a2e (dark) and #fcfcfb (light).
 * Light-mode aqua/yellow/magenta sit below 3:1 contrast: charts always ship a legend and tooltips.
 */
export const CATEGORICAL: Record<Theme, readonly string[]> = {
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7'],
};

const NEUTRAL: Record<Theme, string> = { dark: '#7c8aa5', light: '#8a94a8' };

export function phaseColor(phase: LinePhase, theme: Theme): string {
  const order: LinePhase[] = ['tr', 'rfq', 'evaluation', 'award', 'manufacturing', 'logistics'];
  const i = order.indexOf(phase);
  return i === -1 ? NEUTRAL[theme] : CATEGORICAL[theme][i];
}

/** Reserved status colors — never reused for series. Always paired with an icon or label. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export function milestoneStatusColor(status: MilestoneStatus, theme: Theme): string {
  switch (status) {
    case 'done':
      return STATUS.good;
    case 'dueSoon':
      return STATUS.warning;
    case 'overdue':
      return STATUS.serious;
    case 'future':
      return NEUTRAL[theme];
    default:
      return 'transparent';
  }
}

/** Sequential blue ramp for heatmaps: near-surface → strongest. */
export const SEQUENTIAL: Record<Theme, readonly string[]> = {
  dark: ['#16233d', '#184f95', '#2a78d6', '#5598e7', '#9ec5f4'],
  light: ['#eef4fc', '#b7d3f6', '#6da7ec', '#256abf', '#104281'],
};

/** Ink colors for chart axes, labels and grid lines. */
export const CHART_INK: Record<Theme, { text: string; muted: string; grid: string; surface: string; cutOff: string }> = {
  dark: { text: '#e2e8f0', muted: '#94a3b8', grid: 'rgba(148,163,184,0.12)', surface: '#111a2e', cutOff: '#22d3ee' },
  light: { text: '#0f172a', muted: '#475569', grid: 'rgba(15,23,42,0.08)', surface: '#ffffff', cutOff: '#0891b2' },
};
```

- [ ] **Step 4: Add the primitives**

`src/ui/common/Card.tsx`:

```tsx
import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** AI surfaces get the animated gradient border and the ✦ mark. */
  ai?: boolean;
}

export const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export function Card({ title, subtitle, actions, children, className = '', ai = false }: CardProps) {
  const frame = ai ? 'ai-border' : 'border border-line bg-surface';
  return (
    <motion.section variants={cardVariants} className={`rounded-2xl p-4 shadow-sm backdrop-blur-md ${frame} ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-ink">
                {ai && <span aria-hidden className="ai-text text-base">✦</span>}
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** Container that staggers its Card children into view. */
export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      {children}
    </motion.div>
  );
}
```

`src/ui/common/AnimatedNumber.tsx`:

```tsx
import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const format = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** Counts from the previous value to `value` (800 ms on first paint, 400 ms on updates). */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | undefined>(undefined);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current ?? 0;
    previous.current = value;
    if (reduced || from === value) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: from === 0 ? 0.8 : 0.4,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {format(value)}
    </span>
  );
}
```

`src/ui/common/Chip.tsx`:

```tsx
import type { MilestoneStatus } from '../../analytics/lineMetrics';
import { LINE_PHASE_LABEL } from '../../data/milestones';
import type { LinePhase } from '../../data/types';
import { useApp } from '../../store/useApp';
import { milestoneStatusColor, phaseColor } from '../theme/palette';

export function PhaseChip({ phase, muted = false }: { phase: LinePhase; muted?: boolean }) {
  const theme = useApp((s) => s.theme);
  const color = phaseColor(phase, theme);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs whitespace-nowrap ${muted ? 'text-ink-3' : 'text-ink'}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
      {LINE_PHASE_LABEL[phase]}
    </span>
  );
}

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  done: 'Hoàn thành',
  overdue: 'Quá hạn',
  dueSoon: 'Sắp đến hạn',
  future: 'Chưa đến',
  noDate: 'Không có ngày',
};

const STATUS_ICON: Record<MilestoneStatus, string> = { done: '✓', overdue: '!', dueSoon: '◷', future: '·', noDate: '–' };

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  const theme = useApp((s) => s.theme);
  const color = milestoneStatusColor(status, theme);
  return (
    <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-ink-2">
      <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
        {STATUS_ICON[status]}
      </span>
      {STATUS_LABEL[status]}
    </span>
  );
}

/** ROS float: negative is at risk (critical), small positive is tight (warning). */
export function FloatBadge({ days }: { days: number | undefined }) {
  if (days === undefined) return <span className="text-ink-3">—</span>;
  const tone = days < 0 ? 'text-critical' : days < 30 ? 'text-warning' : 'text-ink-2';
  const icon = days < 0 ? '⚠ ' : '';
  return (
    <span className={`font-mono tabular-nums ${tone}`}>
      {icon}
      {days > 0 ? '+' : ''}
      {days}d
    </span>
  );
}
```

`src/ui/common/ErrorBoundary.tsx`:

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  error?: Error;
}

/** Contains a widget failure so the rest of the dashboard keeps working. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Widget "${this.props.label}" failed`, error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="rounded-2xl border border-serious/40 bg-surface p-4 text-sm text-ink-2">
          <p className="font-semibold text-serious">Không hiển thị được “{this.props.label}”.</p>
          <p className="mt-1 text-xs text-ink-3">{this.state.error.message}</p>
          <button className="mt-2 text-xs text-ai-1 underline" onClick={() => this.setState({ error: undefined })}>
            Thử lại
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

`src/ui/common/MultiSelect.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface MultiSelectProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}

/** Compact dropdown with checkboxes; closes on outside click or Escape. */
export function MultiSelect<T extends string>({ label, options, selected, onChange }: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const active = selected.length > 0;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm whitespace-nowrap transition-colors ${
          active ? 'border-ai-1/60 bg-ai-1/10 text-ink' : 'border-line bg-surface text-ink-2 hover:text-ink'
        }`}
      >
        {label}
        {active && <span className="rounded bg-ai-1/20 px-1.5 font-mono text-xs text-ai-1">{selected.length}</span>}
        <span aria-hidden className="text-ink-3">▾</span>
      </button>
      {open && (
        <ul
          id={id}
          role="listbox"
          aria-multiselectable
          className="absolute z-30 mt-1 max-h-72 min-w-56 overflow-auto rounded-xl border border-line bg-surface-2 p-1 shadow-xl"
        >
          {options.map((o) => (
            <li key={o.value}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface">
                <input type="checkbox" className="accent-cyan-500" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            </li>
          ))}
          {active && (
            <li>
              <button type="button" className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-ai-1 hover:bg-surface" onClick={() => onChange([])}>
                Bỏ chọn tất cả
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
```

`src/ui/common/Drawer.tsx`:

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class for desktop; full screen below `sm`. */
  width?: string;
}

/** Right-side sheet (full screen on phones), closes on Escape or backdrop click. */
export function Drawer({ open, onClose, title, children, width = 'sm:max-w-3xl' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={`absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-bg shadow-2xl ${width}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <header
              className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
            >
              <div className="min-w-0">{title}</div>
              <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg px-2 py-1 text-lg text-ink-2 hover:bg-surface hover:text-ink">
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
```

`src/ui/common/EmptyFilterState.tsx`:

```tsx
export function EmptyFilterState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-3xl" aria-hidden>
        ∅
      </p>
      <p className="mt-2 text-sm text-ink-2">Không có dòng nào khớp bộ lọc hiện tại.</p>
      <button type="button" onClick={onClear} className="mt-4 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1">
        Xóa bộ lọc
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Add the chart wrapper and hooks**

`src/ui/charts/EChart.tsx`:

```tsx
import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

interface EChartProps {
  option: EChartsOption;
  height: number | string;
  onEvents?: Record<string, (params: unknown) => void>;
  ariaLabel: string;
}

/** Tree-shaken ECharts wrapper. Animation is off when the user prefers reduced motion. */
export function EChart({ option, height, onEvents, ariaLabel }: EChartProps) {
  const reduced = useReducedMotion();
  const merged = useMemo<EChartsOption>(
    () => ({ animationDuration: 600, animationDurationUpdate: 400, ...option, animation: !reduced }),
    [option, reduced],
  );
  return (
    <div role="img" aria-label={ariaLabel}>
      <ReactEChartsCore echarts={echarts} option={merged} style={{ height, width: '100%' }} onEvents={onEvents} notMerge lazyUpdate />
    </div>
  );
}
```

`src/ui/hooks/useFilters.ts`:

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, type Filters } from '../../analytics/filters';
import { filtersFromParams, writeFilters } from '../../store/urlFilters';

/** Filters live in the URL so every view can be shared as a link. */
export function useFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);

  const setFilters = useCallback(
    (patch: Partial<Filters>) => setParams((prev) => writeFilters(prev, { ...filtersFromParams(prev), ...patch }), { replace: true }),
    [setParams],
  );
  const clear = useCallback(() => setParams((prev) => writeFilters(prev, EMPTY_FILTERS), { replace: true }), [setParams]);

  return { filters, setFilters, clear };
}

/** The package drawer is driven by `?pkg=<code>`. */
export function usePackageParam() {
  const [params, setParams] = useSearchParams();
  const code = params.get('pkg') ?? undefined;
  const open = useCallback(
    (pkg: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('pkg', pkg);
        return next;
      }),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('pkg');
        return next;
      }),
    [setParams],
  );
  return { code, open, close };
}
```

`src/ui/hooks/useDashboard.ts`:

```ts
import { useMemo } from 'react';
import { applyFilters, vocabularyOf } from '../../analytics/filters';
import type { MetricsContext } from '../../analytics/lineMetrics';
import { useApp } from '../../store/useApp';
import { useFilters } from './useFilters';

/** Everything a dashboard view needs: all metrics, the filtered subset and the search vocabulary. */
export function useDashboard() {
  const metrics = useApp((s) => s.metrics);
  const cutOff = useApp((s) => s.cutOff);
  const dueSoonDays = useApp((s) => s.config?.dueSoonDays ?? 30);
  // Select stable references only; derive arrays in useMemo (a new array per selector call loops forever).
  const plan = useApp((s) => s.plan);
  const { filters, setFilters, clear } = useFilters();
  const vocab = useMemo(() => vocabularyOf(metrics), [metrics]);
  const filtered = useMemo(() => applyFilters(metrics, filters, vocab), [metrics, filters, vocab]);
  const ctx: MetricsContext = useMemo(() => ({ cutOff, dueSoonDays }), [cutOff, dueSoonDays]);
  const disciplineOrder = useMemo(() => plan?.disciplines.map((d) => d.name) ?? vocab.disciplines, [plan, vocab]);
  return { metrics, filtered, vocab, filters, setFilters, clearFilters: clear, ctx, disciplineOrder };
}
```

`src/test/seedStore.ts`:

```ts
import { appStore } from '../store/appStore';
import { sampleMetrics, samplePlan, TEST_CTX } from './planFixture';

/** Put the app store into a loaded state with the sample plan (UI tests). */
export function seedStore(): void {
  appStore.setState({
    status: 'ready',
    refreshing: false,
    step: 'done',
    config: { appName: 'PMS - PEIW', projectName: 'Test Project', dataSource: { type: 'google-sheet', url: 'x' }, dueSoonDays: 30 },
    plan: samplePlan(),
    metrics: sampleMetrics(),
    cutOff: TEST_CTX.cutOff,
    error: undefined,
    refreshError: undefined,
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/ui/common && npm run typecheck`
Expected: 5 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/ui src/test/seedStore.ts
git commit -m "feat: add design tokens, validated chart palette and UI primitives"
```

---

### Task 12: Overview page

**Files:**
- Create: `src/ui/overview/KpiStrip.tsx`, `InsightsPanel.tsx`, `PhaseFunnel.tsx`, `DisciplineGrid.tsx`, `WorkloadChart.tsx`, `FacilityHeatmap.tsx`, `OverviewPage.tsx`
- Test: `src/ui/overview/overview.test.tsx`

**Interfaces:**
- Consumes: aggregates (Task 8), `generateInsights` (Task 9), primitives and hooks (Task 11), palette (Task 11).
- Produces: `OverviewPage` (route element), `KpiStrip({ kpis, dueSoonDays, activeFlags, onFilter })` (reused by the Discipline page).

Widget behavior: KPI tiles with a flag toggle that filter; insight cards type out their text, show confidence, "Why?" lists evidence lines (click opens the package), "Lọc theo insight" applies the insight filter; phase funnel toggles schedule/actual basis and a bar click filters that phase; discipline tiles link to `/discipline/:name` keeping the query string; workload chart is stacked by the six headline milestones with a dashed cut-off line and zoom; heatmap has a milestone selector.

- [ ] **Step 1: Write the failing test**

`src/ui/overview/overview.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { seedStore } from '../../test/seedStore';
import { OverviewPage } from './OverviewPage';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderOverview(path = '/') {
  const router = createMemoryRouter([{ path: '/', element: <OverviewPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('OverviewPage', () => {
  it('shows KPI tiles, insights and every widget', () => {
    renderOverview();
    expect(screen.getByRole('button', { name: /ROS at risk/ })).toHaveTextContent('1');
    expect(screen.getByText('1 dòng có nguy cơ trễ ROS')).toBeInTheDocument();
    expect(screen.getByText('Phase funnel')).toBeInTheDocument();
    expect(screen.getByText('Discipline health')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Số mốc đến hạn theo tháng' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Heatmap số mốc theo facility và tháng' })).toBeInTheDocument();
  });

  it('reveals insight evidence with Why?', () => {
    renderOverview();
    fireEvent.click(screen.getAllByRole('button', { name: 'Why?' })[0]);
    expect(screen.getByText(/@ PS2R · dòng 7/)).toBeInTheDocument();
  });

  it('applies an insight filter to the URL', () => {
    const router = renderOverview();
    fireEvent.click(screen.getAllByRole('button', { name: 'Lọc theo insight' })[0]);
    expect(router.state.location.search).toContain('flag=rosRisk');
  });

  it('shows the empty state when filters match nothing', () => {
    renderOverview('/?q=zzzz');
    expect(screen.getByText('Không có dòng nào khớp bộ lọc hiện tại.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/overview`
Expected: FAIL — `Failed to resolve import "./OverviewPage"`.

- [ ] **Step 3: Implement the widgets**

`src/ui/overview/KpiStrip.tsx`:

```tsx
import { motion } from 'motion/react';
import type { Kpis } from '../../analytics/aggregate';
import type { Filters, Flag } from '../../analytics/filters';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { cardVariants } from '../common/Card';

interface Tile {
  key: keyof Kpis;
  label: string;
  hint: string;
  flag?: Flag;
  tone?: 'critical' | 'warning' | 'serious';
}

const TILES: Tile[] = [
  { key: 'packages', label: 'Packages', hint: 'Số package có mã hợp lệ' },
  { key: 'lines', label: 'Lines', hint: 'Số dòng Package × Facility' },
  { key: 'slipped', label: 'Slipped', hint: 'Dòng có Forecast trễ hơn Plan', flag: 'slipped', tone: 'serious' },
  { key: 'rosAtRisk', label: 'ROS at risk', hint: 'Hàng về công trường sau ngày ROS', flag: 'rosRisk', tone: 'critical' },
  { key: 'dueSoon', label: 'Due soon', hint: 'Số mốc đến hạn trong cửa sổ sắp tới', flag: 'dueSoon', tone: 'warning' },
];

const TONE: Record<NonNullable<Tile['tone']>, string> = {
  critical: 'text-critical',
  warning: 'text-warning',
  serious: 'text-serious',
};

interface KpiStripProps {
  kpis: Kpis;
  dueSoonDays: number;
  activeFlags: readonly Flag[];
  onFilter: (patch: Partial<Filters>) => void;
}

/** Headline numbers; tiles with a flag toggle that filter on click. */
export function KpiStrip({ kpis, dueSoonDays, activeFlags, onFilter }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map((t) => {
        const value = kpis[t.key];
        const active = t.flag !== undefined && activeFlags.includes(t.flag);
        const alarming = t.tone !== undefined && value > 0;
        const content = (
          <>
            <p className="text-[11px] font-medium tracking-wider text-ink-3 uppercase">
              {t.label}
              {t.key === 'dueSoon' && <span className="normal-case"> · {dueSoonDays} ngày</span>}
            </p>
            <AnimatedNumber value={value} className={`mt-1 block text-3xl font-semibold ${alarming && t.tone ? TONE[t.tone] : 'text-ink'}`} />
            <p className="mt-1 text-[11px] text-ink-3">{t.hint}</p>
          </>
        );
        const base = `rounded-2xl border bg-surface p-4 text-left backdrop-blur-md ${active ? 'border-ai-1' : 'border-line'} ${
          t.key === 'rosAtRisk' && value > 0 ? 'pulse-risk' : ''
        }`;
        return t.flag ? (
          <motion.button
            key={t.key}
            type="button"
            variants={cardVariants}
            whileHover={{ y: -2 }}
            aria-pressed={active}
            className={`${base} cursor-pointer`}
            onClick={() => onFilter({ flags: active ? activeFlags.filter((f) => f !== t.flag) : [...activeFlags, t.flag!] })}
          >
            {content}
          </motion.button>
        ) : (
          <motion.div key={t.key} variants={cardVariants} className={base}>
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}
```

`src/ui/overview/InsightsPanel.tsx`:

```tsx
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Filters } from '../../analytics/filters';
import type { Insight, Severity } from '../../analytics/insights/types';
import type { LineMetrics } from '../../analytics/lineMetrics';
import { Card } from '../common/Card';

const SEVERITY: Record<Severity, { label: string; icon: string; tone: string }> = {
  critical: { label: 'Nghiêm trọng', icon: '▲', tone: 'text-critical' },
  warning: { label: 'Cần chú ý', icon: '●', tone: 'text-warning' },
  info: { label: 'Thông tin', icon: '◆', tone: 'text-ai-1' },
};

/** Reveals text character by character, like a model streaming its answer. */
function Typewriter({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 2)), 12);
    return () => clearInterval(id);
  }, [text, reduced]);
  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-ai-1 align-middle" />}
    </>
  );
}

interface InsightsPanelProps {
  insights: Insight[];
  metrics: readonly LineMetrics[];
  onApply: (filter: Partial<Filters>) => void;
  onOpenPackage: (code: string) => void;
}

export function InsightsPanel({ insights, metrics, onApply, onOpenPackage }: InsightsPanelProps) {
  const [why, setWhy] = useState<string | undefined>();
  const byId = new Map(metrics.map((m) => [m.line.id, m]));

  return (
    <Card ai title="AI Insights" subtitle="Tự động phát hiện từ dữ liệu hiện tại · bấm “Why?” để xem bằng chứng">
      {insights.length === 0 ? (
        <p className="text-sm text-ink-3">Không phát hiện điểm bất thường nào với bộ lọc hiện tại.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((ins, i) => {
            const s = SEVERITY[ins.severity];
            const open = why === ins.id;
            return (
              <motion.li
                key={ins.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-line bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={`flex items-center gap-1 font-medium ${s.tone}`}>
                    <span aria-hidden>{s.icon}</span>
                    {s.label}
                  </span>
                  <span className="font-mono text-ink-3" title="Tỷ lệ dòng có đủ dữ liệu cho phân tích này">
                    Confidence {Math.round(ins.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink">{ins.title}</p>
                <p className="mt-1 min-h-10 text-xs leading-relaxed text-ink-2">
                  <Typewriter text={ins.detail} />
                </p>
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" className="text-ai-1 underline" onClick={() => setWhy(open ? undefined : ins.id)}>
                    {open ? 'Ẩn' : 'Why?'}
                  </button>
                  {ins.filter && (
                    <button type="button" className="text-ai-1 underline" onClick={() => onApply(ins.filter!)}>
                      Lọc theo insight
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {open && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 max-h-40 overflow-auto border-t border-line pt-2 text-xs"
                    >
                      {ins.evidence.slice(0, 50).map((id) => {
                        const m = byId.get(id);
                        if (!m) return null;
                        return (
                          <li key={id}>
                            <button type="button" className="w-full truncate py-0.5 text-left text-ink-2 hover:text-ai-1" onClick={() => onOpenPackage(m.line.packageCode)}>
                              <span className="font-mono">{m.line.packageCode}</span> @ {m.line.facility} · dòng {m.line.sourceRow}
                            </button>
                          </li>
                        );
                      })}
                      {ins.evidence.length > 50 && <li className="text-ink-3">… và {ins.evidence.length - 50} dòng khác</li>}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
```

`src/ui/overview/PhaseFunnel.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { phaseFunnel, type PhaseBasis } from '../../analytics/aggregate';
import type { LineMetrics } from '../../analytics/lineMetrics';
import type { LinePhase } from '../../data/types';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CHART_INK, phaseColor } from '../theme/palette';

interface PhaseFunnelProps {
  metrics: readonly LineMetrics[];
  onSelectPhase: (phase: LinePhase) => void;
}

/** Lines per phase. Bars are direct-labeled; one series, so no legend box. */
export function PhaseFunnel({ metrics, onSelectPhase }: PhaseFunnelProps) {
  const theme = useApp((s) => s.theme);
  const [basis, setBasis] = useState<PhaseBasis>('schedule');
  const data = useMemo(() => phaseFunnel(metrics, basis), [metrics, basis]);
  const ink = CHART_INK[theme];

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: { trigger: 'item', formatter: '{b}: {c} dòng' },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((d) => d.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: ink.muted },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 18,
          data: data.map((d) => ({ value: d.count, itemStyle: { color: phaseColor(d.phase, theme), borderRadius: [0, 4, 4, 0] } })),
          label: { show: true, position: 'right', color: ink.text, fontFamily: 'JetBrains Mono Variable, monospace' },
        },
      ],
    }),
    [data, ink, theme],
  );

  return (
    <Card
      title="Phase funnel"
      subtitle={basis === 'schedule' ? 'Theo kế hoạch: dòng đáng lẽ đang ở phase nào tại cut-off' : 'Theo Actual: phase dựa trên mốc đã ghi nhận thực tế'}
      actions={
        <div role="group" aria-label="Cơ sở tính phase" className="flex rounded-lg border border-line p-0.5 text-xs">
          {(['schedule', 'actual'] as const).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={basis === b}
              onClick={() => setBasis(b)}
              className={`rounded-md px-2 py-1 ${basis === b ? 'bg-ai-1/20 text-ai-1' : 'text-ink-3'}`}
            >
              {b === 'schedule' ? 'Kế hoạch' : 'Actual'}
            </button>
          ))}
        </div>
      }
    >
      <EChart
        ariaLabel="Số dòng theo phase"
        height={260}
        option={option}
        onEvents={{ click: (p) => onSelectPhase(data[(p as { dataIndex: number }).dataIndex].phase) }}
      />
    </Card>
  );
}
```

`src/ui/overview/DisciplineGrid.tsx`:

```tsx
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import type { DisciplineHealth, RiskLevel } from '../../analytics/aggregate';
import { Card } from '../common/Card';

const LEVEL: Record<RiskLevel, { label: string; icon: string; ring: string; tone: string }> = {
  ok: { label: 'Ổn định', icon: '✓', ring: 'border-good/40', tone: 'text-good' },
  watch: { label: 'Theo dõi', icon: '●', ring: 'border-warning/50', tone: 'text-warning' },
  risk: { label: 'Rủi ro', icon: '▲', ring: 'border-critical/60', tone: 'text-critical' },
};

export function DisciplineGrid({ health }: { health: DisciplineHealth[] }) {
  const [params] = useSearchParams();
  const query = params.toString();
  return (
    <Card title="Discipline health" subtitle="Điểm = (ROS×2 + quá hạn×1.5 + trượt×1) / số dòng · bấm để xem chi tiết">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {health.map((h) => {
          const lvl = LEVEL[h.level];
          return (
            <motion.div key={h.name} layoutId={`discipline-${h.name}`} whileHover={{ y: -2 }}>
              <Link
                to={{ pathname: `/discipline/${encodeURIComponent(h.name)}`, search: query ? `?${query}` : '' }}
                className={`block rounded-xl border bg-surface p-3 transition-colors hover:bg-surface-2 ${lvl.ring} ${h.level === 'risk' ? 'pulse-risk' : ''}`}
              >
                <p className="truncate text-xs font-semibold tracking-wide text-ink" title={h.name}>
                  {h.name}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] ${lvl.tone}`}>
                  <span aria-hidden>{lvl.icon}</span>
                  {lvl.label}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 text-[11px] text-ink-3">
                  <dt>Packages</dt>
                  <dd className="text-right font-mono text-ink-2">{h.packages}</dd>
                  <dt>ROS risk</dt>
                  <dd className={`text-right font-mono ${h.rosAtRisk ? 'text-critical' : 'text-ink-2'}`}>{h.rosAtRisk}</dd>
                  <dt>Slipped</dt>
                  <dd className="text-right font-mono text-ink-2">{h.slipped}</dd>
                </dl>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
```

`src/ui/overview/WorkloadChart.tsx`:

```tsx
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { monthlyWorkload } from '../../analytics/aggregate';
import type { LineMetrics } from '../../analytics/lineMetrics';
import { formatMonth, monthKey, type Day } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

/** Stacked monthly count of the six headline milestones, with a cut-off marker. */
export function WorkloadChart({ metrics, cutOff }: { metrics: readonly LineMetrics[]; cutOff: Day }) {
  const theme = useApp((s) => s.theme);
  const data = useMemo(() => monthlyWorkload(metrics), [metrics]);
  const ink = CHART_INK[theme];

  const option = useMemo<EChartsOption>(() => {
    const cutLabel = formatMonth(monthKey(cutOff));
    const labels = data.months.map(formatMonth);
    return {
      color: [...CATEGORICAL[theme]],
      grid: { left: 8, right: 12, top: 36, bottom: 48, containLabel: true },
      legend: { top: 0, textStyle: { color: ink.muted }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: labels, axisLabel: { color: ink.muted }, axisLine: { lineStyle: { color: ink.grid } } },
      yAxis: { type: 'value', axisLabel: { color: ink.muted }, splitLine: { lineStyle: { color: ink.grid } } },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', height: 16, bottom: 8, borderColor: 'transparent', textStyle: { color: ink.muted } },
      ],
      series: data.series.map((s, i) => ({
        type: 'bar',
        name: s.label,
        stack: 'total',
        data: s.counts,
        barMaxWidth: 22,
        itemStyle: { borderColor: ink.surface, borderWidth: 1 },
        ...(i === 0 && labels.includes(cutLabel)
          ? {
              markLine: {
                symbol: 'none',
                label: { formatter: 'Cut-off', color: ink.cutOff },
                lineStyle: { color: ink.cutOff, type: 'dashed', width: 2 },
                data: [{ xAxis: cutLabel }],
              },
            }
          : {}),
      })),
    };
  }, [data, ink, theme, cutOff]);

  return (
    <Card title="Khối lượng mốc theo tháng" subtitle="TR · TBE · CBE · LOA · FAT/EXW · Site — theo ngày hiệu lực (Actual → Forecast → Plan)">
      {data.months.length === 0 ? <p className="text-sm text-ink-3">Không có dữ liệu ngày.</p> : <EChart ariaLabel="Số mốc đến hạn theo tháng" height={320} option={option} />}
    </Card>
  );
}
```

`src/ui/overview/FacilityHeatmap.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { facilityHeatmap } from '../../analytics/aggregate';
import type { LineMetrics } from '../../analytics/lineMetrics';
import { MILESTONES } from '../../data/milestones';
import type { MilestoneKey } from '../../data/types';
import { formatMonth } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CHART_INK, SEQUENTIAL } from '../theme/palette';

/** Milestones due per Facility × Month (sequential single-hue ramp). */
export function FacilityHeatmap({ metrics }: { metrics: readonly LineMetrics[] }) {
  const theme = useApp((s) => s.theme);
  const [milestone, setMilestone] = useState<MilestoneKey | 'all'>('all');
  const data = useMemo(() => facilityHeatmap(metrics, milestone), [metrics, milestone]);
  const ink = CHART_INK[theme];

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 12, top: 8, bottom: 64, containLabel: true },
      tooltip: {
        formatter: (p) => {
          const [mi, fi, n] = (p as unknown as { value: [number, number, number] }).value;
          return `${data.facilities[fi]} · ${formatMonth(data.months[mi])}<br/><b>${n}</b> mốc`;
        },
      },
      xAxis: { type: 'category', data: data.months.map(formatMonth), axisLabel: { color: ink.muted }, splitArea: { show: false } },
      yAxis: { type: 'category', data: data.facilities, axisLabel: { color: ink.muted } },
      visualMap: {
        min: 0,
        max: Math.max(1, data.max),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 120,
        textStyle: { color: ink.muted },
        inRange: { color: [...SEQUENTIAL[theme]] },
      },
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series: [
        {
          type: 'heatmap',
          data: data.cells,
          itemStyle: { borderColor: ink.surface, borderWidth: 2, borderRadius: 3 },
          emphasis: { itemStyle: { borderColor: ink.text } },
        },
      ],
    }),
    [data, ink, theme],
  );

  return (
    <Card
      title="Facility × Tháng"
      subtitle="Số mốc đến hạn theo facility và tháng"
      actions={
        <select
          aria-label="Chọn mốc"
          value={milestone}
          onChange={(e) => setMilestone(e.target.value as MilestoneKey | 'all')}
          className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink"
        >
          <option value="all">Tất cả mốc</option>
          {MILESTONES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      }
    >
      {data.cells.length === 0 ? (
        <p className="text-sm text-ink-3">Không có dữ liệu.</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(480, data.months.length * 22) }}>
            <EChart ariaLabel="Heatmap số mốc theo facility và tháng" height={Math.max(260, data.facilities.length * 28 + 110)} option={option} />
          </div>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Implement the page**

`src/ui/overview/OverviewPage.tsx`:

```tsx
import { useMemo } from 'react';
import { computeKpis, disciplineHealth } from '../../analytics/aggregate';
import { generateInsights } from '../../analytics/insights/registry';
import { useApp } from '../../store/useApp';
import { Stagger } from '../common/Card';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { useDashboard } from '../hooks/useDashboard';
import { usePackageParam } from '../hooks/useFilters';
import { DisciplineGrid } from './DisciplineGrid';
import { FacilityHeatmap } from './FacilityHeatmap';
import { InsightsPanel } from './InsightsPanel';
import { KpiStrip } from './KpiStrip';
import { PhaseFunnel } from './PhaseFunnel';
import { WorkloadChart } from './WorkloadChart';

export function OverviewPage() {
  const { filtered, filters, setFilters, clearFilters, ctx, disciplineOrder } = useDashboard();
  const cutOff = useApp((s) => s.cutOff);
  const { open } = usePackageParam();
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const health = useMemo(() => disciplineHealth(filtered, disciplineOrder), [filtered, disciplineOrder]);
  const insights = useMemo(() => generateInsights({ metrics: filtered, ctx }), [filtered, ctx]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <KpiStrip kpis={kpis} dueSoonDays={ctx.dueSoonDays} activeFlags={filters.flags} onFilter={setFilters} />
      </ErrorBoundary>
      <ErrorBoundary label="AI Insights">
        <InsightsPanel insights={insights} metrics={filtered} onApply={setFilters} onOpenPackage={open} />
      </ErrorBoundary>
      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary label="Phase funnel">
          <PhaseFunnel metrics={filtered} onSelectPhase={(p) => setFilters({ phases: [p] })} />
        </ErrorBoundary>
        <ErrorBoundary label="Discipline health">
          <DisciplineGrid health={health.filter((h) => h.lines > 0)} />
        </ErrorBoundary>
      </div>
      <ErrorBoundary label="Khối lượng theo tháng">
        <WorkloadChart metrics={filtered} cutOff={cutOff} />
      </ErrorBoundary>
      <ErrorBoundary label="Facility × Tháng">
        <FacilityHeatmap metrics={filtered} />
      </ErrorBoundary>
    </Stagger>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/ui/overview && npm run typecheck`
Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/overview
git commit -m "feat: add overview page with KPIs, AI insights, funnel, health grid, workload and heatmap"
```

---

### Task 13: Discipline page and package drawer

**Files:**
- Create: `src/ui/discipline/PackageTable.tsx`, `src/ui/discipline/DisciplinePage.tsx`
- Create: `src/ui/package/MiniGantt.tsx`, `MilestoneTable.tsx`, `RosHistory.tsx`, `PackageDrawer.tsx`
- Test: `src/ui/discipline/discipline.test.tsx`

**Interfaces:**
- Consumes: `summarizePackages`, `computeKpis`, `PackageSummary` (Task 8); `milestoneSlip`, `effectiveDay`, `LineMetrics` (Task 6); `KpiStrip` (Task 12); primitives/hooks/palette (Task 11).
- Produces: `DisciplinePage` (route `discipline/:name`), `PackageDrawer` (opened by `?pkg=<code>` anywhere; shows every facility of the package regardless of filters).

- [ ] **Step 1: Write the failing test**

`src/ui/discipline/discipline.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { seedStore } from '../../test/seedStore';
import { PackageDrawer } from '../package/PackageDrawer';
import { DisciplinePage } from './DisciplinePage';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/discipline/:name',
        element: (
          <>
            <DisciplinePage />
            <PackageDrawer />
          </>
        ),
      },
      { path: '/', element: <p>overview</p> },
    ],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const codesInTable = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelector('td p')?.textContent);

beforeEach(seedStore);

describe('DisciplinePage', () => {
  it('lists packages riskiest first', () => {
    renderAt('/discipline/MECHANICAL');
    expect(codesInTable()).toEqual(['MEC-001', 'MEC-002', 'UNCODED-15']);
    expect(within(screen.getByRole('table')).getAllByRole('row')[1]).toHaveTextContent('▲ ROS');
  });

  it('sorts by a column and reverses on a second click', () => {
    renderAt('/discipline/MECHANICAL');
    fireEvent.click(screen.getByRole('button', { name: /^Package/ }));
    expect(codesInTable()).toEqual(['MEC-001', 'MEC-002', 'UNCODED-15']);
    fireEvent.click(screen.getByRole('button', { name: /^Package/ }));
    expect(codesInTable()).toEqual(['UNCODED-15', 'MEC-002', 'MEC-001']);
  });

  it('reports an unknown discipline', () => {
    renderAt('/discipline/NOPE');
    expect(screen.getByText(/Không tìm thấy discipline/)).toBeInTheDocument();
  });
});

describe('PackageDrawer', () => {
  it('shows milestones per facility and switches facility', () => {
    renderAt('/discipline/MECHANICAL?pkg=MEC-001');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Centrifugal Pump')).toBeInTheDocument();
    expect(within(dialog).getByText('MTO / TR Approval')).toBeInTheDocument();
    expect(within(dialog).getByRole('img', { name: 'Lịch sử điều chỉnh ROS' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /PS2R/ }));
    expect(within(dialog).getByText('Kiểm tra lại ROS')).toBeInTheDocument();
    expect(within(dialog).getByText('Không có lịch sử ROS.')).toBeInTheDocument();
  });

  it('closes with the close button', () => {
    const router = renderAt('/discipline/MECHANICAL?pkg=MEC-001');
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(router.state.location.search).not.toContain('pkg=');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/discipline`
Expected: FAIL — `Failed to resolve import "../package/PackageDrawer"`.

- [ ] **Step 3: Implement the discipline page**

`src/ui/discipline/PackageTable.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { PackageSummary } from '../../analytics/aggregate';
import { MILESTONE_BY_KEY, phaseIndex } from '../../data/milestones';
import { formatDay } from '../../lib/day';
import { FloatBadge, PhaseChip, StatusBadge } from '../common/Chip';

type SortKey = 'risk' | 'code' | 'phase' | 'next' | 'slip' | 'float';

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'code', label: 'Package' },
  { key: 'phase', label: 'Phase (kế hoạch)' },
  { key: 'next', label: 'Mốc tiếp theo' },
  { key: 'slip', label: 'Trượt max', className: 'text-right' },
  { key: 'float', label: 'ROS float', className: 'text-right' },
];

const COMPARE: Record<SortKey, (a: PackageSummary, b: PackageSummary) => number> = {
  risk: (a, b) => b.riskRank - a.riskRank || (a.minRosFloat ?? Infinity) - (b.minRosFloat ?? Infinity),
  code: (a, b) => a.code.localeCompare(b.code),
  phase: (a, b) => phaseIndex(a.scheduledPhase) - phaseIndex(b.scheduledPhase),
  next: (a, b) => (a.next?.day ?? Infinity) - (b.next?.day ?? Infinity),
  slip: (a, b) => (b.maxSlip ?? -Infinity) - (a.maxSlip ?? -Infinity),
  float: (a, b) => (a.minRosFloat ?? Infinity) - (b.minRosFloat ?? Infinity),
};

function riskClass(p: PackageSummary): string {
  if (p.rosAtRisk) return 'border-l-2 border-l-critical bg-critical/5';
  if (p.overdueCount > 0 || p.slipped) return 'border-l-2 border-l-warning';
  return 'border-l-2 border-l-transparent';
}

function NextCell({ p }: { p: PackageSummary }) {
  if (!p.next) return <span className="text-ink-3">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-ink">
        {MILESTONE_BY_KEY[p.next.key].short} · <span className="font-mono">{formatDay(p.next.day)}</span>
      </span>
      <StatusBadge status={p.next.status} />
    </div>
  );
}

/** Package list: sortable table on desktop, cards on phones. Riskiest first by default. */
export function PackageTable({ packages, onOpen }: { packages: PackageSummary[]; onOpen: (code: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'risk', dir: 1 });
  const rows = useMemo(() => [...packages].sort((a, b) => COMPARE[sort.key](a, b) * sort.dir), [packages, sort]);
  const toggle = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : 1 }));

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              {COLUMNS.map((c) => (
                <th key={c.key} className={`px-3 py-2 font-medium ${c.className ?? ''}`} aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => toggle(c.key)} className="hover:text-ink">
                    {c.label} {sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => setSort({ key: 'risk', dir: 1 })} className="hover:text-ink">
                  Rủi ro {sort.key === 'risk' ? '●' : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={`${p.discipline}|${p.code}`} onClick={() => onOpen(p.code)} className={`cursor-pointer border-b border-line/60 hover:bg-surface-2 ${riskClass(p)}`}>
                <td className="px-3 py-2">
                  <p className={`font-mono text-xs ${p.hasValidCode ? 'text-ai-1' : 'text-serious'}`}>{p.code}</p>
                  <p className="max-w-xs truncate text-ink" title={p.name}>
                    {p.name || '—'}
                  </p>
                  <p className="text-[11px] text-ink-3">{p.facilities.join(' · ')}</p>
                </td>
                <td className="px-3 py-2">
                  <PhaseChip phase={p.scheduledPhase} />
                  {p.currentPhase !== p.scheduledPhase && (
                    <p className="mt-1 text-[11px] text-ink-3" title="Phase theo mốc đã có Actual">
                      Actual: {p.currentPhase === 'delivered' ? 'Delivered' : <PhaseChip phase={p.currentPhase} muted />}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2">
                  <NextCell p={p} />
                </td>
                <td className="px-3 py-2 text-right font-mono">{p.maxSlip !== undefined && p.maxSlip > 0 ? <span className="text-serious">+{p.maxSlip}d</span> : '—'}</td>
                <td className="px-3 py-2 text-right">
                  <FloatBadge days={p.minRosFloat} />
                </td>
                <td className="px-3 py-2 text-xs">
                  {p.rosAtRisk && <span className="mr-1 text-critical">▲ ROS</span>}
                  {p.overdueCount > 0 && <span className="mr-1 text-serious">! {p.overdueCount} quá hạn</span>}
                  {p.slipped && !p.rosAtRisk && <span className="text-warning">● trượt</span>}
                  {p.riskRank === 0 && <span className="text-good">✓</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {rows.map((p) => (
          <li key={`${p.discipline}|${p.code}`}>
            <button type="button" onClick={() => onOpen(p.code)} className={`w-full rounded-xl border border-line bg-surface p-3 text-left ${riskClass(p)}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-ai-1">{p.code}</p>
                  <p className="truncate text-sm text-ink">{p.name || '—'}</p>
                </div>
                <FloatBadge days={p.minRosFloat} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <PhaseChip phase={p.scheduledPhase} />
                <NextCell p={p} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
```

`src/ui/discipline/DisciplinePage.tsx`:

```tsx
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { computeKpis, summarizePackages } from '../../analytics/aggregate';
import { Card, Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useDashboard } from '../hooks/useDashboard';
import { usePackageParam } from '../hooks/useFilters';
import { KpiStrip } from '../overview/KpiStrip';
import { PackageTable } from './PackageTable';

export function DisciplinePage() {
  const { name = '' } = useParams();
  const [params] = useSearchParams();
  const { filtered, filters, setFilters, clearFilters, ctx, disciplineOrder } = useDashboard();
  const { open } = usePackageParam();
  const lines = useMemo(() => filtered.filter((m) => m.line.discipline === name), [filtered, name]);
  const kpis = useMemo(() => computeKpis(lines), [lines]);
  const packages = useMemo(() => summarizePackages(lines), [lines]);
  const query = params.toString();

  if (!disciplineOrder.includes(name)) {
    return (
      <div className="px-4 py-16 text-center text-sm text-ink-2">
        Không tìm thấy discipline “{name}”.{' '}
        <Link to="/" className="text-ai-1 underline">
          Về tổng quan
        </Link>
      </div>
    );
  }

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <motion.div layoutId={`discipline-${name}`} className="flex flex-wrap items-center gap-3">
        <Link to={{ pathname: '/', search: query ? `?${query}` : '' }} className="text-sm text-ink-3 hover:text-ink">
          ← Tổng quan
        </Link>
        <h1 className="text-xl font-semibold tracking-wide">{name}</h1>
        <nav className="ml-auto flex flex-wrap gap-1 text-xs" aria-label="Discipline khác">
          {disciplineOrder
            .filter((d) => d !== name)
            .map((d) => (
              <Link key={d} to={{ pathname: `/discipline/${encodeURIComponent(d)}`, search: query ? `?${query}` : '' }} className="rounded-full border border-line px-2 py-1 text-ink-3 hover:text-ink">
                {d}
              </Link>
            ))}
        </nav>
      </motion.div>
      {lines.length === 0 ? (
        <EmptyFilterState onClear={clearFilters} />
      ) : (
        <>
          <KpiStrip kpis={kpis} dueSoonDays={ctx.dueSoonDays} activeFlags={filters.flags} onFilter={setFilters} />
          <ErrorBoundary label="Danh sách package">
            <Card title={`Packages (${packages.length})`} subtitle="Mặc định sắp theo rủi ro · bấm một dòng để xem chi tiết">
              <PackageTable packages={packages} onOpen={open} />
            </Card>
          </ErrorBoundary>
        </>
      )}
    </Stagger>
  );
}
```

- [ ] **Step 4: Implement the package drawer**

`src/ui/package/MiniGantt.tsx`:

```tsx
import { useMemo } from 'react';
import { effectiveDay, type LineMetrics } from '../../analytics/lineMetrics';
import { MILESTONES } from '../../data/milestones';
import { formatDay, formatMonth, monthKey, monthRange, monthBounds, type Day } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { milestoneStatusColor, phaseColor } from '../theme/palette';

/**
 * One row per facility. Hollow ring = plan, filled dot = forecast (colored by status), ✓ = actual.
 * Vertical lines mark the cut-off (cyan) and the line's ROS (red).
 */
export function MiniGantt({ lines, cutOff }: { lines: LineMetrics[]; cutOff: Day }) {
  const theme = useApp((s) => s.theme);

  const range = useMemo(() => {
    const days: Day[] = [cutOff];
    for (const m of lines) {
      if (m.line.ros !== undefined) days.push(m.line.ros);
      for (const d of Object.values(m.line.milestones)) {
        for (const v of [d?.plan, d?.forecast, d?.actual]) if (v !== undefined) days.push(v);
      }
    }
    const min = Math.min(...days);
    const max = Math.max(...days);
    const from = monthBounds(monthKey(min)).from;
    const to = monthBounds(monthKey(max)).to;
    return { from, to, span: Math.max(1, to - from) };
  }, [lines, cutOff]);

  const pos = (d: Day) => `${((d - range.from) / range.span) * 100}%`;
  const months = monthRange(monthKey(range.from), monthKey(range.to));
  const tickEvery = Math.max(1, Math.ceil(months.length / 8));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="relative ml-28 h-5 text-[10px] text-ink-3">
          {months.map((mk, i) =>
            i % tickEvery === 0 ? (
              <span key={mk} className="absolute -translate-x-1/2" style={{ left: pos(monthBounds(mk).from) }}>
                {formatMonth(mk)}
              </span>
            ) : null,
          )}
        </div>
        {lines.map((m) => (
          <div key={m.line.id} className="flex items-center border-t border-line/60 py-2">
            <div className="w-28 shrink-0 truncate pr-2 text-xs text-ink-2" title={m.line.facility}>
              {m.line.facility}
            </div>
            <div className="relative h-8 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
              <div className="absolute inset-y-0 w-0.5 bg-ai-1" style={{ left: pos(cutOff) }} title={`Cut-off ${formatDay(cutOff)}`} />
              {m.line.ros !== undefined && (
                <div className="absolute inset-y-0 w-0.5 bg-critical" style={{ left: pos(m.line.ros) }} title={`ROS ${formatDay(m.line.ros)}`} />
              )}
              {MILESTONES.map((def) => {
                const d = m.line.milestones[def.key];
                if (!d) return null;
                const status = m.status[def.key] ?? 'noDate';
                const shown = effectiveDay(d);
                const tip = `${def.label}\nPlan: ${formatDay(d.plan)}\nForecast: ${formatDay(d.forecast)}\nActual: ${formatDay(d.actual)}`;
                return (
                  <div key={def.key}>
                    {d.plan !== undefined && d.plan !== shown && (
                      <span
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent"
                        style={{ left: pos(d.plan), borderColor: phaseColor(def.phase, theme) }}
                        title={tip}
                      />
                    )}
                    {shown !== undefined && (
                      <span
                        className="absolute top-1/2 grid h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[8px] font-bold text-white ring-2 ring-bg"
                        style={{ left: pos(shown), background: status === 'future' ? phaseColor(def.phase, theme) : milestoneStatusColor(status, theme) }}
                        title={tip}
                      >
                        {d.actual !== undefined ? '✓' : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-3">
          <span>○ Plan</span>
          <span>● Forecast (màu phase / trạng thái)</span>
          <span>✓ Actual</span>
          <span className="text-ai-1">│ Cut-off</span>
          <span className="text-critical">│ ROS</span>
        </p>
      </div>
    </div>
  );
}
```

`src/ui/package/MilestoneTable.tsx`:

```tsx
import { milestoneSlip, type LineMetrics } from '../../analytics/lineMetrics';
import { MILESTONES } from '../../data/milestones';
import { formatDay } from '../../lib/day';
import { StatusBadge } from '../common/Chip';

/** Plan / Forecast / Actual / Δ for every milestone of one line. */
export function MilestoneTable({ metrics }: { metrics: LineMetrics }) {
  const rows = MILESTONES.filter((def) => metrics.line.milestones[def.key]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-xs">
        <thead>
          <tr className="border-b border-line text-left text-ink-3">
            <th className="py-1.5 pr-2 font-medium">Mốc</th>
            <th className="px-2 font-medium">Plan</th>
            <th className="px-2 font-medium">Forecast</th>
            <th className="px-2 font-medium">Actual</th>
            <th className="px-2 text-right font-medium">Δ ngày</th>
            <th className="pl-2 font-medium">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((def) => {
            const d = metrics.line.milestones[def.key]!;
            const slip = milestoneSlip(d);
            return (
              <tr key={def.key} className="border-b border-line/50">
                <td className="py-1.5 pr-2 text-ink">{def.label}</td>
                <td className="px-2 font-mono text-ink-2">{formatDay(d.plan)}</td>
                <td className="px-2 font-mono text-ink">{formatDay(d.forecast)}</td>
                <td className="px-2 font-mono text-good">{d.actual !== undefined ? formatDay(d.actual) : ''}</td>
                <td className={`px-2 text-right font-mono ${slip && slip > 0 ? 'text-serious' : slip && slip < 0 ? 'text-good' : 'text-ink-3'}`}>
                  {slip ? `${slip > 0 ? '+' : ''}${slip}` : '0'}
                </td>
                <td className="pl-2">
                  <StatusBadge status={metrics.status[def.key] ?? 'noDate'} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

`src/ui/package/RosHistory.tsx`:

```tsx
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { Line } from '../../data/types';
import { dayToISO, formatDay } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

const MS_PER_DAY = 86_400_000;

/** Step line of ROS across the ED revisions (Old ED → latest ED). */
export function RosHistory({ line }: { line: Line }) {
  const theme = useApp((s) => s.theme);
  const ink = CHART_INK[theme];
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p) => {
          const item = (p as { dataIndex: number }[])[0];
          const point = line.rosHistory[item.dataIndex];
          return `${point.label}<br/><b>${formatDay(point.day)}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: line.rosHistory.map((p) => p.label.replace(/\s*\(.*\)$/, '')),
        axisLabel: { color: ink.muted, fontSize: 10, interval: 0, rotate: 20 },
      },
      yAxis: {
        type: 'time',
        scale: true,
        axisLabel: { color: ink.muted, formatter: (v: number) => dayToISO(Math.floor(v / MS_PER_DAY)).slice(0, 7) },
        splitLine: { lineStyle: { color: ink.grid } },
      },
      series: [
        {
          type: 'line',
          step: 'end',
          symbolSize: 8,
          lineStyle: { width: 2, color: CATEGORICAL[theme][0] },
          itemStyle: { color: CATEGORICAL[theme][0], borderColor: ink.surface, borderWidth: 2 },
          data: line.rosHistory.map((p) => p.day * MS_PER_DAY),
        },
      ],
    }),
    [line, ink, theme],
  );
  if (line.rosHistory.length < 2) return <p className="text-xs text-ink-3">Không có lịch sử ROS.</p>;
  return <EChart ariaLabel="Lịch sử điều chỉnh ROS" height={180} option={option} />;
}
```

`src/ui/package/PackageDrawer.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { summarizePackages } from '../../analytics/aggregate';
import { formatDay } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { FloatBadge, PhaseChip } from '../common/Chip';
import { Drawer } from '../common/Drawer';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { usePackageParam } from '../hooks/useFilters';
import { MilestoneTable } from './MilestoneTable';
import { MiniGantt } from './MiniGantt';
import { RosHistory } from './RosHistory';

/** Package detail, opened with `?pkg=<code>` from any view. Shows all facilities regardless of filters. */
export function PackageDrawer() {
  const { code, close } = usePackageParam();
  const metrics = useApp((s) => s.metrics);
  const cutOff = useApp((s) => s.cutOff);
  const [facility, setFacility] = useState<string | undefined>();
  const pkg = useMemo(() => (code ? summarizePackages(metrics.filter((m) => m.line.packageCode === code))[0] : undefined), [code, metrics]);
  const selected = pkg?.lines.find((m) => m.line.facility === facility) ?? pkg?.lines[0];

  return (
    <Drawer
      open={code !== undefined}
      onClose={() => {
        setFacility(undefined);
        close();
      }}
      title={
        pkg ? (
          <div>
            <p className="font-mono text-xs text-ai-1">
              {pkg.code} · {pkg.discipline}
            </p>
            <h2 className="text-base font-semibold">{pkg.name || '—'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <PhaseChip phase={pkg.scheduledPhase} />
              <span className="text-ink-3">{pkg.lines[0].line.itemType}</span>
              <span className="text-ink-3">ROS float min</span>
              <FloatBadge days={pkg.minRosFloat} />
            </div>
          </div>
        ) : (
          <h2 className="text-base font-semibold">Không tìm thấy package “{code}”</h2>
        )
      }
    >
      {pkg && selected && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-3 uppercase">Tiến độ theo facility</h3>
            <ErrorBoundary label="Gantt">
              <MiniGantt lines={pkg.lines} cutOff={cutOff} />
            </ErrorBoundary>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">Chi tiết mốc</h3>
              <div className="flex flex-wrap gap-1">
                {pkg.lines.map((m) => (
                  <button
                    key={m.line.id}
                    type="button"
                    onClick={() => setFacility(m.line.facility)}
                    aria-pressed={m === selected}
                    className={`rounded-full border px-2 py-0.5 text-xs ${m === selected ? 'border-ai-1 bg-ai-1/15 text-ai-1' : 'border-line text-ink-2'}`}
                  >
                    {m.line.facility}
                    {m.rosAtRisk && <span className="ml-1 text-critical">▲</span>}
                  </button>
                ))}
              </div>
            </div>
            <dl className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">ROS</dt>
                <dd className="font-mono">{formatDay(selected.line.ros)}</dd>
              </div>
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">ROS float</dt>
                <dd>
                  <FloatBadge days={selected.rosFloat} />
                </dd>
              </div>
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">Delivery</dt>
                <dd className="font-mono">{selected.line.deliveryWeeks ?? '—'} tuần</dd>
              </div>
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">Dòng trong sheet</dt>
                <dd className="font-mono">{selected.line.sourceRow}</dd>
              </div>
            </dl>
            <MilestoneTable metrics={selected} />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-3 uppercase">Lịch sử ROS ({selected.line.facility})</h3>
            <ErrorBoundary label="Lịch sử ROS">
              <RosHistory line={selected.line} />
            </ErrorBoundary>
          </section>

          {selected.line.remark && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">Remark</h3>
              <p className="rounded-lg border border-line bg-surface p-3 text-sm whitespace-pre-line text-ink-2">{selected.line.remark}</p>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/ui/discipline && npm run typecheck`
Expected: 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ui/discipline src/ui/package
git commit -m "feat: add discipline page with risk-sorted package table and package drawer"
```

---

### Task 14: App shell, routing and entry point

**Files:**
- Create: `src/ui/shell/AskBox.tsx`, `Header.tsx`, `FilterBar.tsx`, `AppShell.tsx`
- Create: `src/ui/states/LoadingScreen.tsx`, `src/ui/states/ErrorScreen.tsx`, `src/ui/health/DataHealthPanel.tsx`
- Create: `src/App.tsx`
- Modify: `src/main.tsx` (replace the Task 1 placeholder)
- Test: `src/ui/app.test.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces: `routes` (exported for tests), `App`. `AppShell` starts `load()` once, applies `data-theme` to `<html>`, sets `document.title` from `appName`, and shows loading → error → dashboard.

- [ ] **Step 1: Write the failing test**

`src/ui/app.test.tsx`:

```tsx
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../App';
import { appStore } from '../store/appStore';
import { seedStore } from '../test/seedStore';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('./charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(seedStore);

describe('dashboard app', () => {
  it('renders the shell and the overview', () => {
    renderAt('/');
    expect(screen.getByText('PMS - PEIW')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask PMS - PEIW/)).toBeInTheDocument();
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe(appStore.getState().theme);
  });

  it('filters through a KPI tile and shows the row count', () => {
    const router = renderAt('/');
    fireEvent.click(screen.getByRole('button', { name: /ROS at risk/ }));
    expect(router.state.location.search).toContain('flag=rosRisk');
    expect(screen.getAllByText((_, el) => el?.textContent === '1 / 6 dòng').length).toBeGreaterThan(0);
  });

  it('drills into a discipline and opens a package drawer', () => {
    const router = renderAt('/');
    fireEvent.click(screen.getByRole('link', { name: /MECHANICAL/ }));
    expect(router.state.location.pathname).toBe('/discipline/MECHANICAL');
    fireEvent.click(within(screen.getByRole('table')).getByText('Centrifugal Pump'));
    expect(router.state.location.search).toContain('pkg=MEC-001');
    expect(within(screen.getByRole('dialog')).getByText('Chi tiết mốc')).toBeInTheDocument();
  });

  it('toggles the theme', () => {
    renderAt('/');
    const before = appStore.getState().theme;
    fireEvent.click(screen.getByRole('button', { name: /Chuyển sang giao diện/ }));
    expect(appStore.getState().theme).not.toBe(before);
    expect(document.documentElement.dataset.theme).toBe(appStore.getState().theme);
  });

  it('shows the error screen when loading failed', () => {
    act(() => {
      appStore.setState({ status: 'error', plan: undefined, metrics: [], error: { title: 'Không tải được dữ liệu', message: 'denied', code: 'ACCESS_DENIED' } });
    });
    renderAt('/');
    expect(screen.getByText('Không tải được dữ liệu')).toBeInTheDocument();
    expect(screen.getByText(/Anyone with the link/)).toBeInTheDocument();
  });

  it('opens Data Health with grouped warnings', () => {
    renderAt('/');
    fireEvent.click(screen.getByTitle('Data Health'));
    expect(screen.getByText('Package Code trống / bằng 0')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/app.test.tsx`
Expected: FAIL — `Failed to resolve import "../App"`.

- [ ] **Step 3: Implement the shell pieces**

`src/ui/shell/AskBox.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { describeSearch, parseSearch, type SearchVocabulary } from '../../analytics/search';

interface AskBoxProps {
  value: string;
  vocab: SearchVocabulary;
  onChange: (q: string) => void;
}

/** "Ask PMS - PEIW" — smart search today, the LLM entry point later. */
export function AskBox({ value, vocab, onChange }: AskBoxProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  const understood = useMemo(() => (draft.trim() ? describeSearch(parseSearch(draft, vocab)) : []), [draft, vocab]);

  return (
    <div className="w-full">
      <label className="ai-border flex h-10 items-center gap-2 rounded-xl px-3">
        <span aria-hidden className="ai-text text-lg">✦</span>
        <span className="sr-only">Tìm kiếm thông minh</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask PMS - PEIW…  ví dụ: PS2R LOA Q2-2027"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        {draft && (
          <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setDraft('')} className="text-ink-3 hover:text-ink">
            ✕
          </button>
        )}
        <span title="Hỏi đáp bằng AI sẽ có ở phiên bản sau" className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-3 md:inline">
          AI chat · sắp ra mắt
        </span>
      </label>
      {understood.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-ink-3">
          Hiểu là:
          {understood.map((u) => (
            <span key={u} className="rounded bg-ai-1/10 px-1.5 py-0.5 text-ai-1">
              {u}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
```

`src/ui/shell/Header.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { dayFromISO, dayToISO, todayDay } from '../../lib/day';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { useDashboard } from '../hooks/useDashboard';
import { AskBox } from './AskBox';

function timeAgo(date: Date, now = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function Header({ onOpenHealth }: { onOpenHealth: () => void }) {
  const appName = useApp((s) => s.config?.appName ?? 'PMS - PEIW');
  const projectName = useApp((s) => s.config?.projectName ?? '');
  const cutOff = useApp((s) => s.cutOff);
  const theme = useApp((s) => s.theme);
  const plan = useApp((s) => s.plan);
  const refreshing = useApp((s) => s.refreshing);
  const refreshError = useApp((s) => s.refreshError);
  const { filters, setFilters, vocab } = useDashboard();
  const { load, setCutOff, toggleTheme } = appStore.getState();
  const warningCount = plan?.warnings.filter((w) => w.level !== 'info').length ?? 0;

  return (
    <header
      className="sticky top-0 z-20 border-b border-line bg-bg/80 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="ai-border grid h-9 w-9 place-items-center rounded-xl text-lg">
            <span className="ai-text">◈</span>
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wide">{appName}</span>
            <span className="block text-[11px] text-ink-3">{projectName} · Procurement Intelligence</span>
          </span>
        </Link>

        <div className="order-last w-full lg:order-none lg:w-auto lg:flex-1 lg:max-w-xl">
          <AskBox value={filters.q} vocab={vocab} onChange={(q) => setFilters({ q })} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-ink-3">
            <span className="hidden sm:inline">Cut-off</span>
            <input
              type="date"
              value={dayToISO(cutOff)}
              onChange={(e) => {
                const day = dayFromISO(e.target.value);
                if (day !== undefined) setCutOff(day);
              }}
              className="h-9 rounded-lg border border-line bg-surface px-2 font-mono text-xs text-ink"
            />
          </label>
          {cutOff !== todayDay() && (
            <button type="button" className="text-xs text-ai-1 underline" onClick={() => setCutOff(todayDay())}>
              Hôm nay
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            title={refreshError ? refreshError.message : 'Tải lại dữ liệu'}
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs ${
              refreshError ? 'border-serious/50 text-serious' : 'border-line text-ink-2 hover:text-ink'
            }`}
          >
            <span aria-hidden className={refreshing ? 'animate-spin' : ''}>⟳</span>
            <span className="hidden sm:inline">
              {refreshing ? 'Đang đồng bộ…' : refreshError ? 'Dữ liệu cũ' : plan ? `Đồng bộ ${timeAgo(plan.loadedAt)}` : ''}
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
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            className="grid h-9 w-9 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </div>
    </header>
  );
}
```

`src/ui/shell/FilterBar.tsx`:

```tsx
import { useState } from 'react';
import { isEmptyFilters, type Filters, type Flag } from '../../analytics/filters';
import { LINE_PHASE_LABEL, LINE_PHASE_ORDER } from '../../data/milestones';
import type { ItemType } from '../../data/types';
import { MultiSelect } from '../common/MultiSelect';
import { useDashboard } from '../hooks/useDashboard';

const FLAG_LABEL: Record<Flag, string> = {
  rosRisk: 'Nguy cơ trễ ROS',
  slipped: 'Forecast trễ Plan',
  overdue: 'Có mốc quá hạn',
  dueSoon: 'Có mốc sắp đến hạn',
};

function Controls() {
  const { filters, setFilters, clearFilters, vocab, filtered, metrics } = useDashboard();
  const set = <K extends keyof Filters>(key: K) => (value: Filters[K]) => setFilters({ [key]: value } as Partial<Filters>);
  return (
    <>
      <MultiSelect label="Discipline" options={vocab.disciplines.map((d) => ({ value: d, label: d }))} selected={filters.disciplines} onChange={set('disciplines')} />
      <MultiSelect label="Facility" options={vocab.facilities.map((f) => ({ value: f, label: f }))} selected={filters.facilities} onChange={set('facilities')} />
      <MultiSelect<ItemType>
        label="Tagged/Bulk"
        options={[
          { value: 'Tagged', label: 'Tagged' },
          { value: 'Bulk', label: 'Bulk' },
        ]}
        selected={filters.itemTypes}
        onChange={set('itemTypes')}
      />
      <MultiSelect label="Phase (kế hoạch)" options={LINE_PHASE_ORDER.map((p) => ({ value: p, label: LINE_PHASE_LABEL[p] }))} selected={filters.phases} onChange={set('phases')} />
      <MultiSelect<Flag> label="Cảnh báo" options={(Object.keys(FLAG_LABEL) as Flag[]).map((f) => ({ value: f, label: FLAG_LABEL[f] }))} selected={filters.flags} onChange={set('flags')} />
      <span className="ml-auto text-xs text-ink-3">
        <span className="font-mono text-ink">{filtered.length}</span> / {metrics.length} dòng
      </span>
      {!isEmptyFilters(filters) && (
        <button type="button" onClick={clearFilters} className="text-xs text-ai-1 underline">
          Xóa bộ lọc
        </button>
      )}
    </>
  );
}

/** Sticky filter row on desktop; a "Bộ lọc" button opening a bottom sheet on phones. */
export function FilterBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { filters } = useDashboard();
  const activeCount =
    filters.disciplines.length + filters.facilities.length + filters.itemTypes.length + filters.phases.length + filters.flags.length;

  return (
    <div className="border-b border-line bg-bg/60 backdrop-blur-md">
      <div className="mx-auto hidden max-w-[1600px] flex-wrap items-center gap-2 px-4 py-2 md:flex">
        <Controls />
      </div>
      <div className="flex items-center justify-between px-4 py-2 md:hidden">
        <button type="button" onClick={() => setSheetOpen(true)} className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm">
          Bộ lọc {activeCount > 0 && <span className="rounded bg-ai-1/20 px-1.5 font-mono text-xs text-ai-1">{activeCount}</span>}
        </button>
      </div>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div
            className="absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 rounded-t-2xl border-t border-line bg-bg p-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
          >
            <Controls />
            <button type="button" onClick={() => setSheetOpen(false)} className="mt-2 w-full rounded-lg bg-ai-1/20 py-2 text-sm text-ai-1">
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

`src/ui/states/LoadingScreen.tsx`:

```tsx
import { motion } from 'motion/react';
import type { LoadStep } from '../../store/appStore';
import { useApp } from '../../store/useApp';

const STEPS: { key: Exclude<LoadStep, 'done'>; label: string }[] = [
  { key: 'config', label: 'Đọc cấu hình' },
  { key: 'fetch', label: 'Đồng bộ dữ liệu từ nguồn' },
  { key: 'parse', label: 'Phân tích cấu trúc Procurement Plan' },
  { key: 'analyze', label: 'Phát hiện rủi ro & tạo insight' },
];

/** Real pipeline progress (not a fake timer) over scanning skeletons. */
export function LoadingScreen() {
  const step = useApp((s) => s.step);
  const detail = useApp((s) => s.stepDetail);
  const current = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="ai-border mx-auto mb-6 max-w-md rounded-2xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span className="ai-text text-lg">✦</span> Đang chuẩn bị dashboard…
        </p>
        <ol className="space-y-2 text-sm">
          {STEPS.map((s, i) => (
            <motion.li key={s.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i <= current ? 1 : 0.4, x: 0 }} className="flex items-center gap-2">
              <span className={`font-mono text-xs ${i < current ? 'text-good' : i === current ? 'text-ai-1' : 'text-ink-3'}`}>
                {i < current ? '✓' : i === current ? '›' : '·'}
              </span>
              <span className={i === current ? 'text-ink' : 'text-ink-2'}>
                {s.label}
                {i === current && detail ? ` (${detail})` : ''}
                {i === current && '…'}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="scan h-24 rounded-2xl border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="scan h-64 rounded-2xl border border-line bg-surface" />
        <div className="scan h-64 rounded-2xl border border-line bg-surface" />
      </div>
    </div>
  );
}
```

`src/ui/states/ErrorScreen.tsx`:

```tsx
import { appStore, type LoadError } from '../../store/appStore';

const HINTS: Record<string, string> = {
  NETWORK: 'Máy của bạn cần truy cập được docs.google.com và *.googleusercontent.com.',
  ACCESS_DENIED: 'Nhờ chủ sheet bật chia sẻ "Anyone with the link" (hoặc Publish to web) rồi thử lại.',
  NOT_FOUND: 'Kiểm tra lại dataSource.url trong config.json trên server.',
  CONFIG: 'Sửa file config.json cạnh index.html trên server rồi tải lại trang.',
  MISSING_COLUMNS: 'Có thể tiêu đề cột trong sheet đã bị đổi tên. So sánh với cấu trúc chuẩn trong tài liệu.',
};

export function ErrorScreen({ error }: { error: LoadError }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        ⚠
      </p>
      <h1 className="mt-3 text-lg font-semibold">{error.title}</h1>
      <p className="mt-2 text-sm text-ink-2">{error.message}</p>
      {HINTS[error.code] && <p className="mt-2 text-xs text-ink-3">{HINTS[error.code]}</p>}
      <p className="mt-1 font-mono text-[10px] text-ink-3">mã lỗi: {error.code}</p>
      <button type="button" onClick={() => void appStore.getState().load()} className="mt-5 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1 hover:bg-ai-1/30">
        Thử lại
      </button>
    </div>
  );
}
```

`src/ui/health/DataHealthPanel.tsx`:

```tsx
import { useMemo } from 'react';
import type { DataWarning, WarningCode } from '../../data/types';
import { useApp } from '../../store/useApp';
import { Drawer } from '../common/Drawer';

const CODE_LABEL: Record<WarningCode, string> = {
  INVALID_PACKAGE_CODE: 'Package Code trống / bằng 0',
  MISSING_FACILITY: 'Thiếu Facility',
  INCOMPLETE_TRIPLET: 'Thiếu dòng FORECAST/ACTUAL',
  ORPHAN_ROW: 'Dòng FORECAST/ACTUAL lạc',
  UNKNOWN_ROW_TYPE: 'Giá trị cột Date lạ',
  INVALID_DATE: 'Ô ngày không hợp lệ (#####, 00/Jan/00…)',
  UNKNOWN_COLUMN: 'Cột không nhận diện',
  NO_DISCIPLINE: 'Dòng nằm ngoài discipline',
};

const LEVEL_TONE: Record<DataWarning['level'], string> = { error: 'text-critical', warn: 'text-serious', info: 'text-ink-3' };

export function DataHealthPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plan = useApp((s) => s.plan);
  const groups = useMemo(() => {
    const map = new Map<WarningCode, DataWarning[]>();
    for (const w of plan?.warnings ?? []) map.set(w.code, [...(map.get(w.code) ?? []), w]);
    return [...map];
  }, [plan]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="sm:max-w-xl"
      title={
        <div>
          <h2 className="text-base font-semibold">Data Health</h2>
          <p className="text-xs text-ink-3">Các vấn đề chất lượng dữ liệu phát hiện khi đọc sheet. App vẫn hiển thị các dòng này.</p>
        </div>
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-good">✓ Không phát hiện vấn đề nào.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([code, items]) => (
            <details key={code} className="rounded-xl border border-line bg-surface p-3" open={items.length <= 5}>
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className={LEVEL_TONE[items[0].level]}>{CODE_LABEL[code]}</span>
                <span className="font-mono text-xs text-ink-3">{items.length}</span>
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-ink-2">
                {items.map((w, i) => (
                  <li key={`${w.row ?? 'x'}-${i}`} className="flex gap-2">
                    {w.row !== undefined && <span className="w-14 shrink-0 font-mono text-ink-3">dòng {w.row}</span>}
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </Drawer>
  );
}
```

`src/ui/shell/AppShell.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { appStore } from '../../store/appStore';
import { useApp } from '../../store/useApp';
import { DataHealthPanel } from '../health/DataHealthPanel';
import { PackageDrawer } from '../package/PackageDrawer';
import { ErrorScreen } from '../states/ErrorScreen';
import { LoadingScreen } from '../states/LoadingScreen';
import { FilterBar } from './FilterBar';
import { Header } from './Header';

export function AppShell() {
  const status = useApp((s) => s.status);
  const error = useApp((s) => s.error);
  const theme = useApp((s) => s.theme);
  const appName = useApp((s) => s.config?.appName);
  const [healthOpen, setHealthOpen] = useState(false);

  useEffect(() => {
    if (appStore.getState().status === 'idle') void appStore.getState().load();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (appName) document.title = appName;
  }, [appName]);

  return (
    <div className="min-h-screen" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <Header onOpenHealth={() => setHealthOpen(true)} />
      {status === 'ready' && <FilterBar />}
      <main>
        {status === 'error' && error ? <ErrorScreen error={error} /> : status === 'ready' ? <Outlet /> : <LoadingScreen />}
      </main>
      {status === 'ready' && (
        <>
          <PackageDrawer />
          <DataHealthPanel open={healthOpen} onClose={() => setHealthOpen(false)} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire routing and the entry point**

`src/App.tsx`:

```tsx
import { createHashRouter, RouterProvider } from 'react-router-dom';
import { DisciplinePage } from './ui/discipline/DisciplinePage';
import { OverviewPage } from './ui/overview/OverviewPage';
import { AppShell } from './ui/shell/AppShell';

/** Hash routing: works from any static host path without server rewrites. */
export const routes = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'discipline/:name', element: <DisciplinePage /> },
    ],
  },
];

const router = createHashRouter(routes);

export function App() {
  return <RouterProvider router={router} />;
}
```

Replace `src/main.tsx` entirely:

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

document.documentElement.dataset.theme = 'dark';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Run the full suite, typecheck and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: all tests PASS (1 skipped: reconciliation); build output includes separate `xlsx-*.js`, `echarts-*.js`, `vendor-*.js` chunks and no chunk-size warning.

- [ ] **Step 6: Try it against the real sheet**

Run: `npm run dev` and open `http://localhost:5173`.
Expected: loading steps appear, then the Overview shows about 141 packages / 573 lines, a critical insight about ROS risk concentrated in PIPELINE, and the PIPELINE tile flagged "Theo dõi". (Numbers move as the sheet changes.)

- [ ] **Step 7: Commit**

```bash
git add src/ui/shell src/ui/states src/ui/health src/ui/app.test.tsx src/App.tsx src/main.tsx
git commit -m "feat: add app shell with smart search, filters, loading/error states and Data Health"
```

---

### Task 15: Offline server and release packaging

**Files:**
- Create: `server/app.ts`, `server/index.ts`, `scripts/build-release.mjs`, `docs/deploy.md`, `README.md`
- Test: `server/app.test.ts`

**Interfaces:**
- Produces: `buildServer({ publicDir, configPath, logger? }): FastifyInstance` with `GET /config.json` (re-read per request, `no-store`), `GET /healthz`, static files (`assets/` immutable, everything else `no-cache`). `release/` = `server.cjs` + `public/` + `config.json` + `README-deploy.md`.

Note: with `@fastify/static` v10 the `setHeaders` callback receives a Fastify reply — use `res.header(...)`, not `res.setHeader(...)`.

- [ ] **Step 1: Write the failing test**

`server/app.test.ts`:

```ts
// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildServer } from './app';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-peiw-'));
  fs.mkdirSync(path.join(dir, 'public', 'assets'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'public', 'index.html'), '<!doctype html><title>PMS - PEIW</title>');
  fs.writeFileSync(path.join(dir, 'public', 'assets', 'app-abc123.js'), 'console.log(1)');
  fs.writeFileSync(path.join(dir, 'config.json'), '{"appName":"PMS - PEIW"}');
});

afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const make = () => buildServer({ publicDir: path.join(dir, 'public'), configPath: path.join(dir, 'config.json') });

describe('server', () => {
  it('serves index.html without long caching', async () => {
    const res = await make().inject({ method: 'GET', url: '/' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('PMS - PEIW');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('serves hashed assets with immutable caching', async () => {
    const res = await make().inject({ method: 'GET', url: '/assets/app-abc123.js' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });

  it('serves the live config.json uncached, re-read on each request', async () => {
    const app = make();
    const first = await app.inject({ method: 'GET', url: '/config.json' });
    expect(first.json()).toEqual({ appName: 'PMS - PEIW' });
    expect(first.headers['cache-control']).toBe('no-store');
    fs.writeFileSync(path.join(dir, 'config.json'), '{"appName":"Renamed"}');
    const second = await app.inject({ method: 'GET', url: '/config.json' });
    expect(second.json()).toEqual({ appName: 'Renamed' });
  });

  it('reports a missing config.json', async () => {
    fs.rmSync(path.join(dir, 'config.json'));
    const res = await make().inject({ method: 'GET', url: '/config.json' });
    expect(res.statusCode).toBe(500);
  });

  it('answers the health check', async () => {
    const res = await make().inject({ method: 'GET', url: '/healthz' });
    expect(res.json()).toEqual({ ok: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run server`
Expected: FAIL — `Failed to resolve import "./app"`.

- [ ] **Step 3: Implement the server**

`server/app.ts`:

```ts
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';

export interface ServerOptions {
  /** Folder holding the built front-end (index.html + assets/). */
  publicDir: string;
  /** Path of the editable config.json served to the browser. */
  configPath: string;
  logger?: boolean;
}

/** Static host for the dashboard. Extension points for v2 (/api/data) and v3 (/api/ask) go here. */
export function buildServer({ publicDir, configPath, logger = false }: ServerOptions): FastifyInstance {
  const app = Fastify({ logger });

  // Read on every request so admins can edit config.json without a restart.
  app.get('/config.json', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    try {
      const raw = await fs.promises.readFile(configPath, 'utf8');
      return reply.type('application/json').send(raw);
    } catch {
      return reply.code(500).send({ error: `Không đọc được ${path.basename(configPath)} trên server` });
    }
  });

  app.get('/healthz', async () => ({ ok: true }));

  app.register(fastifyStatic, {
    root: publicDir,
    index: ['index.html'],
    setHeaders(res, filePath) {
      const hashedAsset = filePath.includes(`${path.sep}assets${path.sep}`);
      res.header('Cache-Control', hashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  return app;
}
```

`server/index.ts`:

```ts
import fs from 'node:fs';
import path from 'node:path';
import { buildServer } from './app';

// In the release bundle this file sits next to public/ and config.json.
const baseDir = path.dirname(process.argv[1] ?? '.');
const publicDir = path.resolve(baseDir, 'public');
const configPath = path.resolve(baseDir, 'config.json');

function readPort(): number {
  if (process.env.PORT) return Number(process.env.PORT);
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { port?: unknown };
    if (typeof config.port === 'number') return config.port;
  } catch {
    // Fall through to the default; the browser will report a broken config.
  }
  return 8080;
}

const app = buildServer({ publicDir, configPath, logger: true });
const port = readPort();
app.listen({ port, host: '0.0.0.0' }).catch((error: unknown) => {
  app.log.error(error);
  process.exit(1);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run server && npm run typecheck`
Expected: 5 tests PASS.

- [ ] **Step 5: Add release packaging and docs**

`scripts/build-release.mjs`:

```js
// Package an offline-ready release: release/{server.cjs, public/, config.json, README-deploy.md}.
// Run after `vite build`. The server needs only Node.js — no npm install on the target machine.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, 'release');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

await build({
  entryPoints: [path.join(root, 'server', 'index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: path.join(out, 'server.cjs'),
  logLevel: 'info',
});

fs.cpSync(path.join(root, 'dist'), path.join(out, 'public'), { recursive: true });
// config.json lives next to server.cjs so admins edit one file; drop the copy Vite placed in dist.
fs.rmSync(path.join(out, 'public', 'config.json'), { force: true });
fs.copyFileSync(path.join(root, 'public', 'config.json'), path.join(out, 'config.json'));
fs.copyFileSync(path.join(root, 'docs', 'deploy.md'), path.join(out, 'README-deploy.md'));

console.log(`Release ready in ${path.relative(root, out)}/`);
```

`docs/deploy.md`:

````markdown
# PMS - PEIW — Triển khai trên server nội bộ (offline)

Server **không cần internet** và **không cần `npm install`**. Chỉ cần Node.js 20 trở lên.
Trình duyệt của người dùng phải truy cập được `docs.google.com` và `*.googleusercontent.com` (dữ liệu được tải trực tiếp từ Google Sheet).

## Nội dung gói release

```
release/
├── server.cjs          # Node server đã bundle sẵn mọi thư viện
├── config.json         # Cấu hình — sửa file này, không cần build lại
├── public/             # Giao diện đã build (index.html + assets/)
└── README-deploy.md    # Tài liệu này
```

## Tạo gói (trên máy có internet)

```bash
npm ci
npm run release
```

Copy toàn bộ thư mục `release/` lên server.

## Chạy

```bash
cd release
node server.cjs            # cổng lấy từ config.json ("port"), mặc định 8080
PORT=9000 node server.cjs  # hoặc đặt cổng bằng biến môi trường (Linux/macOS)
```

Windows PowerShell: `$env:PORT=9000; node server.cjs`

Kiểm tra: mở `http://<server>:8080/` và `http://<server>:8080/healthz` (trả `{"ok":true}`).

## Chạy như service

**Windows (NSSM):**

```powershell
nssm install PMS-PEIW "C:\Program Files\nodejs\node.exe" "D:\apps\pms-peiw\server.cjs"
nssm set PMS-PEIW AppDirectory "D:\apps\pms-peiw"
nssm start PMS-PEIW
```

**Linux (systemd)** — `/etc/systemd/system/pms-peiw.service`:

```ini
[Unit]
Description=PMS - PEIW dashboard
After=network.target

[Service]
WorkingDirectory=/opt/pms-peiw
ExecStart=/usr/bin/node /opt/pms-peiw/server.cjs
Restart=always

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable --now pms-peiw`

## config.json

| Khóa | Ý nghĩa |
|---|---|
| `appName` | Tên hiển thị trên header và tab trình duyệt |
| `projectName` | Tên dự án |
| `dataSource.type` | `google-sheet` (trình duyệt tải trực tiếp) hoặc `server` (dành cho v2) |
| `dataSource.url` | Link Google Sheet — dán link edit hoặc link `export?format=xlsx` đều được |
| `dataSource.sheetName` | Tên sheet dữ liệu (mặc định sheet đầu tiên) |
| `dueSoonDays` | Cửa sổ "sắp đến hạn", tính bằng ngày |
| `port` | Cổng server |

Sửa `config.json` rồi tải lại trang là có hiệu lực — không cần khởi động lại server.

## Sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| "Nguồn dữ liệu từ chối truy cập" | Sheet không còn chia sẻ "Anyone with the link". Bật lại chia sẻ. |
| "Không kết nối được tới nguồn dữ liệu" | Máy người dùng không ra được Google. Kiểm tra proxy/firewall. |
| "Thiếu cột bắt buộc" | Tiêu đề cột trong sheet bị đổi tên. Cột bắt buộc: `Package Code`, `Facility`, `Date`, và ít nhất một cột mốc. |
| Trang trắng sau khi cập nhật | Tải lại trang (Ctrl+F5). `index.html` không bị cache nên hiếm khi xảy ra. |
````

`README.md`:

````markdown
# PMS - PEIW

Dashboard kế hoạch mua sắm (Procurement Plan) cho dự án dầu khí. Đọc dữ liệu trực tiếp từ Google Sheet, trình bày tổng quan → discipline → package, kèm AI Insights dựa trên luật.

## Phát triển

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit + component tests
npm run typecheck
```

Dev server đọc `public/config.json`.

## Kiến trúc

```
src/
├── lib/day.ts            # Ngày dạng số nguyên, không phụ thuộc múi giờ
├── config/               # Đọc & kiểm tra config.json
├── data/
│   ├── milestones.ts     # Danh mục mốc & phase — sửa tên cột ở đây
│   ├── sources/          # DataSource: Google Sheet | Server (v2)
│   └── parser/           # Workbook → Plan (hàm thuần)
├── analytics/            # Chỉ số, lọc, tìm kiếm, tổng hợp, insight (hàm thuần)
│   └── insights/rules/   # Mỗi insight một file; đăng ký trong registry.ts
├── store/                # Zustand: tải dữ liệu, cut-off, theme; filter nằm trên URL
└── ui/                   # React: shell, overview, discipline, package drawer
server/                   # Fastify: phục vụ file tĩnh + config.json
```

Thêm insight: tạo file trong `src/analytics/insights/rules/`, thêm vào `INSIGHT_RULES`.
Đổi nguồn dữ liệu: sửa `dataSource` trong `config.json`.

## Triển khai

Xem [docs/deploy.md](docs/deploy.md).

## Tài liệu thiết kế

- Spec: `docs/superpowers/specs/2026-09-18-procurement-dashboard-design.md`
- Kế hoạch: `docs/superpowers/plans/2026-09-18-procurement-dashboard.md`
````

- [ ] **Step 6: Build and smoke-test the release**

Run:

```bash
npm run release
cd release && PORT=8123 node server.cjs
```

(PowerShell: `cd release; $env:PORT=8123; node server.cjs`)

In a second terminal:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8123/
curl -s http://localhost:8123/healthz
curl -s http://localhost:8123/config.json
```

Expected: `200`, `{"ok":true}`, and the config JSON. Stop the server afterwards.

- [ ] **Step 7: Commit**

```bash
git add server scripts docs/deploy.md README.md
git commit -m "feat: add offline Fastify server, release packaging and deployment guide"
```

---

### Task 16: Verification against real data and manual smoke test

**Files:** none created; fix anything found in the files it concerns.

- [ ] **Step 1: Full automated check**

Run: `npm test && npm run typecheck && npm run release`
Expected: all tests PASS (reconciliation skipped), no type errors, `release/` produced.

- [ ] **Step 2: Reconcile against the live sheet**

Download the export once to a git-ignored location and run the reconciliation test:

```bash
curl -sL -o export.xlsx "https://docs.google.com/spreadsheets/d/1oygbFq6v3j0NThuZ9Zmf8noHm5jwPr_YSvDvXHT8FPQ/export?format=xlsx"
RECONCILE_FILE=export.xlsx npx vitest run src/data/parser/reconcile.test.ts --reporter=verbose
```

(PowerShell: `$env:RECONCILE_FILE="export.xlsx"; npx vitest run src/data/parser/reconcile.test.ts --reporter=verbose`)

Expected: PASS, and the printed numbers match the sheet. As of 18-Sep-2026: 8 disciplines, `validPackages` 141, `lines` 573, `slipped` 7, `rosAtRisk` 4, warnings `INVALID_PACKAGE_CODE` 11, `MISSING_FACILITY` 3, `INVALID_DATE` 34, no `ORPHAN_ROW`/`INCOMPLETE_TRIPLET`. Delete `export.xlsx` afterwards (it is git-ignored, but keep the tree clean).

- [ ] **Step 3: Manual smoke test in a browser** (`node release/server.cjs`, open `http://localhost:8080`)

Check each item and note failures:

1. Loading panel walks through the four steps, then the dashboard appears in under 3 s on office network.
2. Dark theme by default; toggle switches to light and survives a reload.
3. KPI numbers count up; "ROS at risk" pulses at most three times; clicking it filters (URL gains `flag=rosRisk`, row counter updates).
4. Insight cards type their text; "Why?" lists evidence; clicking an evidence row opens the package drawer.
5. Phase funnel "Kế hoạch" / "Actual" toggle changes the bars; clicking a bar filters by phase.
6. Discipline tile → discipline page (layout animation), package table sorted by risk; header click sorts; rows with ROS risk have a red left border.
7. Package drawer: Gantt markers show tooltips; facility chips switch the milestone table; ROS history chart renders; Esc closes.
8. Ask box: `PS2R LOA 2027` shows the "Hiểu là" chips and filters; clearing restores.
9. Data Health lists invalid codes, missing facilities and invalid dates with sheet row numbers.
10. Change the cut-off date: KPIs and insights update; "Hôm nay" resets it.
11. Responsive: at ~400 px width the filter bar becomes "Bộ lọc" (bottom sheet), the package table becomes cards, the drawer is full screen, nothing scrolls horizontally except charts/tables.
12. OS "reduce motion" on: no count-up, no pulsing, no gradient spin.
13. Error path: set `dataSource.url` in `release/config.json` to `https://docs.google.com/spreadsheets/d/INVALID/export?format=xlsx`, reload → clear error screen with hint and "Thử lại"; restore the URL.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found in manual verification"
```

(Skip if nothing changed.)
