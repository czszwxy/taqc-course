import { readConfigLegacy } from './legacy-config';

export function readConfig(name: string): Promise<string> {
  return new Promise((resolve, reject) => {
    readConfigLegacy(name, (error, value) => {
      if (error || value === undefined) reject(error ?? new Error('No value'));
      else resolve(value);
    });
  });
}
