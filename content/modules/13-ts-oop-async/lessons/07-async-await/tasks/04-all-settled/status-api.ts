const LATENCY: Record<string, number> = { api: 20, search: 35, auth: 15 };

export function ping(service: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ms = LATENCY[service];
    setTimeout(() => {
      if (ms === undefined) reject(new Error(`${service} is down`));
      else resolve(ms);
    }, ms ?? 10);
  });
}
