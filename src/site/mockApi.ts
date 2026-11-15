import { API_BASE, API_FIXED_BASE, handleApiRequest } from '../../server/mock-api';

/**
 * The static website has no server, so requests to the Gadgetly API (/api and /api-fixed) are answered right here in
 * the browser by the same code the dev server uses (server/mock-api.ts): same data, same bugs, same tokens.
 * Orders the learner creates live in memory until the page is reloaded.
 */

/** Longest base first: "/api-fixed/…" also starts with "/api". */
const API_BASES = [API_FIXED_BASE, API_BASE];

/** Reason phrases the API console shows next to the status code ("201 Created"). */
const STATUS_TEXT: Record<string, string> = {
  '200': 'OK',
  '201': 'Created',
  '204': 'No Content',
  '400': 'Bad Request',
  '401': 'Unauthorized',
  '403': 'Forbidden',
  '404': 'Not Found',
  '405': 'Method Not Allowed',
  '409': 'Conflict',
  '413': 'Payload Too Large',
  '415': 'Unsupported Media Type',
  '422': 'Unprocessable Entity',
  '500': 'Internal Server Error',
};

function apiBaseOf(url: URL): string | undefined {
  if (url.origin !== window.location.origin) return undefined;
  return API_BASES.find((base) => url.pathname === base || url.pathname.startsWith(`${base}/`));
}

export function installMockApi(): void {
  const realFetch = window.fetch.bind(window);
  const mockFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const base = apiBaseOf(url);
    if (base === undefined) return realFetch(input, init);
    const answer = await handleApiRequest(base, {
      method: request.method,
      url: url.pathname.slice(base.length) + url.search,
      authorization: request.headers.get('authorization') ?? undefined,
      contentType: request.headers.get('content-type') ?? undefined,
      userAgent: navigator.userAgent,
      body: await request.text(),
    });
    return new Response(answer.body ?? null, { status: answer.status, statusText: STATUS_TEXT[String(answer.status)] ?? '', headers: answer.headers });
  };
  window.fetch = mockFetch;
}
