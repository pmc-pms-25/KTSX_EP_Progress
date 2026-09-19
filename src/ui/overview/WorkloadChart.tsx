import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { monthlyWorkload } from '../../analytics/aggregate';
import type { LineMetrics } from '../../analytics/lineMetrics';
import { useT } from '../../i18n/useT';
import { formatMonth, monthKey, type Day } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

/** Stacked monthly count of the six headline milestones, with a cut-off marker. */
export function WorkloadChart({ metrics, cutOff }: { metrics: readonly LineMetrics[]; cutOff: Day }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const data = useMemo(() => monthlyWorkload(metrics), [metrics]);
  const ink = CHART_INK[theme];

  const option = useMemo<EChartsOption>(() => {
    const cutLabel = formatMonth(monthKey(cutOff));
    const labels = data.months.map(formatMonth);
    return {
      color: [...CATEGORICAL[theme]],
      grid: { left: 8, right: 12, top: 36, bottom: 48, containLabel: true },
      legend: { top: 0, textStyle: { color: ink.muted }, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: labels, axisLabel: { color: ink.muted }, axisLine: { lineStyle: { color: ink.grid } } },
      yAxis: { type: 'value', axisLabel: { color: ink.muted }, splitLine: { lineStyle: { color: ink.grid } } },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', height: 16, bottom: 8, borderColor: 'transparent', textStyle: { color: ink.muted } },
      ],
      series: data.series.map((s, i) => ({
        type: 'bar',
        name: s.label,
        stack: 'total',
        data: s.counts,
        barMaxWidth: 22,
        itemStyle: { borderColor: ink.surface, borderWidth: 1 },
        ...(i === 0 && labels.includes(cutLabel)
          ? {
              markLine: {
                symbol: 'none',
                label: { formatter: 'Cut-off', color: ink.cutOff },
                lineStyle: { color: ink.cutOff, type: 'dashed', width: 2 },
                data: [{ xAxis: cutLabel }],
              },
            }
          : {}),
      })),
    };
  }, [data, ink, theme, cutOff]);

  return (
    <Card title={t('workloadChart.title')} subtitle={t('workloadChart.subtitle')}>
      {data.months.length === 0 ? <p className="text-sm text-ink-3">{t('workloadChart.noData')}</p> : <EChart ariaLabel={t('workloadChart.chartAriaLabel')} height={320} option={option} />}
    </Card>
  );
}
