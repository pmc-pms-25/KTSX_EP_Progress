import type { MessageKey } from './en';

export type Lang = 'en' | 'vi';

export const LANGS: readonly Lang[] = ['en', 'vi'];

export interface Message {
  key: MessageKey;
  params?: Record<string, string | number>;
}

/** Build a Message. Pure — no React, no formatting; analytics/data code imports only this. */
export function msg(key: MessageKey, params?: Record<string, string | number>): Message {
  return params ? { key, params } : { key };
}
