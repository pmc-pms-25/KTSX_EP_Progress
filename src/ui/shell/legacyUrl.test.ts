import { migrateLegacyParams } from './legacyUrl';

const migrate = (q: string) => migrateLegacyParams(new URLSearchParams(q)).toString();

describe('migrateLegacyParams', () => {
  it('renames the short keys and splits comma lists into repeated keys', () => {
    expect(migrate('d=MECHANICAL,PIPING&f=BF&t=Bulk&p=award&flag=rosRisk,slipped')).toBe(
      'discipline=MECHANICAL&discipline=PIPING&facility=BF&type=Bulk&phase=award&flag=rosRisk&flag=slipped',
    );
  });

  it('passes other params through untouched', () => {
    expect(migrate('q=LOA+2027&pkg=MEC-001&milestone=tr')).toBe('q=LOA+2027&pkg=MEC-001&milestone=tr');
  });

  it('leaves new-format params as they are', () => {
    expect(migrate('discipline=A&flag=rosRisk&flag=slipped')).toBe('discipline=A&flag=rosRisk&flag=slipped');
  });

  it('maps the old Logistics and On-Sailing phases to Ready Ex-Works and Arrived at Site', () => {
    expect(migrateLegacyParams(new URLSearchParams('phase=logistics&phase=arrived&pkg=A')).toString()).toBe('phase=exWorks&phase=arrived&pkg=A');
    expect(migrateLegacyParams(new URLSearchParams('p=award,logistics')).toString()).toBe('phase=award&phase=exWorks&phase=arrived');
    expect(migrateLegacyParams(new URLSearchParams('phase=onSailing')).toString()).toBe('phase=exWorks');
  });
});
