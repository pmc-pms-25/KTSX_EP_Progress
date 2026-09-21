import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { transmittalActivity } from '../../analytics/engineering/summaries';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

/** Documents received per week, from incoming transmittal dates. */
export function TransmittalChart({ metrics }: { metrics: readonly DocMetrics[] }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const ink = CHART_INK[theme];
  const weeks = useMemo(() => transmittalActivity(metrics), [metrics]);

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 12, top: 16, bottom: 48, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'category', data: weeks.map((w) => formatDay(w.start)), axisLabel: { color: ink.muted }, axisLine: { lineStyle: { color: ink.grid } } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: ink.muted }, splitLine: { lineStyle: { color: ink.grid } } },
      dataZoom: [
        { type: 'inside' },
        { type: 'slider', height: 16, bottom: 8, borderColor: 'transparent', textStyle: { color: ink.muted } },
      ],
      series: [
        {
          type: 'bar',
          name: t('eng.transmittal.title'),
          data: weeks.map((w) => w.count),
          barMaxWidth: 22,
          itemStyle: { color: CATEGORICAL[theme][0], borderRadius: [4, 4, 0, 0] },
        },
      ],
    }),
    [weeks, ink, theme, t],
  );

  return (
    <Card title={t('eng.transmittal.title')} subtitle={t('eng.transmittal.subtitle')}>
      {weeks.length === 0 ? (
        <p className="text-sm text-ink-3">{t('eng.transmittal.noData')}</p>
      ) : (
        <EChart ariaLabel={t('eng.transmittal.chartAriaLabel')} height={280} option={option} />
      )}
    </Card>
  );
}
