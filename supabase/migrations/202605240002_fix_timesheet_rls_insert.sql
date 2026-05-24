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
