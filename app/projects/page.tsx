"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
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
  Pencil,
  Plus,
  Save,
  Search,
  Target,
  UserRound,
  X
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
type PositionDraft = {
  title: string;
  professionalGrade: string;
  startDate: string;
  endDate: string;
  plannedAllocationPercent: string;
  requiredSkills: string;
};
type AssignmentDraft = {
  employeeId: string;
  startDate: string;
  endDate: string;
  allocationPercent: string;
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

const emptyPositionDraft: PositionDraft = {
  title: "",
  professionalGrade: "Consultant",
  startDate: "",
  endDate: "",
  plannedAllocationPercent: "50",
  requiredSkills: ""
};

const emptyAssignmentDraft: AssignmentDraft = {
  employeeId: "",
  startDate: "",
  endDate: "",
  allocationPercent: "50"
};

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

  const todayKey = toDateKey(new Date());

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
  }).filter(
    (week) =>
      week.endDate >= project.start_date &&
      week.startDate <= project.end_date &&
      week.startDate <= todayKey
  );
}

function isAssignmentActiveInWeek(assignment: Assignment, weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return assignment.start_date <= toDateKey(end) && assignment.end_date >= weekStartDate;
}

function rangesOverlap(
  firstStartDate: string,
  firstEndDate: string,
  secondStartDate: string,
  secondEndDate: string
) {
  return firstStartDate <= secondEndDate && secondStartDate <= firstEndDate;
}

function normalizePercent(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function getStaffingStatus(assignedPercent: number, plannedPercent: number): PositionStatus {
  if (assignedPercent <= 0) {
    return "open";
  }

  return assignedPercent >= plannedPercent ? "staffed" : "partially_staffed";
}

function isRunningStaffingPeriod(startDate: string, endDate: string, todayKey: string) {
  return startDate <= todayKey && endDate >= todayKey;
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
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [assignmentModalPositionId, setAssignmentModalPositionId] = useState<string | null>(null);
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [positionDraft, setPositionDraft] = useState<PositionDraft>(emptyPositionDraft);
  const [assignmentDraft, setAssignmentDraft] = useState<AssignmentDraft>(emptyAssignmentDraft);
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
  const activeProfiles = profiles.filter((profile) => profile.is_active);
  const todayKey = toDateKey(new Date());
  const selectedAssignmentPosition = selectedPositions.find(
    (position) => position.id === assignmentModalPositionId
  );
  const editingPosition = selectedPositions.find((position) => position.id === editingPositionId);
  const editingAssignment = assignments.find((assignment) => assignment.id === editingAssignmentId);
  const isEditingRunningPosition = editingPosition
    ? isRunningStaffingPeriod(editingPosition.start_date, editingPosition.end_date, todayKey)
    : false;
  const isEditingRunningAssignment = editingAssignment
    ? isRunningStaffingPeriod(editingAssignment.start_date, editingAssignment.end_date, todayKey)
    : false;
  const assignmentEmployee = activeProfiles.find(
    (profile) => profile.id === assignmentDraft.employeeId
  );
  const assignmentAllocation = normalizePercent(assignmentDraft.allocationPercent, 0);
  const overlappingAssignmentTotal =
    assignmentEmployee && assignmentDraft.startDate && assignmentDraft.endDate
      ? assignments
          .filter(
            (assignment) =>
              assignment.id !== editingAssignmentId &&
              assignment.employee_id === assignmentEmployee.id &&
              rangesOverlap(
                assignment.start_date,
                assignment.end_date,
                assignmentDraft.startDate,
                assignmentDraft.endDate
              )
          )
          .reduce((sum, assignment) => sum + Number(assignment.allocation_percent), 0)
      : 0;
  const projectedEmployeeAllocation = overlappingAssignmentTotal + assignmentAllocation;
  const shouldShowAllocationWarning =
    Boolean(assignmentEmployee && assignmentDraft.startDate && assignmentDraft.endDate) &&
    projectedEmployeeAllocation > 100;
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

  function openPositionModal() {
    if (!selectedProject) {
      return;
    }

    setMessage(null);
    setEditingPositionId(null);
    setPositionDraft({
      ...emptyPositionDraft,
      startDate: selectedProject.start_date,
      endDate: selectedProject.end_date
    });
    setIsPositionModalOpen(true);
  }

  function openEditPositionModal(position: Position) {
    if (position.end_date < todayKey) {
      setMessage("Past positions are locked for reporting integrity.");
      return;
    }

    setMessage(null);
    setEditingPositionId(position.id);
    setPositionDraft({
      title: position.title,
      professionalGrade: position.professional_grade,
      startDate: position.start_date,
      endDate: position.end_date,
      plannedAllocationPercent: String(position.planned_allocation_percent),
      requiredSkills: position.required_skills.join(", ")
    });
    setIsPositionModalOpen(true);
  }

  function openAssignmentModal(position: Position) {
    if (position.end_date < todayKey) {
      setMessage("Past positions are locked for reporting integrity.");
      return;
    }

    setMessage(null);
    setEditingAssignmentId(null);
    setAssignmentDraft({
      employeeId: activeProfiles[0]?.id ?? "",
      startDate: position.start_date,
      endDate: position.end_date,
      allocationPercent: String(position.planned_allocation_percent)
    });
    setAssignmentModalPositionId(position.id);
  }

  function openEditAssignmentModal(assignment: Assignment) {
    if (assignment.end_date < todayKey) {
      setMessage("Past assignments are locked for reporting integrity.");
      return;
    }

    const position = positions.find((item) => item.id === assignment.project_position_id);

    setMessage(null);
    setEditingAssignmentId(assignment.id);
    setAssignmentDraft({
      employeeId: assignment.employee_id,
      startDate: assignment.start_date,
      endDate: assignment.end_date,
      allocationPercent: String(assignment.allocation_percent)
    });
    setAssignmentModalPositionId(position?.id ?? assignment.project_position_id);
  }

  function closeStaffingModal() {
    setIsPositionModalOpen(false);
    setAssignmentModalPositionId(null);
    setEditingPositionId(null);
    setEditingAssignmentId(null);
  }

  async function submitPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !selectedProject) {
      return;
    }

    const title = positionDraft.title.trim();
    const planned = normalizePercent(positionDraft.plannedAllocationPercent, 50);

    if (!title || !positionDraft.startDate || !positionDraft.endDate) {
      setMessage("Please fill title, start date and end date.");
      return;
    }

    if (positionDraft.endDate < positionDraft.startDate) {
      setMessage("End date must be on or after the start date.");
      return;
    }

    if (editingPosition && editingPosition.end_date < todayKey) {
      setMessage("Past positions are locked for reporting integrity.");
      return;
    }

    if (isEditingRunningPosition && positionDraft.startDate !== editingPosition?.start_date) {
      setMessage("Running positions keep their original start date.");
      return;
    }

    if (isEditingRunningPosition && positionDraft.endDate < todayKey) {
      setMessage("Running positions can only be changed for today or future dates.");
      return;
    }

    const requiredSkills = positionDraft.requiredSkills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    if (editingPosition) {
      const assignedPercent = assignments
        .filter((assignment) => assignment.project_position_id === editingPosition.id)
        .reduce((sum, assignment) => sum + Number(assignment.allocation_percent), 0);
      const { error } = await supabase
        .from("project_positions")
        .update({
          title,
          professional_grade: positionDraft.professionalGrade,
          start_date: positionDraft.startDate,
          end_date: positionDraft.endDate,
          planned_allocation_percent: planned,
          status: getStaffingStatus(assignedPercent, planned),
          required_skills: requiredSkills
        })
        .eq("id", editingPosition.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      closeStaffingModal();
      await loadProjects();
      return;
    }

    const { error } = await supabase.from("project_positions").insert({
      project_id: selectedProject.id,
      title,
      professional_grade: positionDraft.professionalGrade,
      start_date: positionDraft.startDate,
      end_date: positionDraft.endDate,
      planned_allocation_percent: planned,
      status: "open",
      required_skills: requiredSkills
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    closeStaffingModal();
    await loadProjects();
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !selectedAssignmentPosition) {
      return;
    }

    if (!assignmentDraft.employeeId || !assignmentDraft.startDate || !assignmentDraft.endDate) {
      setMessage("Please select an employee and assignment period.");
      return;
    }

    if (assignmentDraft.endDate < assignmentDraft.startDate) {
      setMessage("Assignment end date must be on or after the start date.");
      return;
    }

    const allocation = normalizePercent(assignmentDraft.allocationPercent, 50);
    const nextPositionAssignments = assignments
      .filter(
        (assignment) =>
          assignment.project_position_id === selectedAssignmentPosition.id &&
          assignment.id !== editingAssignmentId
      )
      .reduce((sum, assignment) => sum + Number(assignment.allocation_percent), 0);
    const assignedPercent = nextPositionAssignments + allocation;
    const nextPositionStatus = getStaffingStatus(
      assignedPercent,
      selectedAssignmentPosition.planned_allocation_percent
    );

    if (editingAssignment && editingAssignment.end_date < todayKey) {
      setMessage("Past assignments are locked for reporting integrity.");
      return;
    }

    if (isEditingRunningAssignment && assignmentDraft.employeeId !== editingAssignment?.employee_id) {
      setMessage("Running assignments keep their assigned employee.");
      return;
    }

    if (isEditingRunningAssignment && assignmentDraft.startDate !== editingAssignment?.start_date) {
      setMessage("Running assignments keep their original start date.");
      return;
    }

    if (isEditingRunningAssignment && assignmentDraft.endDate < todayKey) {
      setMessage("Running assignments can only be changed for today or future dates.");
      return;
    }

    if (editingAssignment) {
      const { error } = await supabase
        .from("project_assignments")
        .update({
          employee_id: assignmentDraft.employeeId,
          start_date: assignmentDraft.startDate,
          end_date: assignmentDraft.endDate,
          allocation_percent: allocation
        })
        .eq("id", editingAssignment.id);

      if (error) {
        setMessage(error.message);
        return;
      }

      const { error: statusError } = await supabase
        .from("project_positions")
        .update({ status: nextPositionStatus })
        .eq("id", selectedAssignmentPosition.id);

      if (statusError) {
        setMessage(statusError.message);
        return;
      }

      closeStaffingModal();
      await loadProjects();
      return;
    }

    const { error } = await supabase.from("project_assignments").insert({
      project_position_id: selectedAssignmentPosition.id,
      employee_id: assignmentDraft.employeeId,
      start_date: assignmentDraft.startDate,
      end_date: assignmentDraft.endDate,
      allocation_percent: allocation
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    const { error: statusError } = await supabase
      .from("project_positions")
      .update({ status: nextPositionStatus })
      .eq("id", selectedAssignmentPosition.id);

    if (statusError) {
      setMessage(statusError.message);
      return;
    }

    closeStaffingModal();
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
                        <button className="subtle-action" type="button" onClick={openPositionModal}>
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
                          const isPositionLocked = position.end_date < todayKey;

                          return (
                            <div className="staffing-row" key={position.id}>
                              <div className="staffing-position">
                                <div className="staffing-titleline">
                                  <strong>{position.title}</strong>
                                  <button
                                    aria-label={`Edit ${position.title}`}
                                    className="row-icon-button"
                                    disabled={isPositionLocked}
                                    title={
                                      isPositionLocked
                                        ? "Past positions are locked"
                                        : "Edit position"
                                    }
                                    type="button"
                                    onClick={() => openEditPositionModal(position)}
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </div>
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
                                    const isAssignmentLocked = assignment.end_date < todayKey;

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
                                        <button
                                          aria-label={`Edit assignment for ${employee?.full_name ?? "Unknown"}`}
                                          className="row-icon-button"
                                          disabled={isAssignmentLocked}
                                          title={
                                            isAssignmentLocked
                                              ? "Past assignments are locked"
                                              : "Edit assignment"
                                          }
                                          type="button"
                                          onClick={() => openEditAssignmentModal(assignment)}
                                        >
                                          <Pencil size={12} />
                                        </button>
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
                                  disabled={isPositionLocked}
                                  title={
                                    isPositionLocked
                                      ? "Past positions are locked"
                                      : "Add assignment"
                                  }
                                  type="button"
                                  onClick={() => openAssignmentModal(position)}
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

      {isPositionModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form className="staffing-modal" onSubmit={submitPosition}>
            <div className="modal-header">
              <div>
                <p className="section-kicker">Staffing demand</p>
                <h3>{editingPosition ? "Edit position" : "Add position"}</h3>
              </div>
              <button
                aria-label="Close position modal"
                className="icon-button"
                type="button"
                onClick={closeStaffingModal}
              >
                <X size={16} />
              </button>
            </div>

            <div className="staffing-form-grid">
              <label className="field-group wide">
                <span>Position title</span>
                <input
                  required
                  placeholder="Business Analyst"
                  value={positionDraft.title}
                  onChange={(event) =>
                    setPositionDraft((draft) => ({ ...draft, title: event.target.value }))
                  }
                />
              </label>

              <label className="field-group">
                <span>Professional grade</span>
                <input
                  required
                  placeholder="Senior Consultant"
                  value={positionDraft.professionalGrade}
                  onChange={(event) =>
                    setPositionDraft((draft) => ({
                      ...draft,
                      professionalGrade: event.target.value
                    }))
                  }
                />
              </label>

              <label className="field-group">
                <span>Planned allocation</span>
                <input
                  required
                  min="0"
                  step="5"
                  type="number"
                  value={positionDraft.plannedAllocationPercent}
                  onChange={(event) =>
                    setPositionDraft((draft) => ({
                      ...draft,
                      plannedAllocationPercent: event.target.value
                    }))
                  }
                />
              </label>

              <label className="field-group">
                <span>Start date</span>
                <input
                  required
                  disabled={isEditingRunningPosition}
                  type="date"
                  value={positionDraft.startDate}
                  onChange={(event) =>
                    setPositionDraft((draft) => ({ ...draft, startDate: event.target.value }))
                  }
                />
              </label>

              <label className="field-group">
                <span>End date</span>
                <input
                  required
                  min={isEditingRunningPosition ? todayKey : undefined}
                  type="date"
                  value={positionDraft.endDate}
                  onChange={(event) =>
                    setPositionDraft((draft) => ({ ...draft, endDate: event.target.value }))
                  }
                />
              </label>

              <label className="field-group wide">
                <span>Required skills</span>
                <input
                  placeholder="Analysis, PMO"
                  value={positionDraft.requiredSkills}
                  onChange={(event) =>
                    setPositionDraft((draft) => ({
                      ...draft,
                      requiredSkills: event.target.value
                    }))
                  }
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="subtle-action" type="button" onClick={closeStaffingModal}>
                Cancel
              </button>
              <button className="submit-timesheet-button" type="submit">
                {editingPosition ? <Save size={14} /> : <Plus size={14} />}
                {editingPosition ? "Save position" : "Create position"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedAssignmentPosition ? (
        <div className="modal-backdrop" role="presentation">
          <form className="staffing-modal" onSubmit={submitAssignment}>
            <div className="modal-header">
              <div>
                <p className="section-kicker">{selectedAssignmentPosition.title}</p>
                <h3>{editingAssignment ? "Edit assignment" : "Add assignment"}</h3>
              </div>
              <button
                aria-label="Close assignment modal"
                className="icon-button"
                type="button"
                onClick={closeStaffingModal}
              >
                <X size={16} />
              </button>
            </div>

            <div className="staffing-form-grid">
              <label className="field-group wide">
                <span>Employee</span>
                <select
                  required
                  disabled={isEditingRunningAssignment}
                  value={assignmentDraft.employeeId}
                  onChange={(event) =>
                    setAssignmentDraft((draft) => ({
                      ...draft,
                      employeeId: event.target.value
                    }))
                  }
                >
                  {activeProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name ?? profile.email} - {profile.professional_grade ?? profile.system_role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group">
                <span>Allocation</span>
                <input
                  required
                  min="0"
                  step="5"
                  type="number"
                  value={assignmentDraft.allocationPercent}
                  onChange={(event) =>
                    setAssignmentDraft((draft) => ({
                      ...draft,
                      allocationPercent: event.target.value
                    }))
                  }
                />
              </label>

              <label className="field-group">
                <span>Start date</span>
                <input
                  required
                  disabled={isEditingRunningAssignment}
                  type="date"
                  value={assignmentDraft.startDate}
                  onChange={(event) =>
                    setAssignmentDraft((draft) => ({ ...draft, startDate: event.target.value }))
                  }
                />
              </label>

              <label className="field-group">
                <span>End date</span>
                <input
                  required
                  min={isEditingRunningAssignment ? todayKey : undefined}
                  type="date"
                  value={assignmentDraft.endDate}
                  onChange={(event) =>
                    setAssignmentDraft((draft) => ({ ...draft, endDate: event.target.value }))
                  }
                />
              </label>
            </div>

            {shouldShowAllocationWarning ? (
              <div className="staffing-warning staffing-warning-wide">
                <AlertTriangle size={15} />
                <span>
                  Projected allocation for {assignmentEmployee?.full_name}:{" "}
                  {projectedEmployeeAllocation}%
                </span>
              </div>
            ) : null}

            <div className="modal-actions">
              <button className="subtle-action" type="button" onClick={closeStaffingModal}>
                Cancel
              </button>
              <button className="submit-timesheet-button" type="submit">
                {editingAssignment ? <Save size={14} /> : <Plus size={14} />}
                {editingAssignment ? "Save assignment" : "Create assignment"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </AppShell>
  );
}
