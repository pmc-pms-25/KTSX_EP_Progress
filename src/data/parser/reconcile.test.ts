// @vitest-environment node
/**
 * Manual reconciliation against a real export. Skipped unless RECONCILE_FILE points at an .xlsx:
 *   RECONCILE_FILE=path/to/export.xlsx npx vitest run src/data/parser/reconcile.test.ts
 * Prints the headline numbers to compare with the sheet; asserts only structural invariants,
 * because the counts change as the plan evolves.
 */
import fs from 'node:fs';
import { computeKpis } from '../../analytics/aggregate';
import { computeAllMetrics } from '../../analytics/lineMetrics';
import { todayDay } from '../../lib/day';
import { parsePlan } from './parsePlan';

const file = process.env.RECONCILE_FILE;

describe.skipIf(!file)('reconcile against a real export', () => {
  it('parses cleanly and prints the headline numbers', () => {
    const bytes = fs.readFileSync(file!);
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const result = parsePlan(buf, { projectName: 'reconcile' });
    if (!result.ok) throw new Error(result.error.message);
    const { plan } = result;
    const warnings: Record<string, number> = {};
    for (const w of plan.warnings) warnings[w.code] = (warnings[w.code] ?? 0) + 1;
    const kpis = computeKpis(computeAllMetrics(plan.lines, { cutOff: todayDay(), dueSoonDays: 30 }));

    console.log(
      JSON.stringify(
        {
          disciplines: plan.disciplines.map((d) => `${d.name}: ${d.packages.length}`),
          validPackages: kpis.packages,
          lines: kpis.lines,
          slipped: kpis.slipped,
          rosAtRisk: kpis.rosAtRisk,
          warnings,
        },
        null,
        2,
      ),
    );

    expect(plan.lines.length).toBeGreaterThan(0);
    expect(plan.disciplines.every((d) => d.name !== 'Unassigned')).toBe(true);
    expect(warnings.ORPHAN_ROW ?? 0).toBe(0);
    expect(warnings.INCOMPLETE_TRIPLET ?? 0).toBe(0);
  });
});
