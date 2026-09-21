# Engineering Dashboard (Phase E) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Engineering placeholder with a dashboard built from the EMDR Google Sheet (KPI cards, Phase E stage timeline with drawer, stage funnel, discipline status, transmittal activity, discipline page, document drawer), and hide AI Insights + Facility heatmap on the Procurement overview.

**Architecture:** A pure parser (`parseEmdr`) turns the whole workbook into an `EmdrRegister`. Pure analytics (`docMetrics`, `stageProgress`, summaries) derive per-document stage state against the header cut-off. `src/modules/engineering/` wires store, filters (URL), a dashboard hook and the module definition; `src/ui/engineering/` holds Engineering-only components built from shared primitives (`Card`, `Stagger`, `AnimatedNumber`, `Drawer`, `EChart`, palette).

**Tech Stack:** React 19, TypeScript, Vite, react-router-dom 7 (hash router, lazy routes), Zustand 5, SheetJS `xlsx`, ECharts via `echarts-for-react`, motion, Tailwind 4, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-21-engineering-phase-e-design.md`

## Global Constraints

- Shared layout stays in `src/ui/shell/AppShell.tsx`; never rewrite the header or layout.
- Routes are declared only in `src/App.tsx` (`routes` array, `createHashRouter`).
- Every user-visible string goes through `t('key')` from `useT()`; every new key is added to **both** `src/i18n/en.ts` and `src/i18n/vi.ts` (the `Dictionary` type fails the build otherwise).
- Colours: only existing Tailwind token classes (`bg-bg`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-2`, `text-ink-3`, `border-line`, `text-good`, `text-warning`, `text-serious`, `text-critical`, `text-ai-1`…) and existing constants in `src/ui/theme/palette.ts`. No new hex colours.
- Style, file layout and naming follow `src/ui/overview/` and `src/ui/discipline/`.
- Stage mapping lives only in `src/data/engineering/stages.ts`.
- URL filter keys reuse `FILTER_KEYS` from `src/store/urlFilters.ts`: `discipline`, `facility`, `type` (document type), `phase` (stage), `flag`, `q`. Drawer keys `doc` and `stage` are not filter keys.
- Cut-off is the app-wide `useApp((s) => s.cutOff)`.
- Never `git add -A` / `git add .`; add the files you touched by path. Never delete untracked files you did not create.
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- Test command: `npx vitest run <path>`; full suite `npm test`; typecheck `npm run typecheck`.

## Refinements to the spec

- The Phase E timeline shows the three gated stages (Review, Commented, Final) as nodes; the Not-issued count appears in the timeline subtitle (a Not-issued node would have no plan/late data or drawer).
- `StageProgress` also carries `doneDue` (documents that are due and done) so the node can print "plan x / y".
- `ModuleSearch` gains optional `describe(q)` **and** `placeholderKey`, so the Engineering AskBox neither shows Procurement's "understood as" parsing nor its "PS2R LOA Q2-2027" example.
- Procurement tests that wait for the text `AI Insights` switch to `Phase funnel`; the two InsightsPanel behaviour tests move to a component-level test so the hidden panel stays covered.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/data/engineering/types.ts` | 1 | `EngDocument`, `EmdrRegister`, `StageKey`, `GatedStage`, `ClientCode` |
| `src/data/engineering/stages.ts` (+test) | 1 | Stage list, labels, plan-date field per stage, `stageOf` |
| `src/test/emdrFixture.ts` | 2 | Build EMDR-shaped workbooks for parser tests |
| `src/data/engineering/parseEmdr.ts` (+test) | 2 | Workbook → `EmdrRegister` + warnings |
| `src/data/types.ts`, `src/ui/health/DataHealthPanel.tsx` | 2 | New warning codes + labels |
| `src/test/engFixture.ts` | 3 | `doc()`, `sampleRegister()`, `ENG_CUTOFF` for analytics/UI tests |
| `src/analytics/engineering/docMetrics.ts` | 3 | Per-document stage checks (done/late/pending) |
| `src/analytics/engineering/stageProgress.ts` | 3 | Timeline data per gated stage |
| `src/analytics/engineering/summaries.ts` | 3 | `engKpis`, `disciplineStatus`, `transmittalActivity` |
| `src/analytics/engineering/engineering.test.ts` | 3 | Tests for the three files above |
| `src/modules/engineering/filters.ts` (+test) | 4 | URL ⇄ `EngFilters`, `applyEngFilters`, `engVocabulary`, `searchWords` |
| `src/modules/engineering/metrics.ts` (+test) | 4 | One-entry memo of `DocMetrics[]` |
| `src/modules/engineering/store.ts`, `module.ts`, `useEngDashboard.ts` | 5 | Loader, module definition, dashboard hook |
| `src/modules/types.ts`, `src/ui/shell/AskBox.tsx`, `src/ui/shell/Header.tsx` | 5 | Optional `describe` / `placeholderKey` on search |
| `src/ui/hooks/useFilters.ts` | 5 | Export `useDrawerParam` |
| `src/ui/engineering/params.ts` | 5 | `useDocParam`, `useStageParam` |
| `src/ui/engineering/EngKpiStrip.tsx`, `EngOverviewPage.tsx`, `engOverview.test.tsx` | 5–7 | Overview page |
| `src/ui/theme/palette.ts`, `src/ui/engineering/StageChip.tsx` | 6 | `stageColor`, stage chip |
| `src/ui/engineering/StageTimeline.tsx`, `StageProgressDrawer.tsx` | 6 | Timeline + drawer |
| `src/ui/engineering/StageFunnel.tsx`, `DisciplineStatusGrid.tsx`, `TransmittalChart.tsx` | 7 | Remaining overview blocks |
| `src/ui/engineering/DocumentTable.tsx`, `EngDisciplinePage.tsx`, `DocumentDrawer.tsx`, `engDiscipline.test.tsx` | 8 | Discipline page + document drawer |
| `src/ui/overview/OverviewPage.tsx`, `src/ui/overview/insightsPanel.test.tsx` | 9 | Hide Insights + heatmap |
| Deleted: `src/ui/engineering/EngineeringPage.tsx`, `src/ui/engineering/engineering.test.tsx`, `src/data/engineering/loadWorkbookSummary.ts`, `src/data/engineering/loadWorkbookSummary.test.ts` | 5 | Placeholder removal |

---

### Task 1: Engineering types and stage mapping

**Files:**
- Create: `src/data/engineering/types.ts`
- Create: `src/data/engineering/stages.ts`
- Test: `src/data/engineering/stages.test.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Produces: `StageKey`, `GatedStage`, `ClientCode`, `EngDocument`, `EmdrRegister` (types.ts); `STAGES`, `STAGE_KEYS`, `GATED_STAGES`, `STAGE_LABEL_KEY`, `STAGE_PLAN_FIELD`, `stageIndex(stage)`, `stageOf(doc)` (stages.ts); i18n keys `eng.stage.notIssued|review|commented|final`.

- [ ] **Step 1: Create the types**

`src/data/engineering/types.ts`:

```ts
import type { Day } from '../../lib/day';

/** Phase E steps of a deliverable, in order. */
export type StageKey = 'notIssued' | 'review' | 'commented' | 'final';

/** Steps that have a planned date and can therefore be late. */
export type GatedStage = Exclude<StageKey, 'notIssued'>;

/** Client review code: 1 approved, 2 approved with comments, 3–4 rejected / revise. */
export type ClientCode = 1 | 2 | 3 | 4;

/** One deliverable of the Engineering Master Deliverable Register. */
export interface EngDocument {
  /** Document number, unique after de-duplication. */
  id: string;
  title: string;
  /** Second part of the document number, e.g. `CLQ0`. */
  facility: string;
  /** Third part, e.g. `PIP`. */
  discipline: string;
  /** Fourth part, e.g. `ISO`. */
  docType: string;
  /** Label from the group row above the document, e.g. `Isometric`. */
  docTypeLabel?: string;
  /** Workbook tab the row came from. */
  sheet: string;
  rev: string;
  status?: string;
  code?: ClientCode;
  planIssue?: Day;
  deadlineComment?: Day;
  deadlineResponse?: Day;
  transmittal?: { no: string; date?: Day };
  remark?: string;
}

export interface EmdrRegister {
  documents: EngDocument[];
  /** Cut-off written on the Summary tab. */
  sheetCutOff?: Day;
  /** Grand total on the Summary tab. */
  summaryTotal?: number;
}
```

- [ ] **Step 2: Add the stage label keys**

In `src/i18n/en.ts`, add before the closing `} as const` (or the end of the object — keep the file's existing style, grouping under a `// Engineering (src/ui/engineering, src/modules/engineering).` comment):

```ts
  // Engineering (src/ui/engineering, src/modules/engineering).
  'eng.stage.notIssued': 'Not issued',
  'eng.stage.review': 'Review (IFI/IFR)',
  'eng.stage.commented': 'Commented (IFA)',
  'eng.stage.final': 'Final (IFC/IFU)',
```

In `src/i18n/vi.ts`, at the matching place:

```ts
  // Engineering (src/ui/engineering, src/modules/engineering).
  'eng.stage.notIssued': 'Chưa phát hành',
  'eng.stage.review': 'Đang review (IFI/IFR)',
  'eng.stage.commented': 'Đã có phản hồi (IFA)',
  'eng.stage.final': 'Hoàn tất (IFC/IFU)',
```

All later tasks append their `eng.*` keys to this same group in both files.

- [ ] **Step 3: Write the failing test**

`src/data/engineering/stages.test.ts`:

```ts
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
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/data/engineering/stages.test.ts`
Expected: FAIL — cannot resolve `./stages`.

- [ ] **Step 5: Implement `stages.ts`**

`src/data/engineering/stages.ts`:

```ts
import type { MessageKey } from '../../i18n/en';
import type { EngDocument, GatedStage, StageKey } from './types';

/**
 * Phase E steps. The project has no revision convention yet, so this file is the one place
 * to change when it does: the order here and the rules in `stageOf`.
 */
export const STAGES: readonly { key: StageKey; labelKey: MessageKey }[] = [
  { key: 'notIssued', labelKey: 'eng.stage.notIssued' },
  { key: 'review', labelKey: 'eng.stage.review' },
  { key: 'commented', labelKey: 'eng.stage.commented' },
  { key: 'final', labelKey: 'eng.stage.final' },
];

export const STAGE_KEYS: readonly StageKey[] = STAGES.map((s) => s.key);

export const GATED_STAGES: readonly GatedStage[] = ['review', 'commented', 'final'];

export const STAGE_LABEL_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s.labelKey])) as Record<StageKey, MessageKey>;

/** The planned date each gated stage is measured against. */
export const STAGE_PLAN_FIELD: Record<GatedStage, 'planIssue' | 'deadlineComment' | 'deadlineResponse'> = {
  review: 'planIssue',
  commented: 'deadlineComment',
  final: 'deadlineResponse',
};

export function stageIndex(stage: StageKey): number {
  return STAGE_KEYS.indexOf(stage);
}

const FINAL_STATUS = /issued for (construction|use)/i;
const REVIEW_STATUS = /issued for information/i;

/** Where a document stands, first matching rule wins (see the spec, §4.4). */
export function stageOf(doc: Pick<EngDocument, 'rev' | 'status' | 'code'>): StageKey {
  const rev = doc.rev.trim().toUpperCase();
  const status = doc.status?.trim() ?? '';
  if (FINAL_STATUS.test(status)) return 'final';
  if (/^[NV]/.test(rev)) return 'final';
  if (doc.code !== undefined || rev.startsWith('L')) return 'commented';
  if (/^[JKH]/.test(rev) || REVIEW_STATUS.test(status)) return 'review';
  return 'notIssued';
}
```

- [ ] **Step 6: Run the test and typecheck**

Run: `npx vitest run src/data/engineering/stages.test.ts` → PASS.
Run: `npm run typecheck` → no errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/engineering/types.ts src/data/engineering/stages.ts src/data/engineering/stages.test.ts src/i18n/en.ts src/i18n/vi.ts
git commit -m "feat(engineering): document types and Phase E stage mapping

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: EMDR parser

**Files:**
- Create: `src/test/emdrFixture.ts`
- Create: `src/data/engineering/parseEmdr.ts`
- Test: `src/data/engineering/parseEmdr.test.ts`
- Modify: `src/data/types.ts` (the `WarningCode` union)
- Modify: `src/ui/health/DataHealthPanel.tsx` (`CODE_LABEL_KEY`)
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `EngDocument`, `EmdrRegister`, `ClientCode` (Task 1); `isZip` from `src/data/parser/parsePlan.ts`; `ParseFailure` from `src/store/moduleStore.ts`; `DataWarning` from `src/data/types.ts`; `dayFromExcelSerial`, `dayFromYMD`, `formatDay`, `Day` from `src/lib/day.ts`.
- Produces: `parseEmdr(buf: ArrayBuffer): { data: EmdrRegister; warnings: DataWarning[] }`; failure codes `NOT_XLSX`, `NO_REGISTER_SHEETS`, `NO_DOCUMENTS`; warning codes `SKIPPED_SHEET`, `BAD_DOC_NUMBER`, `BAD_DATE`, `DUPLICATE_DOC`, `SUMMARY_MISMATCH`, `SHEET_CUTOFF`. Test helpers `emdrWorkbook`, `registerSheet`, `summarySheet`.

- [ ] **Step 1: Create the fixture builder**

`src/test/emdrFixture.ts`:

```ts
import * as XLSX from 'xlsx';

export interface FixtureDoc {
  id: string;
  title?: string;
  rev?: string;
  code?: string | number;
  status?: string;
  plan?: string | number;
  deadlineComment?: string | number;
  deadlineResponse?: string | number;
  trNo?: string;
  trDate?: string | number;
  /** `Latest Rev` column; true by default. */
  latest?: boolean;
  remark?: string;
}

export type FixtureRow = FixtureDoc | { group: string };

/** Same labels and order as the real EMDR tabs (two header rows). */
const HEADER = [
  '', '', 'No.', 'DOC. No', 'DOC. TITLE', 'Rev', 'Code', 'Plan Issue\n(dd/mm/yyyy)', 'Deadline Comment\n(dd/mm/yyyy)',
  'Deadline Response\n(dd/mm/yyyy)', 'CTR No.', 'Status', 'Notes', 'Remark', 'Pages', 'Subcontractor',
  'INCOMING TRANSMITTAL', '', 'OUTGOING TRANSMITTAL', '', '',
];
const SUB = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', 'No.', 'Date', 'No.', 'Date', 'Latest Rev'];

/** A register tab: title rows, the two header rows, then group and document rows (numbered 1, 2, …). */
export function registerSheet(rows: FixtureRow[], opts: { cutOff?: string; extraColumnAt?: number } = {}): unknown[][] {
  let no = 0;
  const body = rows.map((row, i) => {
    if ('group' in row) return ['', 0, '', row.group];
    no += 1;
    return [
      '', 275_000 + i, no, row.id, row.title ?? '', row.rev ?? '0', row.code ?? '', row.plan ?? '', row.deadlineComment ?? '',
      row.deadlineResponse ?? '', '', row.status ?? '', '', row.remark ?? '', '', '', row.trNo ?? '', row.trDate ?? '', '', '',
      row.latest ?? true,
    ];
  });
  const table = [HEADER, SUB, [], ...body].map((r) => [...r]);
  if (opts.extraColumnAt !== undefined) {
    table.forEach((r, i) => r.splice(opts.extraColumnAt!, 0, i === 0 ? 'Extra' : ''));
  }
  return [
    ['', '', '', '', 'CLQ0-Design Engineering - Living Quarters Platform - General'],
    [15],
    ['', '', '', '', 'ENGINEERING MASTER DELIVERABLE REGISTER\n'],
    [...Array(24).fill(''), `Cut - off: ${opts.cutOff ?? '09-05-2025'}`],
    ...table,
  ];
}

/** The Summary tab: cut-off on row 4, a header row that also says TOTAL, and the TOTAL row. */
export function summarySheet(total: number, cutOff = '09-05-2025'): unknown[][] {
  return [
    ['', '', '', '', 'CLQ0-Design Engineering PROJECT - SUMMARY REPORT'],
    [16],
    [],
    [...Array(15).fill(''), cutOff],
    ['', '', 'No.', 'DISCIPLINE', 'TOTAL', 'SUB CONTRACTOR'],
    ['', '', 1, 'PIP-Piping and Insulation', total, 0],
    ['', '', '', 'TOTAL', total, 0],
  ];
}

export function emdrWorkbook(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
```

- [ ] **Step 2: Add warning codes, labels and messages**

In `src/data/types.ts`, extend the `WarningCode` union (after `'NO_DISCIPLINE'`):

```ts
  | 'NO_DISCIPLINE'
  // Engineering register (src/data/engineering/parseEmdr.ts).
  | 'SKIPPED_SHEET'
  | 'BAD_DOC_NUMBER'
  | 'BAD_DATE'
  | 'DUPLICATE_DOC'
  | 'SUMMARY_MISMATCH'
  | 'SHEET_CUTOFF';
```

In `src/ui/health/DataHealthPanel.tsx`, add to `CODE_LABEL_KEY`:

```ts
  SKIPPED_SHEET: 'health.code.skippedSheet',
  BAD_DOC_NUMBER: 'health.code.badDocNumber',
  BAD_DATE: 'health.code.badDate',
  DUPLICATE_DOC: 'health.code.duplicateDoc',
  SUMMARY_MISMATCH: 'health.code.summaryMismatch',
  SHEET_CUTOFF: 'health.code.sheetCutOff',
```

In `src/i18n/en.ts` — put the `error.parse.*` keys after the existing `error.parse.*` keys, the `warning.eng.*` keys after the existing `warning.*` keys, and the `health.code.*` keys after the existing `health.code.*` keys:

```ts
  'error.parse.noRegisterSheets': 'No register tab found (a tab needs a "DOC. No" header). Tabs: {sheets}',
  'error.parse.noDocuments': 'The register tabs contain no documents.',

  'warning.eng.skippedSheet': 'Tab "{sheet}" skipped: no "DOC. No" header',
  'warning.eng.badDocNumber': '{id} ({sheet}): document number has fewer than 4 parts; discipline taken from the tab name',
  'warning.eng.badDate': '{id}: unreadable date in {column}: "{value}"',
  'warning.eng.duplicateDoc': '{id} appears in several tabs ({sheets}); kept the latest revision',
  'warning.eng.summaryMismatch': 'The Summary tab reports {summary} documents; {parsed} were read',
  'warning.eng.sheetCutOff': 'Cut-off written in the sheet: {date}',

  'health.code.skippedSheet': 'Skipped tab',
  'health.code.badDocNumber': 'Malformed document number',
  'health.code.badDate': 'Unreadable date',
  'health.code.duplicateDoc': 'Duplicate document number',
  'health.code.summaryMismatch': 'Total differs from the Summary tab',
  'health.code.sheetCutOff': 'Sheet cut-off',
```

In `src/i18n/vi.ts`, at the matching places:

```ts
  'error.parse.noRegisterSheets': 'Không tìm thấy tab register nào (tab cần có cột "DOC. No"). Các tab: {sheets}',
  'error.parse.noDocuments': 'Các tab register không có tài liệu nào.',

  'warning.eng.skippedSheet': 'Bỏ qua tab "{sheet}": không có cột "DOC. No"',
  'warning.eng.badDocNumber': '{id} ({sheet}): số tài liệu thiếu phần; discipline lấy theo tên tab',
  'warning.eng.badDate': '{id}: ngày không đọc được ở {column}: "{value}"',
  'warning.eng.duplicateDoc': '{id} xuất hiện ở nhiều tab ({sheets}); giữ bản rev mới nhất',
  'warning.eng.summaryMismatch': 'Tab Summary ghi {summary} tài liệu; đọc được {parsed}',
  'warning.eng.sheetCutOff': 'Cut-off ghi trong sheet: {date}',

  'health.code.skippedSheet': 'Tab bị bỏ qua',
  'health.code.badDocNumber': 'Số tài liệu sai định dạng',
  'health.code.badDate': 'Ngày không đọc được',
  'health.code.duplicateDoc': 'Trùng số tài liệu',
  'health.code.summaryMismatch': 'Tổng lệch với tab Summary',
  'health.code.sheetCutOff': 'Cut-off của sheet',
```

- [ ] **Step 3: Write the failing test**

`src/data/engineering/parseEmdr.test.ts`:

```ts
import { dayFromYMD } from '../../lib/day';
import type { ParseFailure } from '../../store/moduleStore';
import { emdrWorkbook, registerSheet, summarySheet } from '../../test/emdrFixture';
import { parseEmdr } from './parseEmdr';

const failCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as ParseFailure).code;
  }
  return undefined;
};

const book = () =>
  emdrWorkbook({
    Summary: summarySheet(5),
    CPC0: registerSheet([
      { group: 'SPC - Specification' },
      {
        id: 'PQ-CPC0-HVC-SPC-MPC-00001-00',
        title: 'HVAC SPEC',
        rev: 'N01',
        code: 1,
        status: 'Issued for Construction',
        trNo: 'TRM-1',
        trDate: '25/04/2025',
        remark: 'EPCI#1',
      },
      { group: 'LAY - Layout' },
      { id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', title: 'OLD COPY', rev: 'K01', latest: false },
    ]),
    'PIP-Piping and Insulation': registerSheet(
      [
        { group: 'LAY - Layout' },
        { id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', title: 'PIPING LAYOUT', rev: 'L01', code: '2', plan: '01/03/2025', trDate: '10/04/2025' },
        { id: 'PQ-CLQ0-PIP-ISO-MPC-00002-00', title: 'ISO', rev: '0', plan: '31/02/2025' },
        { id: 'PIP-ODD', title: 'Odd number', rev: '0' },
      ],
      { extraColumnAt: 5 },
    ),
    Notes: [['free text only']],
  });

describe('parseEmdr', () => {
  it('reads every register tab, maps columns by label and splits the document number', () => {
    const { data } = parseEmdr(book());
    expect(data.documents.map((d) => d.id)).toEqual([
      'PQ-CPC0-HVC-SPC-MPC-00001-00',
      'PQ-CLQ0-PIP-LAY-MPC-00001-00',
      'PQ-CLQ0-PIP-ISO-MPC-00002-00',
      'PIP-ODD',
    ]);
    expect(data.documents[0]).toEqual({
      id: 'PQ-CPC0-HVC-SPC-MPC-00001-00',
      title: 'HVAC SPEC',
      facility: 'CPC0',
      discipline: 'HVC',
      docType: 'SPC',
      docTypeLabel: 'Specification',
      sheet: 'CPC0',
      rev: 'N01',
      status: 'Issued for Construction',
      code: 1,
      planIssue: undefined,
      deadlineComment: undefined,
      deadlineResponse: undefined,
      transmittal: { no: 'TRM-1', date: dayFromYMD(2025, 4, 25) },
      remark: 'EPCI#1',
    });
  });

  it('keeps the latest revision of a duplicate, in the first-seen position', () => {
    const { data, warnings } = parseEmdr(book());
    const dup = data.documents[1];
    expect(dup.title).toBe('PIPING LAYOUT');
    expect(dup.sheet).toBe('PIP-Piping and Insulation');
    expect(dup.code).toBe(2);
    expect(dup.docTypeLabel).toBe('Layout');
    expect(dup.planIssue).toBe(dayFromYMD(2025, 3, 1));
    expect(dup.transmittal).toEqual({ no: '', date: dayFromYMD(2025, 4, 10) });
    expect(warnings.filter((w) => w.code === 'DUPLICATE_DOC')).toHaveLength(1);
  });

  it('drops bad dates and falls back to the tab name for a malformed number', () => {
    const { data, warnings } = parseEmdr(book());
    expect(data.documents[2].planIssue).toBeUndefined();
    expect(data.documents[2].docTypeLabel).toBeUndefined();
    expect(data.documents[3]).toMatchObject({ facility: '—', discipline: 'PIP', docType: '—' });
    expect(warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['SKIPPED_SHEET', 'BAD_DATE', 'BAD_DOC_NUMBER', 'SUMMARY_MISMATCH', 'SHEET_CUTOFF']),
    );
  });

  it('reads the Summary total and cut-off', () => {
    const { data } = parseEmdr(book());
    expect(data.summaryTotal).toBe(5);
    expect(data.sheetCutOff).toBe(dayFromYMD(2025, 5, 9));
  });

  it('does not warn about the Summary total when it matches', () => {
    const buf = emdrWorkbook({ Summary: summarySheet(1), PIP: registerSheet([{ id: 'PQ-CLQ0-PIP-LAY-MPC-00001-00', rev: 'K01' }]) });
    expect(parseEmdr(buf).warnings.map((w) => w.code)).not.toContain('SUMMARY_MISMATCH');
  });

  it('fails clearly on bad input', () => {
    expect(failCode(() => parseEmdr(new TextEncoder().encode('nope').buffer as ArrayBuffer))).toBe('NOT_XLSX');
    expect(failCode(() => parseEmdr(emdrWorkbook({ Summary: summarySheet(0), Notes: [['x']] })))).toBe('NO_REGISTER_SHEETS');
    expect(failCode(() => parseEmdr(emdrWorkbook({ PIP: registerSheet([{ group: 'LAY - Layout' }]) })))).toBe('NO_DOCUMENTS');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/data/engineering/parseEmdr.test.ts`
Expected: FAIL — cannot resolve `./parseEmdr`.

- [ ] **Step 5: Implement the parser**

`src/data/engineering/parseEmdr.ts`:

```ts
import * as XLSX from 'xlsx';
import { msg, type Message } from '../../i18n/message';
import { dayFromExcelSerial, dayFromYMD, formatDay, type Day } from '../../lib/day';
import { ParseFailure } from '../../store/moduleStore';
import { isZip } from '../parser/parsePlan';
import type { DataWarning, WarningCode } from '../types';
import type { ClientCode, EmdrRegister, EngDocument } from './types';

type Row = unknown[];

interface Columns {
  no: number;
  id: number;
  title: number;
  rev: number;
  code?: number;
  planIssue?: number;
  deadlineComment?: number;
  deadlineResponse?: number;
  status?: number;
  remark?: number;
  trNo?: number;
  trDate?: number;
  latest?: number;
}

interface Candidate {
  doc: EngDocument;
  latest: boolean;
}

const UNKNOWN = '—';
const GROUP = /^([A-Z]{2,5})\s*-\s*(.+)$/;
const DATE_TEXT = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;

/** `Plan Issue\n(dd/mm/yyyy)` → `plan issue`, `DOC. No` → `doc no`. */
const norm = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());

const warn = (code: WarningCode, level: DataWarning['level'], message: Message, row?: number): DataWarning =>
  row === undefined ? { level, code, message } : { level, code, message, row };

/** Excel serial or `dd/mm/yyyy` / `dd-mm-yyyy` text; `'bad'` when the cell has something else. */
function readDate(value: unknown): Day | undefined | 'bad' {
  if (value === '' || value === null || value === undefined) return undefined;
  if (typeof value === 'number') return dayFromExcelSerial(value) ?? 'bad';
  const m = DATE_TEXT.exec(String(value));
  if (!m) return 'bad';
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return 'bad';
  const day = dayFromYMD(y, mo, d);
  return new Date(day * 86_400_000).getUTCDate() === d ? day : 'bad';
}

function readCode(value: unknown): ClientCode | undefined {
  const n = Number(text(value));
  return n === 1 || n === 2 || n === 3 || n === 4 ? n : undefined;
}

/** `PIP-Piping and Insulation` → `PIP`. */
const sheetDiscipline = (sheet: string) => /^([A-Z]{2,5})\s*-/.exec(sheet.trim())?.[1] ?? sheet.trim();

/** The header row is the one holding `DOC. No`; `INCOMING TRANSMITTAL` No./Date and `Latest Rev` sit on the row below. */
function findColumns(rows: Row[]): { header: number; cols: Columns } | undefined {
  const header = rows.findIndex((r) => r.some((c) => norm(c) === 'doc no'));
  if (header === -1) return undefined;
  const top = rows[header];
  const sub = rows[header + 1] ?? [];
  const at = (label: string, row: Row = top) => {
    const i = row.findIndex((c) => norm(c) === label);
    return i === -1 ? undefined : i;
  };
  const no = at('no');
  const title = at('doc title');
  const rev = at('rev');
  if (no === undefined || title === undefined || rev === undefined) return undefined;
  const incoming = at('incoming transmittal');
  return {
    header,
    cols: {
      no,
      id: at('doc no')!,
      title,
      rev,
      code: at('code'),
      planIssue: at('plan issue'),
      deadlineComment: at('deadline comment'),
      deadlineResponse: at('deadline response'),
      status: at('status'),
      remark: at('remark'),
      trNo: incoming,
      trDate: incoming === undefined ? undefined : incoming + 1,
      latest: at('latest rev', sub) ?? at('latest rev'),
    },
  };
}

function parseSheet(sheet: string, rows: Row[], warnings: DataWarning[]): Candidate[] | undefined {
  const found = findColumns(rows);
  if (!found) return undefined;
  const { header, cols } = found;
  const out: Candidate[] = [];
  let group: { code: string; label: string } | undefined;

  for (let r = header + 2; r < rows.length; r++) {
    const row = rows[r];
    const id = text(row[cols.id]);
    if (!id) continue;
    if (!(Number(text(row[cols.no])) > 0)) {
      const g = GROUP.exec(id);
      if (g) group = { code: g[1], label: g[2].trim() };
      continue;
    }
    const excelRow = r + 1;
    const date = (col: number | undefined, column: string) => {
      if (col === undefined) return undefined;
      const d = readDate(row[col]);
      if (d !== 'bad') return d;
      warnings.push(warn('BAD_DATE', 'warn', msg('warning.eng.badDate', { id, column, value: text(row[col]) }), excelRow));
      return undefined;
    };

    const parts = id.split('-');
    let [facility, discipline, docType] = [parts[1], parts[2], parts[3]];
    if (parts.length < 4) {
      warnings.push(warn('BAD_DOC_NUMBER', 'warn', msg('warning.eng.badDocNumber', { id, sheet }), excelRow));
      [facility, discipline, docType] = [UNKNOWN, sheetDiscipline(sheet), UNKNOWN];
    }
    const trNo = cols.trNo === undefined ? '' : text(row[cols.trNo]);
    const trDate = date(cols.trDate, 'Incoming Transmittal');
    const status = cols.status === undefined ? '' : text(row[cols.status]);
    const remark = cols.remark === undefined ? '' : text(row[cols.remark]);
    const latestCell = cols.latest === undefined ? undefined : row[cols.latest];

    out.push({
      latest: latestCell === true || text(latestCell).toUpperCase() === 'TRUE',
      doc: {
        id,
        title: text(row[cols.title]),
        facility,
        discipline,
        docType,
        docTypeLabel: group && group.code === docType ? group.label : undefined,
        sheet,
        rev: text(row[cols.rev]),
        status: status || undefined,
        code: cols.code === undefined ? undefined : readCode(row[cols.code]),
        planIssue: date(cols.planIssue, 'Plan Issue'),
        deadlineComment: date(cols.deadlineComment, 'Deadline Comment'),
        deadlineResponse: date(cols.deadlineResponse, 'Deadline Response'),
        transmittal: trNo || trDate !== undefined ? { no: trNo, date: trDate } : undefined,
        remark: remark || undefined,
      },
    });
  }
  return out;
}

/** Latest Rev first, then the later transmittal. */
function better(a: Candidate, b: Candidate): boolean {
  if (a.latest !== b.latest) return a.latest;
  return (a.doc.transmittal?.date ?? -Infinity) > (b.doc.transmittal?.date ?? -Infinity);
}

function dedupe(candidates: Candidate[], warnings: DataWarning[]): EngDocument[] {
  const byId = new Map<string, Candidate>();
  const sheets = new Map<string, string[]>();
  for (const c of candidates) {
    const prev = byId.get(c.doc.id);
    if (!prev) {
      byId.set(c.doc.id, c);
      continue;
    }
    sheets.set(c.doc.id, [...(sheets.get(c.doc.id) ?? [prev.doc.sheet]), c.doc.sheet]);
    if (better(c, prev)) byId.set(c.doc.id, c);
  }
  for (const [id, list] of sheets) {
    warnings.push(warn('DUPLICATE_DOC', 'warn', msg('warning.eng.duplicateDoc', { id, sheets: list.join(', ') })));
  }
  return [...byId.values()].map((c) => c.doc);
}

/** Best effort: the number right of the first `TOTAL` cell that has one, and the first date in the title rows. */
function readSummary(rows: Row[]): { total?: number; cutOff?: Day } {
  let total: number | undefined;
  let cutOff: Day | undefined;
  for (const row of rows) {
    const i = row.findIndex((c) => text(c).toUpperCase() === 'TOTAL');
    if (i === -1 || total !== undefined) continue;
    const n = row.slice(i + 1).find((c) => typeof c === 'number');
    if (typeof n === 'number') total = n;
  }
  for (const row of rows.slice(0, 8)) {
    for (const cell of row) {
      const d = typeof cell === 'string' ? readDate(cell) : undefined;
      if (cutOff === undefined && typeof d === 'number') cutOff = d;
    }
  }
  return { total, cutOff };
}

/** Read every register tab of the EMDR workbook (all tabs but `Summary`) into one de-duplicated register. */
export function parseEmdr(buf: ArrayBuffer): { data: EmdrRegister; warnings: DataWarning[] } {
  if (!isZip(buf)) throw new ParseFailure('NOT_XLSX', msg('error.parse.notXlsx'));
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(new Uint8Array(buf), { type: 'array' });
  } catch {
    throw new ParseFailure('NOT_XLSX', msg('error.parse.corrupt'));
  }

  const warnings: DataWarning[] = [];
  const candidates: Candidate[] = [];
  let registers = 0;
  let summary: { total?: number; cutOff?: Day } = {};
  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name], { header: 1, defval: '', blankrows: true });
    if (name.trim().toLowerCase() === 'summary') {
      summary = readSummary(rows);
      continue;
    }
    const docs = parseSheet(name, rows, warnings);
    if (!docs) {
      warnings.push(warn('SKIPPED_SHEET', 'warn', msg('warning.eng.skippedSheet', { sheet: name })));
      continue;
    }
    registers += 1;
    candidates.push(...docs);
  }

  if (registers === 0) {
    throw new ParseFailure('NO_REGISTER_SHEETS', msg('error.parse.noRegisterSheets', { sheets: workbook.SheetNames.join(', ') }));
  }
  const documents = dedupe(candidates, warnings);
  if (documents.length === 0) throw new ParseFailure('NO_DOCUMENTS', msg('error.parse.noDocuments'));
  if (summary.total !== undefined && summary.total !== documents.length) {
    warnings.push(warn('SUMMARY_MISMATCH', 'warn', msg('warning.eng.summaryMismatch', { summary: summary.total, parsed: documents.length })));
  }
  if (summary.cutOff !== undefined) {
    warnings.push(warn('SHEET_CUTOFF', 'info', msg('warning.eng.sheetCutOff', { date: formatDay(summary.cutOff) })));
  }
  return { data: { documents, sheetCutOff: summary.cutOff, summaryTotal: summary.total }, warnings };
}
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `npx vitest run src/data/engineering/parseEmdr.test.ts` → PASS.
Run: `npm run typecheck` → no errors.

If the first test fails only on `planIssue: undefined`-style keys, keep the implementation (explicit `undefined` fields are intended) and fix nothing else. If `toEqual` fails because of the PIP-tab title row `[15]` being read as a document, check that `r` starts at `header + 2`.

- [ ] **Step 7: Check against the real sheet (manual, not committed)**

Download the real workbook to the scratchpad and print a summary:

```bash
curl -sL -o "$TMPDIR/emdr.xlsx" "https://docs.google.com/spreadsheets/d/1ePtJRHK5wQbieWHLNaUs0aJmbifeFDzxLrKSDSEibxo/export?format=xlsx"
```

Then, in a throwaway Vitest file outside `src/` or a `node --import tsx` one-liner if available, call `parseEmdr` on it and print `documents.length`, the warning codes and counts. Expected: about 200 documents, a `SUMMARY_MISMATCH` (Summary says 214), a `SHEET_CUTOFF` of 09-May-2025, no `SKIPPED_SHEET`. Do not commit the script. Report the numbers in your report.

- [ ] **Step 8: Commit**

```bash
git add src/test/emdrFixture.ts src/data/engineering/parseEmdr.ts src/data/engineering/parseEmdr.test.ts src/data/types.ts src/ui/health/DataHealthPanel.tsx src/i18n/en.ts src/i18n/vi.ts
git commit -m "feat(engineering): parse the EMDR workbook

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Engineering analytics

**Files:**
- Create: `src/test/engFixture.ts`
- Create: `src/analytics/engineering/docMetrics.ts`
- Create: `src/analytics/engineering/stageProgress.ts`
- Create: `src/analytics/engineering/summaries.ts`
- Test: `src/analytics/engineering/engineering.test.ts`

**Interfaces:**
- Consumes: Task 1 types and `stageOf`, `stageIndex`, `GATED_STAGES`, `STAGE_KEYS`, `STAGE_PLAN_FIELD`.
- Produces:
  - `StageState = 'done' | 'late' | 'pending'`
  - `StageCheck { stage: GatedStage; plan?: Day; due: boolean; actual?: Day; state: StageState; delayDays?: number }`
  - `DocMetrics { doc: EngDocument; stage: StageKey; checks: Record<GatedStage, StageCheck>; overdue: boolean }`
  - `docMetrics(doc, cutOff): DocMetrics`, `computeDocMetrics(docs, cutOff): DocMetrics[]`
  - `StageDoc { metrics: DocMetrics; check: StageCheck }`
  - `StageProgress { stage: GatedStage; reached: number; total: number; planDue: number; doneDue: number; late: number; ratio?: number; docs: StageDoc[] }`, `stageProgress(metrics): StageProgress[]`
  - `EngKpis { total; issued; final; code1; code2; rejected; notIssued; overdue: number; hasPlanDates: boolean }`, `engKpis(metrics)`
  - `EngRisk = 'ok' | 'warning' | 'critical'`, `DisciplineStatus { discipline: string; total: number; byStage: Record<StageKey, number>; finalRatio: number; notIssued: number; overdue: number; risk: EngRisk }`, `disciplineStatus(metrics)`
  - `TransmittalWeek { start: Day; count: number }`, `transmittalActivity(metrics): TransmittalWeek[]`
  - Test helpers: `ENG_CUTOFF`, `doc(id, patch?)`, `sampleRegister()`.

- [ ] **Step 1: Create the shared test fixture**

`src/test/engFixture.ts`:

```ts
import type { EmdrRegister, EngDocument } from '../data/engineering/types';
import { dayFromYMD } from '../lib/day';

const d = dayFromYMD;

/** The EMDR's own cut-off. */
export const ENG_CUTOFF = d(2025, 5, 9);

/** A document whose facility / discipline / type come from its number. */
export function doc(id: string, patch: Partial<EngDocument> = {}): EngDocument {
  const [, facility = 'CLQ0', discipline = 'PIP', docType = 'SPC'] = id.split('-');
  return { id, title: `${id} title`, facility, discipline, docType, sheet: discipline, rev: '0', ...patch };
}

/**
 * Six documents, cut-off 09-May-2025:
 * - PIP-00001 final, Code 1, review planned 01-Mar (done), transmittal 25-Apr.
 * - PIP-00002 review, review planned 01-Mar (done), comment due 01-Apr → late 38 days.
 * - PIP-00003 not issued, review planned 01-Jun (not due).
 * - STR-00004 commented, Code 2, transmittal 10-Apr.
 * - STR-00005 commented, Code 3 (rejected).
 * - STR-00006 not issued, review planned 01-Apr → late 38 days.
 */
export function sampleRegister(): EmdrRegister {
  return {
    documents: [
      doc('PQ-CLQ0-PIP-LAY-MPC-00001-00', {
        title: 'PIPING LAYOUT',
        rev: 'N01',
        status: 'Issued for Construction',
        code: 1,
        planIssue: d(2025, 3, 1),
        transmittal: { no: 'TRM-1', date: d(2025, 4, 25) },
      }),
      doc('PQ-CLQ0-PIP-ISO-MPC-00002-00', {
        title: 'ISOMETRIC',
        rev: 'K01',
        status: 'Issued for Information',
        planIssue: d(2025, 3, 1),
        deadlineComment: d(2025, 4, 1),
        transmittal: { no: 'TRM-2', date: d(2025, 2, 27) },
      }),
      doc('PQ-CLQ0-PIP-CAL-MPC-00003-00', { title: 'STRESS CALC', planIssue: d(2025, 6, 1) }),
      doc('PQ-CPC0-STR-DTL-MPC-00004-00', { title: 'BRIDGE DETAILS', rev: 'L01', code: 2, transmittal: { no: 'TRM-3', date: d(2025, 4, 10) } }),
      doc('PQ-CPC0-STR-SPC-MPC-00005-00', { title: 'STEEL SPEC', rev: 'L01', code: 3 }),
      doc('PQ-CPC0-STR-BOD-MPC-00006-00', { title: 'DESIGN BASIS', planIssue: d(2025, 4, 1) }),
    ],
    sheetCutOff: ENG_CUTOFF,
    summaryTotal: 6,
  };
}
```

- [ ] **Step 2: Write the failing test**

`src/analytics/engineering/engineering.test.ts`:

```ts
import { dayFromYMD } from '../../lib/day';
import { doc, ENG_CUTOFF, sampleRegister } from '../../test/engFixture';
import { computeDocMetrics } from './docMetrics';
import { stageProgress } from './stageProgress';
import { disciplineStatus, engKpis, transmittalActivity } from './summaries';

const metrics = () => computeDocMetrics(sampleRegister().documents, ENG_CUTOFF);
const ids = (list: { metrics: { doc: { id: string } } }[]) => list.map((x) => x.metrics.doc.id);

describe('computeDocMetrics', () => {
  it('marks each gated stage done, late or pending against the cut-off', () => {
    const [final, review, notDue, , , lateIssue] = metrics();
    expect(final.stage).toBe('final');
    expect(final.checks.review).toEqual({
      stage: 'review',
      plan: dayFromYMD(2025, 3, 1),
      due: true,
      actual: dayFromYMD(2025, 4, 25),
      state: 'done',
      delayDays: 55,
    });
    expect(review.checks.commented).toMatchObject({ state: 'late', due: true, delayDays: 38 });
    expect(review.overdue).toBe(true);
    expect(notDue.checks.review).toMatchObject({ state: 'pending', due: false });
    expect(notDue.overdue).toBe(false);
    expect(lateIssue.checks.review).toMatchObject({ state: 'late', delayDays: 38 });
    expect(lateIssue.checks.final).toEqual({ stage: 'final', plan: undefined, due: false, state: 'pending' });
  });
});

describe('stageProgress', () => {
  it('counts reached documents and plan vs actual per stage', () => {
    const [review, commented, final] = stageProgress(metrics());
    expect(review).toMatchObject({ stage: 'review', reached: 4, total: 6, planDue: 3, doneDue: 2, late: 1 });
    expect(review.ratio).toBeCloseTo(2 / 3);
    expect(commented).toMatchObject({ stage: 'commented', reached: 3, planDue: 1, doneDue: 0, late: 1, ratio: 0 });
    expect(final).toMatchObject({ stage: 'final', reached: 1, planDue: 0, late: 0, ratio: undefined });
  });

  it('lists late documents first, most days late first, then done, then pending', () => {
    const [review] = stageProgress(metrics());
    expect(ids(review.docs)).toEqual([
      'PQ-CPC0-STR-BOD-MPC-00006-00',
      'PQ-CLQ0-PIP-ISO-MPC-00002-00',
      'PQ-CLQ0-PIP-LAY-MPC-00001-00',
      'PQ-CPC0-STR-DTL-MPC-00004-00',
      'PQ-CPC0-STR-SPC-MPC-00005-00',
      'PQ-CLQ0-PIP-CAL-MPC-00003-00',
    ]);
  });
});

describe('engKpis', () => {
  it('sums the headline numbers', () => {
    expect(engKpis(metrics())).toEqual({
      total: 6,
      issued: 4,
      final: 1,
      code1: 1,
      code2: 1,
      rejected: 1,
      notIssued: 2,
      overdue: 2,
      hasPlanDates: true,
    });
  });

  it('reports when no document has planned dates', () => {
    expect(engKpis(computeDocMetrics([doc('PQ-CLQ0-PIP-LAY-MPC-00001-00')], ENG_CUTOFF)).hasPlanDates).toBe(false);
  });
});

describe('disciplineStatus', () => {
  it('counts stages per discipline and ranks by risk', () => {
    const extra = [
      doc('PQ-CLQ0-ARC-SPC-MPC-00001-00', { rev: 'N01' }),
      doc('PQ-CLQ0-ELE-SPC-MPC-00001-00'),
      doc('PQ-CLQ0-ELE-SPC-MPC-00002-00', { rev: 'K01' }),
    ];
    const status = disciplineStatus(computeDocMetrics([...sampleRegister().documents, ...extra], ENG_CUTOFF));
    expect(status.map((s) => [s.discipline, s.risk])).toEqual([
      ['PIP', 'critical'],
      ['STR', 'critical'],
      ['ELE', 'warning'],
      ['ARC', 'ok'],
    ]);
    expect(status[0]).toMatchObject({
      total: 3,
      byStage: { notIssued: 1, review: 1, commented: 0, final: 1 },
      notIssued: 1,
      overdue: 1,
    });
    expect(status[0].finalRatio).toBeCloseTo(1 / 3);
  });
});

describe('transmittalActivity', () => {
  it('counts documents per ISO week and fills empty weeks', () => {
    const weeks = transmittalActivity(metrics());
    expect(weeks).toHaveLength(9);
    expect(weeks[0]).toEqual({ start: dayFromYMD(2025, 2, 24), count: 1 });
    expect(weeks.map((w) => w.count)).toEqual([1, 0, 0, 0, 0, 0, 1, 0, 1]);
  });

  it('is empty without transmittal dates', () => {
    expect(transmittalActivity(computeDocMetrics([doc('PQ-CLQ0-PIP-LAY-MPC-00001-00')], ENG_CUTOFF))).toEqual([]);
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx vitest run src/analytics/engineering/engineering.test.ts`
Expected: FAIL — cannot resolve `./docMetrics`.

- [ ] **Step 4: Implement `docMetrics.ts`**

```ts
import { GATED_STAGES, STAGE_PLAN_FIELD, stageIndex, stageOf } from '../../data/engineering/stages';
import type { EngDocument, GatedStage, StageKey } from '../../data/engineering/types';
import type { Day } from '../../lib/day';

/** done: stage reached · late: planned date on/before the cut-off, not reached · pending: otherwise. */
export type StageState = 'done' | 'late' | 'pending';

export interface StageCheck {
  stage: GatedStage;
  plan?: Day;
  /** Has a planned date on/before the cut-off. */
  due: boolean;
  /** Incoming transmittal date, when the stage is reached. */
  actual?: Day;
  state: StageState;
  /** late: cut-off − plan; done with both dates: actual − plan. */
  delayDays?: number;
}

export interface DocMetrics {
  doc: EngDocument;
  stage: StageKey;
  checks: Record<GatedStage, StageCheck>;
  /** Late at any stage. */
  overdue: boolean;
}

function check(doc: EngDocument, stage: GatedStage, reached: number, cutOff: Day): StageCheck {
  const plan = doc[STAGE_PLAN_FIELD[stage]];
  const due = plan !== undefined && plan <= cutOff;
  if (reached >= stageIndex(stage)) {
    const actual = doc.transmittal?.date;
    const delayDays = plan !== undefined && actual !== undefined ? actual - plan : undefined;
    return { stage, plan, due, actual, state: 'done', delayDays };
  }
  if (due) return { stage, plan, due, state: 'late', delayDays: cutOff - plan };
  return { stage, plan, due, state: 'pending' };
}

export function docMetrics(doc: EngDocument, cutOff: Day): DocMetrics {
  const stage = stageOf(doc);
  const reached = stageIndex(stage);
  const checks = Object.fromEntries(GATED_STAGES.map((g) => [g, check(doc, g, reached, cutOff)])) as Record<GatedStage, StageCheck>;
  return { doc, stage, checks, overdue: GATED_STAGES.some((g) => checks[g].state === 'late') };
}

export function computeDocMetrics(docs: readonly EngDocument[], cutOff: Day): DocMetrics[] {
  return docs.map((d) => docMetrics(d, cutOff));
}
```

- [ ] **Step 5: Implement `stageProgress.ts`**

```ts
import { GATED_STAGES } from '../../data/engineering/stages';
import type { GatedStage } from '../../data/engineering/types';
import type { DocMetrics, StageCheck, StageState } from './docMetrics';

export interface StageDoc {
  metrics: DocMetrics;
  check: StageCheck;
}

export interface StageProgress {
  stage: GatedStage;
  /** Documents at or beyond this stage. */
  reached: number;
  total: number;
  /** Documents whose planned date for this stage is on/before the cut-off; 0 hides Plan vs Actual. */
  planDue: number;
  /** Of those, how many reached the stage. */
  doneDue: number;
  late: number;
  /** doneDue / planDue; undefined when nothing is due. */
  ratio?: number;
  /** Late (most days late first), then done, then pending. */
  docs: StageDoc[];
}

const ORDER: Record<StageState, number> = { late: 0, done: 1, pending: 2 };

function compare(a: StageDoc, b: StageDoc): number {
  return (
    ORDER[a.check.state] - ORDER[b.check.state] ||
    (a.check.state === 'late' ? b.check.delayDays! - a.check.delayDays! : 0) ||
    a.metrics.doc.id.localeCompare(b.metrics.doc.id)
  );
}

/** Progress of each gated stage as of the cut-off the metrics were computed with. */
export function stageProgress(metrics: readonly DocMetrics[]): StageProgress[] {
  return GATED_STAGES.map((stage) => {
    const docs = metrics.map((m) => ({ metrics: m, check: m.checks[stage] })).sort(compare);
    const planDue = docs.filter((d) => d.check.due).length;
    const doneDue = docs.filter((d) => d.check.due && d.check.state === 'done').length;
    return {
      stage,
      reached: docs.filter((d) => d.check.state === 'done').length,
      total: metrics.length,
      planDue,
      doneDue,
      late: docs.filter((d) => d.check.state === 'late').length,
      ratio: planDue > 0 ? doneDue / planDue : undefined,
      docs,
    };
  });
}
```

- [ ] **Step 6: Implement `summaries.ts`**

```ts
import { GATED_STAGES, STAGE_KEYS } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import type { Day } from '../../lib/day';
import type { DocMetrics } from './docMetrics';

export interface EngKpis {
  total: number;
  issued: number;
  final: number;
  code1: number;
  code2: number;
  rejected: number;
  notIssued: number;
  overdue: number;
  /** Any document has a planned date: the Overdue tile only makes sense then. */
  hasPlanDates: boolean;
}

export function engKpis(metrics: readonly DocMetrics[]): EngKpis {
  const count = (test: (m: DocMetrics) => boolean) => metrics.filter(test).length;
  return {
    total: metrics.length,
    issued: count((m) => m.stage !== 'notIssued'),
    final: count((m) => m.stage === 'final'),
    code1: count((m) => m.doc.code === 1),
    code2: count((m) => m.doc.code === 2),
    rejected: count((m) => m.doc.code === 3 || m.doc.code === 4),
    notIssued: count((m) => m.stage === 'notIssued'),
    overdue: count((m) => m.overdue),
    hasPlanDates: metrics.some((m) => GATED_STAGES.some((g) => m.checks[g].plan !== undefined)),
  };
}

export type EngRisk = 'ok' | 'warning' | 'critical';

export interface DisciplineStatus {
  discipline: string;
  total: number;
  byStage: Record<StageKey, number>;
  finalRatio: number;
  notIssued: number;
  overdue: number;
  risk: EngRisk;
}

const RISK_RANK: Record<EngRisk, number> = { critical: 0, warning: 1, ok: 2 };

/** critical: something overdue · warning: more than 30% never issued · ok otherwise. Riskiest first, then by code. */
export function disciplineStatus(metrics: readonly DocMetrics[]): DisciplineStatus[] {
  const groups = new Map<string, DocMetrics[]>();
  for (const m of metrics) groups.set(m.doc.discipline, [...(groups.get(m.doc.discipline) ?? []), m]);
  return [...groups]
    .map(([discipline, list]) => {
      const byStage = Object.fromEntries(STAGE_KEYS.map((s) => [s, list.filter((m) => m.stage === s).length])) as Record<StageKey, number>;
      const overdue = list.filter((m) => m.overdue).length;
      const notIssued = byStage.notIssued;
      const risk: EngRisk = overdue > 0 ? 'critical' : notIssued / list.length > 0.3 ? 'warning' : 'ok';
      return { discipline, total: list.length, byStage, finalRatio: byStage.final / list.length, notIssued, overdue, risk };
    })
    .sort((a, b) => RISK_RANK[a.risk] - RISK_RANK[b.risk] || a.discipline.localeCompare(b.discipline));
}

export interface TransmittalWeek {
  /** Monday of the ISO week. */
  start: Day;
  count: number;
}

/** Day 0 (1970-01-01) was a Thursday. */
const weekStart = (day: Day) => day - ((day + 3) % 7);

/** Documents received per week (incoming transmittal date), with empty weeks filled in. */
export function transmittalActivity(metrics: readonly DocMetrics[]): TransmittalWeek[] {
  const counts = new Map<Day, number>();
  for (const m of metrics) {
    const date = m.doc.transmittal?.date;
    if (date === undefined) continue;
    const start = weekStart(date);
    counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  if (counts.size === 0) return [];
  const starts = [...counts.keys()];
  const weeks: TransmittalWeek[] = [];
  for (let start = Math.min(...starts); start <= Math.max(...starts); start += 7) weeks.push({ start, count: counts.get(start) ?? 0 });
  return weeks;
}
```

- [ ] **Step 7: Run the tests and typecheck**

Run: `npx vitest run src/analytics/engineering/engineering.test.ts` → PASS.
Run: `npm run typecheck` → no errors.

- [ ] **Step 8: Commit**

```bash
git add src/test/engFixture.ts src/analytics/engineering/docMetrics.ts src/analytics/engineering/stageProgress.ts src/analytics/engineering/summaries.ts src/analytics/engineering/engineering.test.ts
git commit -m "feat(engineering): stage progress, KPIs, discipline status and transmittal activity

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Engineering filters and metrics memo

**Files:**
- Create: `src/modules/engineering/filters.ts`
- Test: `src/modules/engineering/filters.test.ts`
- Create: `src/modules/engineering/metrics.ts`
- Test: `src/modules/engineering/metrics.test.ts`

**Interfaces:**
- Consumes: `DocMetrics`, `computeDocMetrics` (Task 3); `STAGE_KEYS` (Task 1); `FILTER_KEYS` from `src/store/urlFilters.ts`; `SearchVocabulary` from `src/analytics/search.ts`.
- Produces:
  - `EngFlag = 'notIssued' | 'overdue' | 'code1' | 'code2' | 'rejected'`, `ENG_FLAGS`
  - `EngFilters { disciplines: string[]; facilities: string[]; docTypes: string[]; stages: StageKey[]; flags: EngFlag[]; q: string }`, `EMPTY_ENG_FILTERS`
  - `engFiltersFromParams(params: URLSearchParams): EngFilters`
  - `writeEngFilters(params: URLSearchParams, filters: EngFilters): URLSearchParams`
  - `applyEngFilters(metrics: readonly DocMetrics[], filters: EngFilters): DocMetrics[]`
  - `searchWords(q: string): string[]`
  - `engVocabulary(metrics: readonly DocMetrics[]): SearchVocabulary`
  - `engineeringMetrics(register: EmdrRegister, cutOff: Day): DocMetrics[]`

- [ ] **Step 1: Write the failing tests**

`src/modules/engineering/filters.test.ts`:

```ts
import { computeDocMetrics } from '../../analytics/engineering/docMetrics';
import { ENG_CUTOFF, sampleRegister } from '../../test/engFixture';
import { applyEngFilters, EMPTY_ENG_FILTERS, engFiltersFromParams, engVocabulary, searchWords, writeEngFilters } from './filters';

const metrics = () => computeDocMetrics(sampleRegister().documents, ENG_CUTOFF);
const ids = (list: { doc: { id: string } }[]) => list.map((m) => m.doc.id.split('-')[5]);

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
});

describe('engVocabulary', () => {
  it('lists disciplines and facilities alphabetically', () => {
    expect(engVocabulary(metrics())).toEqual({ disciplines: ['PIP', 'STR'], facilities: ['CLQ0', 'CPC0'] });
  });
});
```

`src/modules/engineering/metrics.test.ts`:

```ts
import { ENG_CUTOFF, sampleRegister } from '../../test/engFixture';
import { engineeringMetrics } from './metrics';

describe('engineeringMetrics', () => {
  it('returns the same array for the same register and cut-off', () => {
    const register = sampleRegister();
    const first = engineeringMetrics(register, ENG_CUTOFF);
    expect(engineeringMetrics(register, ENG_CUTOFF)).toBe(first);
    expect(engineeringMetrics(register, ENG_CUTOFF + 1)).not.toBe(first);
    expect(engineeringMetrics(sampleRegister(), ENG_CUTOFF + 1)).toHaveLength(6);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/modules/engineering/filters.test.ts src/modules/engineering/metrics.test.ts`
Expected: FAIL — cannot resolve `./filters` / `./metrics`.

- [ ] **Step 3: Implement `filters.ts`**

```ts
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import type { SearchVocabulary } from '../../analytics/search';
import { STAGE_KEYS } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import { FILTER_KEYS } from '../../store/urlFilters';

export type EngFlag = 'notIssued' | 'overdue' | 'code1' | 'code2' | 'rejected';

export const ENG_FLAGS: readonly EngFlag[] = ['notIssued', 'overdue', 'code1', 'code2', 'rejected'];

export interface EngFilters {
  disciplines: string[];
  facilities: string[];
  docTypes: string[];
  stages: StageKey[];
  flags: EngFlag[];
  q: string;
}

export const EMPTY_ENG_FILTERS: EngFilters = { disciplines: [], facilities: [], docTypes: [], stages: [], flags: [], q: '' };

/** Same URL keys as Procurement, so a filter such as `discipline` reads the same in every module. */
const PARAM: Record<keyof EngFilters, string> = {
  disciplines: FILTER_KEYS.disciplines,
  facilities: FILTER_KEYS.facilities,
  docTypes: FILTER_KEYS.itemTypes,
  stages: FILTER_KEYS.phases,
  flags: FILTER_KEYS.flags,
  q: FILTER_KEYS.q,
};

const list = (params: URLSearchParams, key: string) => params.getAll(key).filter(Boolean);

export function engFiltersFromParams(params: URLSearchParams): EngFilters {
  return {
    disciplines: list(params, PARAM.disciplines),
    facilities: list(params, PARAM.facilities),
    docTypes: list(params, PARAM.docTypes),
    stages: list(params, PARAM.stages).filter((s): s is StageKey => STAGE_KEYS.includes(s as StageKey)),
    flags: list(params, PARAM.flags).filter((f): f is EngFlag => ENG_FLAGS.includes(f as EngFlag)),
    q: params.get(PARAM.q) ?? '',
  };
}

/** Write filters into `params`, keeping unrelated keys (such as `doc`). Returns a new instance. */
export function writeEngFilters(params: URLSearchParams, filters: EngFilters): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const facet of Object.keys(PARAM) as (keyof EngFilters)[]) {
    const key = PARAM[facet];
    next.delete(key);
    if (facet === 'q') {
      if (filters.q.trim()) next.set(key, filters.q.trim());
    } else {
      for (const value of filters[facet] as string[]) next.append(key, value);
    }
  }
  return next;
}

const FLAG_TEST: Record<EngFlag, (m: DocMetrics) => boolean> = {
  notIssued: (m) => m.stage === 'notIssued',
  overdue: (m) => m.overdue,
  code1: (m) => m.doc.code === 1,
  code2: (m) => m.doc.code === 2,
  rejected: (m) => m.doc.code === 3 || m.doc.code === 4,
};

export const searchWords = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);

const inList = <T,>(values: readonly T[], value: T) => values.length === 0 || values.includes(value);

/** Facets are OR within a facet and AND across facets; flags and search words AND on top. */
export function applyEngFilters(metrics: readonly DocMetrics[], f: EngFilters): DocMetrics[] {
  const words = searchWords(f.q);
  return metrics.filter((m) => {
    const { doc } = m;
    if (!inList(f.disciplines, doc.discipline) || !inList(f.facilities, doc.facility) || !inList(f.docTypes, doc.docType) || !inList(f.stages, m.stage)) {
      return false;
    }
    if (!f.flags.every((flag) => FLAG_TEST[flag](m))) return false;
    const haystack = `${doc.id} ${doc.title} ${doc.discipline} ${doc.facility} ${doc.docType}`.toLowerCase();
    return words.every((w) => haystack.includes(w));
  });
}

export function engVocabulary(metrics: readonly DocMetrics[]): SearchVocabulary {
  const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
  return { disciplines: sorted(metrics.map((m) => m.doc.discipline)), facilities: sorted(metrics.map((m) => m.doc.facility)) };
}
```

- [ ] **Step 4: Implement `metrics.ts`**

```ts
import { computeDocMetrics, type DocMetrics } from '../../analytics/engineering/docMetrics';
import type { EmdrRegister } from '../../data/engineering/types';
import type { Day } from '../../lib/day';

let last: { register: EmdrRegister; cutOff: Day; metrics: DocMetrics[] } | undefined;

/** One-entry cache, like `procurementMetrics`: header, filter bar, page and drawers share one array. */
export function engineeringMetrics(register: EmdrRegister, cutOff: Day): DocMetrics[] {
  if (last && last.register === register && last.cutOff === cutOff) return last.metrics;
  const metrics = computeDocMetrics(register.documents, cutOff);
  last = { register, cutOff, metrics };
  return metrics;
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run src/modules/engineering/filters.test.ts src/modules/engineering/metrics.test.ts` → PASS.
Run: `npm run typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/engineering/filters.ts src/modules/engineering/filters.test.ts src/modules/engineering/metrics.ts src/modules/engineering/metrics.test.ts
git commit -m "feat(engineering): URL filters, search and metrics memo

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Wire the module and the KPI overview

**Files:**
- Modify: `src/modules/engineering/store.ts`, `src/modules/engineering/module.ts`
- Create: `src/modules/engineering/useEngDashboard.ts`
- Modify: `src/modules/types.ts`, `src/ui/shell/AskBox.tsx`, `src/ui/shell/Header.tsx`
- Modify: `src/ui/hooks/useFilters.ts` (export `useDrawerParam`)
- Create: `src/ui/engineering/params.ts`, `src/ui/engineering/EngKpiStrip.tsx`, `src/ui/engineering/EngOverviewPage.tsx`
- Test: `src/ui/engineering/engOverview.test.tsx`
- Delete: `src/ui/engineering/EngineeringPage.tsx`, `src/ui/engineering/engineering.test.tsx`, `src/data/engineering/loadWorkbookSummary.ts`, `src/data/engineering/loadWorkbookSummary.test.ts`
- Modify: `src/App.tsx`, `src/test/seedStore.ts`, `src/ui/shell/shell.test.tsx`, `src/ui/shell/routing.test.tsx`
- Modify: `public/config.json`, `docs/deploy.md`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `parseEmdr` (Task 2); `engKpis`, `EngKpis`, `DocMetrics` (Task 3); filters and `engineeringMetrics` (Task 4); `STAGES`, `GATED_STAGES` (Task 1); `sampleRegister` (Task 3 fixture).
- Produces:
  - `engineeringStore: ModuleStore<EmdrRegister>`; `engineeringModule: ModuleDefinition<EmdrRegister>`
  - `useEngDashboard(): { register?: EmdrRegister; metrics: DocMetrics[]; filtered: DocMetrics[]; filters: EngFilters; setFilters(patch: Partial<EngFilters>): void; clearFilters(): void; cutOff: Day; vocab: SearchVocabulary }`
  - `useDrawerParam(key)` exported from `src/ui/hooks/useFilters.ts`
  - `useDocParam(): { id?: string; open(id: string): void; close(): void }`, `useStageParam(): { stage?: GatedStage; open(stage: GatedStage): void; close(): void }`
  - `EngKpiStrip({ kpis, filters, onFilter })`, `EngOverviewPage()` (Tasks 6–7 add blocks to it)
  - `ModuleSearch.describe?(q: string): string[]`, `ModuleSearch.placeholderKey?: MessageKey`
  - `seedEngineering()` in `src/test/seedStore.ts`

- [ ] **Step 1: Add i18n keys; remove the placeholder keys**

Delete `'engineering.placeholder.title'` and `'engineering.placeholder.detail'` from both files.

`src/i18n/en.ts` — add `'unit.documents'` after `'unit.milestones'`, `'status.documentsLoaded'` after `'status.linesLoaded'`, the rest in the Engineering group:

```ts
  'unit.documents': '{n|document|documents}',
  'status.documentsLoaded': '{count} {count|document|documents}',

  'eng.ask.placeholder': 'Search documents…  e.g. PIP layout',
  'eng.filter.docType': 'Document type',
  'eng.filter.stage': 'Stage (Phase E)',
  'eng.flag.notIssued': 'Not issued',
  'eng.flag.overdue': 'Overdue',
  'eng.flag.code1': 'Code 1 (approved)',
  'eng.flag.code2': 'Code 2 (with comments)',
  'eng.flag.rejected': 'Rejected (Code 3/4)',
  'eng.kpi.total': 'Documents',
  'eng.kpi.issued': 'Issued',
  'eng.kpi.final': 'IFC / IFU',
  'eng.kpi.code1': 'Code 1',
  'eng.kpi.code2': 'Code 2',
  'eng.kpi.notIssued': 'Not issued',
  'eng.kpi.overdue': 'Overdue',
  'eng.kpi.rejected': 'Rejected',
  'eng.kpi.hint.total': 'Deliverables in the register',
  'eng.kpi.hint.issued': 'Issued at least once',
  'eng.kpi.hint.final': 'Issued for Construction or Use',
  'eng.kpi.hint.code1': 'Approved by the client',
  'eng.kpi.hint.code2': 'Approved with comments',
  'eng.kpi.hint.notIssued': 'Never issued (rev 0)',
  'eng.kpi.hint.overdue': 'A planned date passed without the step',
  'eng.kpi.hint.rejected': 'Client Code 3 or 4',
```

`src/i18n/vi.ts`:

```ts
  'unit.documents': 'tài liệu',
  'status.documentsLoaded': '{count} tài liệu',

  'eng.ask.placeholder': 'Tìm tài liệu…  ví dụ: PIP layout',
  'eng.filter.docType': 'Loại tài liệu',
  'eng.filter.stage': 'Bước (Phase E)',
  'eng.flag.notIssued': 'Chưa phát hành',
  'eng.flag.overdue': 'Quá hạn',
  'eng.flag.code1': 'Code 1 (chấp thuận)',
  'eng.flag.code2': 'Code 2 (kèm comment)',
  'eng.flag.rejected': 'Bị từ chối (Code 3/4)',
  'eng.kpi.total': 'Tài liệu',
  'eng.kpi.issued': 'Đã phát hành',
  'eng.kpi.final': 'IFC / IFU',
  'eng.kpi.code1': 'Code 1',
  'eng.kpi.code2': 'Code 2',
  'eng.kpi.notIssued': 'Chưa phát hành',
  'eng.kpi.overdue': 'Quá hạn',
  'eng.kpi.rejected': 'Bị từ chối',
  'eng.kpi.hint.total': 'Tài liệu trong register',
  'eng.kpi.hint.issued': 'Đã phát hành ít nhất một lần',
  'eng.kpi.hint.final': 'Đã phát hành IFC hoặc IFU',
  'eng.kpi.hint.code1': 'Khách hàng chấp thuận',
  'eng.kpi.hint.code2': 'Chấp thuận kèm comment',
  'eng.kpi.hint.notIssued': 'Chưa phát hành lần nào (rev 0)',
  'eng.kpi.hint.overdue': 'Quá ngày kế hoạch mà chưa đạt bước',
  'eng.kpi.hint.rejected': 'Khách hàng trả Code 3 hoặc 4',
```

- [ ] **Step 2: Store loader and dashboard hook**

Replace `src/modules/engineering/store.ts`:

```ts
import { parseEmdr } from '../../data/engineering/parseEmdr';
import type { EmdrRegister } from '../../data/engineering/types';
import { createDataSource } from '../../data/sources/sources';
import { msg } from '../../i18n/message';
import { appStore } from '../../store/appStore';
import { createModuleStore, nextFrame, type ModuleLoader } from '../../store/moduleStore';

/** Fetch the EMDR workbook and read every register tab. */
export function createEngineeringLoader(createSource = createDataSource): ModuleLoader<EmdrRegister> {
  return async (source, { signal, onStep }) => {
    onStep('fetch');
    const buf = await createSource(source).load(signal);
    onStep('parse');
    await nextFrame();
    const parsed = parseEmdr(buf);
    onStep('analyze', msg('status.documentsLoaded', { count: parsed.data.documents.length }));
    await nextFrame();
    return parsed;
  };
}

export const engineeringStore = createModuleStore<EmdrRegister>({
  moduleId: 'engineering',
  loader: createEngineeringLoader(),
  getConfig: () => appStore.getState().config,
  now: () => new Date(),
});
```

Create `src/modules/engineering/useEngDashboard.ts`:

```ts
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { useApp } from '../../store/useApp';
import { useModule } from '../../store/useModule';
import { applyEngFilters, EMPTY_ENG_FILTERS, engFiltersFromParams, engVocabulary, writeEngFilters, type EngFilters } from './filters';
import { engineeringMetrics } from './metrics';
import { engineeringStore } from './store';

const NO_METRICS: DocMetrics[] = [];

/** Everything an Engineering view needs: all document metrics, the filtered subset and URL-backed filters. */
export function useEngDashboard() {
  const register = useModule(engineeringStore, (s) => s.data);
  const cutOff = useApp((s) => s.cutOff);
  const metrics = useMemo(() => (register ? engineeringMetrics(register, cutOff) : NO_METRICS), [register, cutOff]);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => engFiltersFromParams(params), [params]);
  const setFilters = useCallback(
    (patch: Partial<EngFilters>) => setParams((prev) => writeEngFilters(prev, { ...engFiltersFromParams(prev), ...patch }), { replace: true }),
    [setParams],
  );
  const clearFilters = useCallback(() => setParams((prev) => writeEngFilters(prev, EMPTY_ENG_FILTERS), { replace: true }), [setParams]);
  const filtered = useMemo(() => applyEngFilters(metrics, filters), [metrics, filters]);
  const vocab = useMemo(() => engVocabulary(metrics), [metrics]);
  return { register, metrics, filtered, filters, setFilters, clearFilters, cutOff, vocab };
}
```

- [ ] **Step 3: Optional search description and placeholder**

In `src/modules/types.ts`, extend `ModuleSearch`:

```ts
export interface ModuleSearch {
  value: string;
  vocab: SearchVocabulary;
  onChange(q: string): void;
  /** Chips for how the query is read; Procurement's parser when absent. */
  describe?(q: string): string[];
  /** Input placeholder; `ask.placeholder` when absent. */
  placeholderKey?: MessageKey;
}
```

In `src/ui/shell/AskBox.tsx`: add the two optional props and use them.

```tsx
interface AskBoxProps {
  value: string;
  vocab: SearchVocabulary;
  onChange: (q: string) => void;
  describe?: (q: string) => string[];
  placeholderKey?: MessageKey;
}

export function AskBox({ value, vocab, onChange, describe, placeholderKey = 'ask.placeholder' }: AskBoxProps) {
```

Replace the `understood` memo:

```tsx
  const understood = useMemo(
    () => (draft.trim() ? (describe ? describe(draft) : describeSearch(parseSearch(draft, vocab))) : []),
    [draft, vocab, describe],
  );
```

and the input's `placeholder={t('ask.placeholder')}` with `placeholder={t(placeholderKey)}`. Add `import type { MessageKey } from '../../i18n/en';` if AskBox does not import it yet.

In `src/ui/shell/Header.tsx`, `SearchSlot` becomes:

```tsx
function SearchSlot({ module }: { module: AnyModule }) {
  const { value, vocab, onChange, describe, placeholderKey } = module.useSearch!();
  return <AskBox value={value} vocab={vocab} onChange={onChange} describe={describe} placeholderKey={placeholderKey} />;
}
```

- [ ] **Step 4: Module definition**

Replace `src/modules/engineering/module.ts`:

```ts
import { STAGES } from '../../data/engineering/stages';
import type { EmdrRegister, EngDocument } from '../../data/engineering/types';
import type { MessageKey } from '../../i18n/en';
import { FILTER_KEYS } from '../../store/urlFilters';
import type { FacetOption, ModuleDefinition } from '../types';
import { ENG_FLAGS, searchWords, type EngFlag } from './filters';
import { engineeringStore } from './store';
import { useEngDashboard } from './useEngDashboard';

const FLAG_LABEL_KEY: Record<EngFlag, MessageKey> = {
  notIssued: 'eng.flag.notIssued',
  overdue: 'eng.flag.overdue',
  code1: 'eng.flag.code1',
  code2: 'eng.flag.code2',
  rejected: 'eng.flag.rejected',
};

const same = (value: string): FacetOption => ({ value, label: value });
const sorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

/** `SPC · Specification` when the register names the type. */
function docTypeOptions(docs: readonly EngDocument[]): FacetOption[] {
  const labels = new Map<string, string | undefined>();
  for (const d of docs) if (!labels.get(d.docType)) labels.set(d.docType, d.docTypeLabel);
  return sorted([...labels.keys()]).map((value) => ({ value, label: labels.get(value) ? `${value} · ${labels.get(value)}` : value }));
}

export const engineeringModule: ModuleDefinition<EmdrRegister> = {
  id: 'engineering',
  path: '/engineering',
  labelKey: 'module.engineering',
  icon: '⚙',
  store: engineeringStore,
  facets: [
    { key: FILTER_KEYS.disciplines, labelKey: 'filter.discipline', options: (r) => sorted(r.documents.map((d) => d.discipline)).map(same) },
    { key: FILTER_KEYS.facilities, labelKey: 'filter.facility', options: (r) => sorted(r.documents.map((d) => d.facility)).map(same) },
    { key: FILTER_KEYS.itemTypes, labelKey: 'eng.filter.docType', options: (r) => docTypeOptions(r.documents) },
    { key: FILTER_KEYS.phases, labelKey: 'eng.filter.stage', options: (_, t) => STAGES.map((s) => ({ value: s.key, label: t(s.labelKey) })) },
    { key: FILTER_KEYS.flags, labelKey: 'filter.flagsLabel', options: (_, t) => ENG_FLAGS.map((f) => ({ value: f, label: t(FLAG_LABEL_KEY[f]) })) },
  ],
  useSearch() {
    const { filters, setFilters, vocab } = useEngDashboard();
    return {
      value: filters.q,
      vocab,
      onChange: (q) => setFilters({ q }),
      describe: (q) => searchWords(q).map((w) => `"${w}"`),
      placeholderKey: 'eng.ask.placeholder',
    };
  },
  useResultCount() {
    const { filtered, metrics } = useEngDashboard();
    return { shown: filtered.length, total: metrics.length, unitKey: 'unit.documents' };
  },
};
```

- [ ] **Step 5: Drawer params**

In `src/ui/hooks/useFilters.ts`, change `function useDrawerParam(key: string)` to `export function useDrawerParam(key: string)` (no other change).

Create `src/ui/engineering/params.ts`:

```ts
import { GATED_STAGES } from '../../data/engineering/stages';
import type { GatedStage } from '../../data/engineering/types';
import { useDrawerParam } from '../hooks/useFilters';

/** The document drawer is driven by `?doc=<document number>`. */
export function useDocParam() {
  const { value: id, open, close } = useDrawerParam('doc');
  return { id, open, close };
}

/** The stage drawer is driven by `?stage=<gated stage>`; unknown stages read as closed. */
export function useStageParam() {
  const { value, open, close } = useDrawerParam('stage');
  const stage = GATED_STAGES.find((s) => s === value);
  return { stage, open: open as (stage: GatedStage) => void, close };
}
```

- [ ] **Step 6: Write the failing page test**

Add to `src/test/seedStore.ts` (keep `seedStore` unchanged; the engineering store stays `idle` there):

```ts
import { sampleRegister } from './engFixture';

/** Put the Engineering module into a loaded state with the sample register (UI tests). */
export function seedEngineering(): void {
  engineeringStore.setState({
    status: 'ready',
    refreshing: false,
    step: 'done',
    data: sampleRegister(),
    warnings: [],
    lastSync: new Date(),
    error: undefined,
    refreshError: undefined,
  });
}
```

Delete `src/ui/engineering/engineering.test.tsx`. Create `src/ui/engineering/engOverview.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { engineeringStore } from '../../modules/engineering/store';
import { doc, sampleRegister } from '../../test/engFixture';
import { seedEngineering, seedStore } from '../../test/seedStore';
import { EngOverviewPage } from './EngOverviewPage';

// Canvas charts do not run in jsdom; render a labelled placeholder instead.
vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderPage(path = '/') {
  const router = createMemoryRouter([{ path: '/', element: <EngOverviewPage /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  seedStore();
  seedEngineering();
});

describe('EngOverviewPage', () => {
  it('shows the KPI tiles', () => {
    renderPage();
    expect(screen.getByText('Tài liệu').parentElement).toHaveTextContent('6');
    expect(screen.getByRole('button', { name: /Chưa phát hành/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Quá hạn/ })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: /Bị từ chối/ })).toHaveTextContent('1');
  });

  it('toggles flag and stage filters from the tiles', () => {
    const router = renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Chưa phát hành/ }));
    expect(router.state.location.search).toContain('flag=notIssued');
    fireEvent.click(screen.getByRole('button', { name: /IFC \/ IFU/ }));
    expect(router.state.location.search).toContain('phase=final');
  });

  it('hides Overdue without planned dates and Rejected without Code 3/4', () => {
    engineeringStore.setState({ data: { documents: [doc('PQ-CLQ0-PIP-LAY-MPC-00001-00', { rev: 'K01' })] } });
    renderPage();
    expect(screen.queryByRole('button', { name: /Quá hạn/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bị từ chối/ })).not.toBeInTheDocument();
  });

  it('shows the empty state when filters match nothing', () => {
    renderPage('/?q=zzzz');
    expect(screen.getByText('Không có dòng nào khớp bộ lọc hiện tại.')).toBeInTheDocument();
  });

  it('keeps the sample register untouched', () => {
    expect(sampleRegister().documents).toHaveLength(6);
  });
});
```

(`Tài liệu` is the Total tile's label: a non-clickable tile, so it is found by text.)

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run src/ui/engineering/engOverview.test.tsx`
Expected: FAIL — cannot resolve `./EngOverviewPage`.

- [ ] **Step 8: Implement the KPI strip and the page**

`src/ui/engineering/EngKpiStrip.tsx`:

```tsx
import { motion } from 'motion/react';
import type { EngKpis } from '../../analytics/engineering/summaries';
import type { StageKey } from '../../data/engineering/types';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import type { EngFilters, EngFlag } from '../../modules/engineering/filters';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { cardVariants } from '../common/Card';

type CountKey = Exclude<keyof EngKpis, 'hasPlanDates'>;

interface Tile {
  key: CountKey;
  labelKey: MessageKey;
  hintKey: MessageKey;
  flag?: EngFlag;
  stage?: StageKey;
  /** Also show the share of all documents. */
  percent?: boolean;
  tone?: 'critical' | 'warning' | 'good';
  visible?: (kpis: EngKpis) => boolean;
}

const TILES: Tile[] = [
  { key: 'total', labelKey: 'eng.kpi.total', hintKey: 'eng.kpi.hint.total' },
  { key: 'issued', labelKey: 'eng.kpi.issued', hintKey: 'eng.kpi.hint.issued', percent: true },
  { key: 'final', labelKey: 'eng.kpi.final', hintKey: 'eng.kpi.hint.final', stage: 'final', percent: true, tone: 'good' },
  { key: 'code1', labelKey: 'eng.kpi.code1', hintKey: 'eng.kpi.hint.code1', flag: 'code1' },
  { key: 'code2', labelKey: 'eng.kpi.code2', hintKey: 'eng.kpi.hint.code2', flag: 'code2' },
  { key: 'notIssued', labelKey: 'eng.kpi.notIssued', hintKey: 'eng.kpi.hint.notIssued', flag: 'notIssued', tone: 'warning' },
  { key: 'overdue', labelKey: 'eng.kpi.overdue', hintKey: 'eng.kpi.hint.overdue', flag: 'overdue', tone: 'critical', visible: (k) => k.hasPlanDates },
  { key: 'rejected', labelKey: 'eng.kpi.rejected', hintKey: 'eng.kpi.hint.rejected', flag: 'rejected', tone: 'critical', visible: (k) => k.rejected > 0 },
];

const TONE: Record<NonNullable<Tile['tone']>, string> = { critical: 'text-critical', warning: 'text-warning', good: 'text-good' };

interface EngKpiStripProps {
  kpis: EngKpis;
  filters: EngFilters;
  onFilter: (patch: Partial<EngFilters>) => void;
}

/** Headline document counts; tiles with a flag or stage toggle that filter on click. */
export function EngKpiStrip({ kpis, filters, onFilter }: EngKpiStripProps) {
  const { t } = useT();
  const tiles = TILES.filter((tile) => tile.visible?.(kpis) ?? true);

  const toggle = (tile: Tile) => {
    if (tile.flag) {
      const on = filters.flags.includes(tile.flag);
      onFilter({ flags: on ? filters.flags.filter((f) => f !== tile.flag) : [...filters.flags, tile.flag] });
    } else if (tile.stage) {
      const on = filters.stages.includes(tile.stage);
      onFilter({ stages: on ? filters.stages.filter((s) => s !== tile.stage) : [...filters.stages, tile.stage] });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {tiles.map((tile) => {
        const value = kpis[tile.key];
        const active = (tile.flag !== undefined && filters.flags.includes(tile.flag)) || (tile.stage !== undefined && filters.stages.includes(tile.stage));
        const colored = tile.tone !== undefined && value > 0;
        const content = (
          <>
            <p className="text-[11px] font-medium tracking-wider text-ink-3 uppercase">{t(tile.labelKey)}</p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <AnimatedNumber value={value} className={`text-3xl font-semibold ${colored && tile.tone ? TONE[tile.tone] : 'text-ink'}`} />
              {tile.percent && kpis.total > 0 && <span className="font-mono text-sm text-ink-3">{Math.round((value / kpis.total) * 100)}%</span>}
            </p>
            <p className="mt-1 text-[11px] text-ink-3">{t(tile.hintKey)}</p>
          </>
        );
        const base = `rounded-2xl border bg-surface p-4 text-left backdrop-blur-md ${active ? 'border-ai-1' : 'border-line'}`;
        return tile.flag || tile.stage ? (
          <motion.button
            key={tile.key}
            type="button"
            variants={cardVariants}
            whileHover={{ y: -2 }}
            aria-pressed={active}
            className={`${base} cursor-pointer`}
            onClick={() => toggle(tile)}
          >
            {content}
          </motion.button>
        ) : (
          <motion.div key={tile.key} variants={cardVariants} className={base}>
            {content}
          </motion.div>
        );
      })}
    </div>
  );
}
```

`src/ui/engineering/EngOverviewPage.tsx`:

```tsx
import { useMemo } from 'react';
import { engKpis } from '../../analytics/engineering/summaries';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { EngKpiStrip } from './EngKpiStrip';

export function EngOverviewPage() {
  const { filtered, filters, setFilters, clearFilters } = useEngDashboard();
  const kpis = useMemo(() => engKpis(filtered), [filtered]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <EngKpiStrip kpis={kpis} filters={filters} onFilter={setFilters} />
      </ErrorBoundary>
    </Stagger>
  );
}
```

- [ ] **Step 9: Routes, placeholder removal, config and docs**

In `src/App.tsx`, the engineering index route becomes:

```tsx
          { index: true, lazy: () => import('./ui/engineering/EngOverviewPage').then((m) => ({ Component: m.EngOverviewPage })) },
```

Delete `src/ui/engineering/EngineeringPage.tsx`, `src/data/engineering/loadWorkbookSummary.ts` and `src/data/engineering/loadWorkbookSummary.test.ts` (`git rm`). If `isZip` in `src/data/parser/parsePlan.ts` was exported only for the placeholder, keep it exported — `parseEmdr` uses it.

In `public/config.json`, add the engineering source inside `dataSources`:

```json
    "engineering": {
      "type": "google-sheet",
      "url": "https://docs.google.com/spreadsheets/d/1ePtJRHK5wQbieWHLNaUs0aJmbifeFDzxLrKSDSEibxo/export?format=xlsx"
    }
```

In `docs/deploy.md`, change the `sheetName` table row to:

```md
| `dataSources.<module>.sheetName` | Procurement: tên sheet dữ liệu (mặc định sheet đầu tiên). Engineering bỏ qua trường này và đọc mọi tab register (mọi tab trừ `Summary`) |
```

and the example's engineering line to:

```json
  "engineering": { "type": "google-sheet", "url": "https://docs.google.com/spreadsheets/d/<id>/edit" }
```

- [ ] **Step 10: Update the shell and routing tests**

In `src/ui/shell/shell.test.tsx` and `src/ui/shell/routing.test.tsx`:

- Replace every `data: { sheetName: 'ENG', sheets: ['ENG'], rowCount: 3 }` with `data: sampleRegister()` and add `import { sampleRegister } from '../../test/engFixture';`.
- Replace every wait on the placeholder text (`/Đã tải 3 dòng/` or the full placeholder sentence) with `await screen.findByRole('button', { name: /Chưa phát hành/ })`.
- Rewrite the shell test `'hides the AskBox and the filter bar on a module without search or facets'` as:

```tsx
  it('shows the engineering search, facets and document count', async () => {
    engineeringStore.setState(ENG_READY);
    renderAt('/engineering');
    await screen.findByRole('button', { name: /Chưa phát hành/ });
    expect(await screen.findByText('Test Project · Engineering')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Tìm tài liệu/)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Loại tài liệu/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\/ 6 tài liệu/).length).toBeGreaterThan(0);
  });
```

Run `grep -rn "rowCount\|EngineeringPage\|summarizeWorkbook\|engineering.placeholder" src` afterwards; it must print nothing.

- [ ] **Step 11: Run the tests and typecheck**

Run: `npx vitest run src/ui/engineering src/ui/shell` → PASS.
Run: `npm test` → all pass. Run: `npm run typecheck` → no errors.

- [ ] **Step 12: Commit**

```bash
git add src/modules/engineering/store.ts src/modules/engineering/module.ts src/modules/engineering/useEngDashboard.ts src/modules/types.ts src/ui/shell/AskBox.tsx src/ui/shell/Header.tsx src/ui/hooks/useFilters.ts src/ui/engineering/params.ts src/ui/engineering/EngKpiStrip.tsx src/ui/engineering/EngOverviewPage.tsx src/ui/engineering/engOverview.test.tsx src/App.tsx src/test/seedStore.ts src/ui/shell/shell.test.tsx src/ui/shell/routing.test.tsx public/config.json docs/deploy.md src/i18n/en.ts src/i18n/vi.ts
git rm src/ui/engineering/EngineeringPage.tsx src/ui/engineering/engineering.test.tsx src/data/engineering/loadWorkbookSummary.ts src/data/engineering/loadWorkbookSummary.test.ts
git commit -m "feat(engineering): load the EMDR and show the KPI overview

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Phase E timeline and stage drawer

**Files:**
- Modify: `src/ui/theme/palette.ts` (add `stageColor`)
- Create: `src/ui/engineering/StageChip.tsx`
- Create: `src/ui/engineering/StageTimeline.tsx`
- Create: `src/ui/engineering/StageProgressDrawer.tsx`
- Modify: `src/ui/engineering/EngOverviewPage.tsx`
- Test: `src/ui/engineering/engOverview.test.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `stageProgress`, `StageProgress`, `StageDoc` (Task 3); `StageState` (Task 3); `useStageParam`, `useDocParam` (Task 5); `progressTone`, `ProgressTone` from `src/analytics/phaseProgress.ts`; `STAGE_LABEL_KEY` (Task 1).
- Produces: `stageColor(stage: StageKey, theme: Theme): string`; `StageChip({ stage, muted? })`; `StageTimeline({ progress, notIssued, onSelect })`; `StageProgressDrawer({ progress })`.

- [ ] **Step 1: i18n keys**

`src/i18n/en.ts` (Engineering group):

```ts
  'eng.timeline.title': 'Phase E progress',
  'eng.timeline.subtitle': 'Documents that reached each step · {notIssued} not issued yet · click a step for its documents',
  'eng.timeline.nodeLabel': '{stage}: {reached} of {total} documents',
  'eng.timeline.plan': 'Plan {done} / {due}',
  'eng.timeline.late': '{count} late',
  'eng.timeline.noPlan': 'No planned dates',
  'eng.stageDrawer.summary': '{reached} / {total} documents reached this step · {late} late',
  'eng.stageDrawer.empty': 'No documents in this list.',
  'eng.stageDrawer.plan': 'Plan',
```

`src/i18n/vi.ts`:

```ts
  'eng.timeline.title': 'Tiến độ Phase E',
  'eng.timeline.subtitle': 'Số tài liệu đã đạt từng bước · {notIssued} chưa phát hành · bấm một bước để xem tài liệu',
  'eng.timeline.nodeLabel': '{stage}: {reached} / {total} tài liệu',
  'eng.timeline.plan': 'Kế hoạch {done} / {due}',
  'eng.timeline.late': '{count} trễ',
  'eng.timeline.noPlan': 'Chưa có ngày kế hoạch',
  'eng.stageDrawer.summary': '{reached} / {total} tài liệu đã đạt bước này · {late} trễ',
  'eng.stageDrawer.empty': 'Không có tài liệu nào trong danh sách này.',
  'eng.stageDrawer.plan': 'Kế hoạch',
```

- [ ] **Step 2: Stage colour and chip**

In `src/ui/theme/palette.ts`, after `phaseColor`:

```ts
/** Phase E steps reuse categorical slots (blue, amber, green); Not issued is neutral. */
export function stageColor(stage: StageKey, theme: Theme): string {
  const slot: Partial<Record<StageKey, number>> = { review: 0, commented: 3, final: 2 };
  const i = slot[stage];
  return i === undefined ? NEUTRAL[theme] : CATEGORICAL[theme][i];
}
```

and `import type { StageKey } from '../../data/engineering/types';` at the top.

`src/ui/engineering/StageChip.tsx`:

```tsx
import { STAGE_LABEL_KEY } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { stageColor } from '../theme/palette';

export function StageChip({ stage, muted = false }: { stage: StageKey; muted?: boolean }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs whitespace-nowrap ${muted ? 'text-ink-3' : 'text-ink'}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: stageColor(stage, theme) }} />
      {t(STAGE_LABEL_KEY[stage])}
    </span>
  );
}
```

- [ ] **Step 3: Write the failing tests**

Append to `src/ui/engineering/engOverview.test.tsx` (inside the `describe`):

```tsx
  it('draws the Phase E timeline and opens a stage drawer, late documents first', async () => {
    const router = renderPage();
    expect(screen.getByText('Tiến độ Phase E')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đang review (IFI/IFR): 4 / 6 tài liệu' }));
    expect(router.state.location.search).toContain('stage=review');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('4 / 6 tài liệu đã đạt bước này · 1 trễ');
    const rows = within(dialog).getAllByRole('button', { name: /^PQ-/ });
    expect(rows[0]).toHaveAccessibleName('PQ-CPC0-STR-BOD-MPC-00006-00');
    fireEvent.click(rows[0]);
    expect(router.state.location.search).toContain('doc=PQ-CPC0-STR-BOD-MPC-00006-00');
  });

  it('opens the stage drawer from the URL', async () => {
    renderPage('/?stage=final');
    expect(await screen.findByRole('dialog')).toHaveTextContent('1 / 6 tài liệu đã đạt bước này · 0 trễ');
  });
```

and add `within` to the `@testing-library/react` import.

- [ ] **Step 4: Run to verify they fail**

Run: `npx vitest run src/ui/engineering/engOverview.test.tsx`
Expected: FAIL — timeline title not found.

- [ ] **Step 5: Implement `StageTimeline.tsx`**

```tsx
import { motion, useReducedMotion } from 'motion/react';
import type { StageProgress } from '../../analytics/engineering/stageProgress';
import { progressTone, type ProgressTone } from '../../analytics/phaseProgress';
import { STAGE_LABEL_KEY } from '../../data/engineering/stages';
import type { GatedStage } from '../../data/engineering/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { Card } from '../common/Card';
import { stageColor } from '../theme/palette';

interface StageTimelineProps {
  progress: readonly StageProgress[];
  notIssued: number;
  onSelect: (stage: GatedStage) => void;
}

const TONE_TEXT: Record<ProgressTone, string> = {
  good: 'text-good',
  warning: 'text-warning',
  critical: 'text-critical',
  none: 'text-ai-1',
};

/** Seconds between one node's entrance and the next. */
const STEP = 0.12;

/** A line through the gated Phase E steps; each ring shows the share of documents that reached the step. */
export function StageTimeline({ progress, notIssued, onSelect }: StageTimelineProps) {
  const { t } = useT();
  const reduced = useReducedMotion() ?? false;
  const draw = reduced ? { duration: 0 } : { duration: 0.9, ease: 'easeInOut' as const };

  return (
    <Card title={t('eng.timeline.title')} subtitle={t('eng.timeline.subtitle', { notIssued })}>
      <ol className="relative grid gap-3 lg:grid-cols-3 lg:gap-2">
        <div aria-hidden className="absolute top-7 right-[calc(100%/6)] left-[calc(100%/6)] hidden h-0.5 rounded-full bg-line lg:block">
          <motion.div
            className="h-full origin-left rounded-full bg-gradient-to-r from-ai-1 to-ai-2"
            initial={{ scaleX: reduced ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={draw}
          />
        </div>
        <div aria-hidden className="absolute top-7 bottom-7 left-7 w-0.5 rounded-full bg-line lg:hidden">
          <motion.div
            className="w-full origin-top rounded-full bg-gradient-to-b from-ai-1 to-ai-2"
            style={{ height: '100%' }}
            initial={{ scaleY: reduced ? 1 : 0 }}
            animate={{ scaleY: 1 }}
            transition={draw}
          />
        </div>
        {progress.map((p, i) => (
          <StageNode key={p.stage} progress={p} index={i} reduced={reduced} onSelect={onSelect} />
        ))}
      </ol>
    </Card>
  );
}

interface StageNodeProps {
  progress: StageProgress;
  index: number;
  reduced: boolean;
  onSelect: (stage: GatedStage) => void;
}

function StageNode({ progress: p, index, reduced, onSelect }: StageNodeProps) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const label = t(STAGE_LABEL_KEY[p.stage]);
  const share = p.total > 0 ? p.reached / p.total : 0;
  const tone = progressTone(p.ratio);
  const delay = reduced ? 0 : 0.2 + index * STEP;

  return (
    <motion.li
      className="relative"
      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 18 }}
    >
      <motion.button
        type="button"
        aria-label={t('eng.timeline.nodeLabel', { stage: label, reached: p.reached, total: p.total })}
        onClick={() => onSelect(p.stage)}
        whileHover={reduced ? undefined : { y: -2 }}
        className="group flex w-full cursor-pointer items-center gap-3 rounded-xl p-0 text-left focus-visible:outline-2 focus-visible:outline-ai-1 lg:flex-col lg:gap-2 lg:text-center"
      >
        {/* bg-bg under bg-surface reproduces the card color opaquely, so the ring hides the track behind it. */}
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-bg">
          <span aria-hidden className="absolute inset-0 rounded-full bg-surface" />
          <svg aria-hidden viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" className="stroke-line" />
            <motion.circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              stroke="currentColor"
              // A round cap draws a dot even at zero length.
              opacity={share > 0 ? 1 : 0}
              className={TONE_TEXT[tone]}
              initial={{ pathLength: reduced ? share : 0 }}
              animate={{ pathLength: share }}
              transition={reduced ? { duration: 0 } : { delay: delay + 0.15, duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <span className={`relative font-mono text-xs font-semibold ${TONE_TEXT[tone]}`}>{Math.round(share * 100)}%</span>
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2 group-hover:text-ink lg:justify-center">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: stageColor(p.stage, theme) }} />
            {label}
          </span>
          <span className="mt-0.5 block text-lg font-semibold text-ink">
            <AnimatedNumber value={p.reached} />
            <span className="font-mono text-ink-3"> / </span>
            <AnimatedNumber value={p.total} className="text-ink-2" />
          </span>
          <span className="block text-[11px] text-ink-3">
            {p.planDue === 0 ? (
              t('eng.timeline.noPlan')
            ) : (
              <>
                {t('eng.timeline.plan', { done: p.doneDue, due: p.planDue })}
                {p.late > 0 && <span className="text-critical"> · {t('eng.timeline.late', { count: p.late })}</span>}
              </>
            )}
          </span>
        </span>
      </motion.button>
    </motion.li>
  );
}
```

- [ ] **Step 6: Implement `StageProgressDrawer.tsx`**

```tsx
import { motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import type { StageState } from '../../analytics/engineering/docMetrics';
import type { StageDoc, StageProgress } from '../../analytics/engineering/stageProgress';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { Drawer } from '../common/Drawer';
import { useDocParam, useStageParam } from './params';
import { StageChip } from './StageChip';

type Tab = 'late' | 'done' | 'all';

const TABS: { key: Tab; labelKey: MessageKey; match: (d: StageDoc) => boolean }[] = [
  { key: 'late', labelKey: 'phaseDrawer.tab.late', match: (d) => d.check.state === 'late' },
  { key: 'done', labelKey: 'phaseDrawer.tab.done', match: (d) => d.check.state === 'done' },
  { key: 'all', labelKey: 'phaseDrawer.tab.all', match: () => true },
];

const STATE_STYLE: Record<StageState, { labelKey: MessageKey; className: string }> = {
  late: { labelKey: 'phaseDrawer.state.late', className: 'bg-critical/15 text-critical' },
  done: { labelKey: 'phaseDrawer.state.done', className: 'bg-good/15 text-good' },
  pending: { labelKey: 'phaseDrawer.state.pending', className: 'bg-surface-2 text-ink-3' },
};

/** Documents behind one timeline step, opened with `?stage=<stage>`. */
export function StageProgressDrawer({ progress }: { progress: readonly StageProgress[] }) {
  const { t } = useT();
  const { stage, close } = useStageParam();
  const { open: openDoc } = useDocParam();
  const [chosen, setChosen] = useState<Tab | undefined>();
  const current = progress.find((p) => p.stage === stage);
  const tab = chosen ?? (current && current.late > 0 ? 'late' : 'all');
  const match = TABS.find((x) => x.key === tab)!.match;
  const rows = current?.docs.filter(match) ?? [];

  return (
    <Drawer
      open={current !== undefined}
      onClose={() => {
        setChosen(undefined);
        close();
      }}
      title={
        current && (
          <div>
            <StageChip stage={current.stage} />
            <p className="mt-1 text-xs text-ink-3">
              {t('eng.stageDrawer.summary', { reached: current.reached, total: current.total, late: current.late })}
            </p>
          </div>
        )
      }
    >
      {current && (
        <>
          <div role="tablist" aria-label={t('phaseDrawer.tabsLabel')} className="mb-3 flex w-fit rounded-lg border border-line p-0.5 text-xs">
            {TABS.map((x) => (
              <button
                key={x.key}
                type="button"
                role="tab"
                aria-selected={tab === x.key}
                onClick={() => setChosen(x.key)}
                className={`rounded-md px-3 py-1 ${tab === x.key ? 'bg-ai-1/20 text-ai-1' : 'text-ink-3 hover:text-ink'}`}
              >
                {t(x.labelKey)} <span className="font-mono">{current.docs.filter(x.match).length}</span>
              </button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-3">{t('eng.stageDrawer.empty')}</p>
          ) : (
            <ul key={tab} className="space-y-1.5">
              {rows.map((row, i) => (
                <StageDocRow key={row.metrics.doc.id} row={row} index={i} onOpen={openDoc} />
              ))}
            </ul>
          )}
        </>
      )}
    </Drawer>
  );
}

function StageDocRow({ row, index, onOpen }: { row: StageDoc; index: number; onOpen: (id: string) => void }) {
  const { t } = useT();
  const reduced = useReducedMotion();
  const { doc } = row.metrics;
  const { check } = row;
  const style = STATE_STYLE[check.state];
  const delayTone = check.delayDays === undefined ? 'text-ink-3' : check.delayDays > 0 ? 'text-critical' : 'text-good';

  return (
    <motion.li
      initial={reduced ? false : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.2 }}
    >
      <button
        type="button"
        aria-label={doc.id}
        onClick={() => onOpen(doc.id)}
        className="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-surface px-3 py-2 text-left text-xs hover:border-ai-1 sm:grid-cols-[minmax(0,1fr)_6rem_6rem_4rem_5.5rem]"
      >
        <span className="min-w-0">
          <span className="font-mono text-ai-1">{doc.id}</span>
          <span className="block truncate text-ink-2">{doc.title || '—'}</span>
        </span>
        <span className="text-ink-3 sm:text-ink-2">
          <span className="sm:hidden">{t('eng.stageDrawer.plan')}: </span>
          <span className="font-mono">{formatDay(check.plan)}</span>
        </span>
        <span className="font-mono text-good">{check.actual !== undefined ? formatDay(check.actual) : ''}</span>
        <span className={`font-mono sm:text-right ${delayTone}`}>
          {check.delayDays === undefined ? '' : check.delayDays > 0 ? `+${check.delayDays}` : check.delayDays}
        </span>
        <span className={`w-fit rounded-full px-2 py-0.5 text-[11px] sm:justify-self-end ${style.className}`}>{t(style.labelKey)}</span>
      </button>
    </motion.li>
  );
}
```

- [ ] **Step 7: Add the timeline to the page**

In `EngOverviewPage.tsx`: import `stageProgress`, `useT`, `useStageParam`, `StageTimeline`, `StageProgressDrawer`; add

```tsx
  const { t } = useT();
  const { open: openStage } = useStageParam();
  const progress = useMemo(() => stageProgress(filtered), [filtered]);
```

(before the early return), and after the KPI `ErrorBoundary`:

```tsx
      <ErrorBoundary label={t('eng.timeline.title')}>
        <StageTimeline progress={progress} notIssued={kpis.notIssued} onSelect={openStage} />
        <StageProgressDrawer progress={progress} />
      </ErrorBoundary>
```

- [ ] **Step 8: Run the tests and typecheck**

Run: `npx vitest run src/ui/engineering` → PASS. Run: `npm run typecheck` → no errors.

- [ ] **Step 9: Commit**

```bash
git add src/ui/theme/palette.ts src/ui/engineering/StageChip.tsx src/ui/engineering/StageTimeline.tsx src/ui/engineering/StageProgressDrawer.tsx src/ui/engineering/EngOverviewPage.tsx src/ui/engineering/engOverview.test.tsx src/i18n/en.ts src/i18n/vi.ts
git commit -m "feat(engineering): Phase E timeline and stage drawer

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Stage funnel, discipline status and transmittal activity

**Files:**
- Create: `src/ui/engineering/StageFunnel.tsx`
- Create: `src/ui/engineering/DisciplineStatusGrid.tsx`
- Create: `src/ui/engineering/TransmittalChart.tsx`
- Modify: `src/ui/engineering/EngOverviewPage.tsx`
- Test: `src/ui/engineering/engOverview.test.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `DocMetrics` (Task 3), `disciplineStatus`, `DisciplineStatus`, `EngRisk`, `transmittalActivity` (Task 3); `STAGES` (Task 1); `stageColor` (Task 6); `engineeringModule` (Task 5); `EChart`, `Card`, `CHART_INK`, `CATEGORICAL`.
- Produces: `StageFunnel({ metrics, onSelectStage })`, `DisciplineStatusGrid({ status })`, `TransmittalChart({ metrics })`.

- [ ] **Step 1: i18n keys**

`src/i18n/en.ts`:

```ts
  'eng.funnel.title': 'Stage funnel',
  'eng.funnel.subtitle': 'Documents at each step now · click a bar to filter',
  'eng.funnel.chartAriaLabel': 'Document count by stage',
  'eng.discipline.title': 'Discipline status',
  'eng.discipline.subtitle': 'At risk: something overdue · Watch: over 30% not issued · click for documents',
  'eng.discipline.documents': 'Documents',
  'eng.discipline.final': 'IFC/IFU',
  'eng.discipline.notIssued': 'Not issued',
  'eng.discipline.overdue': 'Overdue',
  'eng.transmittal.title': 'Transmittal activity',
  'eng.transmittal.subtitle': 'Documents received per week (Incoming Transmittal date)',
  'eng.transmittal.chartAriaLabel': 'Documents received per week',
  'eng.transmittal.noData': 'No transmittal dates.',
```

`src/i18n/vi.ts`:

```ts
  'eng.funnel.title': 'Phân bố theo bước',
  'eng.funnel.subtitle': 'Số tài liệu đang ở mỗi bước · bấm một cột để lọc',
  'eng.funnel.chartAriaLabel': 'Số tài liệu theo bước',
  'eng.discipline.title': 'Tình trạng theo discipline',
  'eng.discipline.subtitle': 'Rủi ro: có tài liệu quá hạn · Theo dõi: hơn 30% chưa phát hành · bấm để xem tài liệu',
  'eng.discipline.documents': 'Tài liệu',
  'eng.discipline.final': 'IFC/IFU',
  'eng.discipline.notIssued': 'Chưa phát hành',
  'eng.discipline.overdue': 'Quá hạn',
  'eng.transmittal.title': 'Hoạt động transmittal',
  'eng.transmittal.subtitle': 'Số tài liệu nhận được mỗi tuần (ngày Incoming Transmittal)',
  'eng.transmittal.chartAriaLabel': 'Số tài liệu nhận được mỗi tuần',
  'eng.transmittal.noData': 'Chưa có ngày transmittal.',
```

- [ ] **Step 2: Write the failing tests**

Append to `src/ui/engineering/engOverview.test.tsx`:

```tsx
  it('draws the funnel, discipline cards and transmittal chart', () => {
    renderPage('/?facility=CLQ0');
    expect(screen.getByRole('img', { name: 'Số tài liệu theo bước' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Số tài liệu nhận được mỗi tuần' })).toBeInTheDocument();
    const pip = screen.getByRole('link', { name: /PIP/ });
    expect(pip).toHaveAttribute('href', '/engineering/discipline/PIP?facility=CLQ0');
    expect(pip).toHaveTextContent('Rủi ro');
    expect(screen.queryByRole('link', { name: /STR/ })).not.toBeInTheDocument();
  });
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/ui/engineering/engOverview.test.tsx` → FAIL (chart not found).

- [ ] **Step 4: Implement `StageFunnel.tsx`**

```tsx
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { STAGES } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CHART_INK, stageColor } from '../theme/palette';

interface StageFunnelProps {
  metrics: readonly DocMetrics[];
  onSelectStage: (stage: StageKey) => void;
}

/** Documents currently at each step. Bars are direct-labeled; one series, so no legend box. */
export function StageFunnel({ metrics, onSelectStage }: StageFunnelProps) {
  const { t, lang } = useT();
  const theme = useApp((s) => s.theme);
  const ink = CHART_INK[theme];
  const data = useMemo(() => STAGES.map((s) => ({ ...s, count: metrics.filter((m) => m.stage === s.key).length })), [metrics]);

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const { name, value } = p as unknown as { name: string; value: number };
          return `${name}: ${value} ${t('unit.documents', { n: value })}`;
        },
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((d) => t(d.labelKey)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: ink.muted },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 18,
          data: data.map((d) => ({ value: d.count, itemStyle: { color: stageColor(d.key, theme), borderRadius: [0, 4, 4, 0] } })),
          label: { show: true, position: 'right', color: ink.text, fontFamily: 'JetBrains Mono Variable, monospace' },
        },
      ],
    }),
    [data, ink, theme, lang, t],
  );

  return (
    <Card title={t('eng.funnel.title')} subtitle={t('eng.funnel.subtitle')}>
      <EChart
        ariaLabel={t('eng.funnel.chartAriaLabel')}
        height={220}
        option={option}
        onEvents={{ click: (p) => onSelectStage(data[(p as { dataIndex: number }).dataIndex].key) }}
      />
    </Card>
  );
}
```

- [ ] **Step 5: Implement `DisciplineStatusGrid.tsx`**

```tsx
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import type { DisciplineStatus, EngRisk } from '../../analytics/engineering/summaries';
import { STAGE_KEYS } from '../../data/engineering/stages';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { engineeringModule } from '../../modules/engineering/module';
import { useApp } from '../../store/useApp';
import { Card } from '../common/Card';
import { stageColor } from '../theme/palette';

const LEVEL: Record<EngRisk, { labelKey: MessageKey; icon: string; ring: string; tone: string }> = {
  ok: { labelKey: 'disciplineGrid.level.ok', icon: '✓', ring: 'border-good/40', tone: 'text-good' },
  warning: { labelKey: 'disciplineGrid.level.watch', icon: '●', ring: 'border-warning/50', tone: 'text-warning' },
  critical: { labelKey: 'disciplineGrid.level.risk', icon: '▲', ring: 'border-critical/60', tone: 'text-critical' },
};

export function DisciplineStatusGrid({ status }: { status: DisciplineStatus[] }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const [params] = useSearchParams();
  const query = params.toString();
  return (
    <Card title={t('eng.discipline.title')} subtitle={t('eng.discipline.subtitle')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {status.map((s) => {
          const lvl = LEVEL[s.risk];
          return (
            <motion.div key={s.discipline} layoutId={`eng-discipline-${s.discipline}`} whileHover={{ y: -2 }}>
              <Link
                to={{ pathname: `${engineeringModule.path}/discipline/${encodeURIComponent(s.discipline)}`, search: query ? `?${query}` : '' }}
                className={`block rounded-xl border bg-surface p-3 transition-colors hover:bg-surface-2 ${lvl.ring}`}
              >
                <p className="truncate text-xs font-semibold tracking-wide text-ink" title={s.discipline}>
                  {s.discipline}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] ${lvl.tone}`}>
                  <span aria-hidden>{lvl.icon}</span>
                  {t(lvl.labelKey)}
                </p>
                <div aria-hidden className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line">
                  {STAGE_KEYS.map((k) =>
                    s.byStage[k] > 0 ? <span key={k} style={{ width: `${(s.byStage[k] / s.total) * 100}%`, background: stageColor(k, theme) }} /> : null,
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 text-[11px] text-ink-3">
                  <dt>{t('eng.discipline.documents')}</dt>
                  <dd className="text-right font-mono text-ink-2">{s.total}</dd>
                  <dt>{t('eng.discipline.final')}</dt>
                  <dd className="text-right font-mono text-ink-2">{Math.round(s.finalRatio * 100)}%</dd>
                  <dt>{t('eng.discipline.notIssued')}</dt>
                  <dd className="text-right font-mono text-ink-2">{s.notIssued}</dd>
                  <dt>{t('eng.discipline.overdue')}</dt>
                  <dd className={`text-right font-mono ${s.overdue ? 'text-critical' : 'text-ink-2'}`}>{s.overdue}</dd>
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

- [ ] **Step 6: Implement `TransmittalChart.tsx`**

```tsx
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { transmittalActivity } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

/** Documents received per week, from incoming transmittal dates. */
export function TransmittalChart({ metrics }: { metrics: readonly DocMetrics[] }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const ink = CHART_INK[theme];
  const weeks = useMemo(() => transmittalActivity(metrics), [metrics]);

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 12, top: 16, bottom: 48, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: weeks.map((w) => formatDay(w.start)), axisLabel: { color: ink.muted }, axisLine: { lineStyle: { color: ink.grid } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: ink.muted }, splitLine: { lineStyle: { color: ink.grid } } },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', height: 16, bottom: 8, borderColor: 'transparent', textStyle: { color: ink.muted } },
      ],
      series: [
        {
          type: 'bar',
          name: t('eng.transmittal.title'),
          data: weeks.map((w) => w.count),
          barMaxWidth: 22,
          itemStyle: { color: CATEGORICAL[theme][0], borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [weeks, ink, theme, t],
  );

  return (
    <Card title={t('eng.transmittal.title')} subtitle={t('eng.transmittal.subtitle')}>
      {weeks.length === 0 ? (
        <p className="text-sm text-ink-3">{t('eng.transmittal.noData')}</p>
      ) : (
        <EChart ariaLabel={t('eng.transmittal.chartAriaLabel')} height={280} option={option} />
      )}
    </Card>
  );
}
```

- [ ] **Step 7: Compose the page**

`EngOverviewPage.tsx`, final form:

```tsx
import { useMemo } from 'react';
import { stageProgress } from '../../analytics/engineering/stageProgress';
import { disciplineStatus, engKpis } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { DisciplineStatusGrid } from './DisciplineStatusGrid';
import { EngKpiStrip } from './EngKpiStrip';
import { useStageParam } from './params';
import { StageFunnel } from './StageFunnel';
import { StageProgressDrawer } from './StageProgressDrawer';
import { StageTimeline } from './StageTimeline';
import { TransmittalChart } from './TransmittalChart';

/** Same grid and block order as the Procurement overview. */
export function EngOverviewPage() {
  const { t } = useT();
  const { filtered, filters, setFilters, clearFilters } = useEngDashboard();
  const { open: openStage } = useStageParam();
  const kpis = useMemo(() => engKpis(filtered), [filtered]);
  const progress = useMemo(() => stageProgress(filtered), [filtered]);
  const disciplines = useMemo(() => disciplineStatus(filtered), [filtered]);

  if (filtered.length === 0) return <EmptyFilterState onClear={clearFilters} />;

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <ErrorBoundary label="KPI">
        <EngKpiStrip kpis={kpis} filters={filters} onFilter={setFilters} />
      </ErrorBoundary>
      <ErrorBoundary label={t('eng.timeline.title')}>
        <StageTimeline progress={progress} notIssued={kpis.notIssued} onSelect={openStage} />
        <StageProgressDrawer progress={progress} />
      </ErrorBoundary>
      <div className="grid gap-4 lg:grid-cols-2">
        <ErrorBoundary label={t('eng.funnel.title')}>
          <StageFunnel metrics={filtered} onSelectStage={(s) => setFilters({ stages: [s] })} />
        </ErrorBoundary>
        <ErrorBoundary label={t('eng.discipline.title')}>
          <DisciplineStatusGrid status={disciplines} />
        </ErrorBoundary>
      </div>
      <ErrorBoundary label={t('eng.transmittal.title')}>
        <TransmittalChart metrics={filtered} />
      </ErrorBoundary>
    </Stagger>
  );
}
```

- [ ] **Step 8: Run the tests and typecheck**

Run: `npx vitest run src/ui/engineering` → PASS. Run: `npm run typecheck` → no errors.

- [ ] **Step 9: Commit**

```bash
git add src/ui/engineering/StageFunnel.tsx src/ui/engineering/DisciplineStatusGrid.tsx src/ui/engineering/TransmittalChart.tsx src/ui/engineering/EngOverviewPage.tsx src/ui/engineering/engOverview.test.tsx src/i18n/en.ts src/i18n/vi.ts
git commit -m "feat(engineering): stage funnel, discipline status and transmittal activity

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Discipline page and document drawer

**Files:**
- Create: `src/ui/engineering/DocumentTable.tsx`
- Create: `src/ui/engineering/EngDisciplinePage.tsx`
- Create: `src/ui/engineering/DocumentDrawer.tsx`
- Modify: `src/App.tsx`
- Test: `src/ui/engineering/engDiscipline.test.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/vi.ts`

**Interfaces:**
- Consumes: `useEngDashboard` (Task 5), `useDocParam` (Task 5), `DocMetrics`, `StageState`, `engKpis` (Task 3), `EngKpiStrip` (Task 5), `StageChip` (Task 6), `GATED_STAGES`, `STAGE_LABEL_KEY`, `stageIndex` (Task 1), `engineeringModule` (Task 5).
- Produces: `DocumentTable({ docs, onOpen })`, `EngDisciplinePage()`, `DocumentDrawer()`; routes `/engineering/discipline/:name` and the `?doc=` overlay.

- [ ] **Step 1: i18n keys**

`src/i18n/en.ts`:

```ts
  'eng.table.title': 'Documents ({count})',
  'eng.table.subtitle': 'Overdue and rejected first · click a row for details',
  'eng.table.document': 'Document',
  'eng.table.stage': 'Stage',
  'eng.table.rev': 'Rev',
  'eng.table.code': 'Code',
  'eng.table.transmittal': 'Transmittal',
  'eng.table.risk': 'Risk',
  'eng.table.overdue': 'Overdue',
  'eng.table.rejected': 'Rejected',
  'eng.table.errorLabel': 'Document list',
  'eng.doc.notFound': 'Document {id} not found.',
  'eng.doc.status': 'Status',
  'eng.doc.docType': 'Document type',
  'eng.doc.sourceTab': 'Source tab',
  'eng.doc.transmittal': 'Incoming transmittal',
  'eng.doc.steps': 'Steps',
  'eng.doc.plan': 'Plan',
  'eng.doc.actual': 'Actual',
  'eng.doc.remark': 'Remark',
```

`src/i18n/vi.ts`:

```ts
  'eng.table.title': 'Tài liệu ({count})',
  'eng.table.subtitle': 'Quá hạn và bị từ chối lên đầu · bấm một dòng để xem chi tiết',
  'eng.table.document': 'Tài liệu',
  'eng.table.stage': 'Bước',
  'eng.table.rev': 'Rev',
  'eng.table.code': 'Code',
  'eng.table.transmittal': 'Transmittal',
  'eng.table.risk': 'Rủi ro',
  'eng.table.overdue': 'Quá hạn',
  'eng.table.rejected': 'Bị từ chối',
  'eng.table.errorLabel': 'Danh sách tài liệu',
  'eng.doc.notFound': 'Không tìm thấy tài liệu {id}.',
  'eng.doc.status': 'Trạng thái',
  'eng.doc.docType': 'Loại tài liệu',
  'eng.doc.sourceTab': 'Tab nguồn',
  'eng.doc.transmittal': 'Incoming transmittal',
  'eng.doc.steps': 'Các bước',
  'eng.doc.plan': 'Kế hoạch',
  'eng.doc.actual': 'Thực tế',
  'eng.doc.remark': 'Ghi chú',
```

- [ ] **Step 2: Write the failing tests**

`src/ui/engineering/engDiscipline.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../../App';
import { seedEngineering, seedStore } from '../../test/seedStore';

vi.mock('../charts/EChart', () => ({
  EChart: ({ ariaLabel }: { ariaLabel: string }) => <div role="img" aria-label={ariaLabel} />,
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  seedStore();
  seedEngineering();
});

describe('Engineering discipline page', () => {
  it('lists the discipline documents, overdue first, and opens one', async () => {
    const router = renderAt('/engineering/discipline/PIP');
    expect(await screen.findByRole('heading', { name: 'PIP' })).toBeInTheDocument();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('PQ-CLQ0-PIP-ISO-MPC-00002-00'),
      expect.stringContaining('PQ-CLQ0-PIP-CAL-MPC-00003-00'),
      expect.stringContaining('PQ-CLQ0-PIP-LAY-MPC-00001-00'),
    ]);
    fireEvent.click(rows[0]);
    expect(router.state.location.search).toContain('doc=PQ-CLQ0-PIP-ISO-MPC-00002-00');
    expect(await screen.findByRole('dialog')).toHaveTextContent('ISOMETRIC');
  });

  it('says so for an unknown discipline', async () => {
    renderAt('/engineering/discipline/NOPE');
    expect(await screen.findByText('Không tìm thấy discipline “NOPE”.')).toBeInTheDocument();
  });
});

describe('DocumentDrawer', () => {
  it('shows a document and its steps from the URL, whatever the filters', async () => {
    renderAt('/engineering?discipline=STR&doc=PQ-CLQ0-PIP-LAY-MPC-00001-00');
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('PIPING LAYOUT');
    expect(dialog).toHaveTextContent('TRM-1');
    expect(dialog).toHaveTextContent('Hoàn tất (IFC/IFU)');
    expect(within(dialog).getAllByRole('row')).toHaveLength(4);
  });

  it('reports an unknown document', async () => {
    renderAt('/engineering?doc=NOPE');
    expect(await screen.findByText('Không tìm thấy tài liệu NOPE.')).toBeInTheDocument();
  });
});
```

(The `discipline.notFound` vi text is `Không tìm thấy discipline “{name}”.` — check `src/i18n/vi.ts` and copy it exactly into the assertion if it differs.)

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/ui/engineering/engDiscipline.test.tsx` → FAIL (route `discipline/:name` renders NotFound).

- [ ] **Step 4: Implement `DocumentTable.tsx`**

```tsx
import { useMemo, useState } from 'react';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { stageIndex } from '../../data/engineering/stages';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { StageChip } from './StageChip';

type SortKey = 'risk' | 'id' | 'stage' | 'rev' | 'code' | 'transmittal';

const COLUMNS: { key: SortKey; labelKey: MessageKey; className?: string }[] = [
  { key: 'id', labelKey: 'eng.table.document' },
  { key: 'stage', labelKey: 'eng.table.stage' },
  { key: 'rev', labelKey: 'eng.table.rev' },
  { key: 'code', labelKey: 'eng.table.code', className: 'text-right' },
  { key: 'transmittal', labelKey: 'eng.table.transmittal' },
];

const rejected = (m: DocMetrics) => m.doc.code === 3 || m.doc.code === 4;
/** Higher is riskier: overdue, then rejected, then never issued. */
const riskRank = (m: DocMetrics) => (m.overdue ? 3 : rejected(m) ? 2 : m.stage === 'notIssued' ? 1 : 0);

const COMPARE: Record<SortKey, (a: DocMetrics, b: DocMetrics) => number> = {
  risk: (a, b) => riskRank(b) - riskRank(a) || stageIndex(a.stage) - stageIndex(b.stage) || a.doc.id.localeCompare(b.doc.id),
  id: (a, b) => a.doc.id.localeCompare(b.doc.id),
  stage: (a, b) => stageIndex(a.stage) - stageIndex(b.stage),
  rev: (a, b) => a.doc.rev.localeCompare(b.doc.rev),
  code: (a, b) => (a.doc.code ?? 0) - (b.doc.code ?? 0),
  transmittal: (a, b) => (a.doc.transmittal?.date ?? Infinity) - (b.doc.transmittal?.date ?? Infinity),
};

function riskClass(m: DocMetrics): string {
  if (m.overdue || rejected(m)) return 'border-l-2 border-l-critical bg-critical/5';
  if (m.stage === 'notIssued') return 'border-l-2 border-l-warning';
  return 'border-l-2 border-l-transparent';
}

function RiskTags({ m }: { m: DocMetrics }) {
  const { t } = useT();
  return (
    <>
      {m.overdue && <span className="mr-1 text-critical">▲ {t('eng.table.overdue')}</span>}
      {rejected(m) && <span className="mr-1 text-critical">{t('eng.table.rejected')}</span>}
      {riskRank(m) === 0 && <span className="text-good">✓</span>}
    </>
  );
}

/** Document list: sortable table on desktop, cards on phones. Riskiest first by default. */
export function DocumentTable({ docs, onOpen }: { docs: readonly DocMetrics[]; onOpen: (id: string) => void }) {
  const { t } = useT();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'risk', dir: 1 });
  const rows = useMemo(() => [...docs].sort((a, b) => COMPARE[sort.key](a, b) * sort.dir), [docs, sort]);
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
                    {t(c.labelKey)} {sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}
                  </button>
                </th>
              ))}
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => setSort({ key: 'risk', dir: 1 })} className="hover:text-ink">
                  {t('eng.table.risk')} {sort.key === 'risk' ? '●' : ''}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.doc.id} onClick={() => onOpen(m.doc.id)} className={`cursor-pointer border-b border-line/60 hover:bg-surface-2 ${riskClass(m)}`}>
                <td className="px-3 py-2">
                  <p className="font-mono text-xs text-ai-1">{m.doc.id}</p>
                  <p className="max-w-md truncate text-ink" title={m.doc.title}>
                    {m.doc.title || '—'}
                  </p>
                  <p className="text-[11px] text-ink-3">
                    {m.doc.facility} · {m.doc.docTypeLabel ?? m.doc.docType}
                  </p>
                </td>
                <td className="px-3 py-2">
                  <StageChip stage={m.stage} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{m.doc.rev || '—'}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{m.doc.code ?? '—'}</td>
                <td className="px-3 py-2 text-xs">
                  <p className="font-mono">{formatDay(m.doc.transmittal?.date)}</p>
                  {m.doc.transmittal?.no && <p className="text-[11px] text-ink-3">{m.doc.transmittal.no}</p>}
                </td>
                <td className="px-3 py-2 text-xs">
                  <RiskTags m={m} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {rows.map((m) => (
          <li key={m.doc.id}>
            <button type="button" onClick={() => onOpen(m.doc.id)} className={`w-full rounded-xl border border-line bg-surface p-3 text-left ${riskClass(m)}`}>
              <p className="font-mono text-xs text-ai-1">{m.doc.id}</p>
              <p className="truncate text-sm text-ink">{m.doc.title || '—'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <StageChip stage={m.stage} />
                <span className="font-mono text-ink-3">{m.doc.rev}</span>
                <RiskTags m={m} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
```

Note: jsdom does not apply CSS, so both the table and the phone list are present in tests; the test scopes to `getByRole('table')`.

- [ ] **Step 5: Implement `EngDisciplinePage.tsx`**

```tsx
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { engKpis } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { engineeringModule } from '../../modules/engineering/module';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Card, Stagger } from '../common/Card';
import { EmptyFilterState } from '../common/EmptyFilterState';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { DocumentTable } from './DocumentTable';
import { EngKpiStrip } from './EngKpiStrip';
import { useDocParam } from './params';

export function EngDisciplinePage() {
  const { t } = useT();
  const { name = '' } = useParams();
  const [params] = useSearchParams();
  const { filtered, filters, setFilters, clearFilters, vocab } = useEngDashboard();
  const { open } = useDocParam();
  const docs = useMemo(() => filtered.filter((m) => m.doc.discipline === name), [filtered, name]);
  const kpis = useMemo(() => engKpis(docs), [docs]);
  const query = params.toString();
  const search = query ? `?${query}` : '';

  if (!vocab.disciplines.includes(name)) {
    return (
      <div className="px-4 py-16 text-center text-sm text-ink-2">
        {t('discipline.notFound', { name })}{' '}
        <Link to={engineeringModule.path} className="text-ai-1 underline">
          {t('discipline.backToOverview')}
        </Link>
      </div>
    );
  }

  return (
    <Stagger className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4">
      <motion.div layoutId={`eng-discipline-${name}`} className="flex flex-wrap items-center gap-3">
        <Link to={{ pathname: engineeringModule.path, search }} className="text-sm text-ink-3 hover:text-ink">
          ← {t('discipline.backToOverview')}
        </Link>
        <h1 className="text-xl font-semibold tracking-wide">{name}</h1>
        <nav className="ml-auto flex flex-wrap gap-1 text-xs" aria-label={t('discipline.otherDisciplines')}>
          {vocab.disciplines
            .filter((d) => d !== name)
            .map((d) => (
              <Link key={d} to={{ pathname: `${engineeringModule.path}/discipline/${encodeURIComponent(d)}`, search }} className="rounded-full border border-line px-2 py-1 text-ink-3 hover:text-ink">
                {d}
              </Link>
            ))}
        </nav>
      </motion.div>
      {docs.length === 0 ? (
        <EmptyFilterState onClear={clearFilters} />
      ) : (
        <>
          <EngKpiStrip kpis={kpis} filters={filters} onFilter={setFilters} />
          <ErrorBoundary label={t('eng.table.errorLabel')}>
            <Card title={t('eng.table.title', { count: docs.length })} subtitle={t('eng.table.subtitle')}>
              <DocumentTable docs={docs} onOpen={open} />
            </Card>
          </ErrorBoundary>
        </>
      )}
    </Stagger>
  );
}
```

- [ ] **Step 6: Implement `DocumentDrawer.tsx`**

```tsx
import type { StageState } from '../../analytics/engineering/docMetrics';
import { GATED_STAGES, STAGE_LABEL_KEY } from '../../data/engineering/stages';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Drawer } from '../common/Drawer';
import { useDocParam } from './params';
import { StageChip } from './StageChip';

const STATE_STYLE: Record<StageState, { labelKey: MessageKey; className: string }> = {
  late: { labelKey: 'phaseDrawer.state.late', className: 'bg-critical/15 text-critical' },
  done: { labelKey: 'phaseDrawer.state.done', className: 'bg-good/15 text-good' },
  pending: { labelKey: 'phaseDrawer.state.pending', className: 'bg-surface-2 text-ink-3' },
};

/** Document detail, opened with `?doc=<number>` from any Engineering view. Ignores the filters. */
export function DocumentDrawer() {
  const { t } = useT();
  const { id, close } = useDocParam();
  const { metrics } = useEngDashboard();
  const m = id ? metrics.find((x) => x.doc.id === id) : undefined;
  const doc = m?.doc;

  return (
    <Drawer
      open={id !== undefined}
      onClose={close}
      width="sm:max-w-2xl"
      title={
        doc ? (
          <div>
            <p className="font-mono text-xs text-ai-1">
              {doc.id} · {doc.discipline} · {doc.facility}
            </p>
            <h2 className="text-base font-semibold">{doc.title || '—'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <StageChip stage={m!.stage} />
              <span className="font-mono text-ink-3">Rev {doc.rev || '—'}</span>
              {doc.code !== undefined && <span className="font-mono text-ink-3">Code {doc.code}</span>}
            </div>
          </div>
        ) : (
          <h2 className="text-base font-semibold">{t('eng.doc.notFound', { id: id ?? '' })}</h2>
        )
      }
    >
      {m && doc && (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.status')}</dt>
              <dd>{doc.status ?? '—'}</dd>
            </div>
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.docType')}</dt>
              <dd>{doc.docTypeLabel ? `${doc.docType} · ${doc.docTypeLabel}` : doc.docType}</dd>
            </div>
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.transmittal')}</dt>
              <dd className="font-mono">
                {doc.transmittal?.no || '—'}
                <span className="block">{formatDay(doc.transmittal?.date)}</span>
              </dd>
            </div>
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.sourceTab')}</dt>
              <dd>{doc.sheet}</dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('eng.doc.steps')}</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="py-1.5 pr-2 font-medium">{t('eng.table.stage')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('eng.doc.plan')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('eng.doc.actual')}</th>
                  <th className="py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {GATED_STAGES.map((g) => {
                  const c = m.checks[g];
                  const style = STATE_STYLE[c.state];
                  return (
                    <tr key={g} className="border-b border-line/60">
                      <td className="py-1.5 pr-2">{t(STAGE_LABEL_KEY[g])}</td>
                      <td className="py-1.5 pr-2 font-mono">{formatDay(c.plan)}</td>
                      <td className="py-1.5 pr-2 font-mono">{formatDay(c.actual)}</td>
                      <td className="py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${style.className}`}>{t(style.labelKey)}</span>
                        {c.delayDays !== undefined && c.delayDays > 0 && <span className="ml-1 font-mono text-critical">+{c.delayDays}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {doc.remark && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('eng.doc.remark')}</h3>
              <p className="rounded-lg border border-line bg-surface p-3 text-sm whitespace-pre-line text-ink-2">{doc.remark}</p>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
```

- [ ] **Step 7: Routes**

In `src/App.tsx`, import `DocumentDrawer` (`import { DocumentDrawer } from './ui/engineering/DocumentDrawer';`) and change the engineering route to:

```tsx
      {
        path: 'engineering',
        element: <ModuleRoute module={engineeringModule} overlay={<DocumentDrawer />} />,
        children: [
          { index: true, lazy: () => import('./ui/engineering/EngOverviewPage').then((m) => ({ Component: m.EngOverviewPage })) },
          { path: 'discipline/:name', lazy: () => import('./ui/engineering/EngDisciplinePage').then((m) => ({ Component: m.EngDisciplinePage })) },
          { path: '*', element: <NotFound /> },
        ],
      },
```

- [ ] **Step 8: Run the tests and typecheck**

Run: `npx vitest run src/ui/engineering src/ui/shell` → PASS. Run: `npm run typecheck` → no errors.

- [ ] **Step 9: Commit**

```bash
git add src/ui/engineering/DocumentTable.tsx src/ui/engineering/EngDisciplinePage.tsx src/ui/engineering/DocumentDrawer.tsx src/ui/engineering/engDiscipline.test.tsx src/App.tsx src/i18n/en.ts src/i18n/vi.ts
git commit -m "feat(engineering): discipline page and document drawer

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Hide AI Insights and the Facility heatmap on Procurement

**Files:**
- Modify: `src/ui/overview/OverviewPage.tsx`
- Modify: `src/ui/overview/overview.test.tsx`
- Create: `src/ui/overview/insightsPanel.test.tsx`
- Modify: `src/ui/app.test.tsx`, `src/ui/shell/routing.test.tsx`, `src/ui/shell/shell.test.tsx`, `src/ui/shell/sidebar.test.tsx`

**Interfaces:**
- Consumes: `InsightsPanel`, `generateInsights`, `sampleMetrics`, `TEST_CTX` (existing).
- Produces: `OverviewPage` without the two blocks; `SHOW_INSIGHTS` / `SHOW_FACILITY_HEATMAP` constants.

- [ ] **Step 1: Update the overview test (failing)**

In `src/ui/overview/overview.test.tsx`, replace the first test and delete the two insight tests (`'reveals insight evidence with Why?'`, `'applies an insight filter to the URL'`):

```tsx
  it('shows KPI tiles and the widgets, without AI Insights or the facility heatmap', () => {
    renderOverview();
    expect(screen.getByRole('button', { name: /ROS at risk/ })).toHaveTextContent('1');
    expect(screen.getByText('Phase funnel')).toBeInTheDocument();
    expect(screen.getByText('Discipline health')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Số mốc đến hạn theo tháng' })).toBeInTheDocument();
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Heatmap số mốc theo facility và tháng' })).not.toBeInTheDocument();
  });
```

Remove `fireEvent` from the import if nothing else uses it.

Create `src/ui/overview/insightsPanel.test.tsx` so the hidden panel stays covered:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { generateInsights } from '../../analytics/insights/registry';
import { sampleMetrics, TEST_CTX } from '../../test/planFixture';
import { seedStore } from '../../test/seedStore';
import { InsightsPanel } from './InsightsPanel';

beforeEach(seedStore);

function renderPanel() {
  const metrics = sampleMetrics();
  const onApply = vi.fn();
  render(<InsightsPanel insights={generateInsights({ metrics, ctx: TEST_CTX })} metrics={metrics} onApply={onApply} onOpenPackage={vi.fn()} />);
  return onApply;
}

describe('InsightsPanel (hidden on the overview, kept for later)', () => {
  it('reveals insight evidence with Why?', () => {
    renderPanel();
    expect(screen.getByText('1 dòng có nguy cơ trễ ROS')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Why?' })[0]);
    expect(screen.getByText(/@ PS2R · dòng 7/)).toBeInTheDocument();
  });

  it('applies an insight filter', () => {
    const onApply = renderPanel();
    fireEvent.click(screen.getAllByRole('button', { name: 'Lọc theo insight' })[0]);
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ flags: ['rosRisk'] }));
  });
});
```

If `InsightsPanel` needs a router (it renders a `Link`), wrap the render in `createMemoryRouter([{ path: '/', element: … }])` + `RouterProvider`, as `overview.test.tsx` does.

- [ ] **Step 2: Run to verify the overview test fails**

Run: `npx vitest run src/ui/overview/overview.test.tsx src/ui/overview/insightsPanel.test.tsx`
Expected: overview test FAILS (AI Insights still rendered); the panel tests PASS.

- [ ] **Step 3: Hide the two blocks**

In `src/ui/overview/OverviewPage.tsx`, above `export function OverviewPage()`:

```tsx
/** Hidden since 2026-09-21 so Procurement and Engineering share one layout. Set to true to bring them back. */
const SHOW_INSIGHTS = false;
const SHOW_FACILITY_HEATMAP = false;
```

Change the insight memo to skip the work while hidden:

```tsx
  const insights = useMemo(() => (SHOW_INSIGHTS ? generateInsights({ metrics: filtered, ctx }) : []), [filtered, ctx]);
```

Wrap the two blocks:

```tsx
      {SHOW_INSIGHTS && (
        <ErrorBoundary label="AI Insights">
          <InsightsPanel insights={insights} metrics={filtered} onApply={setFilters} onOpenPackage={open} />
        </ErrorBoundary>
      )}
```

```tsx
      {SHOW_FACILITY_HEATMAP && (
        <ErrorBoundary label={t('facilityHeatmap.title')}>
          <FacilityHeatmap metrics={filtered} />
        </ErrorBoundary>
      )}
```

- [ ] **Step 4: Update the tests that waited for "AI Insights"**

In `src/ui/app.test.tsx`, `src/ui/shell/routing.test.tsx`, `src/ui/shell/shell.test.tsx` and `src/ui/shell/sidebar.test.tsx`, replace every `findByText('AI Insights')` / `getByText('AI Insights')` with the same call on `'Phase funnel'`. Then `grep -rn "AI Insights" src --include=*.test.tsx` must print only the `queryByText('AI Insights')` assertion in `overview.test.tsx`.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test` → all pass. Run: `npm run typecheck` → no errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/overview/OverviewPage.tsx src/ui/overview/overview.test.tsx src/ui/overview/insightsPanel.test.tsx src/ui/app.test.tsx src/ui/shell/routing.test.tsx src/ui/shell/shell.test.tsx src/ui/shell/sidebar.test.tsx
git commit -m "feat(procurement): hide AI Insights and the facility heatmap

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Final verification (controller, after Task 9)

- `npm test` and `npm run typecheck` green.
- Browser smoke test (`npm run dev`), with the real `public/config.json`:
  - `#/engineering` loads the EMDR: KPI tiles, Phase E timeline (review/commented/final), funnel, discipline cards, transmittal chart; no Overdue tile (the sheet has no planned dates).
  - Data Health lists `SUMMARY_MISMATCH` and the sheet cut-off.
  - Filters: Discipline / Facility / Document type / Stage / Flags; the result count reads "x / y tài liệu"; the AskBox placeholder is the Engineering one.
  - Clicking a stage opens the drawer; a document row opens the document drawer; a discipline card opens `/engineering/discipline/<name>`.
  - `#/procurement` shows no AI Insights and no facility heatmap; everything else unchanged.
  - Light/dark, EN/VI, 390 px width with no horizontal overflow; no console errors.
