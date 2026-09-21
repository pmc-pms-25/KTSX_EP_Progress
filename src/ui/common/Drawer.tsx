import { AnimatePresence, motion } from 'motion/react';
import { useEffect, type ReactNode } from 'react';
import { useT } from '../../i18n/useT';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Tailwind max-width class for desktop; full screen below `sm`. */
  width?: string;
  /** Edge the sheet slides from; right by default. */
  side?: 'left' | 'right';
}

/** Side sheet (full screen on phones), closes on Escape or backdrop click. */
export function Drawer({ open, onClose, title, children, width = 'sm:max-w-3xl', side = 'right' }: DrawerProps) {
  const { t } = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            className={`absolute inset-y-0 ${side === 'left' ? 'left-0 border-r' : 'right-0 border-l'} flex w-full flex-col border-line bg-bg shadow-2xl ${width}`}
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? '-100%' : '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <header
              className="flex items-start justify-between gap-3 border-b border-line px-4 pb-3"
              style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
            >
              <div className="min-w-0">{title}</div>
              <button type="button" onClick={onClose} aria-label={t('common.close')} className="rounded-lg px-2 py-1 text-lg text-ink-2 hover:bg-surface hover:text-ink">
                ✕
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
