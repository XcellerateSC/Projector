import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck
} from "lucide-react";

const pipelineItems = [
  { label: "Auth shell", state: "Ready" },
  { label: "Supabase", state: "Next" },
  { label: "Vercel", state: "Pipeline" }
];

const previewStats = [
  { label: "Planned hours", value: "1,240" },
  { label: "Capacity alerts", value: "07" },
  { label: "Open reports", value: "12" }
];

export default function LoginPage() {
  return (
    <main className="login-shell">
      <section className="brand-panel" aria-label="XC Projector overview">
        <div className="brand-mark">
          <BriefcaseBusiness size={24} strokeWidth={1.9} />
        </div>

        <div className="brand-copy">
          <p className="eyebrow">Xcellerate workspace</p>
          <h1>XC Projector</h1>
          <p>
            Project planning, staffing, capacity, time tracking and reporting in
            one operational desktop workspace.
          </p>
        </div>

        <div className="pipeline-card" aria-label="Pipeline preview">
          <div className="panel-header">
            <div>
              <p className="section-kicker">Deployment path</p>
              <h2>First visual checkpoint</h2>
            </div>
            <span className="status-pill">UI only</span>
          </div>

          <div className="pipeline-list">
            {pipelineItems.map((item, index) => (
              <div className="pipeline-row" key={item.label}>
                <div className="pipeline-step">
                  <span>{index + 1}</span>
                </div>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.state}</p>
                </div>
                <CheckCircle2 size={16} />
              </div>
            ))}
          </div>

          <div className="stats-grid">
            {previewStats.map((stat) => (
              <div className="stat-tile" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Login">
        <div className="login-card">
          <div className="login-header">
            <div className="login-icon">
              <LockKeyhole size={20} />
            </div>
            <div>
              <p className="section-kicker">Secure access</p>
              <h2>Anmelden</h2>
            </div>
          </div>

          <form className="login-form">
            <label>
              <span>E-Mail</span>
              <div className="input-frame">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="name@xcellerate.ch"
                  aria-label="E-Mail"
                />
              </div>
            </label>

            <label>
              <span>Passwort</span>
              <div className="input-frame">
                <KeyRound size={16} />
                <input
                  type="password"
                  placeholder="Passwort"
                  aria-label="Passwort"
                />
              </div>
            </label>

            <button className="primary-button" type="button">
              Einloggen
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="self-service">
            <button type="button">Passwort vergessen</button>
            <button type="button">Zugang anfragen</button>
          </div>

          <div className="security-note">
            <ShieldCheck size={16} />
            <span>Supabase Auth wird im nächsten funktionalen Schritt angebunden.</span>
          </div>
        </div>

        <div className="system-strip" aria-label="System hints">
          <div>
            <Clock3 size={15} />
            <span>Desktop-first</span>
          </div>
          <div>
            <ShieldCheck size={15} />
            <span>RLS-ready</span>
          </div>
        </div>
      </section>
    </main>
  );
}
