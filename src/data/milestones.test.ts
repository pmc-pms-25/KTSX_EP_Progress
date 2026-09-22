import { KEY_MILESTONES, LINE_PHASE_ORDER, MILESTONES, MILESTONE_BY_KEY, PHASES, phaseIndex } from './milestones';

describe('milestone catalog', () => {
  it('has unique keys and headers', () => {
    expect(new Set(MILESTONES.map((m) => m.key)).size).toBe(MILESTONES.length);
    expect(new Set(MILESTONES.map((m) => m.header.toLowerCase())).size).toBe(MILESTONES.length);
  });

  it('lists milestones grouped in phase order', () => {
    const phaseOrder = PHASES.map((p) => p.key);
    const indices = MILESTONES.map((m) => phaseOrder.indexOf(m.phase));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(indices.every((i) => i >= 0)).toBe(true);
  });

  it('exposes lookups and the headline milestones', () => {
    expect(MILESTONE_BY_KEY.loa.header).toBe('LOA Effective Date');
    expect(KEY_MILESTONES).toHaveLength(6);
    expect(LINE_PHASE_ORDER.at(-1)).toBe('delivered');
    expect(phaseIndex('award')).toBeLessThan(phaseIndex('onSailing'));
    expect(phaseIndex('onSailing')).toBeLessThan(phaseIndex('arrived'));
  });
});
