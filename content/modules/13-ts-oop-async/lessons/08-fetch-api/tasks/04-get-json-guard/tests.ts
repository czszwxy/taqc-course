import { getJson, HttpError, isProduct } from './solution';

describe('isProduct', () => {
  it('validates the shape', () => {
    expect(isProduct({ id: 1, name: 'M', category: 'A', price: 1, inStock: true })).toBe(true);
    expect(isProduct({ id: 1, name: 'M', category: 'A', price: '1', inStock: true })).toBe(false);
    expect(isProduct(null)).toBe(false);
  });
});

describe('getJson', () => {
  it('returns typed data', async () => {
    const p = await getJson('/api/products/1', isProduct);
    expect(p.name).toBe('Wireless Mouse M2');
  });
  it('throws HttpError with the status', async () => {
    let error: unknown;
    try {
      await getJson('/api/products/999', isProduct);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(404);
  }, 'Перевір response.ok і кидай new HttpError(response.status, ...).');
  it('throws on an unexpected shape', async () => {
    await expect(getJson('/api/health', isProduct)).rejects.toThrow('Unexpected response shape');
  }, 'Після json() перевір дані: if (!isT(data)) throw ...');
  it('500 is an HttpError too', async () => {
    await expect(getJson('/api/broken', isProduct)).rejects.toThrow(HttpError);
  });
});
