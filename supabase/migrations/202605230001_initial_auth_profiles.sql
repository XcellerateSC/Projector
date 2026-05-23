create type public.system_role as enum (
  'employee',
  'project_lead',
  'portfolio_manager'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  system_role public.system_role not null default 'employee',
  professional_grade text,
  business_unit text,
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_system_role_idx on public.profiles(system_role);
create index profiles_is_active_idx on public.profiles(is_active);

alter table public.profiles enable row level security;

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create function public.current_user_is_portfolio_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and system_role = 'portfolio_manager'
      and is_active = true
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  resolved_role public.system_role;
begin
  requested_role := new.raw_user_meta_data ->> 'system_role';

  resolved_role := case
    when requested_role in ('employee', 'project_lead', 'portfolio_manager')
      then requested_role::public.system_role
    else 'employee'::public.system_role
  end;

  insert into public.profiles (
    id,
    email,
    full_name,
    system_role,
    professional_grade,
    business_unit,
    location
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'New user'),
    resolved_role,
    new.raw_user_meta_data ->> 'professional_grade',
    new.raw_user_meta_data ->> 'business_unit',
    new.raw_user_meta_data ->> 'location'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  full_name,
  system_role,
  professional_grade,
  business_unit,
  location
)
select
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'full_name', users.email, 'New user'),
  case
    when users.raw_user_meta_data ->> 'system_role' in ('employee', 'project_lead', 'portfolio_manager')
      then (users.raw_user_meta_data ->> 'system_role')::public.system_role
    else 'employee'::public.system_role
  end,
  users.raw_user_meta_data ->> 'professional_grade',
  users.raw_user_meta_data ->> 'business_unit',
  users.raw_user_meta_data ->> 'location'
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.id = users.id
);

create policy "Authenticated users can read active profiles"
on public.profiles
for select
to authenticated
using (is_active = true);

create policy "Users can read their own inactive profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "Portfolio managers can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.current_user_is_portfolio_manager());

create policy "Portfolio managers can update profiles"
on public.profiles
for update
to authenticated
using (public.current_user_is_portfolio_manager())
with check (public.current_user_is_portfolio_manager());

create policy "Portfolio managers can delete profiles"
on public.profiles
for delete
to authenticated
using (public.current_user_is_portfolio_manager());
