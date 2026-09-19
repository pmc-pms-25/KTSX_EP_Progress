import { en, type MessageKey } from './en';
import type { Lang, Message } from './message';
import { vi } from './vi';

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, vi };

/** BCP-47 locale used for number/date formatting in each language. */
export function locale(lang: Lang): 'en-US' | 'vi-VN' {
  return lang === 'vi' ? 'vi-VN' : 'en-US';
}

export function formatNumber(n: number, lang: Lang): string {
  return n.toLocaleString(locale(lang));
}

/** Render a Message (or a bare key) in the given language, interpolating `{name}` placeholders. */
export function translate(lang: Lang, m: Message | MessageKey, params?: Record<string, string | number>): string {
  const key = typeof m === 'string' ? m : m.key;
  const values = typeof m === 'string' ? params : { ...params, ...m.params };
  const template = DICTS[lang][key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (literal, name: string) => {
    if (!(name in values)) return literal;
    const value = values[name];
    return typeof value === 'number' ? formatNumber(value, lang) : value;
  });
}
