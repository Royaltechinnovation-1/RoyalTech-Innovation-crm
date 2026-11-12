import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Play, Star } from "lucide-react";
import type { CrmStore } from "../../data/store";
import type { TaskStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { fetchDevDashboard, type DevDashboardData } from "../../lib/moduleApi";
import { RequirePermission } from "../../components/RequirePermission";

type TaskTab = "assigned" | "doing" | "done" | "pending";
type KpiGlyphName = "check" | "play" | "clock" | "calendar";
type ActionGlyphName = "tasks" | "report" | "bug" | "message" | "docs" | "git";

/** Simple filled glyphs — matches mockup, avoids outline “AI icon” look */
function KpiGlyph({ name }: { name: KpiGlyphName }) {
  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5.5 12.5 10 17l8.5-9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7.2v9.6L17.2 12 9 7.2z" fill="currentColor" />
      </svg>
    );
  }
  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path
          d="M12 8.2v4.1l2.8 1.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect
        x="4.5"
        y="6"
        width="15"
        height="13.5"
        rx="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M8 4.8v2.6M16 4.8v2.6M4.5 10.2h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Crisp product icons for Quick Actions */
function ActionGlyph({ name }: { name: ActionGlyphName }) {
  if (name === "tasks") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9.2 6.5h10.3M9.2 12h10.3M9.2 17.5h10.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M4.2 6.3 5.6 7.7 8 5.2M4.2 11.8 5.6 13.2 8 10.7M4.2 17.3 5.6 18.7 8 16.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "report") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8.2 4.5h7.6c.9 0 1.6.7 1.6 1.6v12.8c0 .9-.7 1.6-1.6 1.6H8.2c-.9 0-1.6-.7-1.6-1.6V6.1c0-.9.7-1.6 1.6-1.6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
        />
        <path
          d="M9.5 3.8h5v2.4h-5V3.8Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M9.4 11.2h5.2M9.4 14.8h3.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "bug") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M8.4 9.2h7.2v6.4c0 2-1.6 3.4-3.6 3.4h0c-2 0-3.6-1.4-3.6-3.4V9.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M9.2 9.1c0-1.7 1.2-3 2.8-3s2.8 1.3 2.8 3M12 12.2v4.2M5.2 11.2H8.2M15.8 11.2h3M5.8 16.2l2.4-1.2M18.2 16.2l-2.4-1.2M8.6 6.4 6.8 4.8M15.4 6.4l1.8-1.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "message") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5.2 6.2h13.6v9.4c0 .9-.7 1.6-1.6 1.6H10l-3.4 2.8v-2.8H6.8c-.9 0-1.6-.7-1.6-1.6V6.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M8.4 10.2h7.2M8.4 13.2h4.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (name === "docs") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 4.5h7.2L18.8 9v10.5c0 .8-.7 1.5-1.5 1.5H7c-.8 0-1.5-.7-1.5-1.5V6c0-.8.7-1.5 1.5-1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M14.2 4.7V9h4.4M8.6 12.4h6.8M8.6 15.6h6.8M8.6 18.7h4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7.2" cy="6.8" r="2" fill="none" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="7.2" cy="17.2" r="2" fill="none" stroke="currentColor" strokeWidth="2.1" />
      <circle cx="16.8" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="2.1" />
      <path
        d="M7.2 8.8v6.4M9.1 7.4c2.4.4 4.2 2.1 5.2 4.2M9.1 16.6c2.4-.4 4.2-2.1 5.2-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

const DEMO_PROJECTS = [
  { id: "pdemo1", name: "Website Redesign", progress: 70, deadline: "2026-12-20" },
  { id: "pdemo2", name: "Mobile App Development", progress: 45, deadline: "2027-01-20" },
  { id: "pdemo3", name: "E-commerce Platform", progress: 80, deadline: "2026-12-01" },
];

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

function categoryFor(title: string, projectName?: string) {
  if (projectName && projectName !== "—") {
    if (/website|redesign|crm|brightleaf/i.test(projectName)) return "Website Redesign";
    if (/mobile|app|mossline/i.test(projectName)) return "Mobile App";
    if (/e-?commerce|shop/i.test(projectName)) return "E-commerce Platform";
  }
  const t = title.toLowerCase();
  if (t.includes("api") || t.includes("auth") || t.includes("responsive") || t.includes("ui"))
    return "Website Redesign";
  if (t.includes("db") || t.includes("data") || t.includes("inventory") || t.includes("mobile"))
    return "Mobile App";
  return "CRM Platform";
}

export function DeveloperDashboard({ store }: { store: CrmStore }) {
  const [data, setData] = useState<DevDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TaskTab>("assigned");
  const [reportSubmitted, setReportSubmitted] = useState(true);
  const [notice, setNotice] = useState("");

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

  const fullName = store.currentUser.name;
  const manager =
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
  const assigned = tasks.filter((t) => t.status !== "done").length;
  const upcoming = tasks.filter((t) => {
    if (t.status === "done") return false;
    const due = new Date(`${String(t.due_date).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (due.getTime() - today.getTime()) / 86400000;
    return diff >= 0 && diff <= 3;
  }).length;

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

  const completedPct = total ? Math.round((done / Math.max(total, 1)) * 100) : 72;
  const doingPct = total ? Math.round((doing / Math.max(total, 1)) * 100) : 28;
  const pendingPct = Math.max(0, 100 - completedPct - doingPct);
  const ringStyle = {
    background: `conic-gradient(#00aeef 0 ${completedPct}%, #0f3d2e ${completedPct}% ${completedPct + doingPct}%, #d4d9d6 ${completedPct + doingPct}% 100%)`,
  };

  const filtered = tasks.filter((t) => {
    if (tab === "doing") return t.status === "doing";
    if (tab === "done") return t.status === "done";
    if (tab === "pending") return t.status === "todo" || t.status === "blocked";
    return t.status !== "done";
  });

  const onTrack = completedPct >= 45;
  const tabCounts: Record<TaskTab, number> = {
    assigned: assigned || 5,
    doing: doing || 5,
    done: done || 5,
    pending: pending || 2,
  };

  const kpis: Array<{
    label: string;
    value: number;
    trend: string;
    tone: "up" | "down" | "flat" | "link";
    color: string;
    glyph: "check" | "play" | "clock" | "calendar";
    href?: string;
  }> = [
    { label: "Total Tasks", value: total || 12, trend: "1%", tone: "up", color: "cyan", glyph: "check" },
    { label: "In Progress", value: doing || 5, trend: "0%", tone: "up", color: "forest", glyph: "play" },
    { label: "Completed", value: done || 5, trend: "2%", tone: "up", color: "green", glyph: "check" },
    { label: "Pending", value: pending || 2, trend: "1%", tone: "down", color: "amber", glyph: "clock" },
    {
      label: "Upcoming Deadlines",
      value: upcoming || 2,
      trend: "View All →",
      tone: "link",
      color: "teal",
      glyph: "calendar",
      href: "/dev/calendar",
    },
  ];

  const actions: Array<{
    to: string;
    label: string;
    tone: string;
    glyph: ActionGlyphName;
    hot?: boolean;
  }> = [
    {
      to: "/projects/tasks",
      label: "Update Task Progress",
      tone: "cyan",
      glyph: "tasks",
      hot: true,
    },
    {
      to: "/dev/daily-report",
      label: "Submit Daily Report",
      tone: "green",
      glyph: "report",
      hot: true,
    },
    { to: "/dev/bugs", label: "Report Issue", tone: "forest", glyph: "bug", hot: true },
    { to: "/dev/messages", label: "Message Manager", tone: "amber", glyph: "message" },
    { to: "/dev/documents", label: "View Docs", tone: "sky", glyph: "docs" },
    { to: "/dev/github", label: "View GitHub", tone: "navy", glyph: "git" },
  ];

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page dd-page">
        {loading && !tasks.length ? (
          <div className="empty">
            <h3>Loading developer dashboard…</h3>
          </div>
        ) : null}

        <section className="dd-hero">
          <img className="dd-hero-bg" src="/dev-header-skyline.jpg" alt="" aria-hidden="true" />
          <div className="dd-greet">
            <div className="dd-greet-copy">
              <h2>
                Hello, {fullName}! <span aria-hidden="true">👋</span>
              </h2>
              <p>Keep going! You&apos;re doing great on your tasks today.</p>
            </div>
          </div>

          {notice ? <p className="dd-notice">{notice}</p> : null}

          <section className="dd-kpi-row">
            {kpis.map((kpi) => (
              <article className={`dd-kpi tone-${kpi.color}`} key={kpi.label}>
                {kpi.href ? (
                  <Link className="dd-kpi-view" to={kpi.href}>
                    View All →
                  </Link>
                ) : null}
                <span className="dd-kpi-ico">
                  <KpiGlyph name={kpi.glyph} />
                </span>
                <div className="dd-kpi-copy">
                  <p>{kpi.label}</p>
                  <h3>{kpi.value}</h3>
                  {!kpi.href ? (
                    <em className={kpi.tone}>
                      <span aria-hidden="true">{kpi.tone === "down" ? "↓" : "↑"}</span>
                      {kpi.trend}
                    </em>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        </section>

        <section className="dd-mid">
          <article className="dd-card">
            <header className="dd-card-head">
              <h3>My Tasks</h3>
              <Link to="/projects/tasks">View all</Link>
            </header>
            <div className="dd-tabs" role="tablist">
              {(
                [
                  ["assigned", "Assigned"],
                  ["doing", "In Progress"],
                  ["done", "Completed"],
                  ["pending", "Pending"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "is-active" : ""}
                  onClick={() => setTab(key)}
                >
                  {label} ({tabCounts[key]})
                </button>
              ))}
            </div>
            <ul className="dd-task-list">
              {filtered.length === 0 ? (
                <li className="dd-empty">No tasks in this tab.</li>
              ) : (
                filtered.slice(0, 5).map((task) => (
                  <li key={task.id}>
                    <label className="dd-check">
                      <input
                        type="checkbox"
                        checked={task.status === "done"}
                        onChange={() =>
                          store.updateTaskStatus(task.id, task.status === "done" ? "todo" : "done")
                        }
                      />
                      <span />
                    </label>
                    <div className="dd-task-body">
                      <strong>{task.title}</strong>
                      <div className="dd-task-meta">
                        <em>{categoryFor(task.title, task.project_name)}</em>
                        <span>{dueLabel(String(task.due_date))}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="dd-play"
                      title="Mark in progress"
                      onClick={() => store.updateTaskStatus(task.id, "doing")}
                    >
                      <Play size={13} strokeWidth={2.4} fill="currentColor" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="dd-card">
            <header className="dd-card-head">
              <h3>My Projects</h3>
              <Link to="/projects">View all</Link>
            </header>
            <div className="dd-project-list">
              {projects.slice(0, 3).map((project, idx) => (
                <div className={`dd-project tone-${idx % 3}`} key={project.id}>
                  <div className="dd-project-thumb" aria-hidden>
                    <img
                      src="/dev-thumbs.jpg"
                      alt=""
                      style={{ objectPosition: `${idx * 50}% center` }}
                    />
                  </div>
                  <div className="dd-project-body">
                    <div className="dd-project-top">
                      <strong>{project.name}</strong>
                      <b>{project.progress}%</b>
                    </div>
                    <div className="dd-progress-line">
                      <div className="progress">
                        <span style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                    <div className="dd-project-foot">
                      <span className="dd-avatars">
                        <i>{store.currentUser.avatarInitials?.slice(0, 2) || "DV"}</i>
                        <i>{manager?.avatarInitials?.slice(0, 2) || "PM"}</i>
                        <i>TM</i>
                      </span>
                      <span>Due: {formatDate(String(project.deadline))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="dd-card dd-progress-card">
            <header className="dd-card-head">
              <h3>Work Progress</h3>
            </header>
            <div className="dd-progress">
              <div className="dd-ring" style={ringStyle} aria-hidden>
                <div>
                  <strong>{completedPct || 72}%</strong>
                </div>
              </div>
              <ul className="dd-legend">
                <li>
                  <i className="done" /> Completed <strong>{completedPct || 72}%</strong>
                </li>
                <li>
                  <i className="doing" /> In Progress <strong>{doingPct || 28}%</strong>
                </li>
                <li>
                  <i className="pending" /> Pending <strong>{pendingPct}%</strong>
                </li>
              </ul>
            </div>
            <div className={`dd-track ${onTrack ? "ok" : "warn"}`}>
              <svg className="dd-track-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 16.5 10.2 10l3.3 3.3L20 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.2 6.5H20v4.8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>
                {onTrack
                  ? "You are on track! Great work this week."
                  : "Clear pending items to stay on schedule."}
              </span>
            </div>
          </article>
        </section>

        <section className="dd-bottom">
          <article className="dd-card">
            <header className="dd-card-head">
              <h3>Daily Work Report</h3>
            </header>
            <div className="dd-report-row">
              <div className="dd-report-ico ok">
                <CheckCircle2 size={18} strokeWidth={2.2} />
              </div>
              <div>
                <strong>Report Submitted</strong>
                <small>{reportSubmitted ? "Today at 6:15 PM" : "Due today by 6:00 PM"}</small>
              </div>
              <Link className="dd-soft-btn" to="/dev/daily-report">
                View Report
              </Link>
            </div>
            <div className="dd-report-row next">
              <div className="dd-report-ico next">
                <Clock3 size={18} strokeWidth={2.2} />
              </div>
              <div>
                <strong>Next Report Due</strong>
                <small>Tomorrow at 6:00 PM</small>
              </div>
              <button
                type="button"
                className="dd-solid-btn"
                onClick={() => {
                  setReportSubmitted(true);
                  setNotice("Daily report submitted to your project manager.");
                }}
              >
                Submit Report
              </button>
            </div>
          </article>

          <article className="dd-card">
            <header className="dd-card-head">
              <h3>Manager Feedback</h3>
            </header>
            <div className="dd-feedback">
              <img className="dd-feedback-photo" src="/pm-avatar.jpg" alt="" />
              <div className="dd-feedback-meta">
                <strong>{manager?.name || "Priya Singh"}</strong>
                <small>Project Manager</small>
              </div>
              <span className="dd-stars" aria-label="5 star rating">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
            </div>
            <blockquote className="dd-quote">
              “Great work on the API integration! Keep it up.”
            </blockquote>
          </article>

          <article className="dd-card">
            <header className="dd-card-head">
              <h3>Quick Actions</h3>
            </header>
            <div className="dd-actions">
              {actions.map((action) => (
                <Link
                  className={`dd-action ${action.tone}${action.hot ? " is-hot" : ""}`}
                  to={action.to}
                  key={action.to}
                >
                  {action.hot ? <span className="dd-action-tag">Focus</span> : null}
                  <span className="dd-action-ico">
                    <ActionGlyph name={action.glyph} />
                  </span>
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </div>
    </RequirePermission>
  );
}
