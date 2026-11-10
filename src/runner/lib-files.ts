/** TypeScript standard library files we ship to the in-browser compiler (ES2022 chain, no DOM). */
export function isNeededLibFile(fileName: string): boolean {
  if (fileName.includes('.full.')) return false;
  return /^lib\.(es5|es20\d\d(\.[a-z0-9]+)*|decorators(\.legacy)?)\.d\.ts$/i.test(fileName);
}

export const DEFAULT_LIB = 'lib.es2022.d.ts';
