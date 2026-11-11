export interface RunConfig {
  baseUrl: string;
  retries?: number;
  headless?: boolean;
  timeoutMs?: number;
}

export interface ResolvedConfig {
  baseUrl: string;
  retries: number;
  headless: boolean;
  timeoutMs: number;
}

export const DEFAULT_TIMEOUT_MS = 30000;

export function resolveConfig(config: RunConfig): ResolvedConfig {
  // твій код тут
}
