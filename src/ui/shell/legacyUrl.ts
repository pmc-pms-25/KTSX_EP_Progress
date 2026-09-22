/** Short keys with comma-joined values, used by links shared before the multi-module shell. */
const LEGACY_KEYS: Record<string, string> = { d: 'discipline', f: 'facility', t: 'type', p: 'phase', flag: 'flag' };

/** Phase values that were split: Logistics became On-Sailing and Arrived at Site. */
const LEGACY_PHASES: Record<string, string[]> = { logistics: ['onSailing', 'arrived'] };

function append(next: URLSearchParams, key: string, value: string): void {
  const values = key === 'phase' ? (LEGACY_PHASES[value] ?? [value]) : [value];
  for (const v of values) if (!next.getAll(key).includes(v)) next.append(key, v);
}

/** Rewrite old filter params to today's format; every other param passes through. */
export function migrateLegacyParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    const renamed = LEGACY_KEYS[key];
    if (!renamed) {
      append(next, key, value);
      continue;
    }
    for (const part of value.split(',')) if (part) append(next, renamed, part);
  }
  return next;
}
