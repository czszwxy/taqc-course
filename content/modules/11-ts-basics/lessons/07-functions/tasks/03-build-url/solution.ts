export function buildUrl(path: string, baseUrl: string = 'https://staging.example.com'): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const p = path.startsWith('/') ? path.slice(1) : path;
  return `${base}/${p}`;
}
