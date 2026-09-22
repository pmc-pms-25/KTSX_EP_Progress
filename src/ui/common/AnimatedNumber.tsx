import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { formatNumber } from '../../i18n/translate';
import { useApp } from '../../store/useApp';
import type { Lang } from '../../i18n/message';

const format = (n: number, lang: Lang) => formatNumber(Math.round(n), lang);

/** Counts from the previous value to `value` (800 ms on first paint, 400 ms on updates). Tabular figures keep digits aligned. */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const lang = useApp((s) => s.lang);
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | undefined>(undefined);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current ?? 0;
    previous.current = value;
    if (reduced || from === value) {
      node.textContent = format(value, lang);
      return;
    }
    const controls = animate(from, value, {
      duration: from === 0 ? 0.8 : 0.4,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = format(v, lang);
      },
    });
    return () => controls.stop();
  }, [value, reduced, lang]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {format(value, lang)}
    </span>
  );
}
