import { useMemo, useState } from 'react';
import { summarizePackages } from '../../analytics/aggregate';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { FloatBadge, PhaseChip } from '../common/Chip';
import { Drawer } from '../common/Drawer';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useDashboard } from '../hooks/useDashboard';
import { usePackageParam } from '../hooks/useFilters';
import { MilestoneTable } from './MilestoneTable';
import { MiniGantt } from './MiniGantt';
import { RosHistory } from './RosHistory';

/** Package detail, opened with `?pkg=<code>` from any view. Shows all facilities regardless of filters. */
export function PackageDrawer() {
  const { t } = useT();
  const { code, close } = usePackageParam();
  const { metrics, ctx } = useDashboard();
  const cutOff = ctx.cutOff;
  const [facility, setFacility] = useState<string | undefined>();
  const pkg = useMemo(() => (code ? summarizePackages(metrics.filter((m) => m.line.packageCode === code))[0] : undefined), [code, metrics]);
  const selected = pkg?.lines.find((m) => m.line.facility === facility) ?? pkg?.lines[0];

  return (
    <Drawer
      open={code !== undefined}
      onClose={() => {
        setFacility(undefined);
        close();
      }}
      title={
        pkg ? (
          <div>
            <p className="font-mono text-xs text-ai-1">
              {pkg.code} · {pkg.discipline}
            </p>
            <h2 className="text-base font-semibold">{pkg.name || '—'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <PhaseChip phase={pkg.scheduledPhase} />
              <span className="text-ink-3">{pkg.lines[0].line.itemType}</span>
              <span className="text-ink-3">{t('packageTable.rosFloat')} min</span>
              <FloatBadge days={pkg.minRosFloat} />
            </div>
          </div>
        ) : (
          <h2 className="text-base font-semibold">{t('packageDrawer.notFound', { code: code ?? '' })}</h2>
        )
      }
    >
      {pkg && selected && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('packageDrawer.progressByFacility')}</h3>
            <ErrorBoundary label="Gantt">
              <MiniGantt lines={pkg.lines} cutOff={cutOff} />
            </ErrorBoundary>
          </section>

          <section>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('packageDrawer.milestoneDetails')}</h3>
              <div className="flex flex-wrap gap-1">
                {pkg.lines.map((m) => (
                  <button
                    key={m.line.id}
                    type="button"
                    onClick={() => setFacility(m.line.facility)}
                    aria-pressed={m === selected}
                    className={`rounded-full border px-2 py-0.5 text-xs ${m === selected ? 'border-ai-1 bg-ai-1/15 text-ai-1' : 'border-line text-ink-2'}`}
                  >
                    {m.line.facility}
                    {m.rosAtRisk && <span className="ml-1 text-critical">▲</span>}
                  </button>
                ))}
              </div>
            </div>
            <dl className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">ROS</dt>
                <dd className="font-mono">{formatDay(selected.line.ros)}</dd>
              </div>
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">{t('packageTable.rosFloat')}</dt>
                <dd>
                  <FloatBadge days={selected.rosFloat} />
                </dd>
              </div>
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">Delivery</dt>
                <dd className="font-mono">{selected.line.deliveryWeeks ?? '—'} {t('unit.weeks', { n: selected.line.deliveryWeeks ?? 0 })}</dd>
              </div>
              <div className="rounded-lg border border-line p-2">
                <dt className="text-ink-3">{t('packageDrawer.sourceRowLabel')}</dt>
                <dd className="font-mono">{selected.line.sourceRow}</dd>
              </div>
            </dl>
            <MilestoneTable metrics={selected} />
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('packageDrawer.rosHistoryTitle', { facility: selected.line.facility })}</h3>
            <ErrorBoundary label={t('errorBoundary.rosHistoryLabel')}>
              <RosHistory line={selected.line} />
            </ErrorBoundary>
          </section>

          {selected.line.remark && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">Remark</h3>
              <p className="rounded-lg border border-line bg-surface p-3 text-sm whitespace-pre-line text-ink-2">{selected.line.remark}</p>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
