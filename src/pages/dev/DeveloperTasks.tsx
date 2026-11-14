import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { ProjectTask, TaskStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

type FilterTab = "all" | "assigned" | "doing" | "done" | "pending";
type SortKey = "deadline" | "priority" | "title";
type Priority = "high" | "medium" | "low";

function daysUntil(dateStr: string) {
  const due = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function priorityFor(task: ProjectTask): Priority {
  const days = daysUntil(task.dueDate);
  if (task.status === "blocked" || days < 0) return "high";
  if (task.status === "doing" || days <= 2) return "medium";
  if (/auth|payment|critical|bug|api/i.test(task.title)) return "high";
  if (/fix|responsive|dashboard/i.test(task.title)) return "medium";
  return "low";
}

function statusLabel(status: TaskStatus) {
  if (status === "doing") return "In Progress";
  if (status === "done") return "Completed";
  return "Pending";
}

function statusTone(status: TaskStatus) {
  if (status === "doing") return "doing";
  if (status === "done") return "done";
  return "pending";
}

function ProjectGlyph({ name }: { name: string }) {
  if (/website|redesign/i.test(name)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M4.5 12h15M12 4.5c2.4 2.4 3.6 5 3.6 7.5s-1.2 5.1-3.6 7.5c-2.4-2.4-3.6-5-3.6-7.5s1.2-5.1 3.6-7.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }
  if (/mobile|app/i.test(name)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="8" y="3.5" width="8" height="17" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M11 17.5h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (/e-?commerce|shop/i.test(name)) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path
          d="M4.5 7.5h15l-1.2 9.2a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8L4.5 7.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path d="M8.5 7.5V6a3.5 3.5 0 0 1 7 0v1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path
        d="M8.5 7.5 4.8 12l3.7 4.5M15.5 7.5 19.2 12l-3.7 4.5M13.2 5.5l-2.4 13"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeveloperTasks({ store }: { store: CrmStore }) {
  const [tab, setTab] = useState<FilterTab>("all");
  const [sort, setSort] = useState<SortKey>("deadline");
  const [page, setPage] = useState(1);
  const [menuId, setMenuId] = useState<string | null>(null);
  const pageSize = 6;

  const rows = useMemo(() => {
    return store.visibleTasks.map((task) => {
      const project = store.data.projects.find((p) => p.id === task.projectId);
      return {
        ...task,
        projectName: project?.name ?? "—",
        priority: priorityFor(task),
        days: daysUntil(task.dueDate),
      };
    });
  }, [store.visibleTasks, store.data.projects]);

  const total = rows.length;
  const doing = rows.filter((t) => t.status === "doing").length;
  const done = rows.filter((t) => t.status === "done").length;
  const pending = rows.filter((t) => t.status === "todo" || t.status === "blocked").length;
  const assigned = rows.filter((t) => t.status !== "done").length;

  const filtered = useMemo(() => {
    let list = [...rows];
    if (tab === "assigned") list = list.filter((t) => t.status !== "done");
    if (tab === "doing") list = list.filter((t) => t.status === "doing");
    if (tab === "done") list = list.filter((t) => t.status === "done");
    if (tab === "pending") list = list.filter((t) => t.status === "todo" || t.status === "blocked");

    list.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "priority") {
        const rank = { high: 0, medium: 1, low: 2 };
        return rank[a.priority] - rank[b.priority];
      }
      return a.dueDate.localeCompare(b.dueDate);
    });
    return list;
  }, [rows, tab, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const completedPct = total ? Math.round((done / Math.max(total, 1)) * 100) : 72;
  const doingPct = total ? Math.round((doing / Math.max(total, 1)) * 100) : 20;
  const pendingPct = Math.max(0, 100 - completedPct - doingPct);
  const ringStyle = {
    background: `conic-gradient(#00aeef 0 ${completedPct}%, #0f3d2e ${completedPct}% ${completedPct + doingPct}%, #ca5010 ${completedPct + doingPct}% 100%)`,
  };

  const upcoming = [...rows]
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: "all", label: "All Tasks", count: total || 12 },
    { key: "assigned", label: "Assigned", count: assigned || 12 },
    { key: "doing", label: "In Progress", count: doing || 5 },
    { key: "done", label: "Completed", count: done || 5 },
    { key: "pending", label: "Pending", count: pending || 2 },
  ];

  return (
    <RequirePermission store={store} permission="projects.tasks">
      <div className="page mt-page">
        <header className="mt-head">
          <h2>
            <span className="mt-title-ico" aria-hidden>
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
            My Tasks
          </h2>
          <p>Track and manage your assigned tasks.</p>
        </header>

        <section className="mt-kpi-row">
          <article className="mt-kpi tone-cyan">
            <span className="mt-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 7.5h14M5 12h14M5 16.5h14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.3"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <p>Total Tasks</p>
              <h3>{total || 12}</h3>
            </div>
          </article>
          <article className="mt-kpi tone-forest">
            <span className="mt-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="M8 7.2h8v4.2c0 2.2-1.8 4-4 4s-4-1.8-4-4V7.2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                />
                <path
                  d="M10 7.2V5.8a2 2 0 0 1 4 0v1.4M12 15.4v2.4M9.2 19.2h5.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.1"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <p>In Progress</p>
              <h3>{doing || 5}</h3>
            </div>
          </article>
          <article className="mt-kpi tone-green">
            <span className="mt-kpi-ico" aria-hidden>
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
              <h3>{done || 5}</h3>
            </div>
          </article>
          <article className="mt-kpi tone-amber">
            <span className="mt-kpi-ico" aria-hidden>
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
              <h3>{pending || 2}</h3>
            </div>
          </article>
        </section>

        <section className="mt-layout">
          <article className="mt-card mt-main">
            <div className="mt-toolbar">
              <div className="mt-tabs" role="tablist">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    className={tab === item.key ? "is-active" : ""}
                    onClick={() => {
                      setTab(item.key);
                      setPage(1);
                      setMenuId(null);
                    }}
                  >
                    {item.label} ({item.count})
                  </button>
                ))}
              </div>
              <label className="mt-sort">
                <span>Sort By:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                  <option value="deadline">Deadline</option>
                  <option value="priority">Priority</option>
                  <option value="title">Title</option>
                </select>
              </label>
            </div>

            <div className="mt-table-wrap">
              <table className="mt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Task Title</th>
                    <th>Project</th>
                    <th>Priority</th>
                    <th>Deadline</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="mt-empty">
                        No tasks in this filter.
                      </td>
                    </tr>
                  ) : (
                    paged.map((task, idx) => (
                      <tr key={task.id}>
                        <td>{(currentPage - 1) * pageSize + idx + 1}</td>
                        <td>
                          <strong>{task.title}</strong>
                        </td>
                        <td>
                          <span className="mt-project">
                            <i>
                              <ProjectGlyph name={task.projectName} />
                            </i>
                            {task.projectName}
                          </span>
                        </td>
                        <td>
                          <span className={`mt-pill priority-${task.priority}`}>{task.priority}</span>
                        </td>
                        <td>
                          <span className={task.days < 0 ? "is-overdue" : ""}>
                            {formatDate(task.dueDate)}
                          </span>
                        </td>
                        <td>
                          <span className={`mt-pill status-${statusTone(task.status)}`}>
                            {statusLabel(task.status)}
                          </span>
                        </td>
                        <td>
                          <div className="mt-actions">
                            <button
                              type="button"
                              className="mt-ico-btn view"
                              title="View / mark in progress"
                              onClick={() => store.updateTaskStatus(task.id, "doing")}
                            >
                              <svg viewBox="0 0 24 24" aria-hidden>
                                <path
                                  d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                />
                                <circle cx="12" cy="12" r="2.4" fill="currentColor" />
                              </svg>
                            </button>
                            <div className="mt-more-wrap">
                              <button
                                type="button"
                                className="mt-ico-btn"
                                title="More actions"
                                aria-expanded={menuId === task.id}
                                onClick={() => setMenuId((id) => (id === task.id ? null : task.id))}
                              >
                                <svg viewBox="0 0 24 24" aria-hidden>
                                  <circle cx="12" cy="6" r="1.6" fill="currentColor" />
                                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                                  <circle cx="12" cy="18" r="1.6" fill="currentColor" />
                                </svg>
                              </button>
                              {menuId === task.id ? (
                                <div className="mt-more-menu" role="menu">
                                  {(
                                    [
                                      ["todo", "To do"],
                                      ["doing", "In progress"],
                                      ["blocked", "Blocked"],
                                      ["done", "Done"],
                                    ] as const
                                  ).map(([value, label]) => (
                                    <button
                                      key={value}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        store.updateTaskStatus(task.id, value);
                                        setMenuId(null);
                                      }}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <footer className="mt-pager">
              <p>
                Showing {(currentPage - 1) * pageSize + (paged.length ? 1 : 0)}–
                {(currentPage - 1) * pageSize + paged.length} of {filtered.length} tasks
              </p>
              <div className="mt-pages">
                <button
                  type="button"
                  className="mt-page-nav"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  ‹
                </button>
                {Array.from({ length: pageCount }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={currentPage === i + 1 ? "is-active" : ""}
                    onClick={() => setPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className="mt-page-nav"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  aria-label="Next page"
                >
                  ›
                </button>
              </div>
            </footer>
          </article>

          <aside className="mt-side">
            <article className="mt-card">
              <header className="mt-card-head">
                <h3>Task Status</h3>
              </header>
              <div className="mt-progress">
                <div className="mt-ring" style={ringStyle} aria-hidden>
                  <div>
                    <strong>{completedPct || 72}%</strong>
                    <small>Overall</small>
                  </div>
                </div>
                <ul className="mt-legend">
                  <li>
                    <i className="done" /> Completed <b>{completedPct || 72}%</b>
                  </li>
                  <li>
                    <i className="doing" /> In Progress <b>{doingPct || 20}%</b>
                  </li>
                  <li>
                    <i className="pending" /> Pending <b>{pendingPct}%</b>
                  </li>
                </ul>
              </div>
            </article>

            <article className="mt-card">
              <header className="mt-card-head">
                <h3>Upcoming Deadlines</h3>
                <Link to="/dev/calendar">View All →</Link>
              </header>
              <ul className="mt-upcoming">
                {upcoming.length === 0 ? (
                  <li className="mt-empty">No upcoming deadlines.</li>
                ) : (
                  upcoming.map((task) => (
                    <li key={task.id}>
                      <div>
                        <strong>{task.title}</strong>
                        <small>{formatDate(task.dueDate)}</small>
                      </div>
                      <span className={`mt-pill priority-${task.priority}`}>{task.priority}</span>
                    </li>
                  ))
                )}
              </ul>
            </article>

            <article className="mt-card mt-quick">
              <header className="mt-card-head">
                <h3>Quick Actions</h3>
              </header>
              <div className="mt-quick-grid">
                <Link className="mt-quick-btn cyan is-hot" to="/projects/tasks">
                  Update Task Progress
                </Link>
                <Link className="mt-quick-btn green is-hot" to="/dev/daily-report">
                  Submit Daily Report
                </Link>
                <Link className="mt-quick-btn forest is-hot" to="/dev/bugs">
                  Report Issue
                </Link>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </RequirePermission>
  );
}
