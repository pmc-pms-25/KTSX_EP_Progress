import { BarChart, HeatmapChart, LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
// ESM entry on purpose: `lib/core` is CommonJS and bundles to the module object instead of the component.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import { useReducedMotion } from 'motion/react';
import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';

echarts.use([
  BarChart,
  HeatmapChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  VisualMapComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);

interface EChartProps {
  option: EChartsOption;
  height: number | string;
  onEvents?: Record<string, (params: unknown) => void>;
  ariaLabel: string;
}

/** Tree-shaken ECharts wrapper. Animation is off when the user prefers reduced motion. */
export function EChart({ option, height, onEvents, ariaLabel }: EChartProps) {
  const reduced = useReducedMotion();
  const merged = useMemo<EChartsOption>(
    () => ({ animationDuration: 600, animationDurationUpdate: 400, ...option, animation: !reduced }),
    [option, reduced],
  );
  return (
    <div role="img" aria-label={ariaLabel}>
      <ReactEChartsCore echarts={echarts} option={merged} style={{ height, width: '100%' }} onEvents={onEvents} notMerge lazyUpdate />
    </div>
  );
}
