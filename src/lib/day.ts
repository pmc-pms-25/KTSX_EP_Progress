/**
 * A calendar day stored as whole days since 1970-01-01.
 * Timezone-free: never convert through local-time Date objects.
 */
export type Day = number;

/** Month bucket, formatted `YYYY-MM`. */
export type MonthKey = string;

const MS_PER_DAY = 86_400_000;
/** Excel serial of 1970-01-01. */
const EXCEL_EPOCH_OFFSET = 25_569;
/** Serials outside 2000-01-01 .. 2100-01-01 are treated as garbage. */
const MIN_SERIAL = 36_526;
const MAX_SERIAL = 73_051;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dayFromYMD(year: number, month: number, day: number): Day {
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

/** Convert an Excel date serial to a Day; undefined when not a plausible date. */
export function dayFromExcelSerial(value: unknown): Day | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < MIN_SERIAL || value > MAX_SERIAL) return undefined;
  return Math.floor(value) - EXCEL_EPOCH_OFFSET;
}

/** The viewer's local calendar date as a Day. */
export function todayDay(now: Date = new Date()): Day {
  return dayFromYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function parts(day: Day): { y: number; m: number; d: number } {
  const date = new Date(day * MS_PER_DAY);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `2027-03-14` */
export function dayToISO(day: Day): string {
  const { y, m, d } = parts(day);
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Parse `YYYY-MM-DD`; undefined when malformed. */
export function dayFromISO(text: string): Day | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return undefined;
  const [, y, m, d] = match.map(Number);
  const day = dayFromYMD(y, m, d);
  return dayToISO(day) === text.trim() ? day : undefined;
}

/** `14-Mar-2027` */
export function formatDay(day: Day | undefined): string {
  if (day === undefined) return '—';
  const { y, m, d } = parts(day);
  return `${pad(d)}-${MONTHS[m - 1]}-${y}`;
}

export function monthKey(day: Day): MonthKey {
  const { y, m } = parts(day);
  return `${y}-${pad(m)}`;
}

/** `Mar 2027` */
export function formatMonth(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** First and last Day of a month key. */
export function monthBounds(key: MonthKey): { from: Day; to: Day } {
  const [y, m] = key.split('-').map(Number);
  return { from: dayFromYMD(y, m, 1), to: dayFromYMD(y, m + 1, 1) - 1 };
}

/** Inclusive list of month keys from `from` to `to`. */
export function monthRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad(m)}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export const MONTH_ABBREVIATIONS = MONTHS;
