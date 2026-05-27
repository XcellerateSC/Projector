"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  SlidersHorizontal,
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
  href: string;
  icon: ElementType;
  roles: SystemRole[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

type AppShellProps = {
  children: ReactNode | ((profile: Profile) => ReactNode);
  title: string;
  eyebrow?: string;
};

const navGroups: NavGroup[] = [
  {
    label: "Core",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["employee", "project_lead", "portfolio_manager"]
      },
      {
        label: "People",
        href: "/people",
        icon: UsersRound,
        roles: ["employee", "project_lead", "portfolio_manager"]
      }
    ]
  },
  {
    label: "Work",
    items: [
      {
        label: "Projects",
        href: "/projects",
        icon: FolderKanban,
        roles: ["project_lead", "portfolio_manager"]
      },
      {
        label: "Timesheets",
        href: "/timesheets",
        icon: Clock3,
        roles: ["employee", "project_lead", "portfolio_manager"]
      },
      {
        label: "Status",
        href: "/status",
        icon: CalendarCheck2,
        roles: ["project_lead", "portfolio_manager"]
      }
    ]
  },
  {
    label: "Insights",
    items: [
      {
        label: "Reports",
        href: "/reports",
        icon: BarChart3,
        roles: ["project_lead", "portfolio_manager"]
      }
    ]
  },
  {
    label: "System",
    items: [
      {
        label: "Admin",
        href: "/admin",
        icon: SlidersHorizontal,
        roles: ["portfolio_manager"]
      }
    ]
  }
];

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

export const roleLabels: Record<SystemRole, string> = {
  employee: "Consultant",
  project_lead: "Project Manager",
  portfolio_manager: "Portfolio Manager"
};

export const roleSummaries: Record<SystemRole, string[]> = {
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

export function AppShell({ children, title, eyebrow = "XC Projector Demo" }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isDemoSwitcherOpen, setIsDemoSwitcherOpen] = useState(false);
  const [selectedDemoEmail, setSelectedDemoEmail] = useState(demoUsers[0].email);
  const [isSwitchingUser, setIsSwitchingUser] = useState(false);
  const [demoSwitchError, setDemoSwitchError] = useState<string | null>(null);

  const visibleNavGroups = useMemo(() => {
    if (!profile) {
      return [];
    }

    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.roles.includes(profile.system_role))
      }))
      .filter((group) => group.items.length > 0);
  }, [profile]);

  useEffect(() => {
    async function loadShell() {
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

    loadShell();
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
        <div className="loading-card">Workspace wird geladen...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="dashboard-loading">
        <div className="loading-card">
          <strong>Workspace nicht verfügbar</strong>
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
            {visibleNavGroups.map((group) => (
              <div className="sidebar-group" key={group.label}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      className={isActive ? "sidebar-item active" : "sidebar-item"}
                      href={item.href}
                      key={item.href}
                      title={item.label}
                    >
                      <Icon size={17} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
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
            <p className="section-kicker">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="profile-chip">
            <ShieldCheck size={16} />
            <div>
              <strong>{profile.full_name}</strong>
              <span>{roleLabels[profile.system_role]}</span>
            </div>
          </div>
        </header>

        {typeof children === "function" ? children(profile) : children}
      </section>
    </main>
  );
}
