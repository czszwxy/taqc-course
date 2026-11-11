import { createTestCase, type TestCase } from './solution';

// Compile-time check: this object must match the TestCase interface exactly.
const manual: TestCase = { id: 'TC-9', title: 'Logout', steps: ['Open menu', 'Click Log out'], automated: true };

describe('TestCase interface', () => {
  it('accepts a full test case object', () => {
    expect(manual.steps).toHaveLength(2);
    expect(manual.automated).toBe(true);
  }, 'Інтерфейс має містити id: string, title: string, steps: string[], automated: boolean.');
});

describe('createTestCase', () => {
  it('creates a test case with empty steps and automated = false', () => {
    expect(createTestCase('TC-1', 'Login works')).toEqual({ id: 'TC-1', title: 'Login works', steps: [], automated: false });
  });

  it('creates a new steps array every time', () => {
    const a = createTestCase('TC-1', 'A');
    const b = createTestCase('TC-2', 'B');
    a.steps.push('step');
    expect(b.steps).toEqual([]);
  }, 'Повертай новий масив [] у кожному виклику, а не один спільний.');
});
