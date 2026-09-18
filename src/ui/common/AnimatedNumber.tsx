import { animate, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';

const format = (n: number) => Math.round(n).toLocaleString('vi-VN');

/** Counts from the previous value to `value` (800 ms on first paint, 400 ms on updates). */
export function AnimatedNumber({ value, className = '' }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef<number | undefined>(undefined);
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const from = previous.current ?? 0;
    previous.current = value;
    if (reduced || from === value) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(from, value, {
      duration: from === 0 ? 0.8 : 0.4,
      ease: 'easeOut',
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span ref={ref} className={`font-mono tabular-nums ${className}`}>
      {format(value)}
    </span>
  );
}
