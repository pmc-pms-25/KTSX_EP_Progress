import { motion } from 'motion/react';
import { translate } from '../../i18n/translate';
import type { LoadStep } from '../../store/appStore';
import { useApp } from '../../store/useApp';

const STEPS: { key: Exclude<LoadStep, 'done'>; label: string }[] = [
  { key: 'config', label: 'Đọc cấu hình' },
  { key: 'fetch', label: 'Đồng bộ dữ liệu từ nguồn' },
  { key: 'parse', label: 'Phân tích cấu trúc Procurement Plan' },
  { key: 'analyze', label: 'Phát hiện rủi ro & tạo insight' },
];

/** Real pipeline progress (not a fake timer) over scanning skeletons. */
export function LoadingScreen() {
  const step = useApp((s) => s.step);
  const detail = useApp((s) => s.stepDetail);
  const current = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6">
      <div className="ai-border mx-auto mb-6 max-w-md rounded-2xl p-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <span className="ai-text text-lg">✦</span> Đang chuẩn bị dashboard…
        </p>
        <ol className="space-y-2 text-sm">
          {STEPS.map((s, i) => (
            <motion.li key={s.key} initial={{ opacity: 0, x: -6 }} animate={{ opacity: i <= current ? 1 : 0.4, x: 0 }} className="flex items-center gap-2">
              <span className={`font-mono text-xs ${i < current ? 'text-good' : i === current ? 'text-ai-1' : 'text-ink-3'}`}>
                {i < current ? '✓' : i === current ? '›' : '·'}
              </span>
              <span className={i === current ? 'text-ink' : 'text-ink-2'}>
                {s.label}
                {/* i18n: Batch B */}
                {i === current && detail ? ` (${translate('vi', detail)})` : ''}
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
