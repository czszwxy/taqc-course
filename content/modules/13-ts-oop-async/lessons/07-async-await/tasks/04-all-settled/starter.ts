import { ping } from './status-api';

export async function checkServices(names: string[]): Promise<{ up: string[]; down: string[] }> {
  // твій код тут
  void ping;
  return { up: names, down: [] };
}
