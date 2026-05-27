"use client";

import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  Plus,
  Send,
  TimerReset
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type WeekStatus = "Empty" | "Open" | "Ready" | "Submitted";
type WeekSignal = "past-open" | "submitted" | "current" | "future";

type InternalAccount = {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
};

type WeeklyTimesheet = {
  id: string;
  employee_id: string;
  week_start_date: string;
  target_hours: number;
  status: "open" | "submitted";
  submitted_at: string | null;
};

type DbTimeEntry = {
  id: string;
  weekly_timesheet_id: string;
  entry_type: "project" | "internal";
  project_assignment_id: string | null;
  internal_time_account_type_id: string | null;
  hours: number;
  description: string;
};

type Project = {
  id: string;
  name: string;
};

type Position = {
  id: string;
  project_id: string;
  title: string;
  start_date: string;
  end_date: string;
  planned_allocation_percent: number;
};

type Assignment = {
  id: string;
  project_position_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  allocation_percent: number;
};

type TimeEntryRow = {
  rowId: string;
  dbId: string | null;
  type: "Project" | "Internal";
  label: string;
  meta: string;
  plannedHours?: number;
  hours: number;
  description: string;
  assignmentId?: string;
  internalAccountId?: string;
};

type EntryDraftState = "clean" | "dirty" | "saving" | "saved" | "error";

type EntryDraft = {
  hours: string;
  description: string;
  state: EntryDraftState;
};

type TimesheetWeek = {
  id: string;
  year: number;
  weekNumber: number;
  startDate: string;
  kw: string;
  range: string;
  targetHours: number;
  status: WeekStatus;
  booked: number;
};

const availableYears = [2025, 2026, 2027];
const targetHours = 40;

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short"
  });
}

function getIsoWeekStart(year: number, weekNumber: number) {
  const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
  const day = fourthOfJanuary.getUTCDay() || 7;
  const firstMonday = new Date(fourthOfJanuary);
  firstMonday.setUTCDate(fourthOfJanuary.getUTCDate() - day + 1);
  firstMonday.setUTCDate(firstMonday.getUTCDate() + (weekNumber - 1) * 7);
  return firstMonday;
}

function getIsoWeekNumber(date: Date) {
  const normalized = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = normalized.getUTCDay() || 7;
  normalized.setUTCDate(normalized.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1));

  return Math.ceil(((normalized.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function createWeekShell(year: number, weekNumber: number): TimesheetWeek {
  const start = getIsoWeekStart(year, weekNumber);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    id: `${year}-${String(weekNumber).padStart(2, "0")}`,
    year,
    weekNumber,
    startDate: toDateKey(start),
    kw: `KW ${String(weekNumber).padStart(2, "0")}`,
    range: `${formatDate(start)} - ${formatDate(end)}`,
    targetHours,
    status: "Empty",
    booked: 0
  };
}

function createWeeksForYear(year: number) {
  return Array.from({ length: 53 }, (_, index) => createWeekShell(year, index + 1));
}

function isAssignmentActiveInWeek(assignment: Assignment, weekStartDate: string) {
  const start = new Date(`${weekStartDate}T00:00:00`);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return assignment.start_date <= toDateKey(end) && assignment.end_date >= weekStartDate;
}

function getWeekStatus(timesheet: WeeklyTimesheet | undefined, booked: number): WeekStatus {
  if (timesheet?.status === "submitted") {
    return "Submitted";
  }

  if (booked >= targetHours) {
    return "Ready";
  }

  if (booked > 0) {
    return "Open";
  }

  return "Empty";
}

function getWeekSignal(week: TimesheetWeek): WeekSignal {
  const today = new Date();
  const currentYear = today.getUTCFullYear();
  const currentWeekNumber = getIsoWeekNumber(today);

  if (week.status === "Submitted" || week.status === "Ready") {
    return "submitted";
  }

  if (week.year === currentYear && week.weekNumber === currentWeekNumber) {
    return "current";
  }

  if (
    week.year < currentYear ||
    (week.year === currentYear && week.weekNumber < currentWeekNumber)
  ) {
    return "past-open";
  }

  return "future";
}

const weekSignalClass: Record<WeekSignal, string> = {
  "past-open": "error",
  submitted: "success",
  current: "current",
  future: "neutral"
};

function getDraftKey(weekStartDate: string, rowId: string) {
  return `${weekStartDate}:${rowId}`;
}

function normalizeHours(value: string) {
  const hours = Number(value);
  return Number.isNaN(hours) ? 0 : hours;
}

export default function TimesheetsPage() {
  const currentYear = new Date().getFullYear();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(
    availableYears.includes(currentYear) ? currentYear : 2026
  );
  const [selectedWeekId, setSelectedWeekId] = useState(
    `${availableYears.includes(currentYear) ? currentYear : 2026}-${String(
      getIsoWeekNumber(new Date())
    ).padStart(2, "0")}`
  );
  const [timesheets, setTimesheets] = useState<WeeklyTimesheet[]>([]);
  const [timeEntries, setTimeEntries] = useState<DbTimeEntry[]>([]);
  const [internalAccounts, setInternalAccounts] = useState<InternalAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAdditionalAccountId, setSelectedAdditionalAccountId] = useState("");
  const [entryDrafts, setEntryDrafts] = useState<Record<string, EntryDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTimesheetData() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Supabase ist noch nicht konfiguriert.");
      setIsLoading(false);
      return;
    }

    const sessionResult = await supabase.auth.getUser();
    const userId = sessionResult.data.user?.id;

    if (!userId) {
      setMessage("Bitte zuerst einloggen.");
      setIsLoading(false);
      return;
    }

    const [
      accountsResult,
      timesheetsResult,
      entriesResult,
      projectsResult,
      positionsResult,
      assignmentsResult
    ] = await Promise.all([
      supabase
        .from("internal_time_account_types")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase.from("weekly_timesheets").select("*").eq("employee_id", userId),
      supabase.from("time_entries").select("*"),
      supabase.from("projects").select("id,name").order("name"),
      supabase.from("project_positions").select("*"),
      supabase.from("project_assignments").select("*").eq("employee_id", userId)
    ]);

    const firstError =
      accountsResult.error ??
      timesheetsResult.error ??
      entriesResult.error ??
      projectsResult.error ??
      positionsResult.error ??
      assignmentsResult.error;

    if (firstError) {
      setMessage(firstError.message);
      setIsLoading(false);
      return;
    }

    const nextAccounts = (accountsResult.data ?? []) as InternalAccount[];

    setEmployeeId(userId);
    setInternalAccounts(nextAccounts);
    setTimesheets((timesheetsResult.data ?? []) as WeeklyTimesheet[]);
    setTimeEntries((entriesResult.data ?? []) as DbTimeEntry[]);
    setProjects((projectsResult.data ?? []) as Project[]);
    setPositions((positionsResult.data ?? []) as Position[]);
    setAssignments((assignmentsResult.data ?? []) as Assignment[]);
    setSelectedAdditionalAccountId(nextAccounts.find((account) => !account.is_default)?.id ?? "");
    setIsLoading(false);
  }

  useEffect(() => {
    loadTimesheetData();
  }, []);

  const weeks = useMemo(() => {
    return createWeeksForYear(selectedYear).map((week) => {
      const timesheet = timesheets.find((item) => item.week_start_date === week.startDate);
      const booked = timeEntries
        .filter((entry) => entry.weekly_timesheet_id === timesheet?.id)
        .reduce((sum, entry) => sum + Number(entry.hours), 0);

      return {
        ...week,
        targetHours: Number(timesheet?.target_hours ?? targetHours),
        booked,
        status: getWeekStatus(timesheet, booked)
      };
    });
  }, [selectedYear, timeEntries, timesheets]);

  const selectedWeek = weeks.find((week) => week.id === selectedWeekId) ?? weeks[0];
  const selectedTimesheet = timesheets.find(
    (timesheet) => timesheet.week_start_date === selectedWeek.startDate
  );
  const isSubmitted = selectedTimesheet?.status === "submitted";

  const selectedWeekEntries = useMemo(() => {
    if (!selectedWeek) {
      return [];
    }

    const dbEntries = timeEntries.filter(
      (entry) => entry.weekly_timesheet_id === selectedTimesheet?.id
    );
    const activeAssignments = assignments.filter((assignment) =>
      isAssignmentActiveInWeek(assignment, selectedWeek.startDate)
    );
    const projectRows: TimeEntryRow[] = activeAssignments.map((assignment) => {
      const position = positions.find((item) => item.id === assignment.project_position_id);
      const project = projects.find((item) => item.id === position?.project_id);
      const dbEntry = dbEntries.find((entry) => entry.project_assignment_id === assignment.id);

      return {
        rowId: `project-${assignment.id}`,
        dbId: dbEntry?.id ?? null,
        type: "Project",
        label: project?.name ?? "Project assignment",
        meta: position?.title ?? "Assigned role",
        plannedHours: Math.round((Number(assignment.allocation_percent) / 100) * targetHours),
        hours: Number(dbEntry?.hours ?? 0),
        description: dbEntry?.description ?? "",
        assignmentId: assignment.id
      };
    });
    const visibleInternalAccounts = internalAccounts.filter((account) => {
      const hasEntry = dbEntries.some(
        (entry) => entry.internal_time_account_type_id === account.id
      );

      return account.is_default || hasEntry;
    });
    const internalRows: TimeEntryRow[] = visibleInternalAccounts.map((account) => {
      const dbEntry = dbEntries.find(
        (entry) => entry.internal_time_account_type_id === account.id
      );

      return {
        rowId: `internal-${account.id}`,
        dbId: dbEntry?.id ?? null,
        type: "Internal",
        label: account.name,
        meta: account.is_default
          ? "Default internal time account"
          : "Additional internal time account",
        hours: Number(dbEntry?.hours ?? 0),
        description: dbEntry?.description ?? "",
        internalAccountId: account.id
      };
    });

    return [...projectRows, ...internalRows];
  }, [assignments, internalAccounts, positions, projects, selectedTimesheet?.id, selectedWeek, timeEntries]);

  useEffect(() => {
    setEntryDrafts((current) => {
      const next = { ...current };

      selectedWeekEntries.forEach((entry) => {
        const key = getDraftKey(selectedWeek.startDate, entry.rowId);
        const currentDraft = next[key];

        if (!currentDraft || currentDraft.state === "clean") {
          next[key] = {
            hours: String(entry.hours),
            description: entry.description,
            state: "clean"
          };
        }
      });

      return next;
    });
  }, [selectedWeek.startDate, selectedWeekEntries]);

  const editableWeekEntries = useMemo(() => {
    return selectedWeekEntries.map((entry) => {
      const draft = entryDrafts[getDraftKey(selectedWeek.startDate, entry.rowId)];

      return {
        ...entry,
        hours: normalizeHours(draft?.hours ?? String(entry.hours)),
        description: draft?.description ?? entry.description,
        draftHours: draft?.hours ?? String(entry.hours),
        draftDescription: draft?.description ?? entry.description,
        draftState: draft?.state ?? "clean"
      };
    });
  }, [entryDrafts, selectedWeek.startDate, selectedWeekEntries]);

  const additionalInternalAccounts = internalAccounts.filter((account) => !account.is_default);
  const totals = useMemo(() => {
    const booked = editableWeekEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const remaining = Number(selectedWeek?.targetHours ?? targetHours) - booked;

    return {
      booked,
      remaining,
      isComplete: remaining <= 0
    };
  }, [editableWeekEntries, selectedWeek?.targetHours]);

  async function ensureTimesheet() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !employeeId || !selectedWeek) {
      return null;
    }

    if (selectedTimesheet) {
      return selectedTimesheet;
    }

    const { data, error } = await supabase.rpc("ensure_weekly_timesheet", {
      target_employee_id: employeeId,
      target_week_start_date: selectedWeek.startDate,
      target_hours: targetHours
    });

    if (error) {
      setMessage(error.message);
      return null;
    }

    const created = data as WeeklyTimesheet;
    setTimesheets((current) => [...current, created]);
    return created;
  }

  async function upsertEntry(row: TimeEntryRow, patch: Partial<Pick<DbTimeEntry, "hours" | "description">>) {
    if (isSubmitted) {
      return false;
    }

    const supabase = getSupabaseBrowserClient();
    const timesheet = await ensureTimesheet();

    if (!supabase || !timesheet) {
      return false;
    }

    setMessage(null);

    if (row.dbId) {
      const { data, error } = await supabase
        .from("time_entries")
        .update(patch)
        .eq("id", row.dbId)
        .select("*")
        .single();

      if (error) {
        setMessage(error.message);
        return false;
      }

      setTimeEntries((current) =>
        current.map((entry) => (entry.id === row.dbId ? (data as DbTimeEntry) : entry))
      );
      return true;
    }

    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        weekly_timesheet_id: timesheet.id,
        entry_type: row.type === "Project" ? "project" : "internal",
        project_assignment_id: row.assignmentId ?? null,
        internal_time_account_type_id: row.internalAccountId ?? null,
        hours: patch.hours ?? row.hours,
        description: patch.description ?? row.description
      })
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return false;
    }

    setTimeEntries((current) => [...current, data as DbTimeEntry]);
    return true;
  }

  function updateDraft(row: TimeEntryRow, patch: Partial<Pick<EntryDraft, "hours" | "description">>) {
    const key = getDraftKey(selectedWeek.startDate, row.rowId);

    setEntryDrafts((current) => ({
      ...current,
      [key]: {
        hours: patch.hours ?? current[key]?.hours ?? String(row.hours),
        description: patch.description ?? current[key]?.description ?? row.description,
        state: "dirty"
      }
    }));
  }

  async function saveDraft(row: TimeEntryRow) {
    const key = getDraftKey(selectedWeek.startDate, row.rowId);
    const draft = entryDrafts[key];

    if (!draft || draft.state !== "dirty" || isSubmitted) {
      return;
    }

    setEntryDrafts((current) => ({
      ...current,
      [key]: { ...draft, state: "saving" }
    }));

    const isSaved = await upsertEntry(row, {
      hours: normalizeHours(draft.hours),
      description: draft.description
    });

    setEntryDrafts((current) => ({
      ...current,
      [key]: {
        hours: draft.hours,
        description: draft.description,
        state: isSaved ? "saved" : "error"
      }
    }));
  }

  async function saveDraftOnEnter(
    event: KeyboardEvent<HTMLInputElement>,
    row: TimeEntryRow
  ) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    await saveDraft(row);
  }

  function handleYearChange(year: number) {
    const nextWeeks = createWeeksForYear(year);
    setSelectedYear(year);
    setSelectedWeekId(nextWeeks[0].id);
  }

  async function addAdditionalInternalRow() {
    const account = internalAccounts.find((item) => item.id === selectedAdditionalAccountId);

    if (!account || isSubmitted) {
      return;
    }

    await upsertEntry(
      {
        rowId: `internal-${account.id}`,
        dbId: null,
        type: "Internal",
        label: account.name,
        meta: "Additional internal time account",
        hours: 0,
        description: "",
        internalAccountId: account.id
      },
      { hours: 0, description: "" }
    );
  }

  async function submitWeek() {
    const supabase = getSupabaseBrowserClient();
    const timesheet = await ensureTimesheet();

    if (!supabase || !timesheet || !totals.isComplete || isSubmitted) {
      return;
    }

    const { data, error } = await supabase
      .from("weekly_timesheets")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .eq("id", timesheet.id)
      .select("*")
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setTimesheets((current) =>
      current.map((item) => (item.id === timesheet.id ? (data as WeeklyTimesheet) : item))
    );
  }

  async function resetWeek() {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !selectedTimesheet || isSubmitted) {
      return;
    }

    const { error } = await supabase
      .from("time_entries")
      .delete()
      .eq("weekly_timesheet_id", selectedTimesheet.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTimeEntries((current) =>
      current.filter((entry) => entry.weekly_timesheet_id !== selectedTimesheet.id)
    );
    setEntryDrafts((current) => {
      const next = { ...current };
      selectedWeekEntries.forEach((entry) => {
        delete next[getDraftKey(selectedWeek.startDate, entry.rowId)];
      });
      return next;
    });
  }

  if (isLoading) {
    return (
      <AppShell title="Timesheets">
        <div className="dashboard-loading">
          <div className="loading-card">Timesheets werden geladen...</div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Timesheets">
      <div className="dashboard-workspace">
        <aside className="dashboard-master timesheet-master">
          <div className="master-header timesheet-master-header">
            <div>
              <span>Weekly timesheets</span>
            </div>
            <label className="year-select">
              <span>Year</span>
              <select
                value={selectedYear}
                onChange={(event) => handleYearChange(Number(event.target.value))}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="timesheet-week-list">
            {weeks.map((week) => {
              const isActive = week.id === selectedWeek.id;

              return (
                <button
                  className={isActive ? "week-row active" : "week-row"}
                  key={week.id}
                  type="button"
                  onClick={() => setSelectedWeekId(week.id)}
                >
                  <div>
                    <strong>{week.kw}</strong>
                    <span>{week.range}</span>
                  </div>
                  <div className="week-row-meta">
                    <span>
                      {week.booked}/{week.targetHours}h
                    </span>
                    <i className={weekSignalClass[getWeekSignal(week)]} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="dashboard-detail">
          <div className="detail-header">
            <div className="people-title">
              <div className="people-title-icon">
                <Clock3 size={20} />
              </div>
              <div>
                <p className="section-kicker">{selectedWeek.range}</p>
                <h2>{selectedWeek.kw}</h2>
              </div>
            </div>
            <span className={`people-status ${totals.isComplete ? "success" : "warning"}`}>
              {selectedTimesheet?.status === "submitted"
                ? "Submitted"
                : totals.isComplete
                  ? "Complete"
                  : "Open"}
            </span>
          </div>

          <div className="detail-scroll">
            <div className="detail-content timesheet-detail-content">
              {message ? <div className="inline-message warning">{message}</div> : null}

              <div className="summary-grid timesheet-summary-grid">
                <div className="summary-card">
                  <span>Target</span>
                  <strong>{selectedWeek.targetHours}h</strong>
                </div>
                <div className="summary-card">
                  <span>Booked</span>
                  <strong>{totals.booked}h</strong>
                </div>
                <div className="summary-card">
                  <span>Remaining</span>
                  <strong>{totals.remaining}h</strong>
                </div>
                <div className="summary-card">
                  <span>Status</span>
                  <strong>{selectedWeek.status}</strong>
                </div>
              </div>

              <div className="content-panel">
                <div className="panel-header compact">
                  <div>
                    <p className="section-kicker">Weekly entry</p>
                    <h3>Project and internal time</h3>
                  </div>
                  <div className="add-internal-control">
                    <select
                      value={selectedAdditionalAccountId}
                      onChange={(event) =>
                        setSelectedAdditionalAccountId(event.target.value)
                      }
                    >
                      {additionalInternalAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="subtle-action"
                      type="button"
                      onClick={addAdditionalInternalRow}
                      disabled={!selectedAdditionalAccountId || isSubmitted}
                    >
                      <Plus size={14} />
                      Add row
                    </button>
                  </div>
                </div>

                <div className="timesheet-grid">
                  <div className="timesheet-grid-head">
                    <span>Type</span>
                    <span>Assignment / account</span>
                    <span>Planned</span>
                    <span>Hours</span>
                    <span>Description</span>
                    <span>Save</span>
                  </div>

                  {editableWeekEntries.map((entry) => (
                    <div className="timesheet-grid-row" key={entry.rowId}>
                      <div className="entry-type">
                        <i className={entry.type === "Project" ? "success" : "warning"} />
                        <span>{entry.type}</span>
                      </div>

                      <div className="entry-assignment">
                        <strong>{entry.label}</strong>
                        <span>{entry.meta}</span>
                      </div>

                      <div className="entry-planned">
                        {entry.plannedHours !== undefined ? `${entry.plannedHours}h` : "-"}
                      </div>

                      <label className="entry-hours">
                        <input
                          aria-label={`${entry.label} hours`}
                          disabled={isSubmitted}
                          min="0"
                          step="0.25"
                          type="number"
                          value={entry.draftHours}
                          onBlur={() => saveDraft(entry)}
                          onChange={(event) => updateDraft(entry, { hours: event.target.value })}
                          onKeyDown={(event) => saveDraftOnEnter(event, entry)}
                        />
                      </label>

                      <label className="entry-description">
                        <input
                          aria-label={`${entry.label} description`}
                          disabled={isSubmitted}
                          placeholder="Short note"
                          value={entry.draftDescription}
                          onBlur={() => saveDraft(entry)}
                          onChange={(event) =>
                            updateDraft(entry, { description: event.target.value })
                          }
                          onKeyDown={(event) => saveDraftOnEnter(event, entry)}
                        />
                      </label>

                      <span className={`entry-save-state ${entry.draftState}`}>
                        {entry.draftState === "dirty"
                          ? "Unsaved"
                          : entry.draftState === "saving"
                            ? "Saving"
                            : entry.draftState === "saved"
                              ? "Saved"
                              : entry.draftState === "error"
                                ? "Error"
                                : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="timesheet-footer-panel">
                <div className="timesheet-completeness">
                  {totals.isComplete ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                  <div>
                    <strong>
                      {totals.isComplete
                        ? "Week is complete"
                        : `${Math.abs(totals.remaining)}h ${
                            totals.remaining > 0 ? "still missing" : "over target"
                          }`}
                    </strong>
                    <span>
                      Submission is employee-wide and requires booked hours to match
                      target hours.
                    </span>
                  </div>
                </div>

                <div className="timesheet-actions">
                  <button
                    className="subtle-action"
                    type="button"
                    onClick={resetWeek}
                    disabled={!selectedTimesheet || isSubmitted}
                  >
                    <TimerReset size={14} />
                    Reset
                  </button>
                  <button
                    className="submit-timesheet-button"
                    type="button"
                    disabled={!totals.isComplete || isSubmitted}
                    onClick={submitWeek}
                  >
                    <Send size={14} />
                    Submit week
                  </button>
                </div>
              </div>

              <div className="content-panel people-note-panel">
                <FileText size={16} />
                <p>
                  Default internal accounts are always visible. Additional internal
                  accounts can be added only when needed. Project rows appear from
                  active staffing assignments.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
