import { ping } from './status-api';

export async function checkServices(names: string[]): Promise<{ up: string[]; down: string[] }> {
  const results = await Promise.allSettled(names.map((n) => ping(n)));
  const up = names.filter((_, i) => results[i]?.status === 'fulfilled');
  const down = names.filter((_, i) => results[i]?.status === 'rejected');
  return { up, down };
}
