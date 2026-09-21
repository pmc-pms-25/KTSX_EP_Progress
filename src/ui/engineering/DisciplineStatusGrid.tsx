import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import type { DisciplineStatus, EngRisk } from '../../analytics/engineering/summaries';
import { STAGE_KEYS } from '../../data/engineering/stages';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { engineeringModule } from '../../modules/engineering/module';
import { useApp } from '../../store/useApp';
import { Card } from '../common/Card';
import { stageColor } from '../theme/palette';

const LEVEL: Record<EngRisk, { labelKey: MessageKey; icon: string; ring: string; tone: string }> = {
  ok: { labelKey: 'disciplineGrid.level.ok', icon: '✓', ring: 'border-good/40', tone: 'text-good' },
  warning: { labelKey: 'disciplineGrid.level.watch', icon: '●', ring: 'border-warning/50', tone: 'text-warning' },
  critical: { labelKey: 'disciplineGrid.level.risk', icon: '▲', ring: 'border-critical/60', tone: 'text-critical' },
};

export function DisciplineStatusGrid({ status }: { status: DisciplineStatus[] }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const [params] = useSearchParams();
  const query = params.toString();
  return (
    <Card title={t('eng.discipline.title')} subtitle={t('eng.discipline.subtitle')}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {status.map((s) => {
          const lvl = LEVEL[s.risk];
          return (
            <motion.div key={s.discipline} layoutId={`eng-discipline-${s.discipline}`} whileHover={{ y: -2 }}>
              <Link
                to={{ pathname: `${engineeringModule.path}/discipline/${encodeURIComponent(s.discipline)}`, search: query ? `?${query}` : '' }}
                className={`block rounded-xl border bg-surface p-3 transition-colors hover:bg-surface-2 ${lvl.ring}`}
              >
                <p className="truncate text-xs font-semibold tracking-wide text-ink" title={s.discipline}>
                  {s.discipline}
                </p>
                <p className={`mt-1 flex items-center gap-1 text-[11px] ${lvl.tone}`}>
                  <span aria-hidden>{lvl.icon}</span>
                  {t(lvl.labelKey)}
                </p>
                <div aria-hidden className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-line">
                  {STAGE_KEYS.map((k) =>
                    s.byStage[k] > 0 ? <span key={k} style={{ width: `${(s.byStage[k] / s.total) * 100}%`, background: stageColor(k, theme) }} /> : null,
                  )}
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-2 text-[11px] text-ink-3">
                  <dt>{t('eng.discipline.documents')}</dt>
                  <dd className="text-right font-mono text-ink-2">{s.total}</dd>
                  <dt>{t('eng.discipline.final')}</dt>
                  <dd className="text-right font-mono text-ink-2">{Math.round(s.finalRatio * 100)}%</dd>
                  <dt>{t('eng.discipline.notIssued')}</dt>
                  <dd className="text-right font-mono text-ink-2">{s.notIssued}</dd>
                  <dt>{t('eng.discipline.overdue')}</dt>
                  <dd className={`text-right font-mono ${s.overdue ? 'text-critical' : 'text-ink-2'}`}>{s.overdue}</dd>
                </dl>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}
