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
