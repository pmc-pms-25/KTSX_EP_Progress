import { useEffect, useMemo, useState } from 'react';
import { describeSearch, parseSearch, type SearchVocabulary } from '../../analytics/search';
import { useT } from '../../i18n/useT';

interface AskBoxProps {
  value: string;
  vocab: SearchVocabulary;
  onChange: (q: string) => void;
}

/** "Ask PMS - PEIW" — smart search today, the LLM entry point later. */
export function AskBox({ value, vocab, onChange }: AskBoxProps) {
  const { t } = useT();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft((d) => (d.trim() === value.trim() ? d : value));
  }, [value]);
  useEffect(() => {
    if (draft.trim() === value.trim()) return;
    const t = setTimeout(() => onChange(draft), 250);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);

  const understood = useMemo(() => (draft.trim() ? describeSearch(parseSearch(draft, vocab)) : []), [draft, vocab]);

  return (
    <div className="w-full">
      <label className="ai-border flex h-10 items-center gap-2 rounded-xl px-3">
        <span aria-hidden className="ai-text text-lg">✦</span>
        <span className="sr-only">{t('ask.srSearch')}</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('ask.placeholder')}
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        {draft && (
          <button type="button" aria-label={t('ask.clear')} onClick={() => setDraft('')} className="text-ink-3 hover:text-ink">
            ✕
          </button>
        )}
        <span title={t('ask.aiComingSoonTitle')} className="hidden rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-3 md:inline">
          {t('ask.aiComingSoon')}
        </span>
      </label>
      {understood.length > 0 && (
        <p className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-ink-3">
          {t('ask.understoodAs')}
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
