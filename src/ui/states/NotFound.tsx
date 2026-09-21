import { Link } from 'react-router-dom';
import { useT } from '../../i18n/useT';

export function NotFound() {
  const { t } = useT();
  return (
    <div className="px-4 py-16 text-center text-sm text-ink-2">
      {t('notFound.title')}{' '}
      <Link to="/" className="text-ai-1 underline">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
