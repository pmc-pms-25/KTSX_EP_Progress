import { useMemo } from 'react';
import type { DataWarning, WarningCode } from '../../data/types';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { Drawer } from '../common/Drawer';

const CODE_LABEL_KEY: Record<WarningCode, MessageKey> = {
  INVALID_PACKAGE_CODE: 'health.code.invalidPackageCode',
  MISSING_FACILITY: 'health.code.missingFacility',
  INCOMPLETE_TRIPLET: 'health.code.incompleteTriplet',
  ORPHAN_ROW: 'health.code.orphanRow',
  UNKNOWN_ROW_TYPE: 'health.code.unknownRowType',
  INVALID_DATE: 'health.code.invalidDate',
  UNKNOWN_COLUMN: 'health.code.unknownColumn',
  NO_DISCIPLINE: 'health.code.noDiscipline',
  SKIPPED_SHEET: 'health.code.skippedSheet',
  BAD_DOC_NUMBER: 'health.code.badDocNumber',
  BAD_DATE: 'health.code.badDate',
  DUPLICATE_DOC: 'health.code.duplicateDoc',
  SUMMARY_MISMATCH: 'health.code.summaryMismatch',
  SHEET_CUTOFF: 'health.code.sheetCutOff',
};

const LEVEL_TONE: Record<DataWarning['level'], string> = { error: 'text-critical', warn: 'text-serious', info: 'text-ink-3' };

export function DataHealthPanel({ open, onClose, warnings }: { open: boolean; onClose: () => void; warnings: readonly DataWarning[] }) {
  const { t } = useT();
  const groups = useMemo(() => {
    const map = new Map<WarningCode, DataWarning[]>();
    for (const w of warnings) map.set(w.code, [...(map.get(w.code) ?? []), w]);
    return [...map];
  }, [warnings]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="sm:max-w-xl"
      title={
        <div>
          <h2 className="text-base font-semibold">{t('health.title')}</h2>
          <p className="text-xs text-ink-3">{t('health.subtitle')}</p>
        </div>
      }
    >
      {groups.length === 0 ? (
        <p className="text-sm text-good">{t('health.empty')}</p>
      ) : (
        <div className="space-y-3">
          {groups.map(([code, items]) => (
            <details key={code} className="rounded-xl border border-line bg-surface p-3" open={items.length <= 5}>
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                <span className={LEVEL_TONE[items[0].level]}>{t(CODE_LABEL_KEY[code])}</span>
                <span className="font-mono text-xs text-ink-3">{items.length}</span>
              </summary>
              <ul className="mt-2 space-y-1 text-xs text-ink-2">
                {items.map((w, i) => (
                  <li key={`${w.row ?? 'x'}-${i}`} className="flex gap-2">
                    {w.row !== undefined && <span className="w-14 shrink-0 font-mono text-ink-3">{t('common.row', { row: w.row })}</span>}
                    <span>{t(w.message)}</span>
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
