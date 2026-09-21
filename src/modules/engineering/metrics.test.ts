import { ENG_CUTOFF, sampleRegister } from '../../test/engFixture';
import { engineeringMetrics } from './metrics';

describe('engineeringMetrics', () => {
  it('returns the same array for the same register and cut-off', () => {
    const register = sampleRegister();
    const first = engineeringMetrics(register, ENG_CUTOFF);
    expect(engineeringMetrics(register, ENG_CUTOFF)).toBe(first);
    expect(engineeringMetrics(register, ENG_CUTOFF + 1)).not.toBe(first);
    expect(engineeringMetrics(sampleRegister(), ENG_CUTOFF + 1)).toHaveLength(6);
  });
});
