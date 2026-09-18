import {
  dayFromExcelSerial,
  dayFromISO,
  dayFromYMD,
  dayToISO,
  formatDay,
  formatMonth,
  monthBounds,
  monthKey,
  monthRange,
  todayDay,
} from './day';

describe('day utilities', () => {
  it('converts Excel serials to timezone-free days', () => {
    // 46460 is 14-Mar-2027 in Excel.
    expect(dayToISO(dayFromExcelSerial(46460)!)).toBe('2027-03-14');
    expect(dayFromExcelSerial(46460.75)).toBe(dayFromExcelSerial(46460));
  });

  it('rejects values that are not plausible date serials', () => {
    expect(dayFromExcelSerial(0)).toBeUndefined();
    expect(dayFromExcelSerial(62)).toBeUndefined();
    expect(dayFromExcelSerial('00/Jan/00')).toBeUndefined();
    expect(dayFromExcelSerial('#############')).toBeUndefined();
    expect(dayFromExcelSerial(null)).toBeUndefined();
    expect(dayFromExcelSerial(NaN)).toBeUndefined();
  });

  it('round-trips ISO strings and rejects malformed ones', () => {
    const d = dayFromYMD(2026, 9, 18);
    expect(dayToISO(d)).toBe('2026-09-18');
    expect(dayFromISO('2026-09-18')).toBe(d);
    expect(dayFromISO('2026-02-30')).toBeUndefined();
    expect(dayFromISO('18/09/2026')).toBeUndefined();
  });

  it('uses the local calendar date for today', () => {
    expect(todayDay(new Date(2026, 8, 18, 23, 59))).toBe(dayFromYMD(2026, 9, 18));
  });

  it('formats days and months', () => {
    expect(formatDay(dayFromYMD(2027, 3, 4))).toBe('04-Mar-2027');
    expect(formatDay(undefined)).toBe('—');
    expect(monthKey(dayFromYMD(2027, 3, 31))).toBe('2027-03');
    expect(formatMonth('2027-03')).toBe('Mar 2027');
  });

  it('builds month ranges and bounds', () => {
    expect(monthRange('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(monthRange('2027-02', '2027-01')).toEqual([]);
    const b = monthBounds('2028-02');
    expect(dayToISO(b.from)).toBe('2028-02-01');
    expect(dayToISO(b.to)).toBe('2028-02-29');
  });
});
