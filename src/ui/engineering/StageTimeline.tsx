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
            <span className="text-ink-3"> / </span>
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
