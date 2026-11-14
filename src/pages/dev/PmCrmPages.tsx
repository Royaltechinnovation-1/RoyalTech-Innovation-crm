import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { ProjectStatus, TaskStatus } from "../../types";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  assignDevTaskApi,
  createDeveloperApi,
  createDevTaskApi,
} from "../../lib/moduleApi";
import { Field, Input, Select } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

function statusTone(status: string) {
  if (status === "done" || status === "completed" || status === "active") {
    return { background: "#e8f8ef", color: "#16a34a" };
  }
  if (status === "blocked" || status === "on_hold" || status === "inactive") {
    return { background: "#fef2f2", color: "#ef4444" };
  }
  if (status === "doing" || status === "planned") {
    return { background: "#eef3ff", color: "#4b7bf5" };
  }
  return { background: "#fff7e8", color: "#b45309" };
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="ai-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="ai-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button className="ai-menu" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** Real project portfolio for Project Manager */
export function PmProjects({ store }: { store: CrmStore }) {
  const projects = store.visibleProjects;
  const tasks = store.visibleTasks;
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    name: "",
    deadline: new Date().toISOString().slice(0, 10),
    budget: "0",
    status: "planned" as ProjectStatus,
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects
      .filter((p) => !q || `${p.name} ${p.status}`.toLowerCase().includes(q))
      .map((p) => {
        const open = tasks.filter((t) => t.projectId === p.id && t.status !== "done").length;
        const done = tasks.filter((t) => t.projectId === p.id && t.status === "done").length;
        const client = store.data.clients.find((c) => c.id === p.clientId);
        return { project: p, open, done, client };
      });
  }, [projects, query, store.data.clients, tasks]);

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const res = store.createProject({
      name: form.name,
      deadline: form.deadline,
      budget: Number(form.budget) || 0,
      status: form.status,
      managerId: store.currentUser.id,
    });
    if (!res.ok) {
      setErr(res.error);
      return;
    }
    setToast(`Project “${form.name}” created`);
    setForm({
      name: "",
      deadline: new Date().toISOString().slice(0, 10),
      budget: "0",
      status: "planned",
    });
    setModal(false);
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page rd-dash">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>Delivery</span>
              <span>/</span>
              <strong>Projects</strong>
            </nav>
            <h2>Project portfolio</h2>
            <p>Your delivery projects — create, track progress, and open tasks.</p>
          </div>
          <div className="rd-head-actions">
            <Link className="btn btn-secondary" to="/projects/assignments">
              Team
            </Link>
            <button className="btn btn-primary" type="button" onClick={() => setModal(true)}>
              + New project
            </button>
          </div>
        </header>

        {toast ? (
          <div className="toast-banner">
            <span className="toast-banner-dot" />
            {toast}
            <a href="#pm-projects" onClick={() => setToast("")}>
              Dismiss
            </a>
          </div>
        ) : null}

        <div className="ai-toolbar" id="pm-projects">
          <div className="ai-toolbar-left">
            <input
              className="ai-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
            />
          </div>
          <span className="muted">{rows.length} projects</span>
        </div>

        <section className="rd-kpi-row">
          <article className="rd-kpi">
            <p>Total</p>
            <h3>{projects.length}</h3>
            <small>In your portfolio</small>
          </article>
          <article className="rd-kpi">
            <p>Active</p>
            <h3>{projects.filter((p) => p.status === "active").length}</h3>
            <small>In flight</small>
          </article>
          <article className="rd-kpi">
            <p>Open tasks</p>
            <h3>{tasks.filter((t) => t.status !== "done").length}</h3>
            <small>Across projects</small>
          </article>
          <article className="rd-kpi">
            <p>Budget</p>
            <h3>{formatCurrency(projects.reduce((s, p) => s + p.budget, 0))}</h3>
            <small>Portfolio value</small>
          </article>
        </section>

        <section className="rd-table-card">
          <header>
            <h3>Project list</h3>
            <Link to="/projects/tasks">Open tasks</Link>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Project</th>
                  <th>Client</th>
                  <th>Progress</th>
                  <th>Open tasks</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ project, open, done, client }) => (
                  <tr key={project.id}>
                    <td>
                      <span className="link-id">{project.id.toUpperCase()}</span>
                    </td>
                    <td>
                      <strong>{project.name}</strong>
                    </td>
                    <td>{client?.company ?? "—"}</td>
                    <td style={{ minWidth: 140 }}>
                      <div className="rd-mini-track tall">
                        <i style={{ width: `${project.progress}%` }} />
                      </div>
                      <small className="muted">
                        {project.progress}% · {done} done
                      </small>
                    </td>
                    <td>{open}</td>
                    <td>{formatDate(project.deadline)}</td>
                    <td>
                      <span className="ai-status on" style={statusTone(project.status)}>
                        {project.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <Link className="btn btn-secondary" to="/projects/tasks">
                        Tasks
                      </Link>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="muted">
                      No projects yet. Create one to start assigning work.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {modal ? (
          <Modal title="Create project" onClose={() => setModal(false)}>
            <form className="form-grid" onSubmit={onCreate}>
              <Field label="Project name">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Client Portal Refresh"
                  required
                />
              </Field>
              <Field label="Deadline">
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Budget">
                <Input
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))
                  }
                >
                  <option value="planned">Planned</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                </Select>
              </Field>
              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit">
                  Create project
                </button>
              </div>
              {err ? <p className="form-error">{err}</p> : null}
            </form>
          </Modal>
        ) : null}
      </div>
    </RequirePermission>
  );
}

/** PM task board with assign + status */
export function PmTasks({ store }: { store: CrmStore }) {
  const projects = store.visibleProjects;
  const developers = store.teamDevelopers;
  const tasks = store.visibleTasks;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TaskStatus>("all");
  const [projectId, setProjectId] = useState("all");
  const [modal, setModal] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    projectId: projects[0]?.id ?? "",
    title: "",
    assigneeId: developers[0]?.id ?? "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const rows = useMemo(() => {
    return tasks
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) => (projectId === "all" ? true : t.projectId === projectId))
      .filter((t) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const project = projects.find((p) => p.id === t.projectId);
        const user = developers.find((d) => d.id === t.assigneeId);
        return `${t.title} ${project?.name ?? ""} ${user?.name ?? ""}`.toLowerCase().includes(q);
      });
  }, [developers, projectId, projects, query, status, tasks]);

  const onAssign = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    let apiId: string | undefined;
    try {
      const api = await createDevTaskApi(form);
      apiId = api.task.id;
    } catch {
      /* local still works */
    }
    const local = store.createTask({ ...form, id: apiId });
    if (!local.ok) {
      setErr(local.error);
      setSaving(false);
      return;
    }
    setToast("Task assigned");
    setForm((f) => ({ ...f, title: "", dueDate: new Date().toISOString().slice(0, 10) }));
    setModal(false);
    setSaving(false);
  };

  return (
    <RequirePermission store={store} permission="projects.tasks">
      <div className="page rd-dash">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>Delivery</span>
              <span>/</span>
              <strong>Tasks</strong>
            </nav>
            <h2>Task board</h2>
            <p>Assign work to your developers and track status.</p>
          </div>
          <div className="rd-head-actions">
            <Link className="btn btn-secondary" to="/projects/assignments">
              Team logins
            </Link>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  projectId: f.projectId || projects[0]?.id || "",
                  assigneeId: f.assigneeId || developers[0]?.id || "",
                }));
                setModal(true);
              }}
            >
              + Assign task
            </button>
          </div>
        </header>

        {toast ? (
          <div className="toast-banner">
            <span className="toast-banner-dot" />
            {toast}
            <a href="#pm-tasks" onClick={() => setToast("")}>
              Dismiss
            </a>
          </div>
        ) : null}

        <div className="ai-toolbar" id="pm-tasks">
          <div className="ai-toolbar-left">
            <input
              className="ai-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
            />
            <select className="ai-sort" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              className="ai-sort"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              <option value="all">All status</option>
              <option value="todo">Todo</option>
              <option value="doing">Doing</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <span className="muted">{rows.length} tasks</span>
        </div>

        <section className="rd-kpi-row">
          <article className="rd-kpi">
            <p>Open</p>
            <h3>{tasks.filter((t) => t.status !== "done").length}</h3>
            <small>Not finished</small>
          </article>
          <article className="rd-kpi">
            <p>Doing</p>
            <h3>{tasks.filter((t) => t.status === "doing").length}</h3>
            <small>In progress</small>
          </article>
          <article className="rd-kpi">
            <p>Blocked</p>
            <h3>{tasks.filter((t) => t.status === "blocked").length}</h3>
            <small>Needs unblock</small>
          </article>
          <article className="rd-kpi">
            <p>Done</p>
            <h3>{tasks.filter((t) => t.status === "done").length}</h3>
            <small>Completed</small>
          </article>
        </section>

        <section className="rd-table-card">
          <header>
            <h3>Assignment list</h3>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Task</th>
                  <th>Project</th>
                  <th>Developer</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Reassign</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => {
                  const project = projects.find((p) => p.id === task.projectId);
                  const user = store.data.users.find((u) => u.id === task.assigneeId);
                  return (
                    <tr key={task.id}>
                      <td>
                        <span className="link-id">{task.id.toUpperCase()}</span>
                      </td>
                      <td>
                        <strong>{task.title}</strong>
                      </td>
                      <td>{project?.name ?? "—"}</td>
                      <td>
                        <div className="ai-cell-user">
                          <span className="ai-av">{user?.avatarInitials ?? "?"}</span>
                          <span>{user?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td>{formatDate(task.dueDate)}</td>
                      <td>
                        <Select
                          value={task.status}
                          onChange={(e) =>
                            store.updateTaskStatus(task.id, e.target.value as TaskStatus)
                          }
                        >
                          <option value="todo">Todo</option>
                          <option value="doing">Doing</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </Select>
                      </td>
                      <td>
                        <Select
                          value={task.assigneeId}
                          onChange={async (e) => {
                            const assigneeId = e.target.value;
                            store.assignTask(task.id, assigneeId);
                            try {
                              await assignDevTaskApi(task.id, assigneeId);
                            } catch {
                              /* local applied */
                            }
                          }}
                        >
                          {developers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      No tasks match. Assign a task to your team.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {modal ? (
          <Modal title="Assign task" onClose={() => setModal(false)}>
            <form className="form-grid" onSubmit={onAssign}>
              <Field label="Project">
                <Select
                  value={form.projectId}
                  onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Task title">
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </Field>
              <Field label="Developer">
                <Select
                  value={form.assigneeId}
                  onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  required
                >
                  {developers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                  required
                />
              </Field>
              <div className="form-actions">
                <button className="btn btn-secondary" type="button" onClick={() => setModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={saving || !projects.length || !developers.length}
                >
                  {saving ? "Assigning…" : "Assign"}
                </button>
              </div>
              {err ? <p className="form-error">{err}</p> : null}
            </form>
          </Modal>
        ) : null}
      </div>
    </RequirePermission>
  );
}

export function PmWorkload({ store }: { store: CrmStore }) {
  const developers = store.teamDevelopers;
  const tasks = store.visibleTasks;

  const rows = developers.map((dev) => {
    const mine = tasks.filter((t) => t.assigneeId === dev.id);
    const open = mine.filter((t) => t.status !== "done").length;
    const doing = mine.filter((t) => t.status === "doing").length;
    const blocked = mine.filter((t) => t.status === "blocked").length;
    const done = mine.filter((t) => t.status === "done").length;
    return { dev, open, doing, blocked, done, total: mine.length };
  });
  const maxOpen = Math.max(...rows.map((r) => r.open), 1);

  return (
    <RequirePermission store={store} permission="projects.workload">
      <div className="page rd-dash">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>Delivery</span>
              <span>/</span>
              <strong>Workload</strong>
            </nav>
            <h2>Team workload</h2>
            <p>Balance open work across your developers.</p>
          </div>
          <Link className="btn btn-primary" to="/projects/tasks">
            Assign task
          </Link>
        </header>

        <section className="rd-kpi-row">
          {rows.slice(0, 4).map((r) => (
            <article className="rd-kpi" key={r.dev.id}>
              <p>{r.dev.name}</p>
              <h3>{r.open}</h3>
              <small>
                {r.doing} doing · {r.blocked} blocked
              </small>
            </article>
          ))}
          {rows.length === 0 ? (
            <article className="rd-kpi">
              <p>Developers</p>
              <h3>0</h3>
              <small>Add a developer login first</small>
            </article>
          ) : null}
        </section>

        <section className="rd-table-card">
          <header>
            <h3>Capacity board</h3>
            <Link to="/projects/assignments">Manage team</Link>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>Developer</th>
                  <th>Email / login</th>
                  <th>Load</th>
                  <th>Open</th>
                  <th>Doing</th>
                  <th>Blocked</th>
                  <th>Done</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.dev.id}>
                    <td>
                      <div className="ai-cell-user">
                        <span className="ai-av">{r.dev.avatarInitials}</span>
                        <strong>{r.dev.name}</strong>
                      </div>
                    </td>
                    <td>{r.dev.email}</td>
                    <td style={{ minWidth: 120 }}>
                      <div className="rd-mini-track">
                        <i style={{ width: `${Math.max(8, (r.open / maxOpen) * 100)}%` }} />
                      </div>
                    </td>
                    <td>{r.open}</td>
                    <td>{r.doing}</td>
                    <td>{r.blocked}</td>
                    <td>
                      <span className="rd-badge ok">{r.done}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}

export function PmMilestones({ store }: { store: CrmStore }) {
  const projects = [...store.visibleProjects].sort((a, b) => a.deadline.localeCompare(b.deadline));
  const tasks = store.visibleTasks;

  return (
    <RequirePermission store={store} permission="projects.milestones">
      <div className="page rd-dash">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>Delivery</span>
              <span>/</span>
              <strong>Milestones</strong>
            </nav>
            <h2>Deadlines & milestones</h2>
            <p>Project due dates for your portfolio.</p>
          </div>
          <Link className="btn btn-secondary" to="/projects">
            Projects
          </Link>
        </header>

        <section className="rd-table-card">
          <header>
            <h3>Upcoming deadlines</h3>
          </header>
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Progress</th>
                  <th>Open tasks</th>
                  <th>Deadline</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const open = tasks.filter((t) => t.projectId === p.id && t.status !== "done").length;
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <div className="rd-mini-track tall">
                          <i style={{ width: `${p.progress}%` }} />
                        </div>
                        <small className="muted">{p.progress}%</small>
                      </td>
                      <td>{open}</td>
                      <td>{formatDate(p.deadline)}</td>
                      <td>
                        <span className="ai-status on" style={statusTone(p.status)}>
                          {p.status.replaceAll("_", " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}

export function PmReports({ store }: { store: CrmStore }) {
  const projects = store.visibleProjects;
  const tasks = store.visibleTasks;
  const developers = store.teamDevelopers;
  const open = tasks.filter((t) => t.status !== "done").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <RequirePermission store={store} permission="projects.reports">
      <div className="page rd-dash">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>Delivery</span>
              <span>/</span>
              <strong>Reports</strong>
            </nav>
            <h2>Delivery reports</h2>
            <p>Scoped to your team and projects only.</p>
          </div>
        </header>

        <section className="rd-kpi-row">
          <article className="rd-kpi">
            <p>Projects</p>
            <h3>{projects.length}</h3>
            <small>{projects.filter((p) => p.status === "active").length} active</small>
          </article>
          <article className="rd-kpi">
            <p>Open tasks</p>
            <h3>{open}</h3>
            <small>{blocked} blocked</small>
          </article>
          <article className="rd-kpi">
            <p>Completion</p>
            <h3>{completion}%</h3>
            <small>{done} done</small>
          </article>
          <article className="rd-kpi">
            <p>Team</p>
            <h3>{developers.length}</h3>
            <small>Developers reporting to you</small>
          </article>
        </section>

        <section className="rd-split">
          <article className="rd-table-card stretch">
            <header>
              <h3>Per-developer completion</h3>
            </header>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Developer</th>
                    <th>Total</th>
                    <th>Done</th>
                    <th>Open</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {developers.map((d) => {
                    const mine = tasks.filter((t) => t.assigneeId === d.id);
                    const dDone = mine.filter((t) => t.status === "done").length;
                    const rate = mine.length ? Math.round((dDone / mine.length) * 100) : 0;
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="ai-cell-user">
                            <span className="ai-av">{d.avatarInitials}</span>
                            {d.name}
                          </div>
                        </td>
                        <td>{mine.length}</td>
                        <td>{dDone}</td>
                        <td>{mine.length - dDone}</td>
                        <td>
                          <span className="rd-badge ok">{rate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rd-card">
            <header>
              <h3>Budget snapshot</h3>
            </header>
            <div className="rd-list">
              {projects.map((p) => (
                <div className="rd-list-row compact" key={p.id}>
                  <div style={{ flex: 1 }}>
                    <strong>{p.name}</strong>
                    <small>
                      {formatCurrency(p.budget)} · {p.progress}%
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </RequirePermission>
  );
}

/** Team + credentials + assign — keep existing Assignments but harden API sync */
export async function syncCreateDeveloper(
  store: CrmStore,
  input: { name: string; email: string; password: string; managerId: string },
) {
  let apiId: string | undefined;
  try {
    const api = await createDeveloperApi(input);
    apiId = api.developer.id;
  } catch {
    /* local login still works */
  }
  return store.createDeveloper({ ...input, id: apiId });
}
