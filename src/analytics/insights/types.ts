import type { Message } from '../../i18n/message';
import type { Filters } from '../filters';
import type { LineMetrics, MetricsContext } from '../lineMetrics';

export type Severity = 'critical' | 'warning' | 'info';

export interface Insight {
  /** Equals the rule id; stable for React keys and tests. */
  id: string;
  severity: Severity;
  title: Message;
  detail: Message;
  /** 0..1 — share of lines that carry the data this rule depends on. */
  confidence: number;
  /** Line ids backing the insight ("Why?"). */
  evidence: string[];
  /** Filter that reproduces the evidence set, when one exists. */
  filter?: Partial<Filters>;
}

export interface InsightContext {
  metrics: readonly LineMetrics[];
  ctx: MetricsContext;
}

export interface InsightRule {
  id: string;
  evaluate(ic: InsightContext): Insight | undefined;
}
