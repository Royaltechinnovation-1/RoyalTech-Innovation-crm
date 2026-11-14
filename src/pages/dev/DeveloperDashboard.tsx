import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { TaskStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { fetchDevDashboard, type DevDashboardData } from "../../lib/moduleApi";
import { RequirePermission } from "../../components/RequirePermission";
import { Select } from "../../components/ui";

const DEMO_PROJECTS = [
  { id: "pdemo1", name: "Website Redesign", progress: 70, deadline: "2026-12-20" },
  { id: "pdemo2", name: "Mobile App Development", progress: 45, deadline: "2027-01-20" },
  { id: "pdemo3", name: "E-commerce Platform", progress: 80, deadline: "2026-12-01" },
];

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function dueLabel(dateStr: string) {
  const due = new Date(dateStr.includes("T") ? dateStr : `${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return formatDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(due);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatDate(dateStr);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function DeveloperDashboard({ store }: { store: CrmStore }) {
  const [data, setData] = useState<DevDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"overview" | "tasks" | "projects">("overview");
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchDevDashboard({ assigneeId: store.currentUser.id })
      .then((rows) => {
        if (!alive) return;
        setData(rows);
      })
      .catch(() => {
        if (!alive) return;
        setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [store.currentUser.id]);

  const firstName = store.currentUser.name.split(" ")[0];
  const manager =
    store.data.users.find((u) => u.id === store.currentUser.managerId) ??
    store.data.users.find((u) => u.role === "project_manager") ??
    store.data.users.find((u) => u.id === "u5");

  const tasks = useMemo(() => {
    if (store.visibleTasks.length) {
      return store.visibleTasks.map((t) => {
        const project = store.data.projects.find((p) => p.id === t.projectId);
        return {
          id: t.id,
          title: t.title,
          status: t.status as TaskStatus,
          due_date: t.dueDate,
          project_name: project?.name ?? "—",
        };
      });
    }
    return (data?.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
      due_date: t.due_date,
      project_name: t.project_name,
    }));
  }, [store.visibleTasks, store.data.projects, data?.tasks]);

  const total = tasks.length;
  const doing = tasks.filter((t) => t.status === "doing").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pending = tasks.filter((t) => t.status === "todo" || t.status === "blocked").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const completedPct = total ? Math.round((done / Math.max(total, 1)) * 100) : 0;

  const projects =
    data?.projects?.length
      ? data.projects
      : store.data.projects.length
        ? store.data.projects.map((p) => ({
            id: p.id,
            name: p.name,
            progress: p.progress,
            deadline: p.deadline,
          }))
        : DEMO_PROJECTS;

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);
  const upcoming = tasks
    .filter((t) => t.status !== "done")
    .slice()
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 5);

  const setStatus = (id: string, status: TaskStatus) => {
    store.updateTaskStatus(id, status);
    setNotice(status === "done" ? "Task marked done." : `Task moved to ${status}.`);
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page rd-dash">
        {loading && !tasks.length ? (
          <div className="empty">
            <h3>Loading developer dashboard…</h3>
          </div>
        ) : null}

        {notice ? (
          <div className="toast-banner" role="status">
            <span className="toast-banner-dot" />
            <p>{notice}</p>
            <a href="#rd-dev" onClick={() => setNotice("")}>
              Dismiss
            </a>
          </div>
        ) : null}

        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>Dashboard</span>
              <span>/</span>
              <strong>Developer</strong>
            </nav>
            <h2>
              {greetingForNow()}, {firstName}
            </h2>
            <p>
              Your desk · Manager {manager?.name ?? "—"} · {projects.length} projects · {total} tasks
            </p>
          </div>
          <div className="rd-head-actions">
            <Link className="btn btn-secondary" to="/projects/tasks">
              My tasks
            </Link>
            <Link className="btn btn-primary" to="/dev/daily-report">
              Daily report
            </Link>
          </div>
        </header>

        <div className="rd-tabs" id="rd-dev">
          <button
            type="button"
            className={tab === "overview" ? "is-active" : ""}
            onClick={() => setTab("overview")}
          >
            Overview
          </button>
          <button
            type="button"
            className={tab === "tasks" ? "is-active" : ""}
            onClick={() => setTab("tasks")}
          >
            My tasks
          </button>
          <button
            type="button"
            className={tab === "projects" ? "is-active" : ""}
            onClick={() => setTab("projects")}
          >
            Projects
          </button>
        </div>

        <section className="rd-kpi-row">
          <article className="rd-kpi">
            <p>Total tasks</p>
            <h3>{total}</h3>
            <small>{doing + pending} still open</small>
          </article>
          <article className="rd-kpi">
            <p>In progress</p>
            <h3>{doing}</h3>
            <small>Focus work right now</small>
          </article>
          <article className="rd-kpi">
            <p>Pending</p>
            <h3>{pending}</h3>
            <small>{blocked} blocked</small>
          </article>
          <article className="rd-kpi">
            <p>Completed</p>
            <h3>{done}</h3>
            <small>{completedPct}% of assigned</small>
          </article>
        </section>

        {(tab === "overview" || tab === "tasks") && (
          <section className="rd-table-card">
            <header>
              <div>
                <h3>Task list</h3>
                <p className="muted">Update status as you work</p>
              </div>
              <div className="rd-head-actions">
                <div className="rd-legend">
                  <span>
                    <i className="ok" /> Done
                  </span>
                  <span>
                    <i className="busy" /> Doing
                  </span>
                  <span>
                    <i className="late" /> Blocked
                  </span>
                  <span>
                    <i className="off" /> Todo
                  </span>
                </div>
                <select
                  className="ai-sort"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                >
                  <option value="all">All status</option>
                  <option value="todo">Todo</option>
                  <option value="doing">Doing</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              </div>
            </header>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Task</th>
                    <th>Project</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((task) => (
                    <tr key={task.id}>
                      <td>
                        <span className="link-id">{task.id.toUpperCase()}</span>
                      </td>
                      <td>
                        <strong>{task.title}</strong>
                      </td>
                      <td>{task.project_name}</td>
                      <td>{dueLabel(String(task.due_date))}</td>
                      <td>
                        <span
                          className={`ai-status ${task.status === "done" ? "on" : task.status === "blocked" ? "off" : "on"}`}
                          style={
                            task.status === "doing" || task.status === "todo"
                              ? { background: "#eef3ff", color: "#4b7bf5" }
                              : undefined
                          }
                        >
                          {task.status}
                        </span>
                      </td>
                      <td>
                        <Select
                          value={task.status}
                          onChange={(e) => setStatus(task.id, e.target.value as TaskStatus)}
                        >
                          <option value="todo">Todo</option>
                          <option value="doing">Doing</option>
                          <option value="blocked">Blocked</option>
                          <option value="done">Done</option>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        No tasks in this filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(tab === "overview" || tab === "projects") && (
          <section className="rd-split">
            <article className="rd-card">
              <header>
                <h3>Project progress</h3>
                <Link to="/projects">Open projects</Link>
              </header>
              <div className="rd-list">
                {projects.slice(0, 6).map((project) => (
                  <div className="rd-list-row compact" key={project.id}>
                    <span className="rd-av">{initials(project.name)}</span>
                    <div style={{ flex: 1 }}>
                      <strong>{project.name}</strong>
                      <div className="rd-mini-track tall">
                        <i style={{ width: `${project.progress}%` }} />
                      </div>
                      <small>
                        {project.progress}% · due {formatDate(String(project.deadline))}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <aside className="rd-side">
              <article className="rd-card">
                <header>
                  <h3>Due soon</h3>
                </header>
                <div className="rd-list">
                  {upcoming.map((task) => (
                    <div className="rd-list-row compact" key={task.id}>
                      <span className="rd-av sm">{initials(task.title)}</span>
                      <div>
                        <strong>{task.title}</strong>
                        <small>
                          {dueLabel(String(task.due_date))} · {task.project_name}
                        </small>
                      </div>
                    </div>
                  ))}
                  {upcoming.length === 0 ? <p className="muted">No upcoming due dates.</p> : null}
                </div>
              </article>

              <article className="rd-card">
                <header>
                  <h3>Manager</h3>
                </header>
                {manager ? (
                  <div className="rd-list-row">
                    <span className="rd-av">{manager.avatarInitials}</span>
                    <div>
                      <strong>{manager.name}</strong>
                      <small>{manager.email}</small>
                    </div>
                  </div>
                ) : (
                  <p className="muted">No manager linked.</p>
                )}
              </article>
            </aside>
          </section>
        )}
      </div>
    </RequirePermission>
  );
}
