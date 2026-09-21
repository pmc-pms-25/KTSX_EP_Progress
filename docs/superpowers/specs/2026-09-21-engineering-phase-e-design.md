# Engineering Dashboard (Phase E) — Design

**Date:** 2026-09-21
**Status:** Approved in brainstorming, awaiting spec review
**Builds on:** `2026-09-21-multi-module-shell-design.md` (module registry, `createModuleStore`, shared shell)

## 1. Goal

Replace the Engineering placeholder with a real dashboard built from the project's
Engineering Master Deliverable Register (EMDR) Google Sheet. The page mirrors the
Procurement overview in look and structure: filters, KPI cards, a phase (stage)
progress timeline with drill-down drawer, a funnel, discipline status and an activity
chart. At the same time, hide the AI Insights panel and the Facility heatmap on the
Procurement overview so both dashboards share one layout.

## 2. Decisions

| # | Decision |
|---|----------|
| D1 | Stage mapping is our own (the project has no revision convention yet). It lives in one file, `src/data/engineering/stages.ts`, so it can be changed in one place. |
| D2 | Read **every register tab** of the workbook except `Summary`; merge and de-duplicate by document number. Discipline / facility / document type come from the document number, not the tab name. |
| D3 | Stage progress is count-based. Documents that carry plan dates additionally get Plan vs Actual and late/overdue tracking against the cut-off; with no plan dates that part hides itself. Actual date = Incoming Transmittal date. |
| D4 | Filters: `discipline`, `facility`, `type` (document type), `phase` (stage), `flag`, and search `q`. Flags: `notIssued`, `overdue`, `code1`, `code2`, `rejected` (Code 3/4). |
| D5 | Engineering gets its own components in `src/ui/engineering/` built from the shared primitives. The Procurement overview components are **not** generalised now. |
| D6 | No AI Insights and no facility heatmap for Engineering. On Procurement, both are **hidden** (not deleted) behind a one-line switch. |
| D7 | Cut-off is the app-wide header cut-off (defaults to today). The cut-off written in the sheet is only reported in Data Health. |

## 3. Source data (EMDR, as of cut-off 09-05-2025)

- 17 tabs: `Summary`, facility tabs (`CPPT`, `CPC0`), discipline tabs for CLQ0
  (`ARC-Architectural`, `ELE-Electrical`, `GEN-General`, `HVC-HVAC`,
  `ICS-Intrumentation`, `MAR - Marine`, `MEC-Mechanical`, `NVL-Naval Architecture`,
  `PIP-Piping and Insulation`, `PRO-Process`, `PSE-Process Safety`,
  `STR-Structural`, `TEL-Telecommunication`), `TIN`. About 200 documents.
- Register tab layout: title rows, a two-row header (`No.`, `DOC. No`, `DOC. TITLE`,
  `Rev`, `Code`, `Plan Issue (dd/mm/yyyy)`, `Deadline Comment (dd/mm/yyyy)`,
  `Deadline Response (dd/mm/yyyy)`, `CTR No.`, `Status`, `Notes`, `Remark`, `Pages`,
  `Subcontractor`, `INCOMING TRANSMITTAL` → `No.` / `Date`, `OUTGOING TRANSMITTAL`,
  subcontractor and hard-copy transmittal pairs, `Latest Rev`), then group rows
  (`CAL - Calculation`) followed by document rows.
- Document number: `PQ-CLQ0-PIP-ISO-MPC-00001-00` =
  project · facility · discipline · document type · originator · serial · sheet.
  Facilities seen: CLQ0, CPC0, CPPT, CPP0, GENR.
- Values seen: Rev `0`, `H01`, `J01`, `K01`–`K07`, `L01`–`L02`, `N01`–`N03`, `V00`;
  Status `Issued for Information` / `Issued for Use` / `Issued for Construction`;
  Code `1`, `2`.
- `Plan Issue`, `Deadline Comment`, `Deadline Response` and outgoing transmittals are
  currently empty everywhere.
- `Summary` holds a per-tab total and a grand total (214) plus the sheet cut-off.

## 4. Data layer

### 4.1 Config

`public/config.json` gains:

```json
"engineering": {
  "type": "google-sheet",
  "url": "https://docs.google.com/spreadsheets/d/1ePtJRHK5wQbieWHLNaUs0aJmbifeFDzxLrKSDSEibxo/export?format=xlsx"
}
```

No `sheetName`: the parser reads all register tabs (D2). The existing HTTP source
already downloads the whole workbook. `docs/deploy.md` is updated to say so.

### 4.2 Types — `src/data/engineering/types.ts`

```ts
export type StageKey = 'notIssued' | 'review' | 'commented' | 'final';
export type ClientCode = 1 | 2 | 3 | 4;

export interface EngDocument {
  id: string;              // document number, unique after de-duplication
  title: string;
  facility: string;        // 'CLQ0'
  discipline: string;      // 'PIP'
  docType: string;         // 'ISO'
  docTypeLabel?: string;   // 'Isometric' from the nearest group row, when present
  sheet: string;           // source tab, for traceability
  rev: string;             // 'L01', '0'
  status?: string;         // 'Issued for Construction'
  code?: ClientCode;
  planIssue?: Day;
  deadlineComment?: Day;
  deadlineResponse?: Day;
  transmittal?: { no: string; date?: Day };
  remark?: string;
}

export interface EmdrRegister {
  documents: EngDocument[];
  sheetCutOff?: Day;
  summaryTotal?: number;
}
```

`Day` is the existing type from `src/lib/day`.

### 4.3 Parser — `src/data/engineering/parseEmdr.ts`

`parseEmdr(buf: ArrayBuffer): { data: EmdrRegister; warnings: DataWarning[] }`

1. Reject non-zip / unreadable bytes with `ParseFailure('NOT_XLSX')` (reuse `isZip`).
2. For every tab except `Summary`, locate the header row by label (the row whose cells
   include `DOC. No`), then map columns by normalised label, so inserted columns do
   not break parsing. `INCOMING TRANSMITTAL` `No.`/`Date` are read from the sub-header
   row beneath it. A tab without a recognisable header is skipped with a
   `SKIPPED_SHEET` warning.
3. A row is a document when its `No.` cell is a positive number and its `DOC. No` cell
   is not empty. A row with an empty `No.` whose `DOC. No` text looks like `XXX - Label`
   is a group row; its label becomes `docTypeLabel` for the documents that follow.
4. Split the document number into facility / discipline / docType. If it has fewer
   than four parts, keep the row, take the discipline from the tab name prefix
   (`PIP-Piping…` → `PIP`) and add a `BAD_DOC_NUMBER` warning.
5. Dates accept Excel serial numbers and `dd/mm/yyyy` text. Unreadable dates are
   dropped with a `BAD_DATE` warning.
6. `Code` cells `1`–`4` become `ClientCode`; anything else is ignored.
7. Duplicate document numbers across tabs: keep the row with `Latest Rev = TRUE`,
   then the one with the later transmittal date, then the first seen; add one
   `DUPLICATE_DOC` warning per duplicate.
8. From `Summary`, read the `TOTAL` row and the cut-off date (best effort; missing
   values are not errors). If `summaryTotal` differs from the parsed count, add a
   `SUMMARY_MISMATCH` warning. Always add an info `SHEET_CUTOFF` warning when the sheet
   cut-off was found.
9. No register tab at all → `ParseFailure('NO_REGISTER_SHEETS')`. Register tabs but zero
   documents → `ParseFailure('NO_DOCUMENTS')`.

The new warning codes (`SKIPPED_SHEET`, `BAD_DOC_NUMBER`, `BAD_DATE`, `DUPLICATE_DOC`,
`SUMMARY_MISMATCH`, `SHEET_CUTOFF`) are added to `WarningCode` and get Data Health
labels in `en.ts` / `vi.ts` (spec §9 note of the shell design).

`src/data/engineering/loadWorkbookSummary.ts` and its test are deleted.

### 4.4 Stages — `src/data/engineering/stages.ts`

```ts
export const STAGES: readonly { key: StageKey; labelKey: MessageKey }[] =
  [notIssued, review, commented, final];

export function stageOf(doc: EngDocument): StageKey
```

Rules, first match wins:

1. Status is `Issued for Construction` or `Issued for Use` → `final`.
2. Rev starts with `N` or `V` followed by a digit → `final`.
3. Has a `code`, or rev starts with `L` followed by a digit → `commented`.
4. Rev starts with `J`, `K` or `H` followed by a digit, or status is `Issued for Information` → `review`.
5. Otherwise (rev `0`, empty, `NA`, or a letter not followed by a digit) → `notIssued`.

The digit-after-letter requirement keeps a letter-only revision code (such as `NA`,
meaning "not applicable") from being mistaken for a real revision starting with that
letter.

Each stage above `notIssued` has a planned-date field:
`review` ← `planIssue`, `commented` ← `deadlineComment`, `final` ← `deadlineResponse`.

## 5. Analytics — `src/analytics/engineering/`

### 5.1 `stageProgress(docs, cutOff): StageProgress[]` (one entry per stage except `notIssued`)

Per document and stage:

- `done` — the document has reached the stage (stage order ≥ this stage).
- `late` — not reached, planned date ≤ cut-off; `delayDays = cutOff − plan`.
- `pending` — not reached, and not yet due or no planned date.

`actual` is the transmittal date when the document is done and a date exists.

```ts
interface StageProgress {
  stage: StageKey;
  reached: number;       // documents at or beyond the stage
  total: number;         // all documents in scope
  planDue: number;       // documents whose planned date ≤ cut-off (0 → Plan vs Actual hidden)
  late: number;
  ratio?: number;        // reached-among-planDue / planDue; undefined when planDue = 0
  docs: StageDoc[];      // late (most days late first), then done, then pending
}
```

### 5.2 `engKpis(docs): EngKpis`

`total`, `issued` (stage ≠ notIssued), `final`, `code1`, `code2`, `rejected`
(code 3 or 4), `notIssued`, `overdue` (late at any stage) and `hasPlanDates`.

### 5.3 `disciplineStatus(docs): DisciplineStatus[]`

Per discipline: total, count per stage, % final, notIssued, overdue, and risk:
`critical` if overdue > 0, else `warning` if notIssued / total > 0.3, else `ok`.
Ordered by risk, then discipline code.

### 5.4 `transmittalActivity(docs)`

Documents received per ISO week from transmittal dates, for the activity chart.

### 5.5 Filters — `src/modules/engineering/filters.ts`

```ts
type EngFlag = 'notIssued' | 'overdue' | 'code1' | 'code2' | 'rejected';
interface EngFilters { disciplines; facilities; docTypes; stages: StageKey[]; flags: EngFlag[]; q }
engFiltersFromParams(params), writeEngFilters(params, filters), applyEngFilters(docs, filters, cutOff)
```

It uses the shared `FILTER_KEYS` URL names (`discipline`, `facility`, `type`, `phase`,
`flag`, `q`); unknown values are dropped. Search matches document number or title,
case-insensitive. A memo (like `procurementMetrics`) caches the per-document stage /
lateness computation for the last `(register, cutOff)` pair.

## 6. UI

### 6.1 Engineering overview — `/engineering`

```
KPI strip
Phase E timeline (+ stage drawer)
Stage funnel      │ Discipline status
Transmittal activity
```

Same `Stagger` grid, `max-w-[1600px]`, `ErrorBoundary` per block and `EmptyFilterState`
as `OverviewPage`.

| Component (`src/ui/engineering/`) | Procurement analogue | Behaviour |
|---|---|---|
| `EngOverviewPage` | `OverviewPage` | Composes the blocks |
| `EngKpiStrip` | `KpiStrip` | Tiles: Total, Issued %, IFC/IFU %, Code 1, Code 2, Not issued, Overdue (only when `hasPlanDates`), Rejected (only when > 0). Clicking toggles its `flag` / `phase` filter. |
| `StageTimeline` | `PhaseTimeline` | One node per stage: reached / total and %; Plan / Actual / Late when `planDue > 0`. Click opens the drawer. |
| `StageProgressDrawer` | `PhaseProgressDrawer` | `?stage=<key>`; lists documents late → done → pending; row opens the document drawer. |
| `StageFunnel` | `PhaseFunnel` | Bar per stage (count of documents currently at that stage); click filters `phase`. |
| `DisciplineStatusGrid` | `DisciplineGrid` | Card per discipline with stage bar and risk; links to the discipline page keeping filters. |
| `TransmittalChart` | `WorkloadChart` | Documents received per week. |
| `EngDisciplinePage` + `DocumentTable` | `DisciplinePage` + `PackageTable` | `/engineering/discipline/:name`; sortable document table; row opens the document drawer. |
| `DocumentDrawer` | `PackageDrawer` | `?doc=<id>`: title, rev, status, code, stage, per-stage planned / actual / state, transmittal, source tab, remark. |

Stage colours come from the existing phase palette in `src/ui/theme/palette.ts`; no new
hex colours. All text goes through `t()` with new `eng.*` keys in both `en.ts` and `vi.ts`.

### 6.2 Module definition — `src/modules/engineering/module.ts`

- Data type becomes `EmdrRegister`.
- Facets: Discipline, Facility, Document type, Stage, Flag.
- `useSearch`: header AskBox over document number / title; vocabulary = disciplines and facilities.
  Search is plain text: every word must appear in the document number, title, discipline,
  facility or document type. `ModuleSearch` gains an optional `describe(q)` so the AskBox's
  "understood as" chips show these words instead of Procurement's milestone/period parsing.
- `useResultCount`: "shown / total documents" (new `unit.documents` key).
- Drawer keys `doc` and `stage` are not filter keys, so they are not remembered in `lastQuery`.

### 6.3 Routes — `src/App.tsx`

Under `engineering`: overlay `<DocumentDrawer />`; children `index` →
`EngOverviewPage` (lazy), `discipline/:name` → `EngDisciplinePage` (lazy), `*` → `NotFound`.
The placeholder `EngineeringPage` is deleted.

### 6.4 Procurement changes

`OverviewPage` hides `InsightsPanel` and `FacilityHeatmap` via a module-level constant
(`const SHOW_INSIGHTS = false`, `const SHOW_FACILITY_HEATMAP = false`), and skips the
insight computation while hidden. Components, rules and their tests stay.

## 7. Errors and Data Health

- Loading, abort, refresh, unconfigured and error screens come from `createModuleStore`.
- Parse failures: `NOT_XLSX`, `NO_REGISTER_SHEETS`, `NO_DOCUMENTS`, each with an i18n message.
- Warnings (§4.3) appear in Data Health with labels.
- One broken tab never breaks the page: it is skipped with a warning.

## 8. Testing

- Fixture `src/test/fixtures/emdr.ts` builds a small workbook with `XLSX.utils`:
  Summary, one facility tab, two discipline tabs, group rows, rev `0`, a cross-tab
  duplicate, a bad date, and an extra inserted column.
- `parseEmdr`: header by label, group rows, number split, de-duplication, summary
  mismatch, failures and warnings.
- `stageOf`: table test over every rev / status / code combination seen in the real data.
- `stageProgress`, `engKpis`, `disciplineStatus`, `transmittalActivity`, filters:
  late / done / pending against the cut-off, hidden Plan vs Actual without plan dates,
  `rejected` flag, URL validation.
- UI: overview renders every block; KPI click updates the URL; `?stage=` and `?doc=`
  open drawers; discipline page table; empty filter result.
- Procurement overview test: Insights and heatmap are not rendered.
- Full suite, typecheck, and a browser smoke test against the real EMDR sheet.

## 9. Out of scope

AI Insights and facility heatmap for Engineering; shared P/E components; an official
revision convention; external plan sources (P6); outgoing, subcontractor and hard-copy
transmittal tracking.
