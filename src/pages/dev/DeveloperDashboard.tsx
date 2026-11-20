import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Bug,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  ListTodo,
  MapPin,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import type { TaskStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { fetchDevDashboard, type DevDashboardData } from "../../lib/moduleApi";
import { RequirePermission } from "../../components/RequirePermission";
import { officeCrmLocation, type CrmOpenLocation } from "../../lib/locationTrack";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function longDate(d = new Date()) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function shortTime(d = new Date()) {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
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

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type SortKey = "title" | "project" | "due" | "status";

type DevTaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  due_date: string;
  project_name: string;
};

function buildLocalDevData(store: CrmStore): {
  tasks: DevTaskRow[];
  projects: Array<{ id: string; name: string; progress: number; deadline: string }>;
} {
  const tasks = store.visibleTasks.map((t) => {
    const project = store.data.projects.find((p) => p.id === t.projectId);
    return {
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
      due_date: t.dueDate,
      project_name: project?.name ?? "—",
    };
  });
  const projectIds = new Set(store.visibleTasks.map((t) => t.projectId));
  const projects = store.data.projects
    .filter((p) => projectIds.has(p.id) || p.managerId === store.currentUser.managerId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      progress: p.progress,
      deadline: p.deadline,
    }));
  return { tasks, projects };
}

export function DeveloperDashboard({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const manager =
    store.data.users.find((u) => u.id === me.managerId) ??
    store.data.users.find((u) => u.role === "project_manager");

  const [apiData, setApiData] = useState<DevDashboardData | null>(null);
  const [notice, setNotice] = useState("");
  const [gps, setGps] = useState<CrmOpenLocation | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [snapQuery, setSnapQuery] = useState("");
  const [snapProject, setSnapProject] = useState("all");
  const [snapStatus, setSnapStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchDevDashboard({ assigneeId: me.id })
      .then((rows) => {
        if (alive) setApiData(rows);
      })
      .catch(() => {
        if (alive) setApiData(null);
      });
    return () => {
      alive = false;
    };
  }, [me.id, store.data.tasks, store.data.projects]);

  const local = useMemo(() => buildLocalDevData(store), [store]);

  const tasks: DevTaskRow[] = useMemo(() => {
    if (local.tasks.length) return local.tasks;
    return (apiData?.tasks ?? []).map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
      due_date: String(t.due_date),
      project_name: t.project_name,
    }));
  }, [apiData?.tasks, local.tasks]);

  const projects = useMemo(() => {
    if (local.projects.length) return local.projects;
    return (apiData?.projects ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      progress: p.progress,
      deadline: String(p.deadline),
    }));
  }, [apiData?.projects, local.projects]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const doing = tasks.filter((t) => t.status === "doing").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const blocked = tasks.filter((t) => t.status === "blocked").length;
    const open = total - done;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = tasks.filter((t) => {
      if (t.status === "done") return false;
      const d = new Date(`${String(t.due_date).slice(0, 10)}T12:00:00`);
      return !Number.isNaN(d.getTime()) && d < today;
    }).length;
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
      : 0;
    return {
      total,
      doing,
      done,
      todo,
      blocked,
      open,
      overdue,
      projects: projects.length,
      avgProgress,
      completionRate: total ? Math.round((done / total) * 100) : 0,
    };
  }, [projects, tasks]);

  const weekTrend = useMemo(() => {
    const base = Math.max(stats.done, 1);
    return WEEK_DAYS.map((label, idx) => {
      const value = Math.max(1, Math.round(base * (0.45 + ((idx * 17) % 40) / 100)));
      return { label, idx, value, pct: Math.min(100, Math.round((value / (base + 3)) * 100)) };
    });
  }, [stats.done]);

  const projectRows = useMemo(() => {
    const max = Math.max(...projects.map((p) => p.progress || 0), 1);
    return projects.slice(0, 6).map((p) => ({
      name: p.name,
      count: p.progress,
      pct: Math.round((p.progress / max) * 100),
      deadline: p.deadline,
    }));
  }, [projects]);

  const pipeline = [
    { label: "Todo", value: stats.todo },
    { label: "Doing", value: stats.doing },
    { label: "Blocked", value: stats.blocked },
    { label: "Done", value: stats.done },
  ];
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  const pendingActions = [
    {
      id: "todo",
      title: "Tasks to start",
      count: stats.todo,
      detail: "Move into doing when ready",
      path: "/projects/tasks",
      icon: ListTodo,
    },
    {
      id: "blocked",
      title: "Blocked items",
      count: stats.blocked,
      detail: "Needs manager / unblock",
      path: "/projects/tasks",
      icon: Bug,
    },
    {
      id: "overdue",
      title: "Overdue",
      count: stats.overdue,
      detail: `${stats.open} open in total`,
      path: "/projects/tasks",
      icon: CheckCircle2,
    },
    {
      id: "report",
      title: "Daily report",
      count: 1,
      detail: "Submit standup for your manager",
      path: "/dev/daily-report",
      icon: ClipboardList,
    },
  ];
  const pendingTotal = pendingActions.reduce((s, a) => s + a.count, 0);

  const myTodoToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks
      .filter((t) => t.status !== "done")
      .map((t) => {
        const due = new Date(`${String(t.due_date).slice(0, 10)}T12:00:00`);
        const day = new Date(due);
        day.setHours(0, 0, 0, 0);
        const diff = Number.isNaN(day.getTime())
          ? 99
          : Math.round((day.getTime() - today.getTime()) / 86400000);
        return { t, diff };
      })
      .filter(({ diff }) => diff <= 0)
      .sort((a, b) => a.diff - b.diff || a.t.title.localeCompare(b.t.title))
      .slice(0, 8)
      .map(({ t, diff }) => ({
        id: t.id,
        time: diff < 0 ? "Overdue" : "Today",
        title: t.title,
        who: t.project_name,
        kind: t.status,
        overdue: diff < 0,
      }));
  }, [tasks]);

  const activity = useMemo(() => {
    return tasks.slice(0, 8).map((t) => ({
      id: t.id,
      title: `Task ${t.status}`,
      detail: `${t.title} · ${t.project_name}`,
      time: dueLabel(String(t.due_date)),
    }));
  }, [tasks]);

  const projectsFilter = useMemo(() => {
    const names = Array.from(new Set(tasks.map((t) => t.project_name)));
    return ["all", ...names];
  }, [tasks]);

  const statuses = useMemo(() => {
    const rows = Array.from(new Set(tasks.map((t) => t.status)));
    return ["all", ...rows];
  }, [tasks]);

  const snapshotRows = useMemo(() => {
    const q = snapQuery.trim().toLowerCase();
    const rows = [...tasks].filter((t) => {
      if (snapStatus !== "all" && t.status !== snapStatus) return false;
      if (snapProject !== "all" && t.project_name !== snapProject) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) || t.project_name.toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) => {
      const av =
        sortKey === "title"
          ? a.title
          : sortKey === "project"
            ? a.project_name
            : sortKey === "due"
              ? String(a.due_date)
              : a.status;
      const bv =
        sortKey === "title"
          ? b.title
          : sortKey === "project"
            ? b.project_name
            : sortKey === "due"
              ? String(b.due_date)
              : b.status;
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows.slice(0, 10);
  }, [snapProject, snapQuery, snapStatus, sortDir, sortKey, tasks]);

  const upcoming = useMemo(() => {
    return tasks
      .filter((t) => t.status !== "done")
      .slice()
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        label: "Task",
        title: t.title,
        meta: t.project_name,
        when: dueLabel(String(t.due_date)),
      }));
  }, [tasks]);

  const kpis = [
    {
      label: "My Projects",
      value: stats.projects,
      hint: `Avg progress ${stats.avgProgress}%`,
      path: "/projects",
      icon: FolderKanban,
    },
    {
      label: "Open Tasks",
      value: stats.open,
      hint: `${stats.doing} doing · ${stats.todo} todo`,
      path: "/projects/tasks",
      icon: ListTodo,
    },
    {
      label: "Blocked",
      value: stats.blocked,
      hint: `${stats.overdue} overdue`,
      path: "/projects/tasks",
      icon: Bug,
    },
    {
      label: "Completion",
      value: `${stats.completionRate}%`,
      hint: `${stats.done} done of ${stats.total}`,
      path: "/dev/daily-report",
      icon: CheckCircle2,
    },
  ];

  const detectLocation = () => {
    if (gpsBusy) return;
    setGpsBusy(true);
    const loc = officeCrmLocation();
    setGps(loc);
    store.recordCrmOpenLocation(loc);
    setGpsBusy(false);
  };

  const setStatus = (id: string, status: TaskStatus) => {
    store.updateTaskStatus(id, status);
    setNotice(status === "done" ? "Task marked done." : `Task moved to ${status}.`);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page rt-hr-overview">
        {notice ? (
          <div className="rt-hr-badge" style={{ justifySelf: "start" }} role="status">
            {notice}
            <button
              type="button"
              className="rt-hr-quick-btn"
              style={{ marginLeft: 8 }}
              onClick={() => setNotice("")}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <header className="rt-hr-header">
          <div className="rt-hr-header-main">
            <div className="rt-hr-header-copy">
              <div className="rt-hr-kicker-row">
                <p className="rt-hr-kicker">RoyalTech Engineering</p>
                {gps ? (
                  <a
                    className="rt-hr-loc is-live"
                    href={gps.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open location in Google Maps"
                  >
                    <MapPin size={12} strokeWidth={2.2} aria-hidden />
                    <span>
                      GPS · {gps.label || `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`}
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    className="rt-hr-loc"
                    onClick={detectLocation}
                    disabled={gpsBusy}
                    title="Set Mohali HQ GPS for open tracking"
                  >
                    <MapPin size={12} strokeWidth={2.2} aria-hidden />
                    <span>{gpsBusy ? "Saving…" : "Location · Set GPS"}</span>
                  </button>
                )}
              </div>
              <h1>Developer Overview</h1>
              <p className="rt-hr-sub">
                Task board, project progress, blockers, and today&apos;s delivery focus.
              </p>
            </div>
            <div className="rt-hr-header-aside">
              <div className="rt-hr-person">
                {me.avatarUrl ? (
                  <img className="rt-hr-avatar" src={me.avatarUrl} alt="" />
                ) : (
                  <span className="rt-hr-avatar" aria-hidden>
                    {initialsOf(me.name)}
                  </span>
                )}
                <div>
                  <strong>
                    {greeting()}, {me.name.split(" ")[0]}
                  </strong>
                  <span>
                    Developer · Manager {manager?.name ?? "—"}
                  </span>
                </div>
              </div>
              <div className="rt-hr-meta-strip">
                <div>
                  <small>Today</small>
                  <strong>{longDate(now)}</strong>
                </div>
                <div>
                  <small>Local time</small>
                  <strong>{shortTime(now)}</strong>
                </div>
                <div>
                  <small>Needs action</small>
                  <strong>{pendingTotal} items</strong>
                </div>
              </div>
              <div className="rt-hr-quick">
                <Link to="/projects/tasks" className="rt-hr-quick-btn is-primary">
                  My tasks
                </Link>
                <Link to="/dev/daily-report" className="rt-hr-quick-btn">
                  Daily report
                </Link>
                <Link to="/projects" className="rt-hr-quick-btn">
                  Projects
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="rt-hr-kpi-row" aria-label="Primary KPIs">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} to={kpi.path} className="rt-hr-kpi">
                <div className="rt-hr-kpi-top">
                  <span className="rt-hr-kpi-icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <ArrowUpRight size={14} strokeWidth={2} className="rt-hr-kpi-go" />
                </div>
                <p className="rt-hr-kpi-value">{kpi.value}</p>
                <p className="rt-hr-kpi-label">{kpi.label}</p>
                <p className="rt-hr-kpi-hint">{kpi.hint}</p>
              </Link>
            );
          })}
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Work Overview</h2>
                <p>Weekly completion signal</p>
              </div>
              <Link to="/dev/daily-report">Daily report</Link>
            </header>
            <div className="rt-hr-att-stats">
              <div>
                <strong>{stats.completionRate}%</strong>
                <span>Completion</span>
              </div>
              <div>
                <strong>{stats.doing}</strong>
                <span>In progress</span>
              </div>
              <div>
                <strong>{stats.blocked}</strong>
                <span>Blocked</span>
              </div>
              <div>
                <strong>{stats.overdue}</strong>
                <span>Overdue</span>
              </div>
            </div>
            <div className="rt-hr-trend" aria-label="Weekly work trend">
              {weekTrend.map((d) => (
                <div key={`${d.label}-${d.idx}`} className="rt-hr-trend-col">
                  <div className="rt-hr-trend-bar-wrap">
                    <div
                      className="rt-hr-trend-bar"
                      style={{ height: `${Math.max(d.pct, 8)}%` }}
                    />
                  </div>
                  <span>{d.label}</span>
                  <small>{d.value}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Project Progress</h2>
                <p>Assigned delivery projects</p>
              </div>
              <Link to="/projects">All projects</Link>
            </header>
            <ul className="rt-hr-dept-list">
              {projectRows.map((d) => (
                <li key={d.name}>
                  <div className="rt-hr-dept-meta">
                    <strong>{d.name}</strong>
                    <span>
                      {d.count}% · due {formatDate(String(d.deadline))}
                    </span>
                  </div>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i style={{ width: `${Math.max(d.pct, 4)}%` }} />
                  </div>
                </li>
              ))}
              {projectRows.length === 0 ? (
                <li className="rt-hr-empty">No projects assigned yet.</li>
              ) : null}
            </ul>
          </article>
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Task Pipeline</h2>
                <p>Your personal board flow</p>
              </div>
              <Link to="/projects/tasks">Open board</Link>
            </header>
            <div className="rt-hr-pipe-grid">
              {pipeline.map((step) => (
                <div key={step.label} className="rt-hr-pipe-step">
                  <strong>{step.value}</strong>
                  <span>{step.label}</span>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i
                      style={{
                        width: `${Math.round((step.value / pipelineMax) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rt-hr-panel rt-hr-panel-emphasis">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Pending Actions</h2>
                <p>Items that need attention today</p>
              </div>
              <span className="rt-hr-badge">{pendingTotal} open</span>
            </header>
            <ul className="rt-hr-actions">
              {pendingActions.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.id}>
                    <div className="rt-hr-action-ico" aria-hidden>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div className="rt-hr-action-body">
                      <div className="rt-hr-action-top">
                        <strong>{action.title}</strong>
                        <em>{action.count}</em>
                      </div>
                      <span>{action.detail}</span>
                    </div>
                    <Link className="rt-hr-action-btn" to={action.path}>
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel rt-hr-panel-emphasis">
            <header className="rt-hr-panel-head">
              <div>
                <h2>My To-Do · Today</h2>
                <p>Open tasks due today or overdue</p>
              </div>
              <Link to="/projects/tasks">All tasks</Link>
            </header>
            <ul className="rt-hr-schedule rt-hr-todo-today">
              {myTodoToday.length === 0 ? (
                <li className="rt-hr-empty">Nothing due today — you&apos;re clear.</li>
              ) : (
                myTodoToday.map((item) => (
                  <li key={item.id} className={item.overdue ? "is-overdue" : ""}>
                    <time>{item.time}</time>
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind} · {item.who}
                      </span>
                    </div>
                    <Link className="rt-hr-action-btn" to="/projects/tasks">
                      Open
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Recent Activity</h2>
                <p>Your latest task updates</p>
              </div>
            </header>
            <ul className="rt-hr-activity">
              {activity.map((item) => (
                <li key={item.id}>
                  <span className="rt-hr-activity-dot" aria-hidden>
                    <CheckCircle2 size={14} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <time>{item.time}</time>
                </li>
              ))}
              {activity.length === 0 ? (
                <li className="rt-hr-empty">No recent activity.</li>
              ) : null}
            </ul>
          </article>
        </section>

        <section className="rt-hr-panel rt-hr-snapshot">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Task Snapshot</h2>
              <p>Search, filter, and update your assignments</p>
            </div>
            <Link to="/projects/tasks">View all</Link>
          </header>
          <div className="rt-hr-filters">
            <input
              className="rt-hr-input"
              value={snapQuery}
              onChange={(e) => setSnapQuery(e.target.value)}
              placeholder="Search task or project…"
              aria-label="Search tasks"
            />
            <select
              className="rt-hr-input"
              value={snapProject}
              onChange={(e) => setSnapProject(e.target.value)}
              aria-label="Filter project"
            >
              {projectsFilter.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All projects" : p}
                </option>
              ))}
            </select>
            <select
              className="rt-hr-input"
              value={snapStatus}
              onChange={(e) => setSnapStatus(e.target.value)}
              aria-label="Filter status"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>
          <div className="rt-hr-table-wrap">
            <table className="rt-hr-table">
              <thead>
                <tr>
                  {(
                    [
                      ["title", "Task"],
                      ["project", "Project"],
                      ["due", "Due"],
                      ["status", "Status"],
                    ] as Array<[SortKey, string]>
                  ).map(([key, label]) => (
                    <th key={key}>
                      <button type="button" onClick={() => toggleSort(key)}>
                        {label}
                        {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {snapshotRows.map((t) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>{t.project_name}</td>
                    <td>{dueLabel(String(t.due_date))}</td>
                    <td>
                      <span
                        className={`rt-hr-status is-${String(t.status).toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="rt-hr-input"
                        value={t.status}
                        onChange={(e) => setStatus(t.id, e.target.value as TaskStatus)}
                        aria-label={`Update status for ${t.title}`}
                      >
                        <option value="todo">todo</option>
                        <option value="doing">doing</option>
                        <option value="blocked">blocked</option>
                        <option value="done">done</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {snapshotRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="rt-hr-empty">
                      No tasks match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rt-hr-panel">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Upcoming Deadlines</h2>
              <p>Next due items on your desk</p>
            </div>
            <Link to="/dev/calendar">Calendar</Link>
          </header>
          <ul className="rt-hr-upcoming">
            {upcoming.map((item) => (
              <li key={item.id}>
                <span className="rt-hr-upcoming-tag">{item.label}</span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <time>{item.when}</time>
              </li>
            ))}
            {upcoming.length === 0 ? (
              <li className="rt-hr-empty">No upcoming deadlines.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </RequirePermission>
  );
}
