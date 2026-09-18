export function EmptyFilterState({ onClear }: { onClear: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="text-3xl" aria-hidden>
        ∅
      </p>
      <p className="mt-2 text-sm text-ink-2">Không có dòng nào khớp bộ lọc hiện tại.</p>
      <button type="button" onClick={onClear} className="mt-4 rounded-lg bg-ai-1/20 px-4 py-2 text-sm text-ai-1">
        Xóa bộ lọc
      </button>
    </div>
  );
}
