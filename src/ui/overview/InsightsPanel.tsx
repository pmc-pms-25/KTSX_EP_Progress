import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Filters } from '../../analytics/filters';
import type { Insight, Severity } from '../../analytics/insights/types';
import type { LineMetrics } from '../../analytics/lineMetrics';
import { Card } from '../common/Card';

const SEVERITY: Record<Severity, { label: string; icon: string; tone: string }> = {
  critical: { label: 'Nghiêm trọng', icon: '▲', tone: 'text-critical' },
  warning: { label: 'Cần chú ý', icon: '●', tone: 'text-warning' },
  info: { label: 'Thông tin', icon: '◆', tone: 'text-ai-1' },
};

/** Reveals text character by character, like a model streaming its answer. */
function Typewriter({ text }: { text: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) {
      setShown(text.length);
      return;
    }
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 2)), 12);
    return () => clearInterval(id);
  }, [text, reduced]);
  return (
    <>
      {text.slice(0, shown)}
      {shown < text.length && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-ai-1 align-middle" />}
    </>
  );
}

interface InsightsPanelProps {
  insights: Insight[];
  metrics: readonly LineMetrics[];
  onApply: (filter: Partial<Filters>) => void;
  onOpenPackage: (code: string) => void;
}

export function InsightsPanel({ insights, metrics, onApply, onOpenPackage }: InsightsPanelProps) {
  const [why, setWhy] = useState<string | undefined>();
  const byId = new Map(metrics.map((m) => [m.line.id, m]));

  return (
    <Card ai title="AI Insights" subtitle={'Tự động phát hiện từ dữ liệu hiện tại · bấm "Why?" để xem bằng chứng'}>
      {insights.length === 0 ? (
        <p className="text-sm text-ink-3">Không phát hiện điểm bất thường nào với bộ lọc hiện tại.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {insights.map((ins, i) => {
            const s = SEVERITY[ins.severity];
            const open = why === ins.id;
            return (
              <motion.li
                key={ins.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-xl border border-line bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className={`flex items-center gap-1 font-medium ${s.tone}`}>
                    <span aria-hidden>{s.icon}</span>
                    {s.label}
                  </span>
                  <span className="font-mono text-ink-3" title="Tỷ lệ dòng có đủ dữ liệu cho phân tích này">
                    Confidence {Math.round(ins.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-ink">{ins.title}</p>
                <p className="mt-1 min-h-10 text-xs leading-relaxed text-ink-2">
                  <Typewriter text={ins.detail} />
                </p>
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" className="text-ai-1 underline" onClick={() => setWhy(open ? undefined : ins.id)}>
                    {open ? 'Ẩn' : 'Why?'}
                  </button>
                  {ins.filter && (
                    <button type="button" className="text-ai-1 underline" onClick={() => onApply(ins.filter!)}>
                      Lọc theo insight
                    </button>
                  )}
                </div>
                <AnimatePresence>
                  {open && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-2 max-h-40 overflow-auto border-t border-line pt-2 text-xs"
                    >
                      {ins.evidence.slice(0, 50).map((id) => {
                        const m = byId.get(id);
                        if (!m) return null;
                        return (
                          <li key={id}>
                            <button type="button" className="w-full truncate py-0.5 text-left text-ink-2 hover:text-ai-1" onClick={() => onOpenPackage(m.line.packageCode)}>
                              <span className="font-mono">{m.line.packageCode}</span> @ {m.line.facility} · dòng {m.line.sourceRow}
                            </button>
                          </li>
                        );
                      })}
                      {ins.evidence.length > 50 && <li className="text-ink-3">… và {ins.evidence.length - 50} dòng khác</li>}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
