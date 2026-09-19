import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { phaseFunnel, type PhaseBasis } from '../../analytics/aggregate';
import type { LineMetrics } from '../../analytics/lineMetrics';
import type { LinePhase } from '../../data/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CHART_INK, phaseColor } from '../theme/palette';

interface PhaseFunnelProps {
  metrics: readonly LineMetrics[];
  onSelectPhase: (phase: LinePhase) => void;
}

/** Lines per phase. Bars are direct-labeled; one series, so no legend box. */
export function PhaseFunnel({ metrics, onSelectPhase }: PhaseFunnelProps) {
  const { t, lang } = useT();
  const theme = useApp((s) => s.theme);
  const [basis, setBasis] = useState<PhaseBasis>('schedule');
  const data = useMemo(() => phaseFunnel(metrics, basis), [metrics, basis]);
  const ink = CHART_INK[theme];

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const { name, value } = p as unknown as { name: string; value: number };
          return `${name}: ${value} ${t('unit.lines', { n: value })}`;
        },
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((d) => d.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: ink.muted },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 18,
          data: data.map((d) => ({ value: d.count, itemStyle: { color: phaseColor(d.phase, theme), borderRadius: [0, 4, 4, 0] } })),
          label: { show: true, position: 'right', color: ink.text, fontFamily: 'JetBrains Mono Variable, monospace' },
        },
      ],
    }),
    [data, ink, theme, lang],
  );

  return (
    <Card
      title="Phase funnel"
      subtitle={basis === 'schedule' ? t('phaseFunnel.subtitleSchedule') : t('phaseFunnel.subtitleActual')}
      actions={
        <div role="group" aria-label={t('phaseFunnel.basisGroupLabel')} className="flex rounded-lg border border-line p-0.5 text-xs">
          {(['schedule', 'actual'] as const).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={basis === b}
              onClick={() => setBasis(b)}
              className={`rounded-md px-2 py-1 ${basis === b ? 'bg-ai-1/20 text-ai-1' : 'text-ink-3'}`}
            >
              {b === 'schedule' ? t('phaseFunnel.basisSchedule') : 'Actual'}
            </button>
          ))}
        </div>
      }
    >
      <EChart
        ariaLabel={t('phaseFunnel.chartAriaLabel')}
        height={260}
        option={option}
        onEvents={basis === 'schedule' ? { click: (p) => onSelectPhase(data[(p as { dataIndex: number }).dataIndex].phase) } : undefined}
      />
    </Card>
  );
}
