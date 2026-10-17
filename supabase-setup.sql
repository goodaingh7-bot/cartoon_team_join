-- Run once in the SQL editor of the CURRENT Supabase project.
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.team_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_name text not null check (char_length(trim(applicant_name)) between 2 and 80),
  age integer check (age is null or age between 1 and 100),
  roles text[] not null check (cardinality(roles) between 1 and 8),
  story_types text[] not null check (cardinality(story_types) between 1 and 9),
  experience text not null check (experience in ('Beginner', 'Some Experience', 'Experienced')),
  contact_method text not null check (contact_method in ('Mobile Number', 'Instagram ID', 'Telegram ID')),
  contact_value text not null check (char_length(trim(contact_value)) between 2 and 100),
  extra_details text check (extra_details is null or char_length(extra_details) <= 1000),
  status text not null default 'Pending' check (status in ('Pending', 'Accepted', 'Rejected', 'Contacted')),
  created_at timestamptz not null default now()
);

create or replace function public.is_team_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

alter table public.admin_users enable row level security;
alter table public.team_applications enable row level security;

create policy "Admin can view admin list" on public.admin_users
  for select to authenticated using ((select public.is_team_admin()));
create policy "Public can submit applications" on public.team_applications
  for insert to anon, authenticated
  with check (status = 'Pending' and applicant_name = trim(applicant_name) and contact_value = trim(contact_value));
create policy "Admin can view applications" on public.team_applications
  for select to authenticated using ((select public.is_team_admin()));
create policy "Admin can update applications" on public.team_applications
  for update to authenticated using ((select public.is_team_admin())) with check ((select public.is_team_admin()));
create policy "Admin can delete applications" on public.team_applications
  for delete to authenticated using ((select public.is_team_admin()));

revoke all on public.admin_users from anon, authenticated;
grant select on public.admin_users to authenticated;
revoke all on public.team_applications from anon, authenticated;
grant insert on public.team_applications to anon, authenticated;
grant select, update, delete on public.team_applications to authenticated;
revoke all on function public.is_team_admin() from public;
grant execute on function public.is_team_admin() to authenticated;
