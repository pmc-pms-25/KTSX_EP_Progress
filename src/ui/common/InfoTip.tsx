import { useEffect, useId, useState, type ReactNode } from 'react';

interface InfoTipProps {
  /** Accessible name of the "?" button, e.g. "How TR / Pre-RFQ is calculated". */
  label: string;
  children: ReactNode;
  /** Which edge the panel lines up with; use 'end' near the right side of the screen. */
  align?: 'start' | 'end';
  /** Positioning of the "?" (defaults to `relative`, in flow); the panel anchors to it. */
  className?: string;
}

/** A small "?" that explains something on hover, keyboard focus or tap; Escape, blur or leaving closes it. */
export function InfoTip({ label, children, align = 'start', className = '' }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span className={`inline-flex ${className || 'relative'}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        // A tap fires hover and focus before click, so click only opens; blur, Escape or leaving closes.
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="grid h-5 w-5 cursor-help place-items-center rounded-full border border-line bg-surface text-[11px] leading-none text-ink-3 hover:border-ai-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-ai-1"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={`absolute top-full z-40 mt-2 w-72 max-w-[80vw] rounded-xl border border-line bg-surface-2 p-3 text-left text-xs leading-relaxed font-normal text-ink-2 shadow-xl ${
            align === 'end' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
