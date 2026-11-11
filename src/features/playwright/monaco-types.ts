import { monaco } from '../../monaco/setup';
import testIndex from '../../../node_modules/@playwright/test/index.d.ts?raw';
import playwrightTest from '../../../node_modules/playwright/test.d.ts?raw';
import playwrightTestTypes from '../../../node_modules/playwright/types/test.d.ts?raw';
import coreIndex from '../../../node_modules/playwright-core/index.d.ts?raw';
import coreTypes from '../../../node_modules/playwright-core/types/types.d.ts?raw';
import coreStructs from '../../../node_modules/playwright-core/types/structs.d.ts?raw';

/**
 * The real @playwright/test type declarations for the editor (autocomplete for page., expect(…), locators).
 * Lazy: this module is only loaded by the Playwright task view. protocol.d.ts (CDP, ~800 KB) is left out on purpose.
 */
const LIBS: ReadonlyArray<readonly [string, string]> = [
  ['file:///node_modules/@playwright/test/index.d.ts', testIndex],
  ['file:///node_modules/playwright/test.d.ts', playwrightTest],
  ['file:///node_modules/playwright/types/test.d.ts', playwrightTestTypes],
  ['file:///node_modules/playwright-core/index.d.ts', coreIndex],
  ['file:///node_modules/playwright-core/types/types.d.ts', coreTypes],
  ['file:///node_modules/playwright-core/types/structs.d.ts', coreStructs],
];

const state = { added: false };

export function addPlaywrightTypes(): void {
  if (state.added) return;
  state.added = true;
  LIBS.forEach(([uri, content]) => monaco.languages.typescript.typescriptDefaults.addExtraLib(content, uri));
}
