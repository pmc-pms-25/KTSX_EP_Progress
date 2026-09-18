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
