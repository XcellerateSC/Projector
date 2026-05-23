"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRoundCog,
  UsersRound
} from "lucide-react";
import {
  getSupabaseBrowserClient,
  type Profile,
  type SystemRole
} from "@/lib/supabase/client";

type NavItem = {
  label: string;
  description: string;
  icon: ElementType;
  roles: SystemRole[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    description: "Role-based landing view",
    icon: LayoutDashboard,
    roles: ["employee", "project_lead", "portfolio_manager"]
  },
  {
    label: "People",
    description: "Employee profiles and skills",
    icon: UsersRound,
    roles: ["employee", "project_lead", "portfolio_manager"]
  },
  {
    label: "Portfolios",
    description: "Portfolio steering",
    icon: Building2,
    roles: ["portfolio_manager"]
  },
  {
    label: "Projects",
    description: "Projects and charters",
    icon: FolderKanban,
    roles: ["project_lead", "portfolio_manager"]
  },
  {
    label: "Staffing",
    description: "Positions and assignments",
    icon: BriefcaseBusiness,
    roles: ["project_lead", "portfolio_manager"]
  },
  {
    label: "Timesheets",
    description: "Weekly time tracking",
    icon: Clock3,
    roles: ["employee", "project_lead", "portfolio_manager"]
  },
  {
    label: "Status",
    description: "Weekly project reports",
    icon: CalendarCheck2,
    roles: ["project_lead", "portfolio_manager"]
  },
  {
    label: "Reporting",
    description: "Plan vs actual and cost",
    icon: BarChart3,
    roles: ["project_lead", "portfolio_manager"]
  }
];

const roleLabels: Record<SystemRole, string> = {
  employee: "Consultant",
  project_lead: "Project Manager",
  portfolio_manager: "Portfolio Manager"
};

const roleSummaries: Record<SystemRole, string[]> = {
  employee: [
    "Own active assignments",
    "Weekly timesheet status",
    "Employee directory visibility"
  ],
  project_lead: [
    "Assigned projects",
    "Staffing and capacity warnings",
    "Status reports and billing overrides"
  ],
  portfolio_manager: [
    "Full demo administration",
    "Portfolio and project overview",
    "Cross-project reporting and access control"
  ]
};

const demoUsers = [
  {
    email: "paula.portfolio@xcellerate-demo.ch",
    label: "Paula Portfolio",
    role: "Portfolio Manager"
  },
  {
    email: "peter.project@xcellerate-demo.ch",
    label: "Peter Project",
    role: "Project Manager"
  },
  {
    email: "carla.consultant@xcellerate-demo.ch",
    label: "Carla Consultant",
    role: "Consultant"
  },
  {
    email: "chris.consultant@xcellerate-demo.ch",
    label: "Chris Consultant",
    role: "Consultant"
  }
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState(demoUsers[0].email);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [demoSwitchError, setDemoSwitchError] = useState<string | null>(null);

  const visibleNavItems = useMemo(() => {
    if (!profile) {
      return [];
    }

    return navItems.filter((item) => item.roles.includes(profile.system_role));
  }, [profile]);

  useEffect(() => {
    async function loadDashboard() {
      const supabase = getSupabaseBrowserClient();

      if (!supabase) {
        setMessage("Supabase ist noch nicht konfiguriert.");
        setIsLoading(false);
        return;
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id,email,full_name,system_role,professional_grade,business_unit,location,is_active"
        )
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        setMessage(
          "Kein App-Profil gefunden. Bitte public.profiles für diesen User prüfen."
        );
        setIsLoading(false);
        return;
      }

      setProfile(data as Profile);
      setIsLoading(false);
    }

    loadDashboard();
  }, [router]);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    router.replace("/");
  }

  async function handleDemoUserSwitch() {
    setDemoSwitchError(null);

    const supabase = getSupabaseBrowserClient();
    const demoPassword = process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD;

    if (!supabase) {
      setDemoSwitchError("Supabase ist noch nicht konfiguriert.");
      return;
    }

    if (!demoPassword) {
      setDemoSwitchError("Demo-Passwort fehlt in den Environment Variables.");
      return;
    }

    setIsSwitchingUser(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: selectedDemoEmail,
      password: demoPassword
    });

    if (error) {
      setIsSwitchingUser(false);
      setDemoSwitchError("Demo-Wechsel fehlgeschlagen. Passwort oder User prüfen.");
      return;
    }

    window.location.href = "/dashboard";
  }

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <div className="loading-card">Dashboard wird geladen...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="dashboard-loading">
        <div className="loading-card">
          <strong>Dashboard nicht verfügbar</strong>
          <span>{message}</span>
          <button type="button" onClick={() => router.replace("/")}>
            Zurück zum Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <nav className="app-sidebar" aria-label="Main navigation">
        <div>
          <div className="sidebar-logo">
            <BriefcaseBusiness size={22} />
          </div>
          <div className="sidebar-items">
            {visibleNavItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <button
                  className={index === 0 ? "sidebar-item active" : "sidebar-item"}
                  key={item.label}
                  title={item.label}
                  type="button"
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="demo-switcher">
            <button
              className="sidebar-item"
              title="Demo user wechseln"
              type="button"
              onClick={() => setIsDemoSwitcherOpen((isOpen) => !isOpen)}
            >
              <UserRoundCog size={17} />
              <span>Demo</span>
            </button>

            {isDemoSwitcherOpen ? (
              <div className="demo-switcher-panel">
                <div className="demo-switcher-header">
                  <span>Demo Funktion</span>
                  <strong>User wechseln</strong>
                </div>

                <label className="demo-user-select">
                  <span>Demo User</span>
                  <select
                    value={selectedDemoEmail}
                    onChange={(event) => setSelectedDemoEmail(event.target.value)}
                  >
                    {demoUsers.map((user) => (
                      <option key={user.email} value={user.email}>
                        {user.label} - {user.role}
                      </option>
                    ))}
                  </select>
                </label>

                {demoSwitchError ? (
                  <p className="demo-switch-error">{demoSwitchError}</p>
                ) : null}

                <button
                  className="demo-switch-button"
                  type="button"
                  onClick={handleDemoUserSwitch}
                  disabled={isSwitchingUser}
                >
                  {isSwitchingUser ? "Wechsel läuft" : "Als User öffnen"}
                </button>
              </div>
            ) : null}
          </div>

          <button
            className="sidebar-item sidebar-logout"
            title="Logout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="section-kicker">XC Projector Demo</p>
            <h1>Dashboard</h1>
          </div>
          <div className="profile-chip">
            <ShieldCheck size={16} />
            <div>
              <strong>{profile.full_name}</strong>
              <span>{roleLabels[profile.system_role]}</span>
            </div>
          </div>
        </header>

        <div className="dashboard-workspace">
          <aside className="dashboard-master">
            <div className="master-header">
              <span>Menu for role</span>
              <strong>{roleLabels[profile.system_role]}</strong>
            </div>
            <div className="master-list">
              {visibleNavItems.map((item, index) => {
                const Icon = item.icon;

                return (
                  <div
                    className={index === 0 ? "master-row active" : "master-row"}
                    key={item.label}
                  >
                    <div className="master-row-icon">
                      <Icon size={15} />
                    </div>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                    <i />
                  </div>
                );
              })}
            </div>
          </aside>

          <section className="dashboard-detail">
            <div className="detail-header">
              <div>
                <p className="section-kicker">Role-aware workspace</p>
                <h2>Willkommen, {profile.full_name}</h2>
              </div>
              <span className="status-pill light">{profile.system_role}</span>
            </div>

            <div className="detail-scroll">
              <div className="detail-content">
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>Role</span>
                    <strong>{roleLabels[profile.system_role]}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Grade</span>
                    <strong>{profile.professional_grade ?? "Not set"}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Business unit</span>
                    <strong>{profile.business_unit ?? "Not set"}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Location</span>
                    <strong>{profile.location ?? "Not set"}</strong>
                  </div>
                </div>

                <div className="content-panel">
                  <div className="panel-header compact">
                    <div>
                      <p className="section-kicker">Visible capabilities</p>
                      <h3>Demo access scope</h3>
                    </div>
                  </div>

                  <div className="capability-list">
                    {roleSummaries[profile.system_role].map((capability) => (
                      <div className="capability-row" key={capability}>
                        <span />
                        <strong>{capability}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="content-panel">
                  <div className="panel-header compact">
                    <div>
                      <p className="section-kicker">Next slices</p>
                      <h3>What this unlocks</h3>
                    </div>
                  </div>
                  <p className="panel-copy">
                    The shell now knows who is logged in and which system role
                    they have. From here, each future module can decide which
                    navigation entries, actions, records and reports should be
                    visible for the current user.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
