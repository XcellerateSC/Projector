"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Flag,
  MapPin,
  Plus,
  Save,
  Search,
  Target,
  UserRound
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient, type Profile } from "@/lib/supabase/client";

type ProjectHealth = "green" | "amber" | "red";
type ProjectTab = "overview" | "charter" | "staffing" | "timesheets";
type PositionStatus = "open" | "partially_staffed" | "staffed";

type Portfolio = { id: string; name: string };
type Customer = { id: string; name: string };
type ProjectRecord = {
  id: string;
  portfolio_id: string;
  customer_id: string;
  name: string;
  project_lead_id: string | null;
  health: ProjectHealth;
  start_date: string;
  end_date: string;
  location: string | null;
};
type Charter = {
  project_id: string;
  objective: string;
  scope: string;
  budget_note: string;
  milestones: Array<{ label: string; date: string; state: string }>;
};
type Position = {
  id: string;
  project_id: string;
  title: string;
  professional_grade: string;
  start_date: string;
  end_date: string;
  planned_allocation_percent: number;
  status: PositionStatus;
  required_skills: string[];
};
type Assignment = {
  id: string;
  project_position_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  allocation_percent: number;
};
type WeeklyTimesheet = {
  id: string;
  employee_id: string;
  week_start_date: string;
  target_hours: number;
  status: "open" | "submitted";
  submitted_at: string | null;
};
type TimeEntry = {
  id: string;
  weekly_timesheet_id: string;
  entry_type: "project" | "internal";
  project_assignment_id: string | null;
  internal_time_account_type_id: string | null;
  hours: number;
  description: string;
};
type ProjectTimesheetRow = {
  id: string;
  weekStartDate: string;
  weekLabel: string;
  role: string;
  employee: string;
  plannedHours: number;
  bookedHours: number;
  status: "missing" | "open" | "submitted";
  note: string;
};

const healthClass: Record<ProjectHealth, string> = {
  green: "success",
  amber: "warning",
  red: "error"
};

const tabs: Array<{ id: ProjectTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "charter", label: "Charter" },
  { id: "staffing", label: "Staffing" },
  { id: "timesheets", label: "Timesheets" }
];

const availableTimesheetYears = [2025, 2026, 2027];

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function monthLabel(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric"
  });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getIsoWeekStart(year: number, weekNumber: number) {
  const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
  const day = fourthOfJanuary.getUTCDay() || 7;
  const firstMonday = new Date(fourthOfJanuary);
  firstMonday.setUTCDate(fourthOfJanuary.getUTCDate() - day + 1);
  firstMonday.setUTCDate(firstMonday.getUTCDate() + (weekNumber - 1) * 7);
  return firstMonday;
}

function createProjectWeeks(year: number, project: ProjectRecord | undefined) {
  if (!project) {
    return [];
  }

  return Array.from({ length: 53 }, (_, index) => {
    const weekNumber = index + 1;
    const start = getIsoWeekStart(year, weekNumber);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 6);

    return {
      startDate: toDateKey(start),
      endDate: toDateKey(end),
      label: `KW ${String(weekNumber).padStart(2, "0")}`
    };
  }).filter((week) => week.endDate >= project.start_date && week.startDate <= project.end_date);
}

function isAssignmentActiveInWeek(assignment: Assignment, weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return assignment.start_date <= toDateKey(end) && assignment.end_date >= weekStartDate;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [charters, setCharters] = useState<Charter[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [weeklyTimesheets, setWeeklyTimesheets] = useState<WeeklyTimesheet[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [selectedTimesheetYear, setSelectedTimesheetYear] = useState(2026);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [charterDraft, setCharterDraft] = useState({
    objective: "",
    scope: "",
    budget_note: ""
  });

  async function loadProjects() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Supabase ist noch nicht konfiguriert.");
      setIsLoading(false);
      return;
    }

    const [
      portfoliosResult,
      customersResult,
      profilesResult,
      projectsResult,
      chartersResult,
      positionsResult,
      assignmentsResult,
      weeklyTimesheetsResult,
      timeEntriesResult
    ] = await Promise.all([
      supabase.from("portfolios").select("id,name").order("name"),
      supabase.from("customers").select("id,name").order("name"),
      supabase
        .from("profiles")
        .select("id,email,full_name,system_role,professional_grade,business_unit,location,is_active")
        .order("full_name"),
      supabase.from("projects").select("*").order("name"),
      supabase.from("project_charters").select("*"),
      supabase.from("project_positions").select("*").order("title"),
      supabase.from("project_assignments").select("*").order("start_date"),
      supabase.from("weekly_timesheets").select("*"),
      supabase.from("time_entries").select("*").eq("entry_type", "project")
    ]);

    const firstError =
      portfoliosResult.error ??
      customersResult.error ??
      profilesResult.error ??
      projectsResult.error ??
      chartersResult.error ??
      positionsResult.error ??
      assignmentsResult.error ??
      weeklyTimesheetsResult.error ??
      timeEntriesResult.error;

    if (firstError) {
      setMessage(firstError.message);
      setIsLoading(false);
      return;
    }

    const nextProjects = (projectsResult.data ?? []) as ProjectRecord[];
    setPortfolios((portfoliosResult.data ?? []) as Portfolio[]);
    setCustomers((customersResult.data ?? []) as Customer[]);
    setProfiles((profilesResult.data ?? []) as Profile[]);
    setProjects(nextProjects);
    setCharters((chartersResult.data ?? []) as Charter[]);
    setPositions((positionsResult.data ?? []) as Position[]);
    setAssignments((assignmentsResult.data ?? []) as Assignment[]);
    setWeeklyTimesheets((weeklyTimesheetsResult.data ?? []) as WeeklyTimesheet[]);
    setTimeEntries((timeEntriesResult.data ?? []) as TimeEntry[]);
    setSelectedProjectId((current) => current ?? nextProjects[0]?.id ?? null);
    setIsLoading(false);
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedCharter = charters.find(
    (charter) => charter.project_id === selectedProject?.id
  );
  const selectedPositions = positions.filter(
    (position) => position.project_id === selectedProject?.id
  );
  const selectedPortfolio = portfolios.find(
    (portfolio) => portfolio.id === selectedProject?.portfolio_id
  );
  const selectedCustomer = customers.find(
    (customer) => customer.id === selectedProject?.customer_id
  );
  const selectedLead = profiles.find(
    (profile) => profile.id === selectedProject?.project_lead_id
  );
  const projectTimesheetRows = useMemo<ProjectTimesheetRow[]>(() => {
    const weeks = createProjectWeeks(selectedTimesheetYear, selectedProject);
    const projectPositionIds = new Set(selectedPositions.map((position) => position.id));
    const projectAssignments = assignments.filter((assignment) =>
      projectPositionIds.has(assignment.project_position_id)
    );

    return weeks
      .flatMap((week) =>
        projectAssignments
          .filter((assignment) => isAssignmentActiveInWeek(assignment, week.startDate))
          .map((assignment) => {
            const position = selectedPositions.find(
              (item) => item.id === assignment.project_position_id
            );
            const employee = profiles.find((profile) => profile.id === assignment.employee_id);
            const timesheet = weeklyTimesheets.find(
              (item) =>
                item.employee_id === assignment.employee_id &&
                item.week_start_date === week.startDate
            );
            const entry = timeEntries.find(
              (item) =>
                item.weekly_timesheet_id === timesheet?.id &&
                item.project_assignment_id === assignment.id
            );
            const bookedHours = Number(entry?.hours ?? 0);
            const status: ProjectTimesheetRow["status"] =
              bookedHours <= 0
                ? "missing"
                : timesheet?.status === "submitted"
                  ? "submitted"
                  : "open";

            return {
              id: `${week.startDate}-${assignment.id}`,
              weekStartDate: week.startDate,
              weekLabel: week.label,
              role: position?.title ?? "Project role",
              employee: employee?.full_name ?? employee?.email ?? "Unknown",
              plannedHours: Math.round((Number(assignment.allocation_percent) / 100) * 40),
              bookedHours,
              status,
              note: entry?.description ?? ""
            };
          })
      )
      .sort((a, b) => b.weekStartDate.localeCompare(a.weekStartDate) || a.role.localeCompare(b.role));
  }, [
    assignments,
    profiles,
    selectedPositions,
    selectedProject,
    selectedTimesheetYear,
    timeEntries,
    weeklyTimesheets
  ]);
  const projectTimesheetStats = useMemo(() => {
    const missing = projectTimesheetRows.filter((row) => row.status === "missing").length;
    const open = projectTimesheetRows.filter((row) => row.status === "open").length;
    const submitted = projectTimesheetRows.filter((row) => row.status === "submitted").length;
    const booked = projectTimesheetRows.reduce((sum, row) => sum + row.bookedHours, 0);

    return { missing, open, submitted, booked };
  }, [projectTimesheetRows]);
  const projectTimesheetGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        weekStartDate: string;
        weekLabel: string;
        rows: ProjectTimesheetRow[];
        plannedHours: number;
        bookedHours: number;
      }
    >();

    projectTimesheetRows.forEach((row) => {
      const group = groups.get(row.weekStartDate) ?? {
        weekStartDate: row.weekStartDate,
        weekLabel: row.weekLabel,
        rows: [],
        plannedHours: 0,
        bookedHours: 0
      };

      group.rows.push(row);
      group.plannedHours += row.plannedHours;
      group.bookedHours += row.bookedHours;
      groups.set(row.weekStartDate, group);
    });

    return Array.from(groups.values()).sort((a, b) =>
      b.weekStartDate.localeCompare(a.weekStartDate)
    );
  }, [projectTimesheetRows]);

  useEffect(() => {
    setCharterDraft({
      objective: selectedCharter?.objective ?? "",
      scope: selectedCharter?.scope ?? "",
      budget_note: selectedCharter?.budget_note ?? ""
    });
  }, [selectedCharter?.project_id, selectedCharter?.objective, selectedCharter?.scope, selectedCharter?.budget_note]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) => {
      const customer = customers.find((item) => item.id === project.customer_id);
      const portfolio = portfolios.find((item) => item.id === project.portfolio_id);
      const lead = profiles.find((item) => item.id === project.project_lead_id);

      return [project.name, customer?.name, portfolio?.name, lead?.full_name]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [customers, portfolios, profiles, projects, query]);

  async function saveCharter() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !selectedProject) {
      return;
    }

    const { error } = await supabase.from("project_charters").upsert({
      project_id: selectedProject.id,
      ...charterDraft,
      milestones: selectedCharter?.milestones ?? []
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadProjects();
  }

  async function addPosition() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !selectedProject) {
      return;
    }

    const title = window.prompt("Position title", "Business Analyst");
    if (!title) {
      return;
    }

    const grade = window.prompt("Professional grade", "Senior Consultant") ?? "Consultant";
    const startDate = window.prompt("Start date (YYYY-MM-DD)", selectedProject.start_date);
    const endDate = window.prompt("End date (YYYY-MM-DD)", selectedProject.end_date);
    const planned = Number(window.prompt("Planned allocation %", "50") ?? "50");
    const skills = window.prompt("Required skills, comma separated", "Analysis, PMO") ?? "";

    if (!startDate || !endDate) {
      return;
    }

    const { error } = await supabase.from("project_positions").insert({
      project_id: selectedProject.id,
      title,
      professional_grade: grade,
      start_date: startDate,
      end_date: endDate,
      planned_allocation_percent: Number.isNaN(planned) ? 50 : planned,
      status: "open",
      required_skills: skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean)
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadProjects();
  }

  async function addAssignment(position: Position) {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const employeeEmail = window.prompt(
      "Employee email",
      profiles.find((profile) => profile.system_role === "employee")?.email ?? ""
    );
    const employee = profiles.find((profile) => profile.email === employeeEmail);

    if (!employee) {
      setMessage("Employee not found in profiles.");
      return;
    }

    const startDate = window.prompt("Assignment start date (YYYY-MM-DD)", position.start_date);
    const endDate = window.prompt("Assignment end date (YYYY-MM-DD)", position.end_date);
    const allocation = Number(window.prompt("Allocation %", "50") ?? "50");

    if (!startDate || !endDate) {
      return;
    }

    const { error } = await supabase.from("project_assignments").insert({
      project_position_id: position.id,
      employee_id: employee.id,
      start_date: startDate,
      end_date: endDate,
      allocation_percent: Number.isNaN(allocation) ? 50 : allocation
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const positionAssignments = assignments.filter(
      (assignment) => assignment.project_position_id === position.id
    );
    const assignedPercent =
      positionAssignments.reduce((sum, assignment) => sum + assignment.allocation_percent, 0) +
      (Number.isNaN(allocation) ? 50 : allocation);

    await supabase
      .from("project_positions")
      .update({
        status:
          assignedPercent >= position.planned_allocation_percent
            ? "staffed"
            : "partially_staffed"
      })
      .eq("id", position.id);

    await loadProjects();
  }

  if (isLoading) {
    return (
      <AppShell title="Projects">
        <main className="dashboard-loading">
          <div className="loading-card">Projects werden geladen...</div>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell title="Projects">
      <div className="dashboard-workspace">
        <aside className="dashboard-master projects-master">
          <div className="master-header">
            <span>Project workspace</span>
            <strong>{filteredProjects.length} projects</strong>
          </div>

          <div className="people-search">
            <Search size={14} />
            <input
              aria-label="Search projects"
              placeholder="Search project, customer, portfolio"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="master-list">
            {filteredProjects.map((project) => {
              const customer = customers.find((item) => item.id === project.customer_id);
              const portfolio = portfolios.find((item) => item.id === project.portfolio_id);

              return (
                <button
                  className={
                    project.id === selectedProject?.id
                      ? "project-row active"
                      : "project-row"
                  }
                  key={project.id}
                  type="button"
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    setActiveTab("overview");
                  }}
                >
                  <div>
                    <strong>{project.name}</strong>
                    <span>{customer?.name ?? "Unknown customer"}</span>
                    <small>{portfolio?.name ?? "Unknown portfolio"}</small>
                  </div>
                  <i className={healthClass[project.health]} />
                </button>
              );
            })}
          </div>
        </aside>

        {selectedProject ? (
          <section className="dashboard-detail">
            <div className="detail-header project-detail-header">
              <div className="people-title">
                <div className="people-title-icon">
                  <BriefcaseBusiness size={20} />
                </div>
                <div>
                  <p className="section-kicker">{selectedCustomer?.name}</p>
                  <h2>{selectedProject.name}</h2>
                </div>
              </div>
              <span className={`people-status ${healthClass[selectedProject.health]}`}>
                {selectedProject.health}
              </span>
            </div>

            <div className="project-tabs" role="tablist" aria-label="Project sections">
              {tabs.map((tab) => (
                <button
                  className={activeTab === tab.id ? "project-tab active" : "project-tab"}
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="detail-scroll">
              <div className="detail-content project-detail-content">
                {message ? <p className="form-error">{message}</p> : null}

                {activeTab === "overview" ? (
                  <>
                    <div className="summary-grid">
                      <div className="summary-card">
                        <span>Portfolio</span>
                        <strong>{selectedPortfolio?.name ?? "-"}</strong>
                      </div>
                      <div className="summary-card">
                        <span>Project lead</span>
                        <strong>{selectedLead?.full_name ?? "-"}</strong>
                      </div>
                      <div className="summary-card">
                        <span>Timeline</span>
                        <strong>
                          {monthLabel(selectedProject.start_date)} -{" "}
                          {monthLabel(selectedProject.end_date)}
                        </strong>
                      </div>
                      <div className="summary-card">
                        <span>Open positions</span>
                        <strong>
                          {
                            selectedPositions.filter(
                              (position) => position.status !== "staffed"
                            ).length
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="project-overview-grid">
                      <div className="content-panel">
                        <div className="panel-header compact">
                          <div>
                            <p className="section-kicker">Objective</p>
                            <h3>Project purpose</h3>
                          </div>
                        </div>
                        <p className="panel-copy">{selectedCharter?.objective}</p>
                      </div>

                      <div className="content-panel project-facts-panel">
                        <div className="project-fact">
                          <Building2 size={15} />
                          <span>{selectedCustomer?.name}</span>
                        </div>
                        <div className="project-fact">
                          <UserRound size={15} />
                          <span>{selectedLead?.full_name}</span>
                        </div>
                        <div className="project-fact">
                          <MapPin size={15} />
                          <span>{selectedProject.location}</span>
                        </div>
                        <div className="project-fact">
                          <CalendarDays size={15} />
                          <span>
                            {formatDate(selectedProject.start_date)} -{" "}
                            {formatDate(selectedProject.end_date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="content-panel">
                      <div className="panel-header compact">
                        <div>
                          <p className="section-kicker">Milestones</p>
                          <h3>Delivery path</h3>
                        </div>
                      </div>
                      <div className="milestone-list">
                        {(selectedCharter?.milestones ?? []).map((milestone) => (
                          <div className="milestone-row" key={milestone.label}>
                            <Flag size={14} />
                            <div>
                              <strong>{milestone.label}</strong>
                              <span>{formatDate(milestone.date)}</span>
                            </div>
                            <i>{milestone.state}</i>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                {activeTab === "charter" ? (
                  <>
                    <div className="content-panel">
                      <div className="panel-header compact">
                        <div>
                          <p className="section-kicker">Charter</p>
                          <h3>Objective and scope</h3>
                        </div>
                        <button className="subtle-action" type="button" onClick={saveCharter}>
                          <Save size={14} />
                          Save charter
                        </button>
                      </div>

                      <div className="charter-edit-grid">
                        <label>
                          <Target size={15} />
                          <span>Objective</span>
                          <textarea
                            value={charterDraft.objective}
                            onChange={(event) =>
                              setCharterDraft((draft) => ({
                                ...draft,
                                objective: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label>
                          <ClipboardList size={15} />
                          <span>Scope</span>
                          <textarea
                            value={charterDraft.scope}
                            onChange={(event) =>
                              setCharterDraft((draft) => ({
                                ...draft,
                                scope: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label>
                          <FileText size={15} />
                          <span>Budget note</span>
                          <textarea
                            value={charterDraft.budget_note}
                            onChange={(event) =>
                              setCharterDraft((draft) => ({
                                ...draft,
                                budget_note: event.target.value
                              }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}

                {activeTab === "staffing" ? (
                  <>
                    <div className="content-panel">
                      <div className="panel-header compact">
                        <div>
                          <p className="section-kicker">Positions and staffing</p>
                          <h3>Planned demand and assigned people</h3>
                        </div>
                        <button className="subtle-action" type="button" onClick={addPosition}>
                          <Plus size={14} />
                          Add position
                        </button>
                      </div>

                      <div className="staffing-table">
                        <div className="staffing-table-head">
                          <span>Position</span>
                          <span>Period</span>
                          <span>Plan</span>
                          <span>Assignments</span>
                          <span>Status</span>
                        </div>
                        {selectedPositions.map((position) => {
                          const positionAssignments = assignments.filter(
                            (assignment) => assignment.project_position_id === position.id
                          );
                          const assigned = positionAssignments.reduce(
                            (sum, assignment) => sum + assignment.allocation_percent,
                            0
                          );

                          return (
                            <div className="staffing-row" key={position.id}>
                              <div className="staffing-position">
                                <strong>{position.title}</strong>
                                <span>{position.professional_grade}</span>
                                <div className="staffing-skillline">
                                  {position.required_skills.map((skill) => (
                                    <small key={skill}>{skill}</small>
                                  ))}
                                </div>
                              </div>

                              <div className="staffing-period">
                                <span>{formatDate(position.start_date)}</span>
                                <span>{formatDate(position.end_date)}</span>
                              </div>

                              <div className="staffing-plan">
                                <span>{position.planned_allocation_percent}%</span>
                                <span>{assigned}%</span>
                              </div>

                              <div className="staffing-assignments">
                                {positionAssignments.length > 0 ? (
                                  positionAssignments.map((assignment) => {
                                    const employee = profiles.find(
                                      (profile) => profile.id === assignment.employee_id
                                    );

                                    return (
                                      <div
                                        className="staffing-assignment"
                                        key={assignment.id}
                                      >
                                        <strong>{employee?.full_name ?? "Unknown"}</strong>
                                        <span>
                                          {formatDate(assignment.start_date)} -{" "}
                                          {formatDate(assignment.end_date)}
                                        </span>
                                        <i>{assignment.allocation_percent}%</i>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="staffing-warning">
                                    <AlertTriangle size={15} />
                                    <span>No employee assigned yet</span>
                                  </div>
                                )}
                                <button
                                  className="assignment-add-button"
                                  type="button"
                                  onClick={() => addAssignment(position)}
                                >
                                  <Plus size={13} />
                                  Add assignment
                                </button>
                              </div>

                              <div className="staffing-state">
                                <i>{position.status.replace("_", " ")}</i>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="content-panel people-note-panel">
                      <CheckCircle2 size={16} />
                      <p>
                        Positions define planned demand. Assignments show who fills
                        that demand over time. The data now persists in Supabase.
                      </p>
                    </div>
                  </>
                ) : null}

                {activeTab === "timesheets" ? (
                  <>
                    <div className="summary-grid timesheet-review-summary">
                      <div className="summary-card">
                        <span>Booked project time</span>
                        <strong>{projectTimesheetStats.booked}h</strong>
                      </div>
                      <div className="summary-card">
                        <span>Submitted rows</span>
                        <strong>{projectTimesheetStats.submitted}</strong>
                      </div>
                      <div className="summary-card">
                        <span>Open rows</span>
                        <strong>{projectTimesheetStats.open}</strong>
                      </div>
                      <div className="summary-card">
                        <span>Missing rows</span>
                        <strong>{projectTimesheetStats.missing}</strong>
                      </div>
                    </div>

                    <div className="content-panel">
                      <div className="panel-header compact">
                        <div>
                          <p className="section-kicker">Project timesheet review</p>
                          <h3>Role and weekly submissions</h3>
                        </div>
                        <label className="year-select timesheet-review-year">
                          <span>Year</span>
                          <select
                            value={selectedTimesheetYear}
                            onChange={(event) =>
                              setSelectedTimesheetYear(Number(event.target.value))
                            }
                          >
                            {availableTimesheetYears.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="timesheet-review-table">
                        <div className="timesheet-review-head">
                          <span>Project role</span>
                          <span>Employee</span>
                          <span>Planned</span>
                          <span>Booked</span>
                          <span>Status</span>
                          <span>Note</span>
                        </div>

                        {projectTimesheetGroups.length > 0 ? (
                          projectTimesheetGroups.map((group) => (
                            <div className="timesheet-review-group" key={group.weekStartDate}>
                              <div className="timesheet-review-week">
                                <div>
                                  <strong>{group.weekLabel}</strong>
                                  <span>{formatDate(group.weekStartDate)}</span>
                                </div>
                                <div>
                                  <span>{group.rows.length} roles</span>
                                  <strong>
                                    {group.bookedHours}h / {group.plannedHours}h
                                  </strong>
                                </div>
                              </div>

                              {group.rows.map((row) => (
                                <div className="timesheet-review-row" key={row.id}>
                                  <div className="review-role">
                                    <strong>{row.role}</strong>
                                  </div>
                                  <div className="review-employee">{row.employee}</div>
                                  <div className="review-number">{row.plannedHours}h</div>
                                  <div className="review-number">{row.bookedHours}h</div>
                                  <div className="review-status">
                                    <i className={row.status}>{row.status}</i>
                                  </div>
                                  <div className="review-note">{row.note || "-"}</div>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="timesheet-review-empty">
                            No assignments for the selected year.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="content-panel people-note-panel">
                      <CheckCircle2 size={16} />
                      <p>
                        This view shows project time only. Internal accounts stay
                        private to the employee and portfolio-level controls.
                      </p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <section className="dashboard-detail">
            <div className="detail-scroll">
              <div className="loading-card">No projects available.</div>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
