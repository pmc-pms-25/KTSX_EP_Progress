import { useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { facilityHeatmap } from '../../analytics/aggregate';
import type { LineMetrics } from '../../analytics/lineMetrics';
import { MILESTONES } from '../../data/milestones';
import type { MilestoneKey } from '../../data/types';
import { formatMonth } from '../../lib/day';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CHART_INK, SEQUENTIAL } from '../theme/palette';

/** Milestones due per Facility × Month (sequential single-hue ramp). */
export function FacilityHeatmap({ metrics }: { metrics: readonly LineMetrics[] }) {
  const theme = useApp((s) => s.theme);
  const [milestone, setMilestone] = useState<MilestoneKey | 'all'>('all');
  const data = useMemo(() => facilityHeatmap(metrics, milestone), [metrics, milestone]);
  const ink = CHART_INK[theme];

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 12, top: 8, bottom: 64, containLabel: true },
      tooltip: {
        formatter: (p) => {
          const [mi, fi, n] = (p as unknown as { value: [number, number, number] }).value;
          return `${data.facilities[fi]} · ${formatMonth(data.months[mi])}<br/><b>${n}</b> mốc`;
        },
      },
      xAxis: { type: 'category', data: data.months.map(formatMonth), axisLabel: { color: ink.muted }, splitArea: { show: false } },
      yAxis: { type: 'category', data: data.facilities, axisLabel: { color: ink.muted } },
      visualMap: {
        min: 0,
        max: Math.max(1, data.max),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemHeight: 120,
        textStyle: { color: ink.muted },
        inRange: { color: [...SEQUENTIAL[theme]] },
      },
      dataZoom: [{ type: 'inside', xAxisIndex: 0 }],
      series: [
        {
          type: 'heatmap',
          data: data.cells,
          itemStyle: { borderColor: ink.surface, borderWidth: 2, borderRadius: 3 },
          emphasis: { itemStyle: { borderColor: ink.text } },
        },
      ],
    }),
    [data, ink, theme],
  );

  return (
    <Card
      title="Facility × Tháng"
      subtitle="Số mốc đến hạn theo facility và tháng"
      actions={
        <select
          aria-label="Chọn mốc"
          value={milestone}
          onChange={(e) => setMilestone(e.target.value as MilestoneKey | 'all')}
          className="h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink"
        >
          <option value="all">Tất cả mốc</option>
          {MILESTONES.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
      }
    >
      {data.cells.length === 0 ? (
        <p className="text-sm text-ink-3">Không có dữ liệu.</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(480, data.months.length * 22) }}>
            <EChart ariaLabel="Heatmap số mốc theo facility và tháng" height={Math.max(260, data.facilities.length * 28 + 110)} option={option} />
          </div>
        </div>
      )}
    </Card>
  );
}
