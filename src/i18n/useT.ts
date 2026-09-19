import type { MessageKey } from './en';
import type { Message } from './message';
import { translate } from './translate';
import { useApp } from '../store/useApp';

/** Read the store's language and get a translator bound to it. */
export function useT() {
  const lang = useApp((s) => s.lang);
  const t = (key: MessageKey | Message, params?: Record<string, string | number>) => translate(lang, key, params);
  return { t, lang };
}
