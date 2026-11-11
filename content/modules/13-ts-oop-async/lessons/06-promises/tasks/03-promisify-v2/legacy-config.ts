const CONFIG: Record<string, string> = {
  baseUrl: 'http://localhost:5173',
  browser: 'chromium',
};

const LATENCY_MS = 5;

export function readConfigLegacy(name: string, callback: (error: Error | null, value?: string) => void): void {
  setTimeout(() => {
    const value = CONFIG[name];
    if (value === undefined) callback(new Error(`Config ${name} is not set`));
    else callback(null, value);
  }, LATENCY_MS);
}
