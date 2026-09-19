import type { MilestoneStatus } from '../../analytics/lineMetrics';
import { LINE_PHASE_LABEL } from '../../data/milestones';
import type { LinePhase } from '../../data/types';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { milestoneStatusColor, phaseColor } from '../theme/palette';

export function PhaseChip({ phase, muted = false }: { phase: LinePhase; muted?: boolean }) {
  const theme = useApp((s) => s.theme);
  const color = phaseColor(phase, theme);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs whitespace-nowrap ${muted ? 'text-ink-3' : 'text-ink'}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: color }} />
      {LINE_PHASE_LABEL[phase]}
    </span>
  );
}

const STATUS_LABEL_KEY: Record<MilestoneStatus, MessageKey> = {
  done: 'chip.status.done',
  overdue: 'chip.status.overdue',
  dueSoon: 'chip.status.dueSoon',
  future: 'chip.status.future',
  noDate: 'chip.status.noDate',
};

export const STATUS_ICON: Record<MilestoneStatus, string> = { done: '✓', overdue: '!', dueSoon: '◷', future: '·', noDate: '–' };

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  const color = milestoneStatusColor(status, theme);
  return (
    <span className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-ink-2">
      <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: color }}>
        {STATUS_ICON[status]}
      </span>
      {t(STATUS_LABEL_KEY[status])}
    </span>
  );
}

/** ROS float: negative is at risk (critical), small positive is tight (warning). */
export function FloatBadge({ days }: { days: number | undefined }) {
  if (days === undefined) return <span className="text-ink-3">—</span>;
  const tone = days < 0 ? 'text-critical' : days < 30 ? 'text-warning' : 'text-ink-2';
  const icon = days < 0 ? '⚠ ' : '';
  return (
    <span className={`font-mono tabular-nums ${tone}`}>
      {icon}
      {days > 0 ? '+' : ''}
      {days}d
    </span>
  );
}
