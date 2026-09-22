import type { MilestoneStatus } from '../../analytics/lineMetrics';
import type { StageKey } from '../../data/engineering/types';
import type { LinePhase } from '../../data/types';
import type { Theme } from '../../store/appStore';

/**
 * Chart colors. Categorical slots validated with the dataviz palette validator
 * (adjacent CVD ΔE ≥ 8, normal-vision ΔE ≥ 15) on #111a2e (dark) and #fcfcfb (light).
 * Light-mode aqua/yellow/magenta sit below 3:1 contrast: charts always ship a legend and tooltips.
 */
export const CATEGORICAL: Record<Theme, readonly string[]> = {
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9', '#008300'],
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#008300'],
};

const NEUTRAL: Record<Theme, string> = { dark: '#7c8aa5', light: '#8a94a8' };

export function phaseColor(phase: LinePhase, theme: Theme): string {
  const order: LinePhase[] = ['tr', 'rfq', 'evaluation', 'award', 'manufacturing', 'onSailing', 'arrived'];
  const i = order.indexOf(phase);
  return i === -1 ? NEUTRAL[theme] : CATEGORICAL[theme][i];
}

/** Phase E steps reuse categorical slots (blue, amber, green); Not issued is neutral. */
export function stageColor(stage: StageKey, theme: Theme): string {
  const slot: Partial<Record<StageKey, number>> = { review: 0, commented: 3, final: 2 };
  const i = slot[stage];
  return i === undefined ? NEUTRAL[theme] : CATEGORICAL[theme][i];
}

/** Reserved status colors — never reused for series. Always paired with an icon or label. */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const;

export function milestoneStatusColor(status: MilestoneStatus, theme: Theme): string {
  switch (status) {
    case 'done':
      return STATUS.good;
    case 'dueSoon':
      return STATUS.warning;
    case 'overdue':
      return STATUS.serious;
    case 'future':
      return NEUTRAL[theme];
    default:
      return 'transparent';
  }
}

/** Sequential blue ramp for heatmaps: near-surface → strongest. */
export const SEQUENTIAL: Record<Theme, readonly string[]> = {
  dark: ['#16233d', '#184f95', '#2a78d6', '#5598e7', '#9ec5f4'],
  light: ['#eef4fc', '#b7d3f6', '#6da7ec', '#256abf', '#104281'],
};

/** Ink colors for chart axes, labels and grid lines. */
export const CHART_INK: Record<Theme, { text: string; muted: string; grid: string; surface: string; cutOff: string }> = {
  dark: { text: '#e2e8f0', muted: '#94a3b8', grid: 'rgba(148,163,184,0.12)', surface: '#111a2e', cutOff: '#22d3ee' },
  light: { text: '#0f172a', muted: '#475569', grid: 'rgba(15,23,42,0.08)', surface: '#ffffff', cutOff: '#0891b2' },
};
