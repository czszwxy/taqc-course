import { hasBody } from './solution';

export function compileTimeChecks(): void {
  // @ts-expect-error lowercase 'get' is not an HttpMethod
  hasBody('get');
}

describe('hasBody', () => {
  it('POST, PUT, PATCH have a body', () => {
    expect(hasBody('POST')).toBe(true);
    expect(hasBody('PUT')).toBe(true);
    expect(hasBody('PATCH')).toBe(true);
  });
  it('GET and DELETE do not', () => {
    expect(hasBody('GET')).toBe(false);
    expect(hasBody('DELETE')).toBe(false);
  });
});
