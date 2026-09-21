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
const FINAL_REV = /^[NV]\d/;
const COMMENTED_REV = /^L\d/;
const REVIEW_REV = /^[JKH]\d/;

/** Where a document stands, first matching rule wins (see the spec, §4.4). */
export function stageOf(doc: Pick<EngDocument, 'rev' | 'status' | 'code'>): StageKey {
  const rev = doc.rev.trim().toUpperCase();
  const status = doc.status?.trim() ?? '';
  if (FINAL_STATUS.test(status)) return 'final';
  if (FINAL_REV.test(rev)) return 'final';
  if (doc.code !== undefined || COMMENTED_REV.test(rev)) return 'commented';
  if (REVIEW_REV.test(rev) || REVIEW_STATUS.test(status)) return 'review';
  return 'notIssued';
}
