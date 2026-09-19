import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { Line } from '../../data/types';
import { useT } from '../../i18n/useT';
import { formatDay, formatMonth, monthKey } from '../../lib/day';
import { escapeHtml } from '../../lib/escapeHtml';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

/** Step line of ROS across the ED revisions (Old ED → latest ED). */
export function RosHistory({ line }: { line: Line }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const ink = CHART_INK[theme];
  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'axis',
        formatter: (p) => {
          const item = (p as { dataIndex: number }[])[0];
          const point = line.rosHistory[item.dataIndex];
          return `${escapeHtml(point.label)}<br/><b>${escapeHtml(formatDay(point.day))}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: line.rosHistory.map((p) => p.label.replace(/\s*\(.*\)$/, '')),
        axisLabel: { color: ink.muted, fontSize: 10, interval: 0, rotate: 20 },
      },
      yAxis: {
        type: 'value',
        scale: true,
        minInterval: 1,
        axisLabel: { color: ink.muted, formatter: (v: number) => formatMonth(monthKey(Math.round(v))) },
        splitLine: { lineStyle: { color: ink.grid } },
      },
      series: [
        {
          type: 'line',
          step: 'end',
          symbolSize: 8,
          lineStyle: { width: 2, color: CATEGORICAL[theme][0] },
          itemStyle: { color: CATEGORICAL[theme][0], borderColor: ink.surface, borderWidth: 2 },
          data: line.rosHistory.map((p) => p.day),
        },
      ],
    }),
    [line, ink, theme],
  );
  if (line.rosHistory.length < 2) return <p className="text-xs text-ink-3">{t('rosHistory.empty')}</p>;
  return <EChart ariaLabel={t('rosHistory.ariaLabel')} height={180} option={option} />;
}
