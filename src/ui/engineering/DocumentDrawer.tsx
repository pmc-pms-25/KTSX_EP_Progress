import type { StageState } from '../../analytics/engineering/docMetrics';
import { GATED_STAGES, STAGE_LABEL_KEY } from '../../data/engineering/stages';
import type { MessageKey } from '../../i18n/en';
import { useT } from '../../i18n/useT';
import { formatDay } from '../../lib/day';
import { useEngDashboard } from '../../modules/engineering/useEngDashboard';
import { Drawer } from '../common/Drawer';
import { useDocParam } from './params';
import { StageChip } from './StageChip';

const STATE_STYLE: Record<StageState, { labelKey: MessageKey; className: string }> = {
  late: { labelKey: 'phaseDrawer.state.late', className: 'bg-critical/15 text-critical' },
  done: { labelKey: 'phaseDrawer.state.done', className: 'bg-good/15 text-good' },
  pending: { labelKey: 'phaseDrawer.state.pending', className: 'bg-surface-2 text-ink-3' },
};

/** Document detail, opened with `?doc=<number>` from any Engineering view. Ignores the filters. */
export function DocumentDrawer() {
  const { t } = useT();
  const { id, close } = useDocParam();
  const { metrics } = useEngDashboard();
  const m = id ? metrics.find((x) => x.doc.id === id) : undefined;
  const doc = m?.doc;

  return (
    <Drawer
      open={id !== undefined}
      onClose={close}
      width="sm:max-w-2xl"
      title={
        doc ? (
          <div>
            <p className="font-mono text-xs text-ai-1">
              {doc.id} · {doc.discipline} · {doc.facility}
            </p>
            <h2 className="text-base font-semibold">{doc.title || '—'}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <StageChip stage={m!.stage} />
              <span className="font-mono text-ink-3">Rev {doc.rev || '—'}</span>
              {doc.code !== undefined && <span className="font-mono text-ink-3">Code {doc.code}</span>}
            </div>
          </div>
        ) : (
          <h2 className="text-base font-semibold">{t('eng.doc.notFound', { id: id ?? '' })}</h2>
        )
      }
    >
      {m && doc && (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.status')}</dt>
              <dd>{doc.status ?? '—'}</dd>
            </div>
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.docType')}</dt>
              <dd>{doc.docTypeLabel ? `${doc.docType} · ${doc.docTypeLabel}` : doc.docType}</dd>
            </div>
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.transmittal')}</dt>
              <dd className="font-mono">
                {doc.transmittal?.no || '—'}
                <span className="block">{formatDay(doc.transmittal?.date)}</span>
              </dd>
            </div>
            <div className="rounded-lg border border-line p-2">
              <dt className="text-ink-3">{t('eng.doc.sourceTab')}</dt>
              <dd>{doc.sheet}</dd>
            </div>
          </dl>

          <section>
            <h3 className="mb-2 text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('eng.doc.steps')}</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="py-1.5 pr-2 font-medium">{t('eng.table.stage')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('eng.doc.plan')}</th>
                  <th className="py-1.5 pr-2 font-medium">{t('eng.doc.actual')}</th>
                  <th className="py-1.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {GATED_STAGES.map((g) => {
                  const c = m.checks[g];
                  const style = STATE_STYLE[c.state];
                  return (
                    <tr key={g} className="border-b border-line/60">
                      <td className="py-1.5 pr-2">{t(STAGE_LABEL_KEY[g])}</td>
                      <td className="py-1.5 pr-2 font-mono">{formatDay(c.plan)}</td>
                      <td className="py-1.5 pr-2 font-mono">{formatDay(c.actual)}</td>
                      <td className="py-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${style.className}`}>{t(style.labelKey)}</span>
                        {c.delayDays !== undefined && c.delayDays > 0 && <span className="ml-1 font-mono text-critical">+{c.delayDays}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {doc.remark && (
            <section>
              <h3 className="mb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">{t('eng.doc.remark')}</h3>
              <p className="rounded-lg border border-line bg-surface p-3 text-sm whitespace-pre-line text-ink-2">{doc.remark}</p>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
