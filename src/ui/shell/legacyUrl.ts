/** Short keys with comma-joined values, used by links shared before the multi-module shell. */
const LEGACY_KEYS: Record<string, string> = { d: 'discipline', f: 'facility', t: 'type', p: 'phase', flag: 'flag' };

/** Rewrite old filter params to today's format; every other param passes through. */
export function migrateLegacyParams(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams();
  for (const [key, value] of params) {
    const renamed = LEGACY_KEYS[key];
    if (!renamed) {
      next.append(key, value);
      continue;
    }
    for (const part of value.split(',')) if (part) next.append(renamed, part);
  }
  return next;
}
