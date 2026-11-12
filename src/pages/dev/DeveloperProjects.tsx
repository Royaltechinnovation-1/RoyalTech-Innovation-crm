import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { Project, ProjectStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

type Priority = "High" | "Medium" | "Low";
type ProjectView = {
  id: string;
  name: string;
  description: string;
  type: string;
  priority: Priority;
  status: ProjectStatus | "pending";
  progress: number;
  deadline: string;
  tone: "cyan" | "violet" | "amber" | "green" | "rose";
  team: { initials: string; name: string }[];
};

const DEMO: ProjectView[] = [
  {
    id: "demo1",
    name: "E-Commerce Platform",
    description: "Full-stack storefront with checkout, inventory sync, and admin tools.",
    type: "Web Development",
    priority: "High",
    status: "active",
    progress: 80,
    deadline: "2026-12-01",
    tone: "cyan",
    team: [
      { initials: "AS", name: "Amit Sharma" },
      { initials: "AI", name: "Ananya Iyer" },
      { initials: "PS", name: "Priya Singh" },
    ],
  },
  {
    id: "demo2",
    name: "Mobile App Development",
    description: "Cross-platform mobile app for customer engagement and push alerts.",
    type: "Mobile",
    priority: "Medium",
    status: "active",
    progress: 45,
    deadline: "2027-01-20",
    tone: "violet",
    team: [
      { initials: "RM", name: "Rohan Mehta" },
      { initials: "AI", name: "Ananya Iyer" },
    ],
  },
  {
    id: "demo3",
    name: "Website Redesign",
    description: "Marketing site redesign with new design system and CRM integrations.",
    type: "Web Development",
    priority: "High",
    status: "active",
    progress: 70,
    deadline: "2026-12-15",
    tone: "amber",
    team: [
      { initials: "PS", name: "Priya Singh" },
      { initials: "AS", name: "Amit Sharma" },
      { initials: "SK", name: "Simran Kaur" },
    ],
  },
  {
    id: "demo4",
    name: "HR Portal Revamp",
    description: "Employee portal for leave, attendance, and onboarding workflows.",
    type: "Internal Tools",
    priority: "Low",
    status: "completed",
    progress: 100,
    deadline: "2026-10-30",
    tone: "green",
    team: [
      { initials: "NK", name: "Neha Kapoor" },
      { initials: "AI", name: "Ananya Iyer" },
    ],
  },
  {
    id: "demo5",
    name: "Analytics Dashboard",
    description: "Executive KPI dashboards fed by nightly ETL pipelines.",
    type: "Data",
    priority: "Medium",
    status: "pending",
    progress: 15,
    deadline: "2026-12-28",
    tone: "rose",
    team: [
      { initials: "VS", name: "Vikram Shah" },
      { initials: "AI", name: "Ananya Iyer" },
    ],
  },
];

function priorityFor(project: Project): Priority {
  if (project.progress < 40 || project.status === "on_hold") return "High";
  if (project.progress < 75) return "Medium";
  return "Low";
}

function typeFor(name: string) {
  if (/mobile|app/i.test(name)) return "Mobile";
  if (/e-?commerce|shop/i.test(name)) return "Web Development";
  if (/website|redesign|crm/i.test(name)) return "Web Development";
  if (/hr|portal/i.test(name)) return "Internal Tools";
  return "Delivery";
}

function descriptionFor(name: string) {
  if (/e-?commerce/i.test(name)) return "Full-stack storefront with checkout and inventory sync.";
  if (/mobile/i.test(name)) return "Cross-platform mobile app for customer engagement.";
  if (/website|redesign/i.test(name)) return "Marketing site redesign with CRM integrations.";
  return "Assigned delivery project from your project manager.";
}

function toneFor(name: string, i: number): ProjectView["tone"] {
  if (/e-?commerce/i.test(name)) return "cyan";
  if (/mobile/i.test(name)) return "violet";
  if (/website|redesign/i.test(name)) return "amber";
  const tones: ProjectView["tone"][] = ["green", "rose", "cyan", "violet"];
  return tones[i % tones.length];
}

function statusBucket(p: ProjectView) {
  if (p.status === "completed" || p.progress >= 100) return "completed";
  if (p.status === "planned" || p.status === "pending" || p.progress < 25) return "pending";
  return "progress";
}

export function DeveloperProjects({ store }: { store: CrmStore }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const projects = useMemo(() => {
    const fromStore: ProjectView[] = store.data.projects.map((p, i) => {
      const client = store.data.clients.find((c) => c.id === p.clientId);
      const manager = store.data.users.find((u) => u.id === p.managerId);
      const assignees = store.visibleTasks
        .filter((t) => t.projectId === p.id)
        .map((t) => store.data.users.find((u) => u.id === t.assigneeId))
        .filter(Boolean);
      const unique = new Map<string, { initials: string; name: string }>();
      assignees.forEach((u) => {
        if (!u) return;
        unique.set(u.id, { initials: u.avatarInitials, name: u.name });
      });
      if (manager) unique.set(manager.id, { initials: manager.avatarInitials, name: manager.name });
      return {
        id: p.id,
        name: p.name,
        description: client
          ? `${descriptionFor(p.name)} Client: ${client.name}.`
          : descriptionFor(p.name),
        type: typeFor(p.name),
        priority: priorityFor(p),
        status: p.status,
        progress: p.progress,
        deadline: p.deadline,
        tone: toneFor(p.name, i),
        team: [...unique.values()].slice(0, 4),
      };
    });

    if (fromStore.length >= 3) return fromStore;
    const names = new Set(fromStore.map((p) => p.name.toLowerCase()));
    return [...fromStore, ...DEMO.filter((d) => !names.has(d.name.toLowerCase()))];
  }, [store]);

  const total = projects.length;
  const inProgress = projects.filter((p) => statusBucket(p) === "progress").length;
  const completed = projects.filter((p) => statusBucket(p) === "completed").length;
  const pending = projects.filter((p) => statusBucket(p) === "pending").length;
  const overall = total
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / total)
    : 0;

  const deadlines = useMemo(
    () =>
      [...projects]
        .filter((p) => statusBucket(p) !== "completed")
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 4),
    [projects],
  );

  const selected = projects.find((p) => p.id === selectedId) ?? null;
  const completedPct = total ? (completed / total) * 100 : 0;
  const progressPct = total ? ((completed + inProgress) / total) * 100 : 0;
  const donutStyle = {
    background: `conic-gradient(#16a34a 0 ${completedPct}%, #7c3aed ${completedPct}% ${progressPct}%, #ea580c ${progressPct}% 100%)`,
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page mp-page">
        <header className="mp-head">
          <h2>
            <span className="mp-title-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M4.5 8.5h6l1.6 1.8H19.5v8.2a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18.5V8.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            My Projects
          </h2>
          <p>View and manage your assigned projects.</p>
        </header>

        <section className="mp-kpis">
          <article className="mp-kpi tone-cyan">
            <span className="mp-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M4.5 8.5h6l1.6 1.8H19.5v8.2a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18.5V8.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <div>
              <p>Total Projects</p>
              <h3>{total}</h3>
            </div>
          </article>
          <article className="mp-kpi tone-violet">
            <span className="mp-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 12.5h14M12 5.5v14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <p>In Progress</p>
              <h3>{inProgress}</h3>
            </div>
          </article>
          <article className="mp-kpi tone-green">
            <span className="mp-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M5.5 12.5 10 17l8.5-9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <p>Completed</p>
              <h3>{completed}</h3>
            </div>
          </article>
          <article className="mp-kpi tone-amber">
            <span className="mp-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
                <path
                  d="M12 8.2v4.1l2.8 1.7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <p>Pending</p>
              <h3>{pending}</h3>
            </div>
          </article>
        </section>

        <section className="mp-layout">
          <div className="mp-main">
            {projects.map((project) => (
              <article key={project.id} className="mp-card">
                <span className={`mp-thumb tone-${project.tone}`} aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4.5 8.5h6l1.6 1.8H19.5v8.2a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 18.5V8.5Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
                <div className="mp-card-body">
                  <div className="mp-card-top">
                    <div>
                      <h3>{project.name}</h3>
                      <p>{project.description}</p>
                      <div className="mp-tags">
                        <span className="mp-type">{project.type}</span>
                        <span className={`mp-priority tone-${project.priority.toLowerCase()}`}>
                          {project.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mp-team" aria-label="Team">
                      {project.team.map((m) => (
                        <span key={m.name} title={m.name}>
                          {m.initials}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mp-progress-row">
                    <div className="mp-progress-track" aria-hidden>
                      <i style={{ width: `${project.progress}%` }} />
                    </div>
                    <strong>{project.progress}%</strong>
                  </div>
                  <footer className="mp-card-foot">
                    <span className="mp-deadline">
                      <svg viewBox="0 0 24 24" aria-hidden>
                        <rect
                          x="4.5"
                          y="5"
                          width="15"
                          height="15"
                          rx="2.2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                        <path
                          d="M8 3.6v2.4M16 3.6v2.4M4.5 10h15"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                      {formatDate(project.deadline)}
                    </span>
                    <button
                      type="button"
                      className="mp-view-btn"
                      onClick={() => setSelectedId(project.id)}
                    >
                      View Details →
                    </button>
                  </footer>
                </div>
              </article>
            ))}
          </div>

          <aside className="mp-side">
            <article className="mp-panel">
              <header>
                <h3>Upcoming Deadlines</h3>
              </header>
              <ul className="mp-deadline-list">
                {deadlines.map((d) => (
                  <li key={d.id}>
                    <span className={`mp-dot tone-${d.priority.toLowerCase()}`} />
                    <div>
                      <strong>{d.name}</strong>
                      <small>{formatDate(d.deadline)}</small>
                    </div>
                    <em className={`mp-priority tone-${d.priority.toLowerCase()}`}>{d.priority}</em>
                  </li>
                ))}
                {deadlines.length === 0 ? <li className="mp-empty">No upcoming deadlines.</li> : null}
              </ul>
            </article>

            <article className="mp-panel">
              <header>
                <h3>Project Overview</h3>
              </header>
              <div className="mp-overview">
                <div className="mp-donut" style={donutStyle} aria-hidden>
                  <div>
                    <strong>{overall}%</strong>
                    <small>Overall</small>
                  </div>
                </div>
                <ul>
                  <li>
                    <i className="tone-green" /> Completed <b>{completed}</b>
                  </li>
                  <li>
                    <i className="tone-violet" /> In Progress <b>{inProgress}</b>
                  </li>
                  <li>
                    <i className="tone-amber" /> Pending <b>{pending}</b>
                  </li>
                </ul>
              </div>
            </article>

            <article className="mp-motivate">
              <span className="mp-motivate-ico" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path
                    d="M8 5.5h8v3.2a4 4 0 0 1-8 0V5.5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M8 6.2H5.8A2.3 2.3 0 0 0 5.8 10c1.2 0 2.2-.7 2.2-1.8M16 6.2h2.2A2.3 2.3 0 0 1 18.2 10c-1.2 0-2.2-.7-2.2-1.8M10.5 12.8h3V15l-1.5 4h-0.01L10.5 15v-2.2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <p>Keep up the great work! You are on track with your projects.</p>
            </article>
          </aside>
        </section>

        {selected ? (
          <div className="mp-modal" role="dialog" aria-label="Project details">
            <div className="mp-modal-card">
              <header>
                <div>
                  <h3>{selected.name}</h3>
                  <p>{selected.description}</p>
                </div>
                <button type="button" onClick={() => setSelectedId(null)} aria-label="Close">
                  ×
                </button>
              </header>
              <div className="mp-modal-body">
                <p>
                  <strong>Type</strong> {selected.type}
                </p>
                <p>
                  <strong>Priority</strong> {selected.priority}
                </p>
                <p>
                  <strong>Progress</strong> {selected.progress}%
                </p>
                <p>
                  <strong>Deadline</strong> {formatDate(selected.deadline)}
                </p>
                <p>
                  <strong>Team</strong> {selected.team.map((t) => t.name).join(", ") || "—"}
                </p>
              </div>
              <footer>
                <Link className="mp-view-btn solid" to="/projects/tasks" onClick={() => setSelectedId(null)}>
                  Open Tasks
                </Link>
                <button type="button" className="mp-close" onClick={() => setSelectedId(null)}>
                  Close
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </RequirePermission>
  );
}
