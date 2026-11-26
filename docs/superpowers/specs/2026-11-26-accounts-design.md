# User accounts with Supabase — design

## Why
The owner wants friends and other people to learn with their own accounts, so progress lives on a server and follows a learner
from the computer to the phone. Today progress is per browser (localStorage), shared only by Export / Import or the optional
gist sync with a GitHub token, which is too technical for most people.

## Goals
- Sign up two ways: **with email** (first name, last name, login, email, password) or **login only** (same, without email).
- Every account has a **unique login** (not case-sensitive). An email, when given, is unique too.
- Sign in with **login + password** or **email + password**. Sign out.
- Each account keeps its own progress: solved tasks, drafts, lessons read, checked links, last page, settings (theme, editor, current course).
- Progress saves to and loads from the account; the device's progress can be moved into a new account.
- Clear messages: login taken, email taken, wrong login/email or password, weak password, no connection, too many attempts.

## Non-goals (first version)
- No confirmation emails, no "forgot password" email (both need a mail service). The owner can set a new password in Supabase.
- No profile editing, password change or account deletion in the app (the owner can delete a user in the dashboard; progress goes with it).
- No social sign-in (Google / GitHub).

## Anti-goals
- Signed-out use must keep working exactly as today (localStorage, Export / Import, gist sync).
- The app must never wait for the server to let someone learn: the browser copy stays the working copy.
- One learner's progress must never be readable or writable by another account.
- A friend using the same browser must not see or absorb the previous learner's progress by accident.

## Approaches (owner chose Supabase)
| | Picked? | Trade-off |
|---|---|---|
| Supabase (Postgres + Auth) | **yes** | Least code, one row per learner, SQL dashboard; free projects pause after 7 idle days; local tests need Docker |
| Firebase (Auth + Firestore) | no | Never pauses, but 1 MB records force splitting drafts, rules language, more code |
| Own API on Cloudflare Workers + D1 | no | We would own password storage and brute-force protection; 10 ms CPU limit is tight for hashing |

## How login-only accounts work
Supabase Auth identifies users by email. **Every** account signs in to Supabase with a stand-in address made from its login:
`<login>@users.my-university.invalid`. No mail is ever sent to it (`.invalid` can never receive mail). The real email, if
given, is stored in the learner's profile. Consequences:
- Supabase itself refuses a second account with the same login (same stand-in address) — the uniqueness check cannot race.
- Sign-in with email: a database function `login_for_email(email)` returns the login, then the app signs in with the stand-in address.
  It reveals which login belongs to an email; sign-up has to say "email taken" anyway, and a login is not a secret.
- "Confirm email" must stay **off** in the Supabase project (Supabase only validates an address when it sends mail;
  turning it on would break every sign-up).

## Database (one migration, `supabase/migrations/…_accounts.sql`)
- `profiles`: `id` (= auth user), `login` (lowercase, `^[a-z0-9][a-z0-9._-]{2,29}$`, unique), `email` (lowercase, unique, nullable),
  `first_name`, `last_name` (1–50 chars), `created_at`. Readable only by its owner; no writes from the app.
- `progress`: `user_id`, `data` jsonb (ProgressData), `epoch` text, `settings` jsonb, `rev` bigint, `updated_at`.
  Readable and updatable only by its owner (row level security + explicit grants, as Supabase requires from 30 Oct 2026).
- A trigger on new auth users creates both rows from the sign-up metadata and rejects a sign-up whose metadata is missing or
  whose auth address is not the stand-in of its login.
- `account_taken(login, email)` (for friendly errors before sign-up) and `login_for_email(email)`, callable without signing in.

## App
- `@supabase/supabase-js`, loaded only when the learner opens the account page or is signed in (phones that never sign in never download it).
- `.env` (committed) holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` — both public by design. Empty = accounts are
  switched off and the app looks exactly like today. The secret key never goes into the repo.
- `src/features/account/`: client, sign up / in / out with error mapping, pure form checks, the account sync store, and the page.
- Route `/account`: signed out → "Sign in" / "Create account" (choice "With email" / "Login only"), signed in → name, login,
  email, sync status, Sign out. QA Notebook look: a `.page` sheet, the existing `input` / `btn` / `Callout` styles, a short
  handwritten note. Fields have labels, errors are tied to their fields and announced; works at 375 px.
- Top bar: one button next to Settings — "Sign in", or the learner's login when signed in (red dot when sync fails, like today).

## Sync (reuses merge.ts)
- Same moments as the gist sync: on start, ~8 s after a change, when the app is hidden or shown again.
- The server row has a revision number. Each sync first reads only `rev` (tiny). Unchanged and nothing new here → nothing sent.
  Changed elsewhere → read the row, combine it with this device's progress (the gist sync's `combine`, moved into merge.ts,
  so epochs from Import / Reset behave the same) and write back only if the row still has the revision we read; otherwise retry.
  This keeps downloads small (the free plan has 5 GB of egress a month).
- Settings: the newer of the two copies wins (the settings store gets an `updatedAt`).
- While signed in, the gist sync pauses and its Settings section says the account keeps progress in sync.

## One browser, several people
- Signing in or up saves this device's signed-out progress and settings aside. A checkbox "Add this device's progress to my
  account" is shown when there is any: ticked by default when creating an account, unticked when signing in (it could be
  someone else's browser).
- Signing out first tries one last sync, warns if it failed, then removes the account's progress from the browser and brings
  back what the device had before signing in.

## Testing
- `npm test` also runs pure checks: form rules, stand-in address, settings merge.
- End to end (`npm run test:accounts`): a local Supabase (`npx supabase start`, Docker Desktop) and the app on a spare port in
  Chromium from `lab/.browsers`, with test accounts: both sign-up ways, duplicate login / email, wrong password, sign-in by
  login and by email, progress saved on one browser and loaded in another, moving device progress, sign-out restores the device,
  one account cannot read another's progress, signed-out use unchanged, a 375 px layout check.

## Left to the builder
Exact wording of messages, component split, the stand-in domain constant, retry counts.
