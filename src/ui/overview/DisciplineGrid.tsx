import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import type { DisciplineHealth, RiskLevel } from '../../analytics/aggregate';
import { Card } from '../common/Card';

const LEVEL: Record<RiskLevel, { label: string; icon: string; ring: string; tone: string }> = {
  ok: { label: 'Ổn định', icon: '✓', ring: 'border-good/40', tone: 'text-good' },
  watch: { label: 'Theo dõi', icon: '●', ring: 'border-warning/50', tone: 'text-warning' },
  risk: { label: 'Rủi ro', icon: '▲', ring: 'border-critical/60', tone: 'text-critical' },
};

export function DisciplineGrid({ health }: { health: DisciplineHealth[] }) {
  const [params] = useSearchParams();
  const query = params.toString();
  return (
    <Card title="Discipline health" subtitle="Điểm = (ROS×2 + quá hạn×1.5 + trượt×1) / số dòng · bấm để xem chi tiết">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {health.map((h) => {
          const lvl = LEVEL[h.level];
          return (
            <motion.div key={h.name} layoutId={`discipline-${h.name}`} whileHover={{ y: -2 }}>
              <Link
                to={{ pathname: `/discipline/${encodeURIComponent(h.name)}`, search: query ? `?${query}` : '' }}
                className={`block rounded-xl border bg-surface p-3 transition-colors hover:bg-surface-2 ${lvl.ring} ${h.level === 'risk' ? 'pulse-risk' : ''}`}
              >
                <p className="truncate text-xs font-semibold tracking-wide text-ink" title={h.name}>
                  {h.name}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] ${lvl.tone}`}>
                  <span aria-hidden>{lvl.icon}</span>
                  {lvl.label}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 text-[11px] text-ink-3">
                  <dt>Packages</dt>
                  <dd className="text-right font-mono text-ink-2">{h.packages}</dd>
                  <dt>ROS risk</dt>
                  <dd className={`text-right font-mono ${h.rosAtRisk ? 'text-critical' : 'text-ink-2'}`}>{h.rosAtRisk}</dd>
                  <dt>Slipped</dt>
                  <dd className="text-right font-mono text-ink-2">{h.slipped}</dd>
                </dl>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
