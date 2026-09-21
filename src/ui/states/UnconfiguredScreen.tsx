import { useT } from '../../i18n/useT';
import type { AnyModule } from '../../modules/types';

export function UnconfiguredScreen({ module }: { module: AnyModule }) {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <p className="text-4xl" aria-hidden>
        {module.icon}
      </p>
      <h1 className="mt-3 text-lg font-semibold">{t('module.unconfigured.title')}</h1>
      <p className="mt-2 text-sm text-ink-2">{t('module.unconfigured.detail', { id: module.id, module: t(module.labelKey) })}</p>
    </div>
  );
}
