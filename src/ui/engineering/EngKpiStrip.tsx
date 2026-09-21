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
