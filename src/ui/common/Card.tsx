import { motion } from 'motion/react';
import type { ReactNode } from 'react';

interface CardProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** AI surfaces get the animated gradient border and the ✦ mark. */
  ai?: boolean;
}

export const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

export function Card({ title, subtitle, actions, children, className = '', ai = false }: CardProps) {
  const frame = ai ? 'ai-border' : 'border border-line bg-surface';
  return (
    <motion.section variants={cardVariants} className={`rounded-2xl p-4 shadow-sm backdrop-blur-md ${frame} ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                {ai && <span aria-hidden className="ai-text text-base">✦</span>}
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </motion.section>
  );
}

/** Container that staggers its Card children into view. */
export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
    >
      {children}
    </motion.div>
  );
}
