import { useState, type KeyboardEvent } from 'react';
import { PlaygroundShell, inputClass, isFixedMode } from './PlaygroundShell';

/**
 * Bug Playground: a tiny in-app API client (like Postman) for the local Gadgetly REST API
 * served by server/mock-api.ts. The API itself has 6 INTENTIONAL bugs (catalogued in
 * content/modules/08-http-apis-json/lessons/08-api-test-design/tasks/03-bug-hunt/task.json).
 * With `?fixed` the console talks to /api-fixed instead of /api.
 */

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const JSON_INDENT = 2;
/** A JWT is header.payload.signature. */
const JWT_PARTS = 3;

interface Example {
  label: string;
  method: Method;
  path: string;
  body?: string;
  auth?: boolean;
}

const EXAMPLES: Example[] = [
  { label: 'Health check', method: 'GET', path: '/health' },
  { label: 'List products', method: 'GET', path: '/products?page=1&limit=5' },
  { label: 'One product', method: 'GET', path: '/products/3' },
  { label: 'Log in', method: 'POST', path: '/auth/login', body: '{\n  "email": "qa@gadgetly.test",\n  "password": "Test1234"\n}' },
  { label: 'Who am I', method: 'GET', path: '/me', auth: true },
  { label: 'My orders', method: 'GET', path: '/orders', auth: true },
  { label: 'Create order', method: 'POST', path: '/orders', auth: true, body: '{\n  "productId": 1,\n  "quantity": 2\n}' },
  { label: 'Change quantity', method: 'PATCH', path: '/orders/1002', auth: true, body: '{\n  "quantity": 3\n}' },
  { label: 'Delete order', method: 'DELETE', path: '/orders/1002', auth: true },
];

/** Colour by status class: the first digit of the code (2xx, 3xx, 4xx, 5xx). */
const STATUS_TONE: Record<string, string> = {
  '2': 'bg-emerald-100 text-emerald-800',
  '3': 'bg-sky-100 text-sky-800',
  '4': 'bg-amber-100 text-amber-800',
  '5': 'bg-red-100 text-red-800',
};

interface ResponseView {
  status: number;
  statusText: string;
  ms: number;
  headers: [string, string][];
  body: string;
}

function parseHeaders(text: string): [string, string][] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(':'))
    .map((line) => {
      const at = line.indexOf(':');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()] as [string, string];
    })
    .filter(([key]) => key.length > 0);
}

function prettyBody(text: string): string {
  if (!text) return '(empty body)';
  try {
    return JSON.stringify(JSON.parse(text), null, JSON_INDENT);
  } catch {
    return text;
  }
}

function decodeJwtPart(part: string): string {
  const base64 = part.replaceAll('-', '+').replaceAll('_', '/');
  return prettyBody(decodeURIComponent(escape(atob(base64))));
}

function withAuthHeader(headers: string, token: string): string {
  const others = headers
    .split('\n')
    .filter((line) => !line.toLowerCase().startsWith('authorization:'))
    .join('\n')
    .trim();
  return [others, `Authorization: Bearer ${token}`].filter(Boolean).join('\n');
}

export function ApiConsolePage() {
  const fixed = isFixedMode();
  const base = fixed ? '/api-fixed' : '/api';

  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState(`${base}/health`);
  const [headers, setHeaders] = useState('Content-Type: application/json');
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ResponseView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [jwt, setJwt] = useState('');

  const send = async (): Promise<void> => {
    setLoading(true);
    setFailure(null);
    const started = performance.now();
    try {
      const res = await fetch(url, { method, headers: parseHeaders(headers), body: body.trim() && method !== 'GET' ? body : undefined });
      const text = await res.text();
      const ms = Math.round(performance.now() - started);
      setResponse({ status: res.status, statusText: res.statusText, ms, headers: Array.from(res.headers.entries()), body: prettyBody(text) });
      const found = text.includes('"token"') ? (JSON.parse(text) as { token?: string }).token : undefined;
      if (found) setToken(found);
    } catch (e) {
      setResponse(null);
      setFailure(`Request failed: ${e instanceof Error ? e.message : String(e)}. Is the URL correct?`);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (ev: KeyboardEvent): void => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) void send();
  };

  const useExample = (ex: Example): void => {
    setMethod(ex.method);
    setUrl(`${base}${ex.path}`);
    setBody(ex.body ?? '');
    if (ex.auth && token) setHeaders((h) => withAuthHeader(h, token));
  };

  const reset = async (): Promise<void> => {
    await fetch(`${base}/reset`, { method: 'POST' });
    setResponse(null);
    setFailure('Demo data restored: orders 1001 and 1002 are back.');
  };

  const jwtParts = jwt.trim().split('.');
  const decoded = (() => {
    if (jwtParts.length !== JWT_PARTS) return null;
    try {
      return { header: decodeJwtPart(jwtParts[0] ?? ''), payload: decodeJwtPart(jwtParts[1] ?? '') };
    } catch {
      return null;
    }
  })();

  const tone = response ? (STATUS_TONE[String(response.status).charAt(0)] ?? 'bg-slate-100 text-slate-800') : '';

  const docs = (
    <>
      <li>
        Base URL: <code>http://localhost:5173{base}</code> (Postman and curl work too).
      </li>
      <li>
        Test user: <code>qa@gadgetly.test</code> / <code>Test1234</code>. Log in to get a token, then send <code>Authorization: Bearer &lt;token&gt;</code>.
      </li>
      <li>
        <code>GET /health</code>, <code>GET /products</code> (query: <code>category</code>, <code>inStock</code>, <code>minPrice</code>, <code>maxPrice</code>,{' '}
        <code>page</code> ≥ 1, <code>limit</code> 1–50, default 10), <code>GET /products/:id</code>.
      </li>
      <li>
        <code>POST /auth/login</code> {'{ email, password }'} → 200 token; wrong credentials → 401; missing fields → 400.
      </li>
      <li>
        🔒 <code>GET /me</code>, <code>GET /orders</code> (only your orders), <code>POST /orders</code> {'{ productId, quantity }'} → 201 + <code>Location</code>{' '}
        header.
      </li>
      <li>
        🔒 <code>GET / PUT / PATCH / DELETE /orders/:id</code>. PATCH changes only <code>quantity</code>; DELETE → 204 without body.
      </li>
      <li>
        Rules: quantity is an integer <b>1–10</b>; <code>total = unitPrice × quantity</code>; unknown product → 422; out of stock → 409; no or invalid
        token → 401; someone else's order → 403; unknown id → 404; body must be JSON with <code>Content-Type: application/json</code> (else 415).
      </li>
      <li>Errors always look like {'{ "error": "message" }'}.</li>
    </>
  );

  return (
    <PlaygroundShell brand="gadgetly" fixed={fixed} requirements={docs} onReset={() => void reset()} asideTitle="Gadgetly API — documentation" wide>
      <h1 className="text-2xl font-bold">API console</h1>
      <p className="mt-1 text-sm text-slate-500">Build a request, press Send (or Ctrl+Enter) and read the response — like a mini Postman.</p>

      <div className="mt-4 flex flex-wrap gap-1.5" data-testid="examples">
        {EXAMPLES.map((ex) => (
          <button key={ex.label} type="button" onClick={() => useExample(ex)} className="rounded-full border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50">
            <span className="font-mono font-semibold">{ex.method}</span> {ex.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2" onKeyDown={onKey}>
        <label htmlFor="api-method" className="sr-only">
          Method
        </label>
        <select id="api-method" data-testid="api-method" className={`${inputClass(false)} w-32 font-mono`} value={method} onChange={(e) => setMethod(e.target.value as Method)}>
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <label htmlFor="api-url" className="sr-only">
          URL
        </label>
        <input id="api-url" data-testid="api-url" className={`${inputClass(false)} font-mono`} value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
        <button type="button" data-testid="api-send" onClick={() => void send()} disabled={loading} className="rounded-md bg-orange-500 px-5 font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
          {loading ? '…' : 'Send'}
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2" onKeyDown={onKey}>
        <div>
          <label htmlFor="api-headers" className="mb-1 block text-sm font-medium text-slate-700">
            Headers <span className="font-normal text-slate-400">(one per line: Key: Value)</span>
          </label>
          <textarea id="api-headers" data-testid="api-headers" rows={5} className={`${inputClass(false)} font-mono text-sm`} value={headers} onChange={(e) => setHeaders(e.target.value)} spellCheck={false} />
          {token && (
            <button type="button" data-testid="api-use-token" onClick={() => setHeaders((h) => withAuthHeader(h, token))} className="mt-1 text-xs text-orange-600 underline">
              + Add the token from the last login as Authorization header
            </button>
          )}
        </div>
        <div>
          <label htmlFor="api-body" className="mb-1 block text-sm font-medium text-slate-700">
            Body <span className="font-normal text-slate-400">(JSON; ignored for GET)</span>
          </label>
          <textarea id="api-body" data-testid="api-body" rows={5} className={`${inputClass(false)} font-mono text-sm`} value={body} onChange={(e) => setBody(e.target.value)} spellCheck={false} />
        </div>
      </div>

      {failure && <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">{failure}</p>}

      {response && (
        <section className="mt-5" data-testid="api-response">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span data-testid="api-status" className={`rounded-full px-3 py-1 font-mono font-semibold ${tone}`}>
              {response.status} {response.statusText}
            </span>
            <span className="text-slate-500">{response.ms} ms</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Response headers</div>
              <dl className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 font-mono text-xs" data-testid="api-response-headers">
                {response.headers.map(([k, v]) => (
                  <div key={k} className="break-all">
                    <dt className="inline font-semibold">{k}:</dt> <dd className="inline">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Response body</div>
              <pre className="max-h-72 overflow-auto rounded-md border border-slate-200 bg-slate-900 p-3 text-xs text-slate-100" data-testid="api-response-body">
                {response.body}
              </pre>
            </div>
          </div>
        </section>
      )}

      <details className="mt-6 rounded-lg border border-slate-200 p-3 text-sm">
        <summary className="cursor-pointer font-medium">JWT decoder</summary>
        <p className="mt-2 text-slate-500">Paste a token to see its header and payload. Decoding is not verifying: anyone can read a JWT, only the server can check its signature.</p>
        <textarea aria-label="JWT" rows={3} className={`${inputClass(false)} mt-2 font-mono text-xs`} value={jwt} onChange={(e) => setJwt(e.target.value)} spellCheck={false} />
        {jwt.trim() && !decoded && <p className="mt-2 text-red-600">This does not look like a JWT (three base64url parts separated by dots).</p>}
        {decoded && (
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <pre className="overflow-auto rounded-md bg-slate-900 p-2 text-xs text-slate-100">{decoded.header}</pre>
            <pre className="overflow-auto rounded-md bg-slate-900 p-2 text-xs text-slate-100" data-testid="jwt-payload">
              {decoded.payload}
            </pre>
          </div>
        )}
      </details>
    </PlaygroundShell>
  );
}
