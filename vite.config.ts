import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { isNeededLibFile } from './src/runner/lib-files';
import { API_BASE, API_FIXED_BASE, mockApiMiddleware } from './server/mock-api';
import { labMiddleware } from './server/lab-runner';
import { LAB_ROUTE } from './server/lab-types';

const require = createRequire(import.meta.url);

/**
 * Fixed port: progress lives in localStorage, which is tied to http://localhost:5173.
 * A different port would look like "lost progress". The desktop launcher opens this same URL.
 */
const DEV_PORT = 5173;

/**
 * Exposes the TypeScript standard library .d.ts files (ES2022 chain) as a virtual module,
 * so the in-browser compiler works fully offline.
 */
function tsLibs(): Plugin {
  const id = 'virtual:ts-libs';
  const resolved = '\0' + id;
  return {
    name: 'qa-academy:ts-libs',
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(loadId) {
      if (loadId !== resolved) return null;
      const dir = path.join(path.dirname(require.resolve('typescript/package.json')), 'lib');
      const map = Object.fromEntries(
        fs
          .readdirSync(dir)
          .filter(isNeededLibFile)
          .map((file) => [file, fs.readFileSync(path.join(dir, file), 'utf8')]),
      );
      return `export default ${JSON.stringify(map)};`;
    },
  };
}

/** Real Playwright runs for the automation modules (POST /__lab/run, GET /__lab/status) — see server/lab-runner.ts. */
function playwrightLab(): Plugin {
  const root = path.dirname(fileURLToPath(import.meta.url));
  return {
    name: 'qa-academy:playwright-lab',
    configureServer(server) {
      server.middlewares.use(LAB_ROUTE, labMiddleware(root));
    },
    configurePreviewServer(server) {
      server.middlewares.use(LAB_ROUTE, labMiddleware(root));
    },
  };
}

/** Pyodide (Python in WebAssembly) files the Python task worker loads from /pyodide/ — served locally, so it works offline. */
const PYODIDE_ROUTE = '/pyodide';
const PYODIDE_FILES = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
const PYODIDE_TYPES: Record<string, string> = {
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.json': 'application/json',
};

function pyodideAssets(): Plugin {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', 'pyodide');
  const serve = (req: { url?: string }, res: NodeJS.WritableStream & { setHeader: (k: string, v: string) => void }, next: () => void) => {
    const requested = (req.url ?? '').split('?')[0] ?? '';
    const name = requested.startsWith('/') ? requested.slice(1) : requested;
    if (!PYODIDE_FILES.includes(name)) {
      next();
      return;
    }
    res.setHeader('Content-Type', PYODIDE_TYPES[path.extname(name)] ?? 'application/octet-stream');
    fs.createReadStream(path.join(dir, name)).pipe(res);
  };
  return {
    name: 'my-university:pyodide',
    configureServer(server) {
      server.middlewares.use(PYODIDE_ROUTE, serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(PYODIDE_ROUTE, serve);
    },
    generateBundle() {
      PYODIDE_FILES.forEach((file) => this.emitFile({ type: 'asset', fileName: `pyodide/${file}`, source: fs.readFileSync(path.join(dir, file)) }));
    },
  };
}

/** Local Gadgetly REST API (/api = with intentional bugs, /api-fixed = correct) for the HTTP & API modules. */
function mockApi(): Plugin {
  return {
    name: 'qa-academy:mock-api',
    configureServer(server) {
      server.middlewares.use(API_BASE, mockApiMiddleware(API_BASE));
      server.middlewares.use(API_FIXED_BASE, mockApiMiddleware(API_FIXED_BASE));
    },
    configurePreviewServer(server) {
      server.middlewares.use(API_BASE, mockApiMiddleware(API_BASE));
      server.middlewares.use(API_FIXED_BASE, mockApiMiddleware(API_FIXED_BASE));
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), tsLibs(), mockApi(), playwrightLab(), pyodideAssets()],
  worker: {
    format: 'es',
    plugins: () => [tsLibs()],
  },
  server: {
    port: DEV_PORT,
    strictPort: true,
    // Playwright lab runs write temporary specs and reports here — not app sources.
    watch: { ignored: ['**/lab/**'] },
  },
});
