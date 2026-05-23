"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Mail,
  MapPin,
  Search,
  ShieldCheck,
  UserRound
} from "lucide-react";
import { AppShell, roleLabels } from "@/components/app-shell";

type Person = {
  id: string;
  name: string;
  email: string;
  role: "portfolio_manager" | "project_lead" | "employee";
  grade: string;
  businessUnit: string;
  location: string;
  capacity: string;
  availability: "Available" | "Allocated" | "Overbooked";
  skills: string[];
  certifications: string[];
  projects: Array<{
    name: string;
    allocation: string;
    role: string;
    status: "Active" | "Upcoming";
  }>;
};

const people: Person[] = [
  {
    id: "paula",
    name: "Paula Portfolio",
    email: "paula.portfolio@xcellerate-demo.ch",
    role: "portfolio_manager",
    grade: "Partner",
    businessUnit: "Consulting",
    location: "Zurich",
    capacity: "100%",
    availability: "Allocated",
    skills: ["Portfolio steering", "Executive reporting", "Financial governance"],
    certifications: ["SAFe Agilist", "PMP"],
    projects: [
      {
        name: "Insurance Transformation",
        allocation: "20%",
        role: "Portfolio sponsor",
        status: "Active"
      },
      {
        name: "Banking Data Platform",
        allocation: "15%",
        role: "Portfolio sponsor",
        status: "Active"
      }
    ]
  },
  {
    id: "peter",
    name: "Peter Project",
    email: "peter.project@xcellerate-demo.ch",
    role: "project_lead",
    grade: "Manager",
    businessUnit: "Consulting",
    location: "Zurich",
    capacity: "100%",
    availability: "Overbooked",
    skills: ["Project leadership", "Agile delivery", "Stakeholder management"],
    certifications: ["Scrum Master", "Prince2 Practitioner"],
    projects: [
      {
        name: "Insurance Transformation",
        allocation: "60%",
        role: "Project lead",
        status: "Active"
      },
      {
        name: "Retail CRM Rollout",
        allocation: "50%",
        role: "Project lead",
        status: "Active"
      }
    ]
  },
  {
    id: "carla",
    name: "Carla Consultant",
    email: "carla.consultant@xcellerate-demo.ch",
    role: "employee",
    grade: "Senior Consultant",
    businessUnit: "Consulting",
    location: "Basel",
    capacity: "80%",
    availability: "Allocated",
    skills: ["Business analysis", "Process design", "Requirements engineering"],
    certifications: ["IREB CPRE", "Scrum Product Owner"],
    projects: [
      {
        name: "Banking Data Platform",
        allocation: "60%",
        role: "Business analyst",
        status: "Active"
      },
      {
        name: "Insurance Transformation",
        allocation: "20%",
        role: "Process consultant",
        status: "Upcoming"
      }
    ]
  },
  {
    id: "chris",
    name: "Chris Consultant",
    email: "chris.consultant@xcellerate-demo.ch",
    role: "employee",
    grade: "Consultant",
    businessUnit: "Consulting",
    location: "Bern",
    capacity: "100%",
    availability: "Available",
    skills: ["PMO", "Data preparation", "Workshop support"],
    certifications: ["Scrum Fundamentals"],
    projects: [
      {
        name: "Retail CRM Rollout",
        allocation: "40%",
        role: "PMO consultant",
        status: "Active"
      }
    ]
  }
];

const availabilityClass: Record<Person["availability"], string> = {
  Available: "success",
  Allocated: "warning",
  Overbooked: "error"
};

export default function PeoplePage() {
  const [selectedPersonId, setSelectedPersonId] = useState(people[0].id);
  const [query, setQuery] = useState("");

  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return people;
    }

    return people.filter((person) =>
      [person.name, person.grade, person.businessUnit, person.location]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [query]);

  const selectedPerson =
    people.find((person) => person.id === selectedPersonId) ?? people[0];

  return (
    <AppShell title="People">
      {(profile) => (
        <div className="dashboard-workspace">
          <aside className="dashboard-master people-master">
            <div className="master-header">
              <span>Employee directory</span>
              <strong>{filteredPeople.length} people</strong>
            </div>

            <div className="people-search">
              <Search size={14} />
              <input
                aria-label="Search people"
                placeholder="Search people, grade, location"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            <div className="master-list">
              {filteredPeople.map((person) => (
                <button
                  className={
                    person.id === selectedPerson.id
                      ? "people-row active"
                      : "people-row"
                  }
                  key={person.id}
                  type="button"
                  onClick={() => setSelectedPersonId(person.id)}
                >
                  <div className="people-avatar">{person.name.slice(0, 1)}</div>
                  <div>
                    <strong>{person.name}</strong>
                    <span>{person.grade}</span>
                  </div>
                  <i className={availabilityClass[person.availability]} />
                </button>
              ))}
            </div>
          </aside>

          <section className="dashboard-detail">
            <div className="detail-header">
              <div className="people-title">
                <div className="people-title-icon">
                  <UserRound size={20} />
                </div>
                <div>
                  <p className="section-kicker">Employee profile</p>
                  <h2>{selectedPerson.name}</h2>
                </div>
              </div>
              <span className={`people-status ${availabilityClass[selectedPerson.availability]}`}>
                {selectedPerson.availability}
              </span>
            </div>

            <div className="detail-scroll">
              <div className="detail-content people-detail-content">
                <div className="summary-grid">
                  <div className="summary-card">
                    <span>System role</span>
                    <strong>{roleLabels[selectedPerson.role]}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Grade</span>
                    <strong>{selectedPerson.grade}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Base capacity</span>
                    <strong>{selectedPerson.capacity}</strong>
                  </div>
                  <div className="summary-card">
                    <span>Your access</span>
                    <strong>{roleLabels[profile.system_role]}</strong>
                  </div>
                </div>

                <div className="people-profile-grid">
                  <div className="content-panel people-contact-panel">
                    <div className="panel-header compact">
                      <div>
                        <p className="section-kicker">Contact</p>
                        <h3>Directory information</h3>
                      </div>
                    </div>

                    <div className="people-facts">
                      <div>
                        <Mail size={15} />
                        <span>{selectedPerson.email}</span>
                      </div>
                      <div>
                        <Building2 size={15} />
                        <span>{selectedPerson.businessUnit}</span>
                      </div>
                      <div>
                        <MapPin size={15} />
                        <span>{selectedPerson.location}</span>
                      </div>
                      <div>
                        <BriefcaseBusiness size={15} />
                        <span>{selectedPerson.projects.length} active contexts</span>
                      </div>
                    </div>
                  </div>

                  <div className="content-panel people-contact-panel">
                    <div className="panel-header compact">
                      <div>
                        <p className="section-kicker">Skills</p>
                        <h3>Profile signals</h3>
                      </div>
                    </div>

                    <div className="tag-list">
                      {selectedPerson.skills.map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>

                    <div className="cert-list">
                      {selectedPerson.certifications.map((certification) => (
                        <div key={certification}>
                          <BadgeCheck size={14} />
                          <span>{certification}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="content-panel">
                  <div className="panel-header compact">
                    <div>
                      <p className="section-kicker">Current assignments</p>
                      <h3>Project context</h3>
                    </div>
                    <span className="people-context-note">
                      Visibility will follow RLS later
                    </span>
                  </div>

                  <div className="assignment-list">
                    {selectedPerson.projects.map((project) => (
                      <div className="assignment-row" key={project.name}>
                        <div>
                          <strong>{project.name}</strong>
                          <span>{project.role}</span>
                        </div>
                        <div className="assignment-meta">
                          <span>{project.allocation}</span>
                          <i>{project.status}</i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="content-panel people-note-panel">
                  <ShieldCheck size={16} />
                  <p>
                    People is currently a demo directory. In the next data slice,
                    this page can read from `profiles`, skills, certifications and
                    assignments in Supabase instead of static demo data.
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
