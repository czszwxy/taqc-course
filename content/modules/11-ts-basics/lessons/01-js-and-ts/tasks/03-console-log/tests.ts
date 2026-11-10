import { logSteps } from './solution';

describe('logSteps', () => {
  it('prints exactly 3 lines', () => {
    const lines = captureConsole(() => logSteps());
    expect(lines).toHaveLength(3);
  }, 'Викликай console.log рівно три рази — по одному на кожен крок.');

  it('prints step 1 first', () => {
    const lines = captureConsole(() => logSteps());
    expect(lines[0]).toBe('Step 1: Open the login page');
  }, 'Перший рядок має бути точно "Step 1: Open the login page".');

  it('prints all steps in the right order and wording', () => {
    const lines = captureConsole(() => logSteps());
    expect(lines).toEqual(['Step 1: Open the login page', 'Step 2: Enter valid credentials', 'Step 3: Click "Sign in"']);
  }, 'Порівняй текст з умовою символ у символ: двокрапки, пробіли, лапки навколо Sign in.');
});
