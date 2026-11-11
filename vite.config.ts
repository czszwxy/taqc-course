import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { isNeededLibFile } from './src/runner/lib-files';
import { API_BASE, API_FIXED_BASE, mockApiMiddleware } from './server/mock-api';

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
  plugins: [react(), tailwindcss(), tsLibs(), mockApi()],
  worker: {
    format: 'es',
    plugins: () => [tsLibs()],
  },
  server: {
    port: DEV_PORT,
    strictPort: true,
  },
});
