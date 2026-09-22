import { MILESTONES } from '../data/milestones';
import type { ItemType, LinePhase, MilestoneKey } from '../data/types';
import { dayFromYMD, MONTH_ABBREVIATIONS, type Day } from '../lib/day';

export interface SearchVocabulary {
  disciplines: readonly string[];
  facilities: readonly string[];
}

export interface Period {
  from: Day;
  to: Day;
  label: string;
}

export interface ParsedSearch {
  disciplines: string[];
  facilities: string[];
  itemTypes: ItemType[];
  phases: LinePhase[];
  milestones: MilestoneKey[];
  period?: Period;
  /** Remaining free-text tokens, matched against package code and name. */
  text: string[];
}

const PHASE_WORDS: Record<string, LinePhase> = {
  'pre-rfq': 'tr',
  bidding: 'rfq',
  evaluation: 'evaluation',
  award: 'award',
  manufacturing: 'manufacturing',
  'on-sailing': 'onSailing',
  sailing: 'onSailing',
  arrived: 'arrived',
  delivered: 'delivered',
};

const MILESTONE_WORDS: Record<string, MilestoneKey> = {
  tr: 'trApproval',
  rfq: 'rfqIssue',
  bids: 'bidsDue',
  tbe: 'tbeApproval',
  cbe: 'cbeApproval',
  loa: 'loa',
  po: 'po',
  vd: 'criticalVd',
  spir: 'spirApproved',
  fat: 'fat',
  exw: 'fat',
  ship: 'shipped',
  shipped: 'shipped',
  site: 'received',
  received: 'received',
};

const ITEM_TYPE_WORDS: Record<string, ItemType> = { tagged: 'Tagged', bulk: 'Bulk' };

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parsePeriod(token: string): Period | undefined {
  let m = /^(\d{4})$/.exec(token);
  if (m) {
    const y = Number(m[1]);
    return { from: dayFromYMD(y, 1, 1), to: dayFromYMD(y + 1, 1, 1) - 1, label: m[1] };
  }
  m = /^q([1-4])[-/]?(\d{4})$/.exec(token);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    return { from: dayFromYMD(y, q * 3 - 2, 1), to: dayFromYMD(y, q * 3 + 1, 1) - 1, label: `Q${q}-${y}` };
  }
  m = /^([a-z]{3})[-/]?(\d{4})$/.exec(token);
  if (m) {
    const month = MONTH_ABBREVIATIONS.findIndex((a) => a.toLowerCase() === m![1]) + 1;
    if (month === 0) return undefined;
    const y = Number(m[2]);
    return { from: dayFromYMD(y, month, 1), to: dayFromYMD(y, month + 1, 1) - 1, label: `${MONTH_ABBREVIATIONS[month - 1]}-${y}` };
  }
  return undefined;
}

/**
 * Turn a free-text query like "PS2R LOA Q2-2027 pump" into structured criteria.
 * Multi-word vocabulary entries ("PS2K TS", "INSTRUMENT & TELECOM") are matched before splitting on spaces.
 */
export function parseSearch(query: string, vocab: SearchVocabulary): ParsedSearch {
  const result: ParsedSearch = { disciplines: [], facilities: [], itemTypes: [], phases: [], milestones: [], text: [] };
  let rest = ` ${query.toLowerCase().replace(/\s+/g, ' ').trim()} `;

  const phrases = [
    ...vocab.facilities.map((v) => ({ v, kind: 'facilities' as const })),
    ...vocab.disciplines.map((v) => ({ v, kind: 'disciplines' as const })),
  ].sort((a, b) => b.v.length - a.v.length);

  for (const { v, kind } of phrases) {
    const needle = v.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!needle) continue;
    const re = new RegExp(`(?<=\\s)${escapeRegExp(needle)}(?=\\s)`, 'g');
    if (re.test(rest)) {
      if (!result[kind].includes(v)) result[kind].push(v);
      rest = rest.replace(re, ' ');
    }
  }

  for (const token of rest.split(' ').filter(Boolean)) {
    const period = parsePeriod(token);
    if (period) {
      result.period = period;
    } else if (token in ITEM_TYPE_WORDS) {
      const itemType = ITEM_TYPE_WORDS[token];
      if (!result.itemTypes.includes(itemType)) result.itemTypes.push(itemType);
    } else if (token in PHASE_WORDS) {
      const phase = PHASE_WORDS[token];
      if (!result.phases.includes(phase)) result.phases.push(phase);
    } else if (token in MILESTONE_WORDS) {
      const milestone = MILESTONE_WORDS[token];
      if (!result.milestones.includes(milestone)) result.milestones.push(milestone);
    } else {
      result.text.push(token);
    }
  }
  return result;
}

/** Human-readable chips for what the query was understood as. */
export function describeSearch(parsed: ParsedSearch): string[] {
  const label = (k: MilestoneKey) => MILESTONES.find((m) => m.key === k)?.short ?? k;
  return [
    ...parsed.disciplines,
    ...parsed.facilities,
    ...parsed.itemTypes,
    ...parsed.phases,
    ...parsed.milestones.map(label),
    ...(parsed.period ? [parsed.period.label] : []),
    ...parsed.text.map((t) => `"${t}"`),
  ];
}
