-- Invite codes table
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  uses integer default 0,
  max_uses integer, -- null = unlimited
  active boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.invite_codes enable row level security;

-- Anyone can read active codes (needed for validation during signup)
create policy "Anyone can validate invite codes"
  on public.invite_codes for select
  using (active = true);

-- Function to increment invite code usage
create or replace function public.increment_invite_code_uses(code_value text)
returns void as $$
begin
  update public.invite_codes
  set uses = uses + 1
  where code = code_value;
end;
$$ language plpgsql security definer;

-- Waitlist table
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  first_name text,
  last_name text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.waitlist enable row level security;

-- Anyone can insert into waitlist (signup without code)
create policy "Anyone can join waitlist"
  on public.waitlist for insert
  with check (true);

-- Insert some initial invite codes for you and your team
insert into public.invite_codes (code, description, max_uses) values
  ('HIREDROP2026', 'General invite code', 50),
  ('FOUNDER', 'Founder access', null),
  ('DEVTEAM', 'Developer team', 10);
