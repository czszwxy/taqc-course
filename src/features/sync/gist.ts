/**
 * Minimal GitHub Gist client for progress sync. Talks to api.github.com straight from the browser (CORS is allowed)
 * with the learner's own token; the progress lives in one secret gist of their account.
 */

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
export const GIST_FILE = 'my-university-progress.json';
const GIST_DESCRIPTION = 'my-university: course progress, synced by the app (do not edit by hand)';
const GISTS_PER_PAGE = 100;

const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;

export type SyncErrorKind = 'auth' | 'network' | 'other';

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: SyncErrorKind,
  ) {
    super(message);
  }
}

interface GistFile {
  content?: string;
  truncated?: boolean;
  raw_url?: string;
}

interface Gist {
  id: string;
  files: Record<string, GistFile | undefined>;
}

async function request(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': API_VERSION,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new SyncError('No connection to GitHub. Progress will sync when you are online again.', 'network');
  }
}

async function json<T>(res: Response): Promise<T> {
  if (res.status === HTTP_UNAUTHORIZED) {
    throw new SyncError('GitHub did not accept the token (wrong, deleted or expired). Create a new token and connect again.', 'auth');
  }
  if (res.status === HTTP_FORBIDDEN || res.status === HTTP_NOT_FOUND) {
    throw new SyncError('The token has no access to gists. Create a token with the "gist" permission.', 'auth');
  }
  if (!res.ok) throw new SyncError(`GitHub answered ${res.status}. Try again a bit later.`, 'other');
  return (await res.json()) as T;
}

/** The GitHub user name the token belongs to (also proves the token works). */
export async function fetchLogin(token: string): Promise<string> {
  const user = await json<{ login: string }>(await request(token, '/user'));
  return user.login;
}

/** The id of the learner's progress gist; creates a secret one with `initial` content when there is none yet. */
export async function findOrCreateGist(token: string, initial: string): Promise<string> {
  const gists = await json<Gist[]>(await request(token, `/gists?per_page=${GISTS_PER_PAGE}`));
  const found = gists.find((g) => g.files[GIST_FILE] !== undefined);
  if (found) return found.id;
  const body = JSON.stringify({ description: GIST_DESCRIPTION, public: false, files: { [GIST_FILE]: { content: initial } } });
  const created = await json<Gist>(await request(token, '/gists', { method: 'POST', body }));
  return created.id;
}

/** The progress file's text, or null when the gist (or the file in it) no longer exists. */
export async function readGist(token: string, gistId: string): Promise<string | null> {
  const res = await request(token, `/gists/${gistId}`);
  if (res.status === HTTP_NOT_FOUND) return null;
  const gist = await json<Gist>(res);
  const file = gist.files[GIST_FILE];
  if (!file) return null;
  // Big files are cut in the API answer; the full text is at raw_url.
  if (file.truncated && file.raw_url) return (await fetch(file.raw_url, { cache: 'no-store' })).text();
  return file.content ?? null;
}

export async function writeGist(token: string, gistId: string, content: string): Promise<void> {
  const body = JSON.stringify({ files: { [GIST_FILE]: { content } } });
  await json<Gist>(await request(token, `/gists/${gistId}`, { method: 'PATCH', body }));
}
