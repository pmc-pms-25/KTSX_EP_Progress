import { en } from './en';
import { msg } from './message';
import { formatNumber, locale, translate } from './translate';
import { vi } from './vi';

describe('translate', () => {
  it('interpolates {name} placeholders', () => {
    expect(translate('en', msg('error.source.timeout', { seconds: 30 }))).toBe('Timed out (30s) while loading data.');
    expect(translate('vi', msg('warning.missingFacility', { code: 'MEC-001' }))).toBe('MEC-001: thiếu Facility');
  });

  it('accepts a bare key with a separate params argument', () => {
    expect(translate('en', 'warning.unknownColumn', { header: 'Foo' })).toBe('Ignoring unrecognized column: "Foo"');
  });

  it('formats number params per locale', () => {
    expect(translate('en', msg('insight.rosRisk.title', { count: 1234 }))).toContain('1,234');
    expect(translate('vi', msg('insight.rosRisk.title', { count: 1234 }))).toContain('1.234');
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(1234, 'vi')).toBe('1.234');
  });

  it('renders a key with no params', () => {
    expect(translate('vi', 'warning.noDiscipline')).toBe('Có dòng dữ liệu nằm trước tiêu đề discipline đầu tiên');
  });

  it('leaves an unknown placeholder as-is when its param is missing', () => {
    expect(translate('en', msg('warning.missingFacility', {}))).toBe('{code}: missing Facility');
  });

  it('picks singular or plural for a {name|singular|plural} placeholder', () => {
    expect(translate('en', 'insight.rosRisk.title', { count: 1 })).toBe('1 line at risk of missing ROS');
    expect(translate('en', 'insight.rosRisk.title', { count: 0 })).toBe('0 lines at risk of missing ROS');
    expect(translate('en', 'insight.rosRisk.title', { count: 4 })).toBe('4 lines at risk of missing ROS');
  });

  it('leaves a plural placeholder literally when its param is missing', () => {
    expect(translate('en', 'insight.rosRisk.title', {})).toBe('{count} {count|line|lines} at risk of missing ROS');
  });

  it('leaves a plural placeholder literally when its param is not a number', () => {
    expect(translate('en', 'unit.lines', { n: 'many' })).toBe('{n|line|lines}');
  });

  it('resolves the display locale for each language', () => {
    expect(locale('en')).toBe('en-US');
    expect(locale('vi')).toBe('vi-VN');
  });

  it('keeps the English and Vietnamese dictionaries in lockstep', () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
  });
});
