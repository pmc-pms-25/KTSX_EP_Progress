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
