import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { fetchDevDashboard, type DevDashboardData } from "../../lib/moduleApi";
import { RequirePermission } from "../../components/RequirePermission";
import { Tag } from "../../components/ui";

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

function priorityFor(deadline: string, progress: number): { label: string; tone: "danger" | "mist" | "gold" } {
  const due = new Date(`${String(deadline).slice(0, 10)}T12:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = (due.getTime() - today.getTime()) / 86400000;
  if (diff <= 14 || progress < 40) return { label: "High", tone: "danger" };
  if (diff <= 40) return { label: "Medium", tone: "mist" };
  return { label: "Low", tone: "gold" };
}

export function ProjectManagerDashboard({ store }: { store: CrmStore }) {
  const [data, setData] = useState<DevDashboardData | null>(null);
  const [error, setError] = useState("");
  const [approvals, setApprovals] = useState<
    Array<{ id: string; title: string; who: string; project: string }>
  >([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchDevDashboard({ managerId: store.currentUser.id })
      .then((rows) => {
        setData(rows);
        setError("");
        const pending = rows.tasks
          .filter((t) => t.status === "done" || t.status === "blocked")
          .slice(0, 4)
          .map((t) => ({
            id: t.id,
            title: t.title,
            who: t.assignee_name,
            project: t.project_name,
          }));
        setApprovals(pending);
      })
      .catch((err: Error) => setError(err.message));
  }, [store.currentUser.id]);

  const firstName = store.currentUser.name.split(" ")[0];

  const stats = useMemo(() => {
    if (!data) {
      return {
        team: 0,
        active: 0,
        assigned: 0,
        completed: 0,
        overdue: 0,
        pending: 0,
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = data.tasks.filter((t) => {
      if (t.status === "done") return false;
      const due = new Date(`${String(t.due_date).slice(0, 10)}T12:00:00`);
      return due.getTime() < today.getTime();
    }).length;
    return {
      team: data.workload.length,
      active: data.summary.activeProjects,
      assigned: data.summary.tasks,
      completed: data.tasks.filter((t) => t.status === "done").length,
      overdue,
      pending: approvals.length,
    };
  }, [data, approvals.length]);

  const week = [
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
  const online = Math.max((data?.workload.length ?? 1) - 1, 1);
  const busy = Math.min(1, data?.workload.length ?? 0);
  const offline = Math.max(0, (data?.workload.length ?? 0) - online - busy);
  const onlinePct = Math.round((online / Math.max(stats.team, 1)) * 100);

  const activities = (data?.tasks ?? []).slice(0, 5).map((t) => ({
    id: t.id,
    text: `${t.assignee_name} · ${t.title} (${t.status})`,
    when: formatDate(String(t.due_date)),
  }));

  const decide = (id: string, ok: boolean) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    setNotice(ok ? "Task approved." : "Task rejected and sent back.");
  };

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page dm-page pm-page">
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

        {data ? (
          <>
            <section className="dm-hero">
              <div>
                <p className="dm-kicker">Project Manager dashboard</p>
                <h2>
                  {greetingForNow()}, {firstName}
                </h2>
                <p>Team performance, workload, deadlines, and approvals for your delivery portfolio.</p>
              </div>
              <div className="dm-hero-actions">
                <Tag tone={data.mode === "mysql" ? "sage" : "gold"}>
                  {data.mode === "mysql" ? "MySQL connected" : "Local DB fallback"}
                </Tag>
                <Link className="btn btn-secondary" to="/projects/assignments">
                  Assign tasks
                </Link>
                <Link className="btn btn-primary" to="/projects/reports">
                  View reports
                </Link>
              </div>
            </section>

            {notice ? <p className="dm-notice">{notice}</p> : null}

            <section className="dm-kpi-row six">
              <article className="dm-kpi tone-blue">
                <span className="dm-kpi-ico" aria-hidden>TM</span>
                <div>
                  <p>Total Team</p>
                  <h3>{stats.team}</h3>
                </div>
              </article>
              <article className="dm-kpi tone-violet">
                <span className="dm-kpi-ico" aria-hidden>PR</span>
                <div>
                  <p>Active Projects</p>
                  <h3>{stats.active}</h3>
                </div>
              </article>
              <article className="dm-kpi tone-green">
                <span className="dm-kpi-ico" aria-hidden>TA</span>
                <div>
                  <p>Tasks Assigned</p>
                  <h3>{stats.assigned}</h3>
                </div>
              </article>
              <article className="dm-kpi tone-teal">
                <span className="dm-kpi-ico" aria-hidden>OK</span>
                <div>
                  <p>Tasks Completed</p>
                  <h3>{stats.completed}</h3>
                </div>
              </article>
              <article className="dm-kpi tone-amber">
                <span className="dm-kpi-ico" aria-hidden>OD</span>
                <div>
                  <p>Overdue Tasks</p>
                  <h3>{stats.overdue}</h3>
                </div>
              </article>
              <article className="dm-kpi tone-navy">
                <span className="dm-kpi-ico" aria-hidden>PA</span>
                <div>
                  <p>Pending Approvals</p>
                  <h3>{stats.pending}</h3>
                </div>
              </article>
            </section>

            <section className="pm-charts">
              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Team Performance</h3>
                  <span>This week</span>
                </header>
                <div className="pm-line">
                  <svg viewBox="0 0 280 120" preserveAspectRatio="none" aria-hidden>
                    <polyline
                      fill="none"
                      stroke="#118dff"
                      strokeWidth="3"
                      points={week
                        .map((w, i) => {
                          const x = (i / (week.length - 1)) * 280;
                          const y = 110 - (w.v / maxWeek) * 90;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                  </svg>
                  <div className="pm-line-labels">
                    {week.map((w) => (
                      <span key={w.d}>{w.d}</span>
                    ))}
                  </div>
                </div>
              </article>

              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Developer Availability</h3>
                  <span>Live</span>
                </header>
                <div className="pm-donut-wrap">
                  <div
                    className="pm-donut"
                    style={{
                      background: `conic-gradient(#22c55e 0 ${onlinePct}%, #f59e0b ${onlinePct}% ${onlinePct + 10}%, #94a3b8 ${onlinePct + 10}% 100%)`,
                    }}
                    aria-hidden
                  >
                    <div>
                      <strong>{onlinePct}%</strong>
                      <small>Online</small>
                    </div>
                  </div>
                  <ul className="pm-legend">
                    <li>
                      <i className="on" /> Online <strong>{online}</strong>
                    </li>
                    <li>
                      <i className="busy" /> Busy <strong>{busy}</strong>
                    </li>
                    <li>
                      <i className="off" /> Offline <strong>{offline}</strong>
                    </li>
                  </ul>
                </div>
              </article>

              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Team Workload</h3>
                  <span>Open tasks</span>
                </header>
                <div className="pm-bars">
                  {data.workload.map((person) => (
                    <div className="pm-bar-row" key={person.id}>
                      <span>{person.name.split(" ")[0]}</span>
                      <div className="pm-bar-track">
                        <span style={{ width: `${Math.max(8, (person.open / maxLoad) * 100)}%` }} />
                      </div>
                      <strong>{person.open}</strong>
                    </div>
                  ))}
                </div>
              </article>
            </section>

            <section className="pm-bottom">
              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Recent Activities</h3>
                  <Link to="/projects/tasks">All tasks</Link>
                </header>
                <ul className="pm-list">
                  {activities.map((a) => (
                    <li key={a.id}>
                      <div>
                        <strong>{a.text}</strong>
                        <small>{a.when}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Upcoming Deadlines</h3>
                  <Link to="/projects">Projects</Link>
                </header>
                <ul className="pm-list">
                  {data.projects.map((p) => {
                    const pri = priorityFor(p.deadline, p.progress);
                    return (
                      <li key={p.id}>
                        <div>
                          <strong>{p.name}</strong>
                          <small>Due {formatDate(String(p.deadline))}</small>
                        </div>
                        <Tag tone={pri.tone}>{pri.label}</Tag>
                      </li>
                    );
                  })}
                </ul>
              </article>

              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Pending Approvals</h3>
                  <span>{approvals.length} waiting</span>
                </header>
                <ul className="pm-approvals">
                  {approvals.length === 0 ? (
                    <li className="dm-empty">No approvals pending.</li>
                  ) : (
                    approvals.map((a) => (
                      <li key={a.id}>
                        <div>
                          <strong>{a.title}</strong>
                          <small>
                            {a.who} · {a.project}
                          </small>
                        </div>
                        <div className="pm-approve-actions">
                          <button type="button" className="ok" onClick={() => decide(a.id, true)}>
                            Approve
                          </button>
                          <button type="button" className="no" onClick={() => decide(a.id, false)}>
                            Reject
                          </button>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </article>

              <article className="dm-card">
                <header className="dm-card-head">
                  <h3>Quick Actions</h3>
                </header>
                <div className="pm-quick">
                  <Link className="q blue" to="/projects">
                    Create Project
                  </Link>
                  <Link className="q green" to="/projects/assignments">
                    Assign Tasks
                  </Link>
                  <Link className="q teal" to="/projects/reports">
                    View Reports
                  </Link>
                  <Link className="q navy" to="/projects/workload">
                    Manage Team
                  </Link>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}
