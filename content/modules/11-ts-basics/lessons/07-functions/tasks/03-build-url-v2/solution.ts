export function buildApiPath(endpoint: string, version: string = 'v1'): string {
  const e = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `/api/${version}/${e}`;
}
