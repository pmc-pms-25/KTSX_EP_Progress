import { KEY_MILESTONES, LINE_PHASE_ORDER, PHASE_GATE, MILESTONES, MILESTONE_BY_KEY, PHASES, phaseIndex } from './milestones';

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
    // One per phase, in phase order, so the workload chart lines up with Phase progress.
    expect(KEY_MILESTONES).toEqual(PHASES.flatMap((p) => PHASE_GATE[p.key] ?? []));
    expect(KEY_MILESTONES).toEqual(['trApproval', 'bidsDue', 'cbeApproval', 'loa', 'fat']);
    expect(LINE_PHASE_ORDER.at(-1)).toBe('delivered');
    expect(phaseIndex('award')).toBeLessThan(phaseIndex('exWorks'));
    expect(phaseIndex('exWorks')).toBeLessThan(phaseIndex('arrived'));
  });
});
