# Accounts on Supabase — setup

The app works without this: with empty values in `.env` there is no Sign in button and progress stays in the browser.

## One-time setup of the real project (the owner does this)

1. Sign up at https://supabase.com (GitHub sign-in works) and create a project (free plan, any region close to you).
   Save the database password the wizard shows in your password manager — the app never needs it.
2. **SQL Editor** → New query → paste the whole file `supabase/migrations/20261126000000_accounts.sql` → Run.
   It should say "Success. No rows returned".
3. **Authentication → Sign In / Providers → Email**:
   - **Confirm email: OFF** — accounts sign in with a made-up address `<login>@users.my-university.invalid`, which can
     never receive mail; with confirmation on, every sign-up fails.
   - Minimum password length: **8**.
4. **Project Settings → API**: copy the **Project URL** and the **Publishable** key into `.env`:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Never paste the **secret** key anywhere in the project.
5. Commit and push `.env`: the website build reads it, so accounts appear on https://czszwxy.github.io/taqc-course/
   and in `npm run dev`.

## Good to know

- Free projects **pause after 7 days without any use**. Then nobody can sign in on a new device (learning still works
  and syncs later): open the dashboard and press **Restore project**.
- Users are listed under **Authentication → Users**; deleting one also deletes their profile and progress.
  Do not add users from the dashboard — the sign-up trigger refuses accounts created without the app.
- Forgot password: there is no reset email (no mail service). In **SQL Editor** run, with the learner's login:
  `update auth.users set encrypted_password = extensions.crypt('NEW-PASSWORD', extensions.gen_salt('bf')) where email = 'LOGIN@users.my-university.invalid';`
  and give them the new password.
- Free plan backups are not automatic: Settings → Export / Import in the app still works per learner.

## Local copy for tests (needs Docker Desktop)

```
npm run db:start      # local Supabase on http://127.0.0.1:54321 (first start downloads images)
npm run test:accounts # end-to-end account tests in Chromium against it
npm run db:stop
```
