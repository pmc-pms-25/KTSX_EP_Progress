import { motion, useReducedMotion } from 'motion/react';
import { progressTone, type PhaseProgress, type ProgressTone } from '../../analytics/phaseProgress';
import { LINE_PHASE_LABEL, MILESTONE_BY_KEY } from '../../data/milestones';
import type { PhaseKey } from '../../data/types';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import type { Translate } from '../../modules/types';
import { useApp } from '../../store/useApp';
import { formatDay } from '../../lib/day';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { Card } from '../common/Card';
import { InfoTip } from '../common/InfoTip';
import { phaseColor } from '../theme/palette';

interface PhaseTimelineProps {
  progress: readonly PhaseProgress[];
  onSelect: (phase: PhaseKey) => void;
}

const TONE_TEXT: Record<ProgressTone, string> = {
  good: 'text-good',
  warning: 'text-warning',
  critical: 'text-critical',
  none: 'text-ink-3',
};

/** The "?" sits beside the ring: top-right of the row on phones, just right of the ring on desktop. */
const TIP_POSITION = 'absolute top-4 right-0 lg:top-0 lg:right-[calc(50%-3rem)]';

/** Seconds between one milestone's entrance and the next. */
const STEP = 0.12;

/** A line through the phases; each milestone shows packages completed / planned by cut-off, then the steps still awaiting a data source. */
export function PhaseTimeline({ progress, onSelect }: PhaseTimelineProps) {
  const { t } = useT();
  const reduced = useReducedMotion() ?? false;
  const draw = reduced ? { duration: 0 } : { duration: 0.9, ease: 'easeInOut' as const };

  return (
    // Raised above the next card so a help panel can hang over it.
    <Card title={t('phaseTimeline.title')} subtitle={t('phaseTimeline.subtitle')} className="relative z-10">
      <ol className="relative grid gap-3 lg:grid-cols-9 lg:gap-2">
        {/* The track runs between the first and last ring centers: horizontal on desktop, vertical on phones. */}
        <div aria-hidden className="absolute top-7 right-[calc(100%/18)] left-[calc(100%/18)] hidden h-0.5 rounded-full bg-line lg:block">
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
          <PhaseNode key={p.phase} progress={p} index={i} reduced={reduced} onSelect={onSelect} />
        ))}
        {AWAITING.map((step, i) => (
          <AwaitingNode key={step.id} step={step} index={progress.length + i} reduced={reduced} />
        ))}
      </ol>
    </Card>
  );
}

interface PhaseNodeProps {
  progress: PhaseProgress;
  index: number;
  reduced: boolean;
  onSelect: (phase: PhaseKey) => void;
}

function PhaseNode({ progress: p, index, reduced, onSelect }: PhaseNodeProps) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const tone = progressTone(p.ratio);
  const fill = Math.min(p.ratio ?? 0, 1);
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
        aria-label={t('phaseTimeline.nodeLabel', { phase: p.label, actual: p.actual, plan: p.plan })}
        onClick={() => onSelect(p.phase)}
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
              opacity={fill > 0 ? 1 : 0}
              className={TONE_TEXT[tone]}
              initial={{ pathLength: reduced ? fill : 0 }}
              animate={{ pathLength: fill }}
              transition={reduced ? { duration: 0 } : { delay: delay + 0.15, duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <span className={`relative font-mono text-xs font-semibold ${TONE_TEXT[tone]}`}>
            {p.ratio === undefined ? '—' : `${Math.round(p.ratio * 100)}%`}
          </span>
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-2 group-hover:text-ink lg:justify-center">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: phaseColor(p.phase, theme) }} />
            {p.label}
          </span>
          <span className="block text-xs text-ink-3">{MILESTONE_BY_KEY[p.gate].short}</span>
          <span className="mt-0.5 block text-lg font-semibold text-ink">
            <AnimatedNumber value={p.actual} />
            <span className="text-ink-3"> / </span>
            <AnimatedNumber value={p.plan} className="text-ink-2" />
          </span>
          <span className="block text-xs text-ink-3">
            {p.plan === 0 ? (
              t('phaseTimeline.nothingDue')
            ) : p.late > 0 ? (
              <span className="text-critical">{t('phaseTimeline.late', { count: p.late })}</span>
            ) : (
              '✓'
            )}
          </span>
        </span>
      </motion.button>
      <InfoTip label={t('phaseInfo.label', { phase: p.label })} align={index >= 4 ? 'end' : 'start'} className={TIP_POSITION}>
        <PhaseHelp progress={p} />
      </InfoTip>
    </motion.li>
  );
}

type AwaitingSource = 'expediting' | 'warehouse';

interface AwaitingStep {
  id: string;
  label: (t: Translate) => string;
  source: AwaitingSource;
}

/** Steps after Under-Production whose dates are not in the Procurement Plan: they hold their place until their source is linked. */
const AWAITING: readonly AwaitingStep[] = [
  { id: 'exWorks', label: () => LINE_PHASE_LABEL.exWorks, source: 'expediting' },
  { id: 'arrived', label: () => LINE_PHASE_LABEL.arrived, source: 'expediting' },
  { id: 'inspected', label: (t) => t('phaseTimeline.inspectedAtWorksite'), source: 'warehouse' },
  { id: 'issued', label: (t) => t('phaseTimeline.issuedToConstruction'), source: 'warehouse' },
];

const AWAITING_TEXT: Record<AwaitingSource, { note: MessageKey; help: MessageKey }> = {
  expediting: { note: 'phaseTimeline.awaitingExpediting', help: 'phaseInfo.expediting' },
  warehouse: { note: 'phaseTimeline.awaitingWarehouse', help: 'phaseInfo.warehouse' },
};

function AwaitingNode({ step, index, reduced }: { step: AwaitingStep; index: number; reduced: boolean }) {
  const { t } = useT();
  const label = step.label(t);
  const text = AWAITING_TEXT[step.source];
  return (
    <motion.li
      className="relative flex items-center gap-3 lg:flex-col lg:gap-2 lg:text-center"
      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: reduced ? 0 : 0.2 + index * STEP, type: 'spring', stiffness: 260, damping: 18 }}
    >
      <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-bg">
        <span aria-hidden className="absolute inset-0 rounded-full border-2 border-dashed border-line bg-surface" />
        <span className="relative font-mono text-xs text-ink-3">—</span>
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium text-ink-3">{label}</span>
        <span className="mt-0.5 block text-xs text-ink-3">{t(text.note)}</span>
      </span>
      <InfoTip label={t('phaseInfo.label', { phase: label })} align="end" className={TIP_POSITION}>
        {t(text.help)}
      </InfoTip>
    </motion.li>
  );
}

/** Where a phase's numbers come from: the sheet column, how Plan / Actual / % are counted, and the package total. */
function PhaseHelp({ progress: p }: { progress: PhaseProgress }) {
  const { t } = useT();
  const cutOff = useApp((s) => s.cutOff);
  return (
    <span className="block space-y-1">
      <span className="block font-semibold text-ink">{p.label}</span>
      <span className="block">{t('phaseInfo.date', { column: MILESTONE_BY_KEY[p.gate].header })}</span>
      <span className="block">{t('phaseInfo.plan', { cutOff: formatDay(cutOff) })}</span>
      <span className="block">{t('phaseInfo.actual')}</span>
      <span className="block">{t('phaseInfo.ratio')}</span>
      <span className="block">{t('phaseInfo.total', { total: p.total })}</span>
      <span className="block text-ink-3 italic">{t('phaseInfo.facilities')}</span>
    </span>
  );
}
