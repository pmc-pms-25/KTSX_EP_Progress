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
  /** Buffer on the FORECAST row (ROS − forecast "Received at Worksite"); defaults to 10 like the sheet. */
  forecastBuffer?: number;
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
    row[col('Buffer')] = line.forecastBuffer ?? 10;
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
 * - MEC-001 @ PS2R: forecast slips late, received after ROS (ROS at risk, forecast Buffer −19).
 * - MEC-002 @ BF (Bulk): two actuals recorded, one forecast earlier than plan.
 * - blank code/facility on PLANNED, 0 on FORECAST/ACTUAL (as the sheet's formulas produce): warnings, not orphans.
 * - PIP-001 @ PS2L TS: '#####' date, '00/Jan/00' ROS on FORECAST, no ACTUAL row.
 * - PIP-002 @ WHJs: every milestone has an actual (delivered); forecast Buffer 4 but no longer a risk.
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
        forecastBuffer: -19,
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
        forecastBuffer: 4,
      },
    ],
  },
];

export function sampleWorkbook(): ArrayBuffer {
  return workbookBuffer(sheetRows(SAMPLE_SECTIONS));
}
