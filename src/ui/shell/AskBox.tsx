import { useEffect, useMemo, useState } from 'react';
import { describeSearch, parseSearch, type SearchVocabulary } from '../../analytics/search';

interface AskBoxProps {
  value: string;
  vocab: SearchVocabulary;
  onChange: (q: string) => void;
}

/** "Ask PMS - PEIW" — smart search today, the LLM entry point later. */
export function AskBox({ value, vocab, onChange }: AskBoxProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  const understood = useMemo(() => (draft.trim() ? describeSearch(parseSearch(draft, vocab)) : []), [draft, vocab]);

  return (
    <div className="w-full">
      <label className="ai-border flex h-10 items-center gap-2 rounded-xl px-3">
        <span aria-hidden className="ai-text text-lg">✦</span>
        <span className="sr-only">Tìm kiếm thông minh</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask PMS - PEIW…  ví dụ: PS2R LOA Q2-2027"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        {draft && (
          <button type="button" aria-label="Xóa tìm kiếm" onClick={() => setDraft('')} className="text-ink-3 hover:text-ink">
            ✕
          </button>
        )}
        <span title="Hỏi đáp bằng AI sẽ có ở phiên bản sau" className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-3 md:inline">
          AI chat · sắp ra mắt
        </span>
      </label>
      {understood.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-ink-3">
          Hiểu là:
          {understood.map((u) => (
            <span key={u} className="rounded bg-ai-1/10 px-1.5 py-0.5 text-ai-1">
              {u}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
