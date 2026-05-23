# XC Projector Product Design v0.1

## Purpose

XC Projector is a web application for project planning, staffing, capacity management, time tracking, and project status reporting for a consulting company.

The product must support two core views of the business:

- Future view: plan project demand, staffing, and capacity over upcoming weeks.
- Past/present view: capture actual work performed, compare plan vs actual, and support operational and financial reporting.

The app will be deployed on Vercel and use Supabase for data, authentication, and backend capabilities.

## Primary user groups

- Employee
- Project Lead
- Portfolio Manager

These are system roles for permissions and navigation.

## System role model

### Global system roles

- `employee`
- `project_lead`
- `portfolio_manager`

`portfolio_manager` acts as admin for MVP purposes.

### Context-based responsibility

Global role alone is not sufficient. Access must also depend on context.

Examples:

- A user may be global `employee` but act as project lead on Project A.
- The same user may only act as a staffed employee on Project B.
- A user may be responsible for one or more projects without seeing the full portfolio.

Effective permissions are derived from:

- global system role
- portfolio/project assignments
- staffing membership on projects

## Access control model

### Confirmed access rules

- `portfolio_manager` has full read/write access across the entire app.
- `project_lead` only sees projects explicitly assigned to them.
- Portfolio assignment grants access to all projects in that portfolio.
- Direct project assignment grants access to that project only.
- A `project_lead` working on another project only as staffed employee behaves like a normal employee there.
- `employee` users can view all employee profiles for transparency.
- Employee profiles may show current project assignments.
- A staffed employee does not see the full project team by default and only sees their own project-related data.

### Access principles by area

#### Employee directory

- All authenticated users can view employee profiles.
- Only `portfolio_manager` can fully edit employee master data.
- Employees may later be allowed to edit selected self-service fields, but this is not required for MVP.

#### Projects and staffing

- `portfolio_manager` can create and edit all portfolios, projects, positions, assignments, and rates.
- Assigned `project_lead` can read and edit the projects they own.
- Non-assigned employees only see their own assignment-specific view, not the full staffing picture.

#### Time tracking

- Employees can create and edit their own weekly time entries until submission.
- Assigned `project_lead` can view the submitted state and employee-reported hours for their staffed project members.
- Assigned `project_lead` can set billing overrides for project-related entries within their projects.
- `portfolio_manager` can view and edit all time and override data.

#### Status reports and financials

- Assigned `project_lead` can create and submit status reports for their projects.
- `portfolio_manager` can read all status reports and add comments everywhere.
- Budget and financial views are visible only to `project_lead` with access to the project and to `portfolio_manager`.

### RLS implication

The access model should be implemented primarily through Supabase Row Level Security, using:

- global system role on the profile
- access assignments for portfolio/project responsibility
- assignment membership for employee-specific project data

## Organizational hierarchy

- Portfolio
- Project

Projects belong directly to a portfolio.

This hierarchy is also relevant for access control and future reporting.

### Ownership and inheritance

- Portfolio contains projects.
- Project belongs to one portfolio.
- Access inheritance flows downward from portfolio to project.
- Access does not automatically flow upward from project to portfolio.

## Customer hierarchy

Projects always belong to a customer context.

Expected customer structure:

- Customer / enterprise
- Client sponsor / business unit / department / commissioning entity

Each project may also store customer-side contacts such as:

- Sponsor
- Customer project lead
- Additional stakeholders / contacts

## Project model

Each project should contain at minimum:

- Name
- Portfolio
- Customer
- Client department / commissioning unit
- Internal project lead
- Business unit
- Location
- Start date
- End date
- Budget
- Project charter

### Project charter

Expected MVP charter fields:

- Objective
- Budget
- Start date
- End date
- Optional milestones / phases / epics

Budget is only visible to project leads and portfolio managers.

## Employee model

Each employee/user should have:

- User account
- System role
- Professional grade
- Business unit
- Location
- Active/inactive flag
- Skill profile
- Certifications

### Professional grade

Examples:

- Consultant
- Senior Consultant
- Project Leader
- Manager
- Partner

This list should be extensible.

Professional grade is different from system role. It is relevant for staffing, pricing, and reporting.

### Skills

Skills are separate from professional grade and can be categorized, for example:

- Languages
- Industry experience
- Functional / role experience
- IT tools / applications
- Certifications

Skill matching should guide staffing decisions but should not block staffing in the MVP.

### Employment capacity

Each employee has a base employment percentage, historized with validity dates.

Examples:

- 100%
- 80%
- 60%

Only portfolio managers maintain this baseline capacity in MVP.

## Planning model

Planning starts with abstract demand and is later filled with concrete people.

### Core planning principle

The planning unit is not the person. The planning unit is the project position.

### Project position

A project position is a planned staffing slot within a project.

Example:

- 100% Senior Consultant with Scrum Master skill from May to August

A project position should include:

- Project
- Professional grade
- Required skills
- Planned allocation by week
- Start and end dates
- Billing rate
- Internal notes / description

This position remains stable for planning, reporting, and financial views.

### Assignment

Assignments link concrete employees to a project position over time.

Examples:

- Person A fills the position from May to June
- Person B fills the same position from July to August

Assignments must therefore be historized with validity dates.

This allows one position to be filled by different people over time without losing the continuity of the planned role.

### Planning data shape

To keep planning and reporting stable, weekly planning should be stored explicitly by position and week.

Recommended structure:

- position header for the long-lived staffing demand
- weekly planning rows for allocation and planned hours
- assignment rows for employee fulfillment over time

This makes weekly rollups, capacity checks, and financial calculations much easier than deriving everything from date ranges on the fly.

## Capacity logic

### Base unit

All calculations use hours as the base unit.

System parameters for MVP:

- 8 hours = 1 day
- 5 days = 100% week
- Therefore 40 hours = 100% week

Percentages are a planning and display abstraction. Internally, planning should be stored and aggregated in hours.

### Capacity warnings

For MVP, capacity conflicts should warn, not block.

Rules:

- A project lead can assign any employee.
- If a staffing decision pushes a person above 100% in a week, the system allows it.
- The system highlights the conflict.
- The UI should show which other projects / positions create the over-allocation.
- Both impacted project leads should see the warning in their staffing views.

### Skill matching

Skill fit is advisory only in MVP.

Possible UI behaviors:

- highlight matching candidates
- sort candidates by fit
- show a match score

No hard skill gate in MVP.

### Conflict presentation

The MVP UI should explicitly surface:

- total allocated percentage/hours for the employee in the affected week
- the conflicting other projects/positions
- whether the employee is above target capacity
- a warning state on both the employee candidate list and the affected project staffing overview

## Time tracking model

### Weekly time tracking

Employees track time weekly.

For MVP, time entry granularity is:

- hours per week per active assignment
- description

Employees should also be able to log time against internal time accounts.

### Internal time accounts

Examples:

- Paid absence
- Vacation / overtime compensation
- Training
- Internal admin / meetings
- Business development / sales support

### Weekly completeness rule

An employee must allocate their full weekly target hours before submitting the week.

Weekly target hours are based on:

- standard week hours
- valid employment percentage for that period

For example:

- 100% employee -> 40h target week
- 80% employee -> 32h target week

Submission is only allowed when:

- project hours + internal time hours = weekly target hours

### Weekly submission

There is no full approval workflow in MVP.

However, an employee must submit a week to signal it is complete.

This enables project leads to see:

- who has submitted
- who is still missing

### Submission scope

Weekly submission should be employee-wide, not project-scoped.

Reason:

- employees must fully allocate their weekly capacity across project and internal time
- one weekly submission state is easier to understand and operate
- project leads can still see submission completeness for their own staffed team members

## Actual vs billing values

The original employee time entry must remain unchanged.

Project leads should be able to set a separate billing override for reporting and later invoicing preparation.

This means the model should distinguish between:

- employee-reported hours
- billing-relevant override hours

The app does not generate invoices in MVP, but it should support reporting based on both values.

### Billing override principle

Billing override should apply only to project-related time, not to internal time accounts.

The model should preserve:

- original employee entry
- override value
- override reason
- overriding user
- override timestamp

## Status reporting

Each project may have at most one status report per calendar week.

A report can be skipped for some weeks.

Portfolio managers should be able to see how old the latest report is.

### Status report structure

Each report contains:

- Project
- Week
- Overall progress in 10% steps
- Fixed status dimensions with traffic-light rating and comment

Suggested MVP dimensions:

- Objective
- Timeline
- Budget
- Scope
- Risks / Issues

### Lifecycle

- Draft while being prepared
- Submitted when finalized
- Locked after submission

After submission, comments remain possible.

### Comments

Comments on status reports should be historized and remain open after report submission.

This supports:

- collaboration during creation
- PM feedback
- post-submission context or clarifications

### Recommended report dimensions

Unless later changed, the initial fixed dimensions should be:

- Objective
- Timeline
- Budget
- Scope
- Risks / Issues

These cover the classic executive project-health lens with low UX complexity.

## Financial overview

Financial logic in MVP is reporting-oriented, not invoicing-oriented.

### Rates

Each project position should hold a billable rate.

The entered rate may be:

- hourly
- daily
- weekly

Internally, the system should normalize to hourly logic.

### Financial views

Project leads and portfolio managers should be able to see:

- planned hours and planned cost across project duration
- actual hours and actual cost
- override/billable hours and override/billable cost

These views should support weekly logic first, with aggregation for monthly and overall project summaries later.

### Budget modeling assumption

For MVP, project budget should be stored in two complementary ways:

- project-level financial record for declared budget and budget notes
- derived staffing cost view from project positions and planned hours

This allows a PL/PM to compare:

- declared project budget
- planned staffing cost
- actual staffing cost
- billing-override cost

## Role-based dashboards

### Employee view

- Active and upcoming staffing assignments
- Own weekly time tracking status
- Own submitted and open weeks

### Project lead view

- Open and unfilled project positions
- Capacity conflicts in project staffing
- Missing weekly submissions from staffed employees
- Current project status and historical status reports
- Project plan vs actual capacity and cost view

### Portfolio manager view

- Cross-project status overview
- Latest report age / missing reports
- Plan vs actual at portfolio/project level
- Staffing conflicts and unfilled positions overview

## Core workflows

### 1. Project setup workflow

1. Portfolio manager creates a project within a portfolio.
2. Customer, client unit, charter, budget, and key dates are entered.
3. Internal project lead is assigned.
4. Initial project positions are defined with grades, skill requirements, rates, and planned weekly allocations.

### 2. Staffing workflow

1. Project lead reviews open project positions.
2. Candidate employees are searched and compared with skill/capacity hints.
3. One or more assignments are created against the position over time.
4. The system warns about over-allocation but does not block assignment.

### 3. Weekly time tracking workflow

1. Employee opens the active week.
2. The app lists active project assignments for that week.
3. Employee records project hours and descriptions.
4. Employee fills the remaining capacity with internal time accounts as needed.
5. The system validates full weekly allocation.
6. Employee submits the week.

### 4. Project lead weekly review workflow

1. Project lead opens a project staffing/time overview.
2. The app shows which staffed employees have submitted the week.
3. The app flags missing submissions and capacity conflicts.
4. Project lead optionally sets billing overrides on project time entries.

### 5. Status reporting workflow

1. Project lead creates or updates the draft report for a week.
2. The report captures fixed dimension ratings, comments, and overall progress.
3. Project lead submits the report.
4. After submission, the report becomes immutable, while comments remain open.

### 6. Portfolio monitoring workflow

1. Portfolio manager reviews portfolio/project status summaries.
2. The app highlights stale or missing status reports.
3. The app shows unfilled positions, over-allocations, and plan-vs-actual trends.
4. PM drills into projects, employees, or financial views as needed.

## MVP scope

The current MVP should include:

- Authentication and role-based access
- Portfolio and project structure
- Customer and client-side contact structure
- Project charter
- Project positions
- Employee assignments to positions
- Capacity warning logic
- Employee profiles with skills, certifications, location, business unit, and grade
- Historized employment percentage
- Weekly time tracking on assignments
- Internal time accounts
- Weekly submission with completeness check
- Status reports per project/week with comments
- Plan vs actual hours and cost reporting
- Billable rate on project positions

## Technical architecture direction

### Frontend

Recommended direction:

- Next.js App Router
- TypeScript
- Server Components where useful for data-heavy views
- Client Components for interactive planning/time-entry surfaces
- A component system that can support dense business UI without fighting the framework

### UI density principle

- Prefer compact, list-like business UI over large, airy cards when the user is scanning or maintaining multiple records.
- Default to dense rows with strong hierarchy, short supporting metadata, and clear actions.
- Use larger card treatments only when the content is genuinely richer and needs more visual separation.
- Avoid oversized tiles that show little information; operational setup screens should feel efficient and information-dense.

### Backend

Recommended direction:

- Supabase Postgres as primary database
- Supabase Auth for authentication
- Supabase Row Level Security for authorization
- SQL migrations as source of truth for schema
- Supabase Storage only if later needed for attachments

### Deployment

Recommended direction:

- Vercel for deployment
- Separate environments for local/dev and production at minimum
- Environment variables for Supabase URL, anon key, and service-role operations where needed

### Application layers

Recommended logical split:

- `auth`: sign-in, session handling, profile bootstrap
- `people`: employee profiles, grades, skills, certifications, capacity history
- `planning`: portfolios, projects, positions, assignments
- `time`: weekly timesheets, project entries, internal time entries, submission
- `status`: weekly project status reports and comments
- `reporting`: capacity, financial plan-vs-actual, stale reporting, conflicts

### Suggested data design principles

- Use UUID primary keys.
- Store week-based facts with explicit week start dates.
- Prefer append/history tables for time-bound data such as capacity history and assignments.
- Keep denormalized summary fields minimal and derived where possible.
- Treat rates, budgets, and overrides as auditable business data.

### Suggested UI design principles

- Prefer vertically compact layouts so primary workspaces stay visible within a single viewport whenever possible.
- Use horizontal space actively before adding vertical stacking, especially for overview rows, summaries, status signals, and workspace navigation.
- Separate compact scan views from detailed edit views so overview pages remain fast to read and detail pages can still support full editing.
- Keep cards and rows information-dense but calm: short labels, strong hierarchy, clear actions, and minimal decorative height.

## Suggested Supabase schema outline

### Identity and access

- `profiles`
- `access_assignments`

### People

- `professional_grades`
- `employee_profiles`
- `employment_capacity_history`
- `skill_categories`
- `skills`
- `employee_skills`
- `certifications`
- `employee_certifications`

### Organization and customers

- `portfolios`
- `customers`
- `client_units`
- `client_contacts`

### Projects and planning

- `projects`
- `project_charters`
- `project_financials`
- `project_positions`
- `project_position_weeks`
- `project_position_skill_requirements`
- `project_assignments`

### Time and billing

- `internal_time_account_types`
- `weekly_timesheets`
- `time_entries`
- `billing_overrides`

### Status and reporting

- `status_reports`
- `status_report_comments`

## First implementation slices

Recommended build order:

1. Project bootstrap with Next.js, Supabase client setup, auth shell, and basic layout.
2. Core schema and RLS for profiles, portfolios/projects, and access assignments.
3. Employee directory and employee profile management.
4. Project creation and charter management.
5. Position planning and assignment workflow with capacity warnings.
6. Weekly timesheet flow with internal time accounts and submission.
7. Project lead review screens and billing overrides.
8. Weekly status reports and comments.
9. Portfolio/project reporting dashboards.

## Assumptions locked for now

- Portfolio manager is the effective admin role.
- Project leads only see explicitly assigned projects, unless they have portfolio-level access.
- Portfolio responsibility cascades down to contained projects.
- Employees can see all employee profiles and current project assignments.
- Non-lead staffed users only see their own project-specific data.
- Weekly submission is employee-wide.
- Planning is position-based and fulfillment is assignment-based.
- Hours are the base unit for planning, actuals, and financial reporting.
- Capacity and skill checks are warnings, not blockers.
- Financial output is reporting-oriented, not invoice-generating.

## Explicit simplifications for MVP

- No approval workflow for time entries
- No automatic holiday calendar
- No vacation-day engine
- No hard staffing blockers
- No hard skill enforcement
- No invoice generation
- No detailed work-package structure in status reporting
- No advanced org restrictions by location or business unit

## Likely later-phase features

- Formal approval workflows
- Invoice generation or export
- Advanced staffing recommendation engine
- Country-specific holiday calendars
- Rich notification system
- More advanced monthly financial modeling
- Stronger audit trails on all changes

## Initial data model candidates

Likely top-level entities for implementation:

- users
- employee_profiles
- employment_capacity_history
- portfolios
- customers
- client_units
- client_contacts
- projects
- project_charters
- project_financials
- project_positions
- project_position_skill_requirements
- project_assignments
- skills
- skill_categories
- employee_skills
- certifications
- employee_certifications
- internal_time_account_types
- weekly_timesheets
- time_entries
- status_reports
- status_report_comments

Potential supporting entities:

- project_memberships
- access_assignments
- rate_units
- billing_overrides

## Open design questions

The following should be clarified in the next design iteration:

- Final naming for system roles vs professional grades
- How portfolio-level responsibility is assigned in detail
- Whether time entries belong directly to assignment or weekly timesheet + assignment
- How monthly reporting should be presented in MVP
- Which parts of customer data are required at launch
- Whether self-service editing is allowed for any employee profile fields in MVP
- How detailed comment permissions should be on status reports
- Whether project positions can be split across multiple parallel assignees in MVP UI
