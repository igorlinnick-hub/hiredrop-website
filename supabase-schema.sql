-- Profiles table linked to Supabase Auth users
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text,
  last_name text,
  phone text,
  keywords text[] default '{}',
  location text default 'remote',
  job_type text default 'full-time',
  platforms text[] default '{remoteok}',
  writing_style text default '',
  resume_url text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can only read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

-- Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- Auto-create profile when user signs up.
-- Copies the signup names into the row so a user who hasn't finished the
-- onboarding quiz still has a real name on file (applications must never go
-- out with a blank name). Sources: our signup form writes
-- raw_user_meta_data.first_name/last_name; Google OAuth provides
-- given_name/family_name (and full_name/name as a fallback).
-- Applied to the live DB 2026-07-12.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, name, last_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'first_name', ''),
      nullif(new.raw_user_meta_data->>'given_name', ''),
      nullif(split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1), '')
    ),
    coalesce(
      nullif(new.raw_user_meta_data->>'last_name', ''),
      nullif(new.raw_user_meta_data->>'family_name', ''),
      nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), '^\S+\s*', ''), '')
    )
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Storage bucket for resumes
insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', false);

-- Users can upload their own resume
create policy "Users can upload resume"
  on storage.objects for insert
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users can view their own resume
create policy "Users can view own resume"
  on storage.objects for select
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own resume
create policy "Users can delete own resume"
  on storage.objects for delete
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = auth.uid()::text);
