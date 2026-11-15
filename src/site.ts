/**
 * Where the app runs: the local dev server on the learner's computer (default), or the static website on
 * GitHub Pages — built with VITE_STATIC_SITE=1 and VITE_BASE=/taqc-course/ (see .github/workflows/deploy-site.yml).
 * The website has no server: the Gadgetly API is answered in the browser (src/site/mockApi.ts) and
 * Playwright tasks, which need the local lab, only run on the computer.
 */
export const IS_STATIC_SITE = import.meta.env.VITE_STATIC_SITE === '1';

/** "/" locally, "/taqc-course/" on GitHub Pages: Vite puts the build's base path here. */
const BASE_URL: string = import.meta.env.BASE_URL;

/** Router basename: the base path without its trailing slash ("" at the domain root). */
export const ROUTER_BASENAME = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

/** An app path ("/playground/terms") as a URL that also works under the website's base path. */
export function withBase(path: string): string {
  return `${ROUTER_BASENAME}${path}`;
}
