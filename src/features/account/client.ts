import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The Supabase client of user accounts. supabase-js is imported only when it is first needed (the account page, or a
 * signed-in learner), so phones that never sign in never download it. Empty values in `.env` switch accounts off.
 */
const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

export const ACCOUNTS_ENABLED = SUPABASE_URL !== '' && SUPABASE_KEY !== '';

/** localStorage key of the Supabase session (removed by hand on sign-out, see auth.ts). */
export const AUTH_STORAGE_KEY = 'my-university:auth';

const cache: { client?: Promise<SupabaseClient> } = {};

async function createAccountClient(): Promise<SupabaseClient> {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storageKey: AUTH_STORAGE_KEY } });
}

/** One client per page (cached promise, so parallel callers share it). */
export function getSupabase(): Promise<SupabaseClient> {
  cache.client ??= createAccountClient();
  return cache.client;
}
