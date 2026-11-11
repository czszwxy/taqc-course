import { assertOk, HttpError } from './solution';

describe('assertOk', () => {
  it('passes for 2xx and 3xx', () => {
    expect(() => assertOk(200, 'ok')).not.toThrow();
    expect(() => assertOk(399, 'x')).not.toThrow();
  });
  it('throws HttpError from 400', () => {
    expect(() => assertOk(400, 'Bad')).toThrow(HttpError);
    expect(() => assertOk(404, 'Not found')).toThrow('HTTP 404: Not found');
  });
  it('the error carries the status', () => {
    try {
      assertOk(503, 'Down');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(503);
      expect((error as HttpError).name).toBe('HttpError');
    }
  });
});
