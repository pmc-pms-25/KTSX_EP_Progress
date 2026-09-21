import { GATED_STAGES } from '../../data/engineering/stages';
import type { GatedStage } from '../../data/engineering/types';
import { useDrawerParam } from '../hooks/useFilters';

/** The document drawer is driven by `?doc=<document number>`. */
export function useDocParam() {
  const { value: id, open, close } = useDrawerParam('doc');
  return { id, open, close };
}

/** The stage drawer is driven by `?stage=<gated stage>`; unknown stages read as closed. */
export function useStageParam() {
  const { value, open, close } = useDrawerParam('stage');
  const stage = GATED_STAGES.find((s) => s === value);
  return { stage, open: open as (stage: GatedStage) => void, close };
}
