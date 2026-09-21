import { computeDocMetrics, type DocMetrics } from '../../analytics/engineering/docMetrics';
import type { EmdrRegister } from '../../data/engineering/types';
import type { Day } from '../../lib/day';

let last: { register: EmdrRegister; cutOff: Day; metrics: DocMetrics[] } | undefined;

/** One-entry cache, like `procurementMetrics`: header, filter bar, page and drawers share one array. */
export function engineeringMetrics(register: EmdrRegister, cutOff: Day): DocMetrics[] {
  if (last && last.register === register && last.cutOff === cutOff) return last.metrics;
  const metrics = computeDocMetrics(register.documents, cutOff);
  last = { register, cutOff, metrics };
  return metrics;
}
