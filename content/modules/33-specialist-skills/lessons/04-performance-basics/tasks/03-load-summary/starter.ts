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

export function percentile(values: number[], p: number): number {
  // твій код тут
  return -1;
}

export function summarize(samples: Sample[], sla: Sla): Summary {
  // твій код тут
  return { requests: -1, errorRate: -1, avgMs: -1, p95Ms: -1, passed: false };
}
