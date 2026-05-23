"use client";

import { AppShell, roleLabels, roleSummaries } from "@/components/app-shell";

export default function DashboardPage() {
  return (
    <AppShell title="Dashboard">
      {(profile) => (
        <div className="dashboard-workspace dashboard-workspace-full">
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
                    <span>People</span>
                    <strong>Directory ready</strong>
                  </div>
                  <div className="summary-card">
                    <span>Projects</span>
                    <strong>Coming next</strong>
                  </div>
                  <div className="summary-card">
                    <span>Demo users</span>
                    <strong>Switch enabled</strong>
                  </div>
                </div>

                <div className="content-panel">
                  <div className="panel-header compact">
                    <div>
                      <p className="section-kicker">Visible capabilities</p>
                      <h3>Current role scope</h3>
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
                      <p className="section-kicker">Shell structure</p>
                      <h3>Navigation is now the source of truth</h3>
                    </div>
                  </div>
                  <p className="panel-copy">
                    The left sidebar is grouped into stable sections. Module pages
                    can now use the workspace area for real context lists and
                    details instead of repeating navigation.
                  </p>
                  <p className="panel-copy">
                    Current role label: {roleLabels[profile.system_role]}.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
