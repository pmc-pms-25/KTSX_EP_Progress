import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { Line } from '../../data/types';
import { dayToISO, formatDay } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { CATEGORICAL, CHART_INK } from '../theme/palette';

const MS_PER_DAY = 86_400_000;

/** Step line of ROS across the ED revisions (Old ED → latest ED). */
export function RosHistory({ line }: { line: Line }) {
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
          return `${point.label}<br/><b>${formatDay(point.day)}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: line.rosHistory.map((p) => p.label.replace(/\s*\(.*\)$/, '')),
        axisLabel: { color: ink.muted, fontSize: 10, interval: 0, rotate: 20 },
      },
      yAxis: {
        type: 'time',
        scale: true,
        axisLabel: { color: ink.muted, formatter: (v: number) => dayToISO(Math.floor(v / MS_PER_DAY)).slice(0, 7) },
        splitLine: { lineStyle: { color: ink.grid } },
      },
      series: [
        {
          type: 'line',
          step: 'end',
          symbolSize: 8,
          lineStyle: { width: 2, color: CATEGORICAL[theme][0] },
          itemStyle: { color: CATEGORICAL[theme][0], borderColor: ink.surface, borderWidth: 2 },
          data: line.rosHistory.map((p) => p.day * MS_PER_DAY),
        },
      ],
    }),
    [line, ink, theme],
  );
  if (line.rosHistory.length < 2) return <p className="text-xs text-ink-3">Không có lịch sử ROS.</p>;
  return <EChart ariaLabel="Lịch sử điều chỉnh ROS" height={180} option={option} />;
}
