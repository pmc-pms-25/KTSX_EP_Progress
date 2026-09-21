import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Facet values in the URL: several values repeat the key; changes replace history (Back skips them). */
export function useFacetParams(keys: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => Object.fromEntries(keys.map((k) => [k, params.getAll(k).filter(Boolean)])), [params, keys]);

  const setValues = useCallback(
    (key: string, next: string[]) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete(key);
          for (const v of next) p.append(key, v);
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );

  const clear = useCallback(
    () =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          for (const k of keys) p.delete(k);
          return p;
        },
        { replace: true },
      ),
    [keys, setParams],
  );

  return { values, setValues, clear };
}
