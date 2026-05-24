do $$
begin
  create type public.project_health as enum ('green', 'amber', 'red');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.assignment_status as enum ('open', 'partially_staffed', 'staffed');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.timesheet_status as enum ('open', 'submitted');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.time_entry_type as enum ('project', 'internal');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  industry text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  name text not null,
  project_lead_id uuid references public.profiles(id) on delete set null,
  health public.project_health not null default 'green',
  start_date date not null,
  end_date date not null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, name)
);

create table if not exists public.project_charters (
  project_id uuid primary key references public.projects(id) on delete cascade,
  objective text not null default '',
  scope text not null default '',
  budget_note text not null default '',
  milestones jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_positions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  professional_grade text not null,
  start_date date not null,
  end_date date not null,
  planned_allocation_percent numeric(5,2) not null default 100,
  status public.assignment_status not null default 'open',
  required_skills text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_position_id uuid not null references public.project_positions(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  allocation_percent numeric(5,2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.internal_time_account_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_timesheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  target_hours numeric(6,2) not null default 40,
  status public.timesheet_status not null default 'open',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, week_start_date)
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  weekly_timesheet_id uuid not null references public.weekly_timesheets(id) on delete cascade,
  entry_type public.time_entry_type not null,
  project_assignment_id uuid references public.project_assignments(id) on delete cascade,
  internal_time_account_type_id uuid references public.internal_time_account_types(id) on delete restrict,
  hours numeric(6,2) not null default 0,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (entry_type = 'project' and project_assignment_id is not null and internal_time_account_type_id is null)
    or
    (entry_type = 'internal' and project_assignment_id is null and internal_time_account_type_id is not null)
  )
);

create index if not exists projects_project_lead_idx on public.projects(project_lead_id);
create index if not exists project_positions_project_idx on public.project_positions(project_id);
create index if not exists project_assignments_employee_idx on public.project_assignments(employee_id);
create index if not exists project_assignments_position_idx on public.project_assignments(project_position_id);
create index if not exists weekly_timesheets_employee_week_idx on public.weekly_timesheets(employee_id, week_start_date);
create index if not exists time_entries_timesheet_idx on public.time_entries(weekly_timesheet_id);

drop trigger if exists portfolios_set_updated_at on public.portfolios;
create trigger portfolios_set_updated_at
before update on public.portfolios
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists project_charters_set_updated_at on public.project_charters;
create trigger project_charters_set_updated_at
before update on public.project_charters
for each row execute function public.set_updated_at();

drop trigger if exists project_positions_set_updated_at on public.project_positions;
create trigger project_positions_set_updated_at
before update on public.project_positions
for each row execute function public.set_updated_at();

drop trigger if exists project_assignments_set_updated_at on public.project_assignments;
create trigger project_assignments_set_updated_at
before update on public.project_assignments
for each row execute function public.set_updated_at();

drop trigger if exists internal_time_account_types_set_updated_at on public.internal_time_account_types;
create trigger internal_time_account_types_set_updated_at
before update on public.internal_time_account_types
for each row execute function public.set_updated_at();

drop trigger if exists weekly_timesheets_set_updated_at on public.weekly_timesheets;
create trigger weekly_timesheets_set_updated_at
before update on public.weekly_timesheets
for each row execute function public.set_updated_at();

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

create or replace function public.current_user_is_project_lead_for_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects
    where id = target_project_id
      and project_lead_id = auth.uid()
  );
$$;

create or replace function public.current_user_can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_portfolio_manager()
    or exists (
      select 1
      from public.projects
      where id = target_project_id
        and project_lead_id = auth.uid()
    )
    or exists (
      select 1
      from public.project_positions pp
      join public.project_assignments pa on pa.project_position_id = pp.id
      where pp.project_id = target_project_id
        and pa.employee_id = auth.uid()
    );
$$;

create or replace function public.current_user_can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_is_portfolio_manager()
    or public.current_user_is_project_lead_for_project(target_project_id);
$$;

create or replace function public.current_user_can_access_position(target_position_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_positions pp
    where pp.id = target_position_id
      and public.current_user_can_access_project(pp.project_id)
  );
$$;

create or replace function public.current_user_can_manage_position(target_position_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_positions pp
    where pp.id = target_position_id
      and public.current_user_can_manage_project(pp.project_id)
  );
$$;

create or replace function public.current_user_can_manage_weekly_timesheet(target_weekly_timesheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.weekly_timesheets wt
    where wt.id = target_weekly_timesheet_id
      and (
        wt.employee_id = auth.uid()
        or public.current_user_is_portfolio_manager()
      )
  );
$$;

create or replace function public.current_user_can_read_weekly_timesheet(target_weekly_timesheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_can_manage_weekly_timesheet(target_weekly_timesheet_id)
    or exists (
      select 1
      from public.time_entries te
      join public.project_assignments pa on pa.id = te.project_assignment_id
      join public.project_positions pp on pp.id = pa.project_position_id
      where te.weekly_timesheet_id = target_weekly_timesheet_id
        and public.current_user_can_manage_project(pp.project_id)
    );
$$;

create or replace function public.ensure_weekly_timesheet(
  target_employee_id uuid,
  target_week_start_date date,
  target_hours numeric default 40
)
returns public.weekly_timesheets
language plpgsql
security definer
set search_path = public
as $$
declare
  ensured_timesheet public.weekly_timesheets;
begin
  if target_employee_id <> auth.uid()
    and not public.current_user_is_portfolio_manager()
  then
    raise exception 'Not allowed to create this weekly timesheet'
      using errcode = '42501';
  end if;

  insert into public.weekly_timesheets (
    employee_id,
    week_start_date,
    target_hours,
    status
  )
  values (
    target_employee_id,
    target_week_start_date,
    target_hours,
    'open'
  )
  on conflict (employee_id, week_start_date) do update set
    target_hours = public.weekly_timesheets.target_hours
  returning * into ensured_timesheet;

  return ensured_timesheet;
end;
$$;

grant execute on function public.ensure_weekly_timesheet(uuid, date, numeric) to authenticated;

alter table public.portfolios enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.project_charters enable row level security;
alter table public.project_positions enable row level security;
alter table public.project_assignments enable row level security;
alter table public.internal_time_account_types enable row level security;
alter table public.weekly_timesheets enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "Authenticated users can read portfolios" on public.portfolios;
create policy "Authenticated users can read portfolios"
on public.portfolios for select to authenticated using (true);

drop policy if exists "Portfolio managers manage portfolios" on public.portfolios;
create policy "Portfolio managers manage portfolios"
on public.portfolios for all to authenticated
using (public.current_user_is_portfolio_manager())
with check (public.current_user_is_portfolio_manager());

drop policy if exists "Authenticated users can read customers" on public.customers;
create policy "Authenticated users can read customers"
on public.customers for select to authenticated using (true);

drop policy if exists "Portfolio managers manage customers" on public.customers;
create policy "Portfolio managers manage customers"
on public.customers for all to authenticated
using (public.current_user_is_portfolio_manager())
with check (public.current_user_is_portfolio_manager());

drop policy if exists "Project access can read projects" on public.projects;
create policy "Project access can read projects"
on public.projects for select to authenticated
using (public.current_user_can_access_project(id));

drop policy if exists "Portfolio managers can insert projects" on public.projects;
create policy "Portfolio managers can insert projects"
on public.projects for insert to authenticated
with check (public.current_user_is_portfolio_manager());

drop policy if exists "Project managers can update projects" on public.projects;
create policy "Project managers can update projects"
on public.projects for update to authenticated
using (public.current_user_can_manage_project(id))
with check (public.current_user_can_manage_project(id));

drop policy if exists "Portfolio managers can delete projects" on public.projects;
create policy "Portfolio managers can delete projects"
on public.projects for delete to authenticated
using (public.current_user_is_portfolio_manager());

drop policy if exists "Project access can read charters" on public.project_charters;
create policy "Project access can read charters"
on public.project_charters for select to authenticated
using (public.current_user_can_access_project(project_id));

drop policy if exists "Project managers can manage charters" on public.project_charters;
create policy "Project managers can manage charters"
on public.project_charters for all to authenticated
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

drop policy if exists "Project access can read positions" on public.project_positions;
create policy "Project access can read positions"
on public.project_positions for select to authenticated
using (public.current_user_can_access_project(project_id));

drop policy if exists "Project managers can manage positions" on public.project_positions;
create policy "Project managers can manage positions"
on public.project_positions for all to authenticated
using (public.current_user_can_manage_project(project_id))
with check (public.current_user_can_manage_project(project_id));

drop policy if exists "Project access can read assignments" on public.project_assignments;
create policy "Project access can read assignments"
on public.project_assignments for select to authenticated
using (
  employee_id = auth.uid()
  or public.current_user_can_access_position(project_position_id)
);

drop policy if exists "Project managers can manage assignments" on public.project_assignments;
create policy "Project managers can manage assignments"
on public.project_assignments for all to authenticated
using (public.current_user_can_manage_position(project_position_id))
with check (public.current_user_can_manage_position(project_position_id));

drop policy if exists "Authenticated users can read internal accounts" on public.internal_time_account_types;
create policy "Authenticated users can read internal accounts"
on public.internal_time_account_types for select to authenticated
using (is_active = true);

drop policy if exists "Portfolio managers manage internal accounts" on public.internal_time_account_types;
create policy "Portfolio managers manage internal accounts"
on public.internal_time_account_types for all to authenticated
using (public.current_user_is_portfolio_manager())
with check (public.current_user_is_portfolio_manager());

drop policy if exists "Users manage own weekly timesheets" on public.weekly_timesheets;
drop policy if exists "Users can insert own weekly timesheets" on public.weekly_timesheets;
drop policy if exists "Users can update own weekly timesheets" on public.weekly_timesheets;
drop policy if exists "Users can delete own weekly timesheets" on public.weekly_timesheets;

create policy "Users can insert own weekly timesheets"
on public.weekly_timesheets for insert to authenticated
with check (employee_id = auth.uid() or public.current_user_is_portfolio_manager());

create policy "Users can update own weekly timesheets"
on public.weekly_timesheets for update to authenticated
using (employee_id = auth.uid() or public.current_user_is_portfolio_manager())
with check (employee_id = auth.uid() or public.current_user_is_portfolio_manager());

create policy "Users can delete own weekly timesheets"
on public.weekly_timesheets for delete to authenticated
using (employee_id = auth.uid() or public.current_user_is_portfolio_manager());

drop policy if exists "Project leads can read team weekly timesheets" on public.weekly_timesheets;
create policy "Project leads can read team weekly timesheets"
on public.weekly_timesheets for select to authenticated
using (public.current_user_can_read_weekly_timesheet(id));

drop policy if exists "Users manage own time entries" on public.time_entries;
drop policy if exists "Project managers can read project time entries" on public.time_entries;

create policy "Project managers can read project time entries"
on public.time_entries for select to authenticated
using (
  entry_type = 'project'
  and exists (
    select 1
    from public.project_assignments pa
    join public.project_positions pp on pp.id = pa.project_position_id
    where pa.id = project_assignment_id
      and public.current_user_can_manage_project(pp.project_id)
  )
);

create policy "Users manage own time entries"
on public.time_entries for all to authenticated
using (public.current_user_can_manage_weekly_timesheet(weekly_timesheet_id))
with check (public.current_user_can_manage_weekly_timesheet(weekly_timesheet_id));

insert into public.internal_time_account_types (name, is_default, sort_order)
values
  ('Internal admin & meetings', true, 10),
  ('Weiterbildung', true, 20),
  ('Ferien-Anspruch', true, 30),
  ('Krankheit', true, 40),
  ('Bezahlte Kurzabsenz', false, 100),
  ('Feiertag', false, 110),
  ('Business development', false, 120),
  ('Recruiting / interviews', false, 130),
  ('Knowledge sharing', false, 140)
on conflict (name) do update set
  is_default = excluded.is_default,
  sort_order = excluded.sort_order,
  is_active = true;

insert into public.portfolios (name, description)
values
  ('Financial Services', 'Banking and insurance transformation portfolio.'),
  ('Commercial Excellence', 'Growth and customer-facing transformation portfolio.')
on conflict (name) do update set description = excluded.description;

insert into public.customers (name, industry)
values
  ('Helvetia Group', 'Insurance'),
  ('Alpine Bank', 'Banking'),
  ('Northstar Retail', 'Retail')
on conflict (name) do update set industry = excluded.industry;

insert into public.projects (
  portfolio_id,
  customer_id,
  name,
  project_lead_id,
  health,
  start_date,
  end_date,
  location
)
select
  p.id,
  c.id,
  seed.name,
  pl.id,
  seed.health::public.project_health,
  seed.start_date::date,
  seed.end_date::date,
  seed.location
from (
  values
    ('Insurance Transformation', 'Financial Services', 'Helvetia Group', 'peter.project@xcellerate-demo.ch', 'amber', '2026-05-01', '2026-12-31', 'Zurich'),
    ('Banking Data Platform', 'Financial Services', 'Alpine Bank', 'peter.project@xcellerate-demo.ch', 'green', '2026-06-01', '2026-11-30', 'Basel'),
    ('Retail CRM Rollout', 'Commercial Excellence', 'Northstar Retail', 'peter.project@xcellerate-demo.ch', 'red', '2026-04-01', '2026-09-30', 'Bern')
) as seed(name, portfolio_name, customer_name, lead_email, health, start_date, end_date, location)
join public.portfolios p on p.name = seed.portfolio_name
join public.customers c on c.name = seed.customer_name
left join public.profiles pl on pl.email = seed.lead_email
on conflict (customer_id, name) do update set
  portfolio_id = excluded.portfolio_id,
  project_lead_id = excluded.project_lead_id,
  health = excluded.health,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  location = excluded.location;

insert into public.project_charters (project_id, objective, scope, budget_note, milestones)
select
  pr.id,
  seed.objective,
  seed.scope,
  seed.budget_note,
  seed.milestones::jsonb
from (
  values
    (
      'Insurance Transformation',
      'Modernize the operating model for claims handling and establish a scalable delivery setup.',
      'Process redesign, project governance, business analysis, implementation support and weekly steering preparation.',
      'Budget tracking is intentionally hidden in this slice and will move into the later Financials module.',
      '[{"label":"Discovery complete","date":"2026-06-30","state":"Done"},{"label":"Target operating model","date":"2026-08-31","state":"Active"},{"label":"Pilot rollout","date":"2026-10-31","state":"Planned"}]'
    ),
    (
      'Banking Data Platform',
      'Create a controlled business rollout path for the new analytics platform.',
      'Stakeholder coordination, rollout planning, requirements alignment and adoption tracking.',
      'Financial comparison will be introduced after staffing and timesheets are stable.',
      '[{"label":"Data scope confirmed","date":"2026-06-30","state":"Done"},{"label":"Pilot users onboarded","date":"2026-09-30","state":"Planned"},{"label":"Rollout readiness","date":"2026-11-30","state":"Planned"}]'
    ),
    (
      'Retail CRM Rollout',
      'Stabilize the CRM rollout and recover timeline confidence across business units.',
      'Rollout governance, PMO setup, issue tracking, steering cadence and local readiness support.',
      'Budget details are excluded from this first functional slice.',
      '[{"label":"PMO setup","date":"2026-04-30","state":"Done"},{"label":"Wave 1 rollout","date":"2026-07-31","state":"Active"},{"label":"Stabilization","date":"2026-09-30","state":"Planned"}]'
    )
) as seed(project_name, objective, scope, budget_note, milestones)
join public.projects pr on pr.name = seed.project_name
on conflict (project_id) do update set
  objective = excluded.objective,
  scope = excluded.scope,
  budget_note = excluded.budget_note,
  milestones = excluded.milestones;

insert into public.project_positions (
  project_id,
  title,
  professional_grade,
  start_date,
  end_date,
  planned_allocation_percent,
  status,
  required_skills
)
select
  pr.id,
  seed.title,
  seed.grade,
  seed.start_date::date,
  seed.end_date::date,
  seed.planned::numeric,
  seed.status::public.assignment_status,
  seed.skills::text[]
from (
  values
    ('Insurance Transformation', 'Senior Business Analyst', 'Senior Consultant', '2026-06-01', '2026-11-30', 80, 'partially_staffed', array['Business analysis','Insurance','Process design']),
    ('Insurance Transformation', 'PMO Consultant', 'Consultant', '2026-07-01', '2026-12-31', 50, 'open', array['PMO','Reporting','Workshop support']),
    ('Insurance Transformation', 'Project Lead', 'Manager', '2026-05-01', '2026-12-31', 60, 'staffed', array['Project leadership','Stakeholder management']),
    ('Banking Data Platform', 'Business Analyst', 'Senior Consultant', '2026-06-01', '2026-11-30', 60, 'staffed', array['Requirements engineering','Data','Banking']),
    ('Banking Data Platform', 'Portfolio Sponsor', 'Partner', '2026-06-01', '2026-11-30', 15, 'staffed', array['Governance','Executive reporting']),
    ('Retail CRM Rollout', 'Project Lead', 'Manager', '2026-04-01', '2026-09-30', 50, 'staffed', array['Project leadership','CRM','Recovery planning']),
    ('Retail CRM Rollout', 'PMO Consultant', 'Consultant', '2026-05-01', '2026-09-30', 40, 'staffed', array['PMO','Reporting'])
) as seed(project_name, title, grade, start_date, end_date, planned, status, skills)
join public.projects pr on pr.name = seed.project_name
where not exists (
  select 1
  from public.project_positions existing
  where existing.project_id = pr.id
    and existing.title = seed.title
);

insert into public.project_assignments (
  project_position_id,
  employee_id,
  start_date,
  end_date,
  allocation_percent
)
select
  pp.id,
  prof.id,
  seed.start_date::date,
  seed.end_date::date,
  seed.allocation::numeric
from (
  values
    ('Insurance Transformation', 'Senior Business Analyst', 'carla.consultant@xcellerate-demo.ch', '2026-06-01', '2026-08-31', 60),
    ('Insurance Transformation', 'Senior Business Analyst', 'chris.consultant@xcellerate-demo.ch', '2026-09-01', '2026-11-30', 60),
    ('Insurance Transformation', 'Project Lead', 'peter.project@xcellerate-demo.ch', '2026-05-01', '2026-12-31', 60),
    ('Banking Data Platform', 'Business Analyst', 'carla.consultant@xcellerate-demo.ch', '2026-06-01', '2026-11-30', 60),
    ('Banking Data Platform', 'Portfolio Sponsor', 'paula.portfolio@xcellerate-demo.ch', '2026-06-01', '2026-11-30', 15),
    ('Retail CRM Rollout', 'Project Lead', 'peter.project@xcellerate-demo.ch', '2026-04-01', '2026-09-30', 50),
    ('Retail CRM Rollout', 'PMO Consultant', 'chris.consultant@xcellerate-demo.ch', '2026-05-01', '2026-09-30', 40)
) as seed(project_name, position_title, employee_email, start_date, end_date, allocation)
join public.projects pr on pr.name = seed.project_name
join public.project_positions pp on pp.project_id = pr.id and pp.title = seed.position_title
join public.profiles prof on prof.email = seed.employee_email
where not exists (
  select 1
  from public.project_assignments existing
  where existing.project_position_id = pp.id
    and existing.employee_id = prof.id
    and existing.start_date = seed.start_date::date
);
