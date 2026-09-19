import { motion } from 'motion/react';
import type { Kpis } from '../../analytics/aggregate';
import type { Filters, Flag } from '../../analytics/filters';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { AnimatedNumber } from '../common/AnimatedNumber';
import { cardVariants } from '../common/Card';

interface Tile {
  key: keyof Kpis;
  label: string;
  hintKey: MessageKey;
  flag?: Flag;
  tone?: 'critical' | 'warning' | 'serious';
}

const TILES: Tile[] = [
  { key: 'packages', label: 'Packages', hintKey: 'kpi.hint.packages' },
  { key: 'lines', label: 'Lines', hintKey: 'kpi.hint.lines' },
  { key: 'slipped', label: 'Slipped', hintKey: 'kpi.hint.slipped', flag: 'slipped', tone: 'serious' },
  { key: 'rosAtRisk', label: 'ROS at risk', hintKey: 'kpi.hint.rosAtRisk', flag: 'rosRisk', tone: 'critical' },
  { key: 'dueSoon', label: 'Due soon', hintKey: 'kpi.hint.dueSoon', flag: 'dueSoon', tone: 'warning' },
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
  const { t } = useT();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map((tile) => {
        const value = kpis[tile.key];
        const active = tile.flag !== undefined && activeFlags.includes(tile.flag);
        const alarming = tile.tone !== undefined && value > 0;
        const content = (
          <>
            <p className="text-[11px] font-medium tracking-wider text-ink-3 uppercase">
              {tile.label}
              {tile.key === 'dueSoon' && <span className="normal-case"> · {t('kpi.daysSuffix', { days: dueSoonDays })}</span>}
            </p>
            <AnimatedNumber value={value} className={`mt-1 block text-3xl font-semibold ${alarming && tile.tone ? TONE[tile.tone] : 'text-ink'}`} />
            <p className="mt-1 text-[11px] text-ink-3">{t(tile.hintKey)}</p>
          </>
        );
        const base = `rounded-2xl border bg-surface p-4 text-left backdrop-blur-md ${active ? 'border-ai-1' : 'border-line'} ${
          tile.key === 'rosAtRisk' && value > 0 ? 'pulse-risk' : ''
        }`;
        return tile.flag ? (
          <motion.button
            key={tile.key}
            type="button"
            variants={cardVariants}
            whileHover={{ y: -2 }}
            aria-pressed={active}
            className={`${base} cursor-pointer`}
            onClick={() => onFilter({ flags: active ? activeFlags.filter((f) => f !== tile.flag) : [...activeFlags, tile.flag!] })}
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
