import { motion } from 'motion/react';
import { useT } from '../../i18n/useT';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { cardVariants } from '../common/Card';

const TILE = 'rounded-2xl border border-line bg-surface p-4 text-left backdrop-blur-md';
/** Same style as a card title, so the three cards of the row read as peers. */
const LABEL = 'text-sm font-semibold text-ink';

/** Procurement overview headline: the package count (as in the KPI strip) and overall progress. */
export function SummaryTiles({ packages }: { packages: number }) {
  const { t } = useT();
  return (
    <>
      <motion.div variants={cardVariants} className={TILE}>
        <p className={LABEL}>Packages</p>
        <AnimatedNumber value={packages} className="mt-1 block text-3xl font-semibold text-ink" />
        <p className="mt-1 text-xs text-ink-3">{t('kpi.hint.packages')}</p>
      </motion.div>
      {/* The overall progress formula is not defined yet; the tile holds its place. */}
      <motion.div variants={cardVariants} className={TILE}>
        <p className={LABEL}>{t('overview.progress.title')}</p>
        <span className="mt-1 block text-3xl font-semibold text-ink-3 tabular-nums">—%</span>
        <p className="mt-1 text-xs text-ink-3">{t('overview.progress.pending')}</p>
      </motion.div>
    </>
  );
}
