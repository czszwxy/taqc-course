-- Accounts of my-university: one profile and one progress row per user, readable (and progress updatable) only by
-- that user. Every account signs in to Supabase Auth with a stand-in address made from its login,
-- <login>@users.my-university.invalid — no mail is ever sent to it, so "Confirm email" must stay OFF in the project.
-- The real email, when the learner gives one, lives in profiles.email (unique) and is used only to find the login.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  login text not null unique check (login ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  email text unique check (email = lower(email) and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  first_name text not null check (length(first_name) between 1 and 50 and first_name = btrim(first_name)),
  last_name text not null check (length(last_name) between 1 and 50 and last_name = btrim(last_name)),
  created_at timestamptz not null default now()
);

-- data = the app's ProgressData JSON; rev goes up by one on every save (the app writes only if rev is what it read).
create table public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  epoch text not null default '',
  settings jsonb,
  rev bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Read own progress" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Update own progress" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Explicit grants (Supabase stops granting new tables to the API roles by default from 30 Oct 2026).
-- Rows are created only by the sign-up trigger and removed only with the auth user.
revoke all on public.profiles, public.progress from anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.progress to authenticated;
grant update (data, epoch, settings, rev, updated_at) on public.progress to authenticated;

-- Creates the profile and an empty progress row for every new auth user. A sign-up without the app's metadata, or
-- whose address is not the stand-in of its login, is refused (so nobody can register a real address as a login).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  new_login text := meta ->> 'login';
begin
  if new_login is null or new.email is distinct from new_login || '@users.my-university.invalid' then
    raise exception 'my-university accounts sign up through the app (login % / address %)', new_login, new.email;
  end if;
  insert into public.profiles (id, login, email, first_name, last_name)
  values (new.id, new_login, nullif(meta ->> 'email', ''), meta ->> 'first_name', meta ->> 'last_name');
  insert into public.progress (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Friendly "login taken" / "email taken" messages before a sign-up (the unique constraints still decide).
create function public.account_taken(p_login text, p_email text)
returns table (login_taken boolean, email_taken boolean)
language sql stable security definer set search_path = '' as $$
  select
    exists (select 1 from public.profiles where login = lower(btrim(p_login))),
    coalesce(btrim(p_email), '') <> '' and exists (select 1 from public.profiles where email = lower(btrim(p_email)));
$$;

-- Sign-in with an email: the app asks which login it belongs to, then signs in with that login's stand-in address.
create function public.login_for_email(p_email text) returns text
language sql stable security definer set search_path = '' as $$
  select login from public.profiles where email = lower(btrim(p_email));
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.account_taken(text, text), public.login_for_email(text) from public;
grant execute on function public.account_taken(text, text), public.login_for_email(text) to anon, authenticated;
