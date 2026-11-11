import { readConfig } from './solution';

describe('readConfig', () => {
  it('resolves known keys', async () => {
    await expect(readConfig('baseUrl')).resolves.toBe('http://localhost:5173');
  });
  it('rejects unknown keys', async () => {
    await expect(readConfig('unknown')).rejects.toThrow('Config unknown is not set');
  });
});
