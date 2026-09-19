import { motion } from 'motion/react';
import type { LoadStep } from '../../store/appStore';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { useApp } from '../../store/useApp';

const STEPS: { key: Exclude<LoadStep, 'done'>; labelKey: MessageKey }[] = [
  { key: 'config', labelKey: 'loading.step.config' },
  { key: 'fetch', labelKey: 'loading.step.fetch' },
  { key: 'parse', labelKey: 'loading.step.parse' },
  { key: 'analyze', labelKey: 'loading.step.analyze' },
];

/** Real pipeline progress (not a fake timer) over scanning skeletons. */
export function LoadingScreen() {
  const { t } = useT();
  const step = useApp((s) => s.step);
  const detail = useApp((s) => s.stepDetail);
  const current = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="ai-border mx-auto mb-6 max-w-md rounded-2xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span className="ai-text text-lg">✦</span> {t('loading.preparing')}
        </p>
        <ol className="space-y-2 text-sm">
          {STEPS.map((s, i) => (
            <motion.li key={s.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i <= current ? 1 : 0.4, x: 0 }} className="flex items-center gap-2">
              <span className={`font-mono text-xs ${i < current ? 'text-good' : i === current ? 'text-ai-1' : 'text-ink-3'}`}>
                {i < current ? '✓' : i === current ? '›' : '·'}
              </span>
              <span className={i === current ? 'text-ink' : 'text-ink-2'}>
                {t(s.labelKey)}
                {i === current && detail ? ` (${t(detail)})` : ''}
                {i === current && '…'}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="scan h-24 rounded-2xl border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="scan h-64 rounded-2xl border border-line bg-surface" />
        <div className="scan h-64 rounded-2xl border border-line bg-surface" />
      </div>
    </div>
  );
}
