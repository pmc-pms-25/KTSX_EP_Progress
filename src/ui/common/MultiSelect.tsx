import { useEffect, useId, useRef, useState } from 'react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface MultiSelectProps<T extends string> {
  label: string;
  options: readonly Option<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}

/** Compact dropdown with checkboxes; closes on outside click or Escape. */
export function MultiSelect<T extends string>({ label, options, selected, onChange }: MultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  const active = selected.length > 0;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-sm whitespace-nowrap transition-colors ${
          active ? 'border-ai-1/60 bg-ai-1/10 text-ink' : 'border-line bg-surface text-ink-2 hover:text-ink'
        }`}
      >
        {label}
        {active && <span className="rounded bg-ai-1/20 px-1.5 font-mono text-xs text-ai-1">{selected.length}</span>}
        <span aria-hidden className="text-ink-3">▾</span>
      </button>
      {open && (
        <ul
          id={id}
          role="listbox"
          aria-multiselectable
          className="absolute z-30 mt-1 max-h-72 min-w-56 overflow-auto rounded-xl border border-line bg-surface-2 p-1 shadow-xl"
        >
          {options.map((o) => (
            <li key={o.value}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface">
                <input type="checkbox" className="accent-cyan-500" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
                {o.label}
              </label>
            </li>
          ))}
          {active && (
            <li>
              <button type="button" className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-ai-1 hover:bg-surface" onClick={() => onChange([])}>
                Bỏ chọn tất cả
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
