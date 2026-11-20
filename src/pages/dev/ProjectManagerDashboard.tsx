import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  FolderKanban,
  ListTodo,
  MapPin,
  UserCheck,
  Users,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
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

type SortKey = "title" | "project" | "assignee" | "due" | "status";

function buildLocalDashboard(store: CrmStore): DevDashboardData {
  const me = store.currentUser.id;
  const team = store.data.users.filter(
    (u) => u.role === "developer" && (u.managerId === me || !u.managerId),
  );
  const projects = store.visibleProjects;
  const tasks = store.visibleTasks;
  const open = tasks.filter((t) => t.status !== "done");
  const done = tasks.filter((t) => t.status === "done");
  const blocked = tasks.filter((t) => t.status === "blocked");
  const doing = tasks.filter((t) => t.status === "doing");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = open.filter((t) => {
    const d = new Date(`${t.dueDate}T12:00:00`);
    return !Number.isNaN(d.getTime()) && d < today;
  }).length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length)
    : 0;

  const workload = (
    team.length
      ? team
      : store.teamDevelopers
  ).map((dev) => {
    const mine = tasks.filter((t) => t.assigneeId === dev.id);
    return {
      id: dev.id,
      name: dev.name,
      role: dev.role,
      open: mine.filter((t) => t.status !== "done").length,
      done: mine.filter((t) => t.status === "done").length,
      blocked: mine.filter((t) => t.status === "blocked").length,
      total: mine.length,
      availability: "online",
    };
  });

  return {
    mode: "local",
    summary: {
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === "active").length,
      tasks: tasks.length,
      openTasks: open.length,
      doing: doing.length,
      blocked: blocked.length,
      completed: done.length,
      overdue,
      teamSize: workload.length,
      avgProgress,
      budget: projects.reduce((s, p) => s + (p.budget || 0), 0),
      completionRate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    },
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      deadline: p.deadline,
      budget: p.budget,
      manager_name: store.currentUser.name,
      open_tasks: tasks.filter((t) => t.projectId === p.id && t.status !== "done").length,
      done_tasks: tasks.filter((t) => t.projectId === p.id && t.status === "done").length,
    })),
    tasks: tasks.slice(0, 30).map((t) => {
      const project = store.data.projects.find((p) => p.id === t.projectId);
      const assignee = store.data.users.find((u) => u.id === t.assigneeId);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        due_date: t.dueDate,
        project_name: project?.name || "Project",
        assignee_name: assignee?.name || "Unassigned",
      };
    }),
    workload,
    weekPerformance: WEEK_DAYS.map((day, i) => ({
      day,
      value: Math.max(8, done.length * 8 + ((i * 7) % 20) - (i > 4 ? 15 : 0)),
    })),
    dueSoon: open
      .slice()
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .slice(0, 8)
      .map((t) => {
        const project = store.data.projects.find((p) => p.id === t.projectId);
        const assignee = store.data.users.find((u) => u.id === t.assigneeId);
        return {
          id: t.id,
          title: t.title,
          due_date: t.dueDate,
          status: t.status,
          project_name: project?.name || "Project",
          assignee_name: assignee?.name || "Unassigned",
        };
      }),
  };
}

export function ProjectManagerDashboard({ store }: { store: CrmStore }) {
  const [data, setData] = useState<DevDashboardData | null>(null);
  const [notice, setNotice] = useState("");
  const [gps, setGps] = useState<CrmOpenLocation | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [snapQuery, setSnapQuery] = useState("");
  const [snapStatus, setSnapStatus] = useState("all");
  const [snapProject, setSnapProject] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let cancelled = false;
    fetchDevDashboard({ managerId: store.currentUser.id })
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch(() => {
        if (!cancelled) setData(buildLocalDashboard(store));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.currentUser.id]);

  const me = store.currentUser;

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

  const stats = useMemo(() => {
    if (!data) {
      return {
        team: 0,
        active: 0,
        openTasks: 0,
        doing: 0,
        blocked: 0,
        completed: 0,
        overdue: 0,
        completionRate: 0,
        avgProgress: 0,
      };
    }
    return {
      team: data.summary.teamSize ?? data.workload.length,
      active: data.summary.activeProjects,
      openTasks: data.summary.openTasks,
      doing: data.summary.doing,
      blocked: data.summary.blocked,
      completed: data.summary.completed ?? data.tasks.filter((t) => t.status === "done").length,
      overdue: data.summary.overdue ?? 0,
      completionRate: data.summary.completionRate ?? 0,
      avgProgress: data.summary.avgProgress,
    };
  }, [data]);

  const weekTrend = useMemo(() => {
    const rows = data?.weekPerformance?.length
      ? data.weekPerformance
      : WEEK_DAYS.map((day, i) => ({ day, value: 20 + i * 6 }));
    const max = Math.max(...rows.map((r) => Number(r.value) || 0), 1);
    return rows.map((r, idx) => ({
      label: String(r.day).slice(0, 3),
      value: Number(r.value) || 0,
      pct: Math.round(((Number(r.value) || 0) / max) * 100),
      idx,
    }));
  }, [data?.weekPerformance]);

  const teamRows = useMemo(() => {
    const list = data?.workload ?? [];
    const totalOpen = Math.max(
      list.reduce((s, w) => s + (w.open || 0), 0),
      1,
    );
    return list
      .map((w) => ({
        name: w.name,
        count: w.open,
        pct: Math.round((w.open / totalOpen) * 100),
        done: w.done ?? 0,
        blocked: w.blocked ?? 0,
        status: w.availability ?? "active",
      }))
      .sort((a, b) => b.count - a.count);
  }, [data?.workload]);

  const pipeline = useMemo(() => {
    const projects = data?.projects ?? [];
    const tasks = data?.tasks ?? [];
    return [
      { label: "Projects", value: projects.length },
      { label: "Active", value: projects.filter((p) => p.status === "active").length },
      { label: "In progress", value: tasks.filter((t) => t.status === "doing").length },
      { label: "Blocked", value: tasks.filter((t) => t.status === "blocked").length },
      { label: "Done", value: tasks.filter((t) => t.status === "done").length },
    ];
  }, [data?.projects, data?.tasks]);
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  const pendingActions = [
    {
      id: "approvals",
      title: "Pending approvals",
      count: approvals.length,
      detail: approvals[0] ? `${approvals[0].title} · ${approvals[0].who}` : "No approvals waiting",
      path: "/projects/tasks",
      icon: ClipboardList,
    },
    {
      id: "blocked",
      title: "Blocked tasks",
      count: stats.blocked,
      detail: data?.tasks.find((t) => t.status === "blocked")?.title || "No blocked work",
      path: "/projects/tasks",
      icon: ListTodo,
    },
    {
      id: "overdue",
      title: "Overdue items",
      count: stats.overdue,
      detail: `${stats.openTasks} open tasks in total`,
      path: "/projects/tasks",
      icon: CheckCircle2,
    },
    {
      id: "reports",
      title: "Daily reports",
      count: store.visibleDailyReports.length,
      detail: store.visibleDailyReports[0]
        ? `Latest from ${
            store.data.users.find((u) => u.id === store.visibleDailyReports[0].developerId)
              ?.name ?? "team"
          }`
        : "Waiting for developer standups",
      path: "/",
      icon: ClipboardList,
    },
  ];

  const myTodoToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const open = (data?.tasks ?? []).filter((t) => t.status !== "done");
    const scored = open
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
      .sort((a, b) => a.diff - b.diff || a.t.title.localeCompare(b.t.title));
    return scored.slice(0, 8).map(({ t, diff }) => ({
      id: t.id,
      time: diff < 0 ? "Overdue" : "Today",
      title: t.title,
      who: `${t.assignee_name} · ${t.project_name}`,
      kind: t.status.replaceAll("_", " "),
      overdue: diff < 0,
    }));
  }, [data?.tasks]);

  const projectsFilter = useMemo(() => {
    const names = Array.from(new Set((data?.tasks ?? []).map((t) => t.project_name)));
    return ["all", ...names];
  }, [data?.tasks]);

  const statuses = useMemo(() => {
    const rows = Array.from(new Set((data?.tasks ?? []).map((t) => t.status)));
    return ["all", ...rows];
  }, [data?.tasks]);

  const snapshotRows = useMemo(() => {
    const q = snapQuery.trim().toLowerCase();
    const rows = [...(data?.tasks ?? [])].filter((t) => {
      if (snapStatus !== "all" && t.status !== snapStatus) return false;
      if (snapProject !== "all" && t.project_name !== snapProject) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.project_name.toLowerCase().includes(q) ||
        t.assignee_name.toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) => {
      const av =
        sortKey === "title"
          ? a.title
          : sortKey === "project"
            ? a.project_name
            : sortKey === "assignee"
              ? a.assignee_name
              : sortKey === "due"
                ? String(a.due_date)
                : a.status;
      const bv =
        sortKey === "title"
          ? b.title
          : sortKey === "project"
            ? b.project_name
            : sortKey === "assignee"
              ? b.assignee_name
              : sortKey === "due"
                ? String(b.due_date)
                : b.status;
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows.slice(0, 10);
  }, [data?.tasks, snapProject, snapQuery, snapStatus, sortDir, sortKey]);

  const upcoming = useMemo(() => {
    const deadlines = (data?.dueSoon ?? []).slice(0, 4).map((t) => ({
      id: `d-${t.id}`,
      label: "Deadline",
      title: t.title,
      meta: `${t.assignee_name} · ${t.project_name}`,
      when: dueLabel(String(t.due_date)),
    }));
    const projects = (data?.projects ?? []).slice(0, 3).map((p) => ({
      id: `p-${p.id}`,
      label: "Project",
      title: p.name,
      meta: `${p.progress}% · ${p.open_tasks} open tasks`,
      when: dueLabel(String(p.deadline)),
    }));
    return [...deadlines, ...projects].slice(0, 8);
  }, [data?.dueSoon, data?.projects]);

  const detectLocation = () => {
    if (gpsBusy) return;
    setGpsBusy(true);
    const loc = officeCrmLocation();
    setGps(loc);
    store.recordCrmOpenLocation(loc);
    setGpsBusy(false);
  };

  const decide = (id: string, ok: boolean) => {
    store.decideApproval(id, ok ? "approved" : "rejected");
    setNotice(ok ? "Approval saved." : "Request rejected.");
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const kpis = [
    {
      label: "Team Size",
      value: stats.team,
      hint: `${data?.workload.filter((w) => w.availability === "online").length ?? 0} online now`,
      path: "/projects/assignments",
      icon: Users,
    },
    {
      label: "Active Projects",
      value: stats.active,
      hint: `Avg progress ${stats.avgProgress}%`,
      path: "/projects",
      icon: FolderKanban,
    },
    {
      label: "Open Tasks",
      value: stats.openTasks,
      hint: `${stats.doing} doing · ${stats.blocked} blocked`,
      path: "/projects/tasks",
      icon: ListTodo,
    },
    {
      label: "Completion Rate",
      value: `${stats.completionRate}%`,
      hint: `${stats.completed} done · ${stats.overdue} overdue`,
      path: "/projects/reports",
      icon: CheckCircle2,
    },
  ];

  const pendingTotal = pendingActions.reduce((s, a) => s + a.count, 0);

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

        {/* Same header pattern as HR Overview */}
        <header className="rt-hr-header">
          <div className="rt-hr-header-main">
            <div className="rt-hr-header-copy">
              <div className="rt-hr-kicker-row">
                <p className="rt-hr-kicker">RoyalTech Delivery</p>
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
              <h1>Manager Overview</h1>
              <p className="rt-hr-sub">
                Team workload, project delivery, approvals, and today&apos;s deadlines.
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
                  <span>Project Manager · {me.email}</span>
                </div>
              </div>
              <div className="rt-hr-meta-strip">
                <div>
                  <small>Today</small>
                  <strong>{longDate()}</strong>
                </div>
                <div>
                  <small>Local time</small>
                  <strong>{shortTime()}</strong>
                </div>
                <div>
                  <small>Needs review</small>
                  <strong>{pendingTotal} items</strong>
                </div>
              </div>
              <div className="rt-hr-quick">
                <Link to="/projects/assignments?add=developer" className="rt-hr-quick-btn is-primary">
                  Add developer
                </Link>
                <Link to="/projects/tasks" className="rt-hr-quick-btn">
                  Assign task
                </Link>
                <Link to="/projects/assignments" className="rt-hr-quick-btn">
                  Team
                </Link>
              </div>
            </div>
          </div>
        </header>

        {!data ? (
          <section className="rt-hr-panel">
            <p className="rt-hr-empty">Loading manager dashboard…</p>
          </section>
        ) : (
          <>
            {/* KPI row — same as HR */}
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

            {/* Delivery trend + Team distribution (like Attendance + Workforce) */}
            <section className="rt-hr-row-2">
              <article className="rt-hr-panel">
                <header className="rt-hr-panel-head">
                  <div>
                    <h2>Delivery Overview</h2>
                    <p>Weekly completion signal</p>
                  </div>
                  <Link to="/projects/reports">Open reports</Link>
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
                <div className="rt-hr-trend" aria-label="Weekly delivery trend">
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
                    <h2>Team Overview</h2>
                    <p>Developer-wise open workload</p>
                  </div>
                  <Link to="/projects/assignments">Directory</Link>
                </header>
                <ul className="rt-hr-dept-list">
                  {teamRows.map((d) => (
                    <li key={d.name}>
                      <div className="rt-hr-dept-meta">
                        <strong>{d.name}</strong>
                        <span>
                          {d.count} open · {d.pct}%
                        </span>
                      </div>
                      <div className="rt-hr-dept-track" aria-hidden>
                        <i style={{ width: `${Math.max(d.pct, 4)}%` }} />
                      </div>
                    </li>
                  ))}
                  {teamRows.length === 0 ? (
                    <li className="rt-hr-empty">No developers assigned yet.</li>
                  ) : null}
                </ul>
              </article>
            </section>

            {/* Pipeline + Pending actions (like Recruitment + Pending HR) */}
            <section className="rt-hr-row-2">
              <article className="rt-hr-panel">
                <header className="rt-hr-panel-head">
                  <div>
                    <h2>Delivery Pipeline</h2>
                    <p>Projects and task flow</p>
                  </div>
                  <Link to="/projects">Pipeline</Link>
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
                    <h2>Pending Manager Actions</h2>
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
                        {action.id === "approvals" && approvals[0] ? (
                          <div className="rt-hr-quick" style={{ flexDirection: "column", gap: 4 }}>
                            <button
                              type="button"
                              className="rt-hr-quick-btn is-primary"
                              onClick={() => decide(approvals[0].id, true)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rt-hr-quick-btn"
                              onClick={() => decide(approvals[0].id, false)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <Link className="rt-hr-action-btn" to={action.path}>
                            Review
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </article>
            </section>

            {/* My To-Do Today + Activity */}
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
                    <h2>Team Daily Reports</h2>
                    <p>Submitted by your developers</p>
                  </div>
                  <span className="rt-hr-badge">{store.visibleDailyReports.length}</span>
                </header>
                <ul className="rt-hr-activity">
                  {store.visibleDailyReports.slice(0, 8).map((report) => {
                    const who =
                      store.data.users.find((u) => u.id === report.developerId)?.name ??
                      "Developer";
                    return (
                      <li key={report.id}>
                        <span className="rt-hr-activity-dot" aria-hidden>
                          <ClipboardList size={14} strokeWidth={2} />
                        </span>
                        <div>
                          <strong>
                            {who} · {report.workStatus}
                          </strong>
                          <span>
                            {report.hours}h · {report.description.slice(0, 90)}
                            {report.description.length > 90 ? "…" : ""}
                          </span>
                        </div>
                        <time>{formatDate(report.date)}</time>
                      </li>
                    );
                  })}
                  {store.visibleDailyReports.length === 0 ? (
                    <li className="rt-hr-empty">
                      No daily reports yet. Developers submit from Daily Report.
                    </li>
                  ) : null}
                </ul>
              </article>
            </section>

            {/* Task snapshot — same as Employee Snapshot */}
            <section className="rt-hr-panel rt-hr-snapshot">
              <header className="rt-hr-panel-head">
                <div>
                  <h2>Task Snapshot</h2>
                  <p>Search, filter, and review live assignments</p>
                </div>
                <Link to="/projects/tasks">View all</Link>
              </header>
              <div className="rt-hr-filters">
                <input
                  className="rt-hr-input"
                  value={snapQuery}
                  onChange={(e) => setSnapQuery(e.target.value)}
                  placeholder="Search task, project, assignee…"
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
                          ["assignee", "Assignee"],
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
                    </tr>
                  </thead>
                  <tbody>
                    {snapshotRows.map((t) => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td>{t.project_name}</td>
                        <td>{t.assignee_name}</td>
                        <td>{dueLabel(String(t.due_date))}</td>
                        <td>
                          <span
                            className={`rt-hr-status is-${String(t.status).toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            {t.status}
                          </span>
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

            {/* Upcoming — same as HR upcoming events */}
            <section className="rt-hr-panel">
              <header className="rt-hr-panel-head">
                <div>
                  <h2>Upcoming Delivery Events</h2>
                  <p>Deadlines, project targets, and checkpoints</p>
                </div>
                <Link to="/projects/milestones">Manage milestones</Link>
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
                  <li className="rt-hr-empty">No upcoming delivery events.</li>
                ) : null}
              </ul>
            </section>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
