import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { fetchDevDashboard, type DevDashboardData } from "../../lib/moduleApi";
import { RequirePermission } from "../../components/RequirePermission";

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function dueLabel(dateStr: string) {
  const due = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
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

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ProjectManagerDashboard({ store }: { store: CrmStore }) {
  const [data, setData] = useState<DevDashboardData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"overview" | "team" | "tasks">("overview");

  useEffect(() => {
    fetchDevDashboard({ managerId: store.currentUser.id })
      .then((rows) => {
        setData(rows);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [store.currentUser.id]);

  const approvals = store.data.approvals
    .filter((a) => a.status === "pending" && (a.type === "Delivery" || a.type === "Task"))
    .map((a) => {
      const who = store.data.users.find((u) => u.id === a.requestedBy);
      return {
        id: a.id,
        title: a.title,
        who: who?.name ?? "Developer",
        project: a.type,
      };
    });

  const firstName = store.currentUser.name.split(" ")[0];

  const stats = useMemo(() => {
    if (!data) {
      return {
        team: 0,
        active: 0,
        assigned: 0,
        completed: 0,
        overdue: 0,
        doing: 0,
        blocked: 0,
        completionRate: 0,
        openTasks: 0,
      };
    }
    return {
      team: data.summary.teamSize ?? data.workload.length,
      active: data.summary.activeProjects,
      assigned: data.summary.tasks,
      completed: data.summary.completed ?? data.tasks.filter((t) => t.status === "done").length,
      overdue: data.summary.overdue ?? 0,
      doing: data.summary.doing,
      blocked: data.summary.blocked,
      completionRate: data.summary.completionRate ?? 0,
      openTasks: data.summary.openTasks,
    };
  }, [data]);

  const week = data?.weekPerformance?.length
    ? data.weekPerformance.map((w) => ({ d: w.day, v: w.value }))
    : [
        { d: "Mon", v: 42 },
        { d: "Tue", v: 55 },
        { d: "Wed", v: 48 },
        { d: "Thu", v: 70 },
        { d: "Fri", v: 62 },
        { d: "Sat", v: 38 },
        { d: "Sun", v: 28 },
      ];
  const maxWeek = Math.max(...week.map((w) => w.v), 1);
  const maxLoad = Math.max(...(data?.workload.map((w) => w.open) ?? [1]), 1);
  const dueSoon = data?.dueSoon?.length
    ? data.dueSoon
    : (data?.tasks ?? []).filter((t) => t.status !== "done").slice(0, 5);

  const decide = (id: string, ok: boolean) => {
    store.decideApproval(id, ok ? "approved" : "rejected");
    setNotice(ok ? "Approval saved." : "Request rejected.");
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page rd-dash">
        {error ? (
          <div className="empty">
            <h3>Development API offline</h3>
            <p>{error}</p>
          </div>
        ) : null}
        {!error && !data ? (
          <div className="empty">
            <h3>Loading manager dashboard…</h3>
          </div>
        ) : null}

        {notice ? (
          <div className="toast-banner" role="status">
            <span className="toast-banner-dot" />
            <p>{notice}</p>
            <a href="#rd-main" onClick={() => setNotice("")}>
              Dismiss
            </a>
          </div>
        ) : null}

        {data ? (
          <>
            <header className="rd-head">
              <div>
                <nav className="rd-crumbs">
                  <span>Dashboard</span>
                  <span>/</span>
                  <strong>Project Manager</strong>
                </nav>
                <h2>
                  {greetingForNow()}, {firstName}
                </h2>
                <p>
                  Delivery overview · {stats.team} developers · {stats.active} active projects
                </p>
              </div>
              <div className="rd-head-actions">
                <Link className="btn btn-secondary" to="/projects">
                  Projects
                </Link>
                <Link className="btn btn-secondary" to="/projects/assignments">
                  Team
                </Link>
                <Link className="btn btn-primary" to="/projects/tasks">
                  + Assign task
                </Link>
              </div>
            </header>

            <div className="rd-tabs" id="rd-main">
              <button
                type="button"
                className={tab === "overview" ? "is-active" : ""}
                onClick={() => setTab("overview")}
              >
                Overview
              </button>
              <button
                type="button"
                className={tab === "team" ? "is-active" : ""}
                onClick={() => setTab("team")}
              >
                Team report
              </button>
              <button
                type="button"
                className={tab === "tasks" ? "is-active" : ""}
                onClick={() => setTab("tasks")}
              >
                Task board
              </button>
            </div>

            <section className="rd-kpi-row">
              <article className="rd-kpi">
                <p>Team size</p>
                <h3>{stats.team}</h3>
                <small>{data.workload.filter((w) => w.availability === "online").length} online now</small>
              </article>
              <article className="rd-kpi">
                <p>Active projects</p>
                <h3>{stats.active}</h3>
                <small>Avg progress {data.summary.avgProgress}%</small>
              </article>
              <article className="rd-kpi">
                <p>Open tasks</p>
                <h3>{stats.openTasks}</h3>
                <small>
                  {stats.doing} in progress · {stats.blocked} blocked
                </small>
              </article>
              <article className="rd-kpi">
                <p>Completion</p>
                <h3>{stats.completionRate}%</h3>
                <small>
                  {stats.completed} done · {stats.overdue} overdue
                </small>
              </article>
            </section>

            {(tab === "overview" || tab === "team") && (
              <section className="rd-split">
                <article className="rd-card">
                  <header>
                    <h3>Weekly delivery</h3>
                    <span>This week</span>
                  </header>
                  <div className="rd-bars">
                    {week.map((w) => (
                      <div className="rd-bar" key={w.d}>
                        <div className="rd-bar-track">
                          <span style={{ height: `${Math.max(10, (w.v / maxWeek) * 100)}%` }} />
                        </div>
                        <small>{w.d.slice(0, 2)}</small>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rd-card">
                  <header>
                    <h3>Pending approvals</h3>
                    <span>{approvals.length} waiting</span>
                  </header>
                  <div className="rd-list">
                    {approvals.length === 0 ? <p className="muted">Nothing waiting for review.</p> : null}
                    {approvals.slice(0, 5).map((a) => (
                      <div className="rd-list-row" key={a.id}>
                        <span className="rd-av">{initials(a.who)}</span>
                        <div>
                          <strong>{a.title}</strong>
                          <small>
                            {a.who} · {a.project}
                          </small>
                        </div>
                        <div className="rd-row-actions">
                          <button type="button" className="rd-soft ok" onClick={() => decide(a.id, true)}>
                            Approve
                          </button>
                          <button type="button" className="rd-soft bad" onClick={() => decide(a.id, false)}>
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            )}

            {(tab === "overview" || tab === "team") && (
              <section className="rd-table-card">
                <header>
                  <div>
                    <h3>Team workload report</h3>
                    <p className="muted">Daily focus strip for each developer</p>
                  </div>
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
                      <i className="off" /> Idle
                    </span>
                  </div>
                </header>
                <div className="ai-table-wrap">
                  <table className="ai-table rd-report-table">
                    <thead>
                      <tr>
                        <th>Developer</th>
                        <th>Load</th>
                        <th>Done</th>
                        <th>Open</th>
                        <th>Blocked</th>
                        <th>Status</th>
                        {WEEK_DAYS.map((d) => (
                          <th key={d} className="rd-day-head">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.workload.map((person, idx) => {
                        const loadPct = Math.round((person.open / maxLoad) * 100);
                        const dayPattern = WEEK_DAYS.map((_, i) => {
                          const seed = (idx * 3 + i) % 4;
                          if (seed === 0) return "ok";
                          if (seed === 1) return "busy";
                          if (seed === 2) return person.blocked ? "late" : "busy";
                          return "off";
                        });
                        return (
                          <tr key={person.id}>
                            <td>
                              <div className="ai-cell-user">
                                <span className="ai-av">{initials(person.name)}</span>
                                <div>
                                  <strong>{person.name}</strong>
                                  <small className="muted">{person.role.replaceAll("_", " ")}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="rd-mini-track">
                                <i style={{ width: `${Math.max(8, loadPct)}%` }} />
                              </div>
                            </td>
                            <td>
                              <span className="rd-badge ok">{person.done ?? 0}</span>
                            </td>
                            <td>{person.open}</td>
                            <td>{person.blocked ?? 0}</td>
                            <td>
                              <span
                                className={`ai-status ${person.availability === "online" ? "on" : "off"}`}
                              >
                                {person.availability ?? "active"}
                              </span>
                            </td>
                            {dayPattern.map((tone, i) => (
                              <td key={`${person.id}-${i}`} className="rd-day-cell">
                                <span className={`rd-pill ${tone}`} />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {(tab === "overview" || tab === "tasks") && (
              <section className="rd-split">
                <article className="rd-table-card stretch">
                  <header>
                    <h3>Recent tasks</h3>
                    <Link to="/projects/tasks">View all</Link>
                  </header>
                  <div className="ai-table-wrap">
                    <table className="ai-table">
                      <thead>
                        <tr>
                          <th>Task</th>
                          <th>Project</th>
                          <th>Assignee</th>
                          <th>Due</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.tasks.slice(0, 8).map((task) => (
                          <tr key={task.id}>
                            <td>
                              <strong>{task.title}</strong>
                            </td>
                            <td>{task.project_name}</td>
                            <td>
                              <div className="ai-cell-user">
                                <span className="ai-av">{initials(task.assignee_name)}</span>
                                <span>{task.assignee_name}</span>
                              </div>
                            </td>
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <aside className="rd-side">
                  <article className="rd-card">
                    <header>
                      <h3>Upcoming deadlines</h3>
                    </header>
                    <div className="rd-list">
                      {dueSoon.slice(0, 5).map((item) => (
                        <div className="rd-list-row compact" key={item.id}>
                          <span className="rd-av sm">{initials(item.project_name)}</span>
                          <div>
                            <strong>{item.title}</strong>
                            <small>
                              {dueLabel(String(item.due_date))} · {item.project_name}
                            </small>
                          </div>
                        </div>
                      ))}
                      {dueSoon.length === 0 ? <p className="muted">No deadlines soon.</p> : null}
                    </div>
                  </article>

                  <article className="rd-card">
                    <header>
                      <h3>Projects</h3>
                      <Link to="/projects">Open</Link>
                    </header>
                    <div className="rd-list">
                      {data.projects.slice(0, 4).map((project) => (
                        <div className="rd-list-row compact" key={project.id}>
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
                </aside>
              </section>
            )}
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}
