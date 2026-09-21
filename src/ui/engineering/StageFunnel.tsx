import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import type { DocMetrics } from '../../analytics/engineering/docMetrics';
import { STAGES } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { EChart } from '../charts/EChart';
import { Card } from '../common/Card';
import { CHART_INK, stageColor } from '../theme/palette';

interface StageFunnelProps {
  metrics: readonly DocMetrics[];
  onSelectStage: (stage: StageKey) => void;
}

/** Documents currently at each step. Bars are direct-labeled; one series, so no legend box. */
export function StageFunnel({ metrics, onSelectStage }: StageFunnelProps) {
  const { t, lang } = useT();
  const theme = useApp((s) => s.theme);
  const ink = CHART_INK[theme];
  const data = useMemo(() => STAGES.map((s) => ({ ...s, count: metrics.filter((m) => m.stage === s.key).length })), [metrics]);

  const option = useMemo<EChartsOption>(
    () => ({
      grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: 'item',
        formatter: (p) => {
          const { name, value } = p as unknown as { name: string; value: number };
          return `${name}: ${value} ${t('unit.documents', { n: value })}`;
        },
      },
      xAxis: { type: 'value', show: false },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((d) => t(d.labelKey)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: ink.muted },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 18,
          data: data.map((d) => ({ value: d.count, itemStyle: { color: stageColor(d.key, theme), borderRadius: [0, 4, 4, 0] } })),
          label: { show: true, position: 'right', color: ink.text, fontFamily: 'JetBrains Mono Variable, monospace' },
        },
      ],
    }),
    [data, ink, theme, lang, t],
  );

  return (
    <Card title={t('eng.funnel.title')} subtitle={t('eng.funnel.subtitle')}>
      <EChart
        ariaLabel={t('eng.funnel.chartAriaLabel')}
        height={220}
        option={option}
        onEvents={{ click: (p) => onSelectStage(data[(p as { dataIndex: number }).dataIndex].key) }}
      />
    </Card>
  );
}
