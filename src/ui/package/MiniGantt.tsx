import { useMemo } from 'react';
import { effectiveDay, type LineMetrics } from '../../analytics/lineMetrics';
import { MILESTONES } from '../../data/milestones';
import { useT } from '../../i18n/useT';
import { formatDay, formatMonth, monthKey, monthRange, monthBounds, type Day } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { STATUS_ICON } from '../common/Chip';
import { milestoneStatusColor, phaseColor } from '../theme/palette';

/**
 * One row per facility. Hollow ring = plan, filled dot = forecast (colored by status), ✓ = actual.
 * Vertical lines mark the cut-off (cyan) and the line's ROS (red).
 */
export function MiniGantt({ lines, cutOff }: { lines: LineMetrics[]; cutOff: Day }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);

  const range = useMemo(() => {
    const days: Day[] = [cutOff];
    for (const m of lines) {
      if (m.line.ros !== undefined) days.push(m.line.ros);
      for (const d of Object.values(m.line.milestones)) {
        for (const v of [d?.plan, d?.forecast, d?.actual]) if (v !== undefined) days.push(v);
      }
    }
    const min = Math.min(...days);
    const max = Math.max(...days);
    const from = monthBounds(monthKey(min)).from;
    const to = monthBounds(monthKey(max)).to;
    return { from, to, span: Math.max(1, to - from) };
  }, [lines, cutOff]);

  const pos = (d: Day) => `${((d - range.from) / range.span) * 100}%`;
  const months = monthRange(monthKey(range.from), monthKey(range.to));
  const tickEvery = Math.max(1, Math.ceil(months.length / 8));

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="relative ml-28 h-5 text-[10px] text-ink-3">
          {months.map((mk, i) =>
            i % tickEvery === 0 ? (
              <span key={mk} className="absolute -translate-x-1/2" style={{ left: pos(monthBounds(mk).from) }}>
                {formatMonth(mk)}
              </span>
            ) : null,
          )}
        </div>
        {lines.map((m) => (
          <div key={m.line.id} className="flex items-center border-t border-line/60 py-2">
            <div className="w-28 shrink-0 truncate pr-2 text-xs text-ink-2" title={m.line.facility}>
              {m.line.facility}
            </div>
            <div className="relative h-8 flex-1">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line" />
              <div className="absolute inset-y-0 w-0.5 bg-ai-1" style={{ left: pos(cutOff) }} title={`Cut-off ${formatDay(cutOff)}`} />
              {m.line.ros !== undefined && (
                <div className="absolute inset-y-0 w-0.5 bg-critical" style={{ left: pos(m.line.ros) }} title={`ROS ${formatDay(m.line.ros)}`} />
              )}
              {MILESTONES.map((def) => {
                const d = m.line.milestones[def.key];
                if (!d) return null;
                const status = m.status[def.key] ?? 'noDate';
                const shown = effectiveDay(d);
                const tip = `${def.label}\nPlan: ${formatDay(d.plan)}\nForecast: ${formatDay(d.forecast)}\nActual: ${formatDay(d.actual)}`;
                return (
                  <div key={def.key}>
                    {d.plan !== undefined && d.plan !== shown && (
                      <span
                        className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent"
                        style={{ left: pos(d.plan), borderColor: phaseColor(def.phase, theme) }}
                        title={tip}
                      />
                    )}
                    {shown !== undefined && (
                      <span
                        className="absolute top-1/2 grid h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[8px] font-bold text-white ring-2 ring-bg"
                        style={{ left: pos(shown), background: status === 'future' ? phaseColor(def.phase, theme) : milestoneStatusColor(status, theme) }}
                        title={tip}
                      >
                        {status === 'future' ? '' : STATUS_ICON[status]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-3">
          <span>○ Plan</span>
          <span>{t('miniGantt.legendForecast')}</span>
          <span>✓ Actual</span>
          <span className="text-ai-1">│ Cut-off</span>
          <span className="text-critical">│ ROS</span>
        </p>
      </div>
    </div>
  );
}
