import { STAGE_LABEL_KEY } from '../../data/engineering/stages';
import type { StageKey } from '../../data/engineering/types';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';
import { stageColor } from '../theme/palette';

export function StageChip({ stage, muted = false }: { stage: StageKey; muted?: boolean }) {
  const { t } = useT();
  const theme = useApp((s) => s.theme);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-xs whitespace-nowrap ${muted ? 'text-ink-3' : 'text-ink'}`}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: stageColor(stage, theme) }} />
      {t(STAGE_LABEL_KEY[stage])}
    </span>
  );
}
