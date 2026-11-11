import { addTag } from './solution';

const frozen: readonly string[] = ['@smoke'];

// Never called: the result must be readonly too.
export function compileTimeChecks(): void {
  const result = addTag(frozen, '@ui');
  // @ts-expect-error the result must be readonly string[]
  result.push('@x');
}

describe('addTag', () => {
  it('adds a new tag at the end', () => {
    expect(addTag(frozen, '@regression')).toEqual(['@smoke', '@regression']);
  }, 'Параметр tags має тип readonly string[] — створи новий масив через spread.');
  it('does not duplicate tags', () => {
    expect(addTag(frozen, '@smoke')).toEqual(['@smoke']);
  });
  it('does not change the original array', () => {
    addTag(frozen, '@new');
    expect(frozen).toEqual(['@smoke']);
  });
});
