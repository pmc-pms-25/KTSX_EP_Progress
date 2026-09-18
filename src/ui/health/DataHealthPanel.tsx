import { useMemo } from 'react';
import type { DataWarning, WarningCode } from '../../data/types';
import { useApp } from '../../store/useApp';
import { Drawer } from '../common/Drawer';

const CODE_LABEL: Record<WarningCode, string> = {
  INVALID_PACKAGE_CODE: 'Package Code trống / bằng 0',
  MISSING_FACILITY: 'Thiếu Facility',
  INCOMPLETE_TRIPLET: 'Thiếu dòng FORECAST/ACTUAL',
  ORPHAN_ROW: 'Dòng FORECAST/ACTUAL lạc',
  UNKNOWN_ROW_TYPE: 'Giá trị cột Date lạ',
  INVALID_DATE: 'Ô ngày không hợp lệ (#####, 00/Jan/00…)',
  UNKNOWN_COLUMN: 'Cột không nhận diện',
  NO_DISCIPLINE: 'Dòng nằm ngoài discipline',
};

const LEVEL_TONE: Record<DataWarning['level'], string> = { error: 'text-critical', warn: 'text-serious', info: 'text-ink-3' };

export function DataHealthPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const plan = useApp((s) => s.plan);
  const groups = useMemo(() => {
    const map = new Map<WarningCode, DataWarning[]>();
    for (const w of plan?.warnings ?? []) map.set(w.code, [...(map.get(w.code) ?? []), w]);
    return [...map];
  }, [plan]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="sm:max-w-xl"
      title={
        <div>
          <h2 className="text-base font-semibold">Data Health</h2>
          <p className="text-xs text-ink-3">Các vấn đề chất lượng dữ liệu phát hiện khi đọc sheet. App vẫn hiển thị các dòng này.</p>
        </div>
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-good">✓ Không phát hiện vấn đề nào.</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([code, items]) => (
            <details key={code} className="rounded-xl border border-line bg-surface p-3" open={items.length <= 5}>
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className={LEVEL_TONE[items[0].level]}>{CODE_LABEL[code]}</span>
                <span className="font-mono text-xs text-ink-3">{items.length}</span>
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-ink-2">
                {items.map((w, i) => (
                  <li key={`${w.row ?? 'x'}-${i}`} className="flex gap-2">
                    {w.row !== undefined && <span className="w-14 shrink-0 font-mono text-ink-3">dòng {w.row}</span>}
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </Drawer>
  );
}
