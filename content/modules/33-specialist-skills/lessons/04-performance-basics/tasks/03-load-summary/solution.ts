export interface Sample {
  durationMs: number;
  status: number;
}

export interface Sla {
  p95Ms: number;
  maxErrorRate: number;
}

export interface Summary {
  requests: number;
  errorRate: number;
  avgMs: number;
  p95Ms: number;
  passed: boolean;
}

const FIRST_ERROR_STATUS = 400;
const P95 = 95;
const PERCENT = 100;

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / PERCENT) * sorted.length);
  return sorted[Math.max(rank, 1) - 1] ?? 0;
}

export function summarize(samples: Sample[], sla: Sla): Summary {
  const requests = samples.length;
  if (requests === 0) return { requests: 0, errorRate: 0, avgMs: 0, p95Ms: 0, passed: false };

  const durations = samples.map((sample) => sample.durationMs);
  const errorRate = samples.filter((sample) => sample.status >= FIRST_ERROR_STATUS).length / requests;
  const avgMs = Math.round(durations.reduce((sum, ms) => sum + ms, 0) / requests);
  const p95Ms = percentile(durations, P95);

  return { requests, errorRate, avgMs, p95Ms, passed: p95Ms <= sla.p95Ms && errorRate <= sla.maxErrorRate };
}
