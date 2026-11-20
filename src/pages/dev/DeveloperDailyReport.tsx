import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { DailyReportStatus } from "../../types";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DeveloperDailyReport({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const manager =
    store.data.users.find((u) => u.id === me.managerId) ??
    store.data.users.find((u) => u.role === "project_manager");

  const doing = store.visibleTasks.filter((t) => t.status === "doing").length;
  const done = store.visibleTasks.filter((t) => t.status === "done").length;
  const total = store.visibleTasks.length;
  const completion = total ? Math.round((done / total) * 100) : 0;

  const reports = store.visibleDailyReports;

  const [description, setDescription] = useState("");
  const [workStatus, setWorkStatus] = useState<DailyReportStatus>("In Progress");
  const [hours, setHours] = useState("4");
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);

  const weekPoints = useMemo(() => {
    const base = Math.max(completion, 40);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => Math.min(98, base - 12 + i * 3));
  }, [completion]);
  const perf = completion || Math.min(92, 40 + done * 8);
  const hoursLogged = reports[0]?.hours ?? 0;
  const todaySubmitted = reports.some(
    (r) => r.date === new Date().toISOString().slice(0, 10) && r.developerId === me.id,
  );

  const onSubmit = () => {
    setError("");
    setNotice("");
    const res = store.submitDailyReport({
      description,
      workStatus,
      hours: Number(hours) || 0,
      tasksCompleted: Math.max(done, doing > 0 ? 1 : 0),
      attachmentName: fileName || undefined,
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDescription("");
    setFileName("");
    setNotice(`Report sent to ${res.managerName}. They can see it on their dashboard.`);
    setViewId(res.reportId);
  };

  const viewing = reports.find((r) => r.id === viewId) ?? null;

  return (
    <RequirePermission store={store} permission="projects">
      <div className="page dr-page">
        <section className="dr-hero">
          <div className="dr-hero-copy">
            <h2>
              <span className="dr-title-ico" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <rect
                    x="4.5"
                    y="5"
                    width="15"
                    height="15"
                    rx="2.4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                  />
                  <path
                    d="M8 3.6v2.6M16 3.6v2.6M4.5 10h15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8.2 13.2h3.2M8.2 16.2h7.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              Daily Report
            </h2>
            <p>
              Submit to your manager{manager ? ` (${manager.name})` : ""}. Reports are saved and
              visible on the manager dashboard.
            </p>
          </div>
        </section>

        {notice ? <p className="dr-notice">{notice}</p> : null}
        {error ? <p className="dr-notice" style={{ color: "#9b2c2c" }}>{error}</p> : null}
        {todaySubmitted ? (
          <p className="dr-notice">You already submitted a report today — you can send another update if needed.</p>
        ) : null}

        <section className="dr-strip" aria-label="Report actions and stats">
          <article className="dr-strip-submit">
            <div className="dr-form-title">
              <span className="dr-send-ico" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4.5 11.2 19.2 4.8 12.4 19.4l-1.8-6.2-6.1-2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h3>Submit Daily Report</h3>
            </div>
            <div className="dr-date">
              <svg viewBox="0 0 24 24" aria-hidden>
                <rect
                  x="4.5"
                  y="6"
                  width="15"
                  height="13.5"
                  rx="2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M8 4.8v2.4M16 4.8v2.4M4.5 10.2h15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span>{todayLabel()}</span>
            </div>
          </article>

          <article className="dr-kpi tone-cyan">
            <span className="dr-kpi-ico" aria-hidden>
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
              <p>Tasks open</p>
              <h3>{doing + store.visibleTasks.filter((t) => t.status === "todo").length}</h3>
            </div>
          </article>

          <article className="dr-kpi tone-violet">
            <span className="dr-kpi-ico" aria-hidden>
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
              <p>Hours Logged</p>
              <h3>{hoursLogged}h</h3>
            </div>
          </article>

          <article className="dr-kpi tone-green">
            <span className="dr-kpi-ico" aria-hidden>
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
              <p>Completion</p>
              <h3>{completion}%</h3>
            </div>
          </article>

          <article className="dr-kpi tone-amber">
            <span className="dr-kpi-ico" aria-hidden>
              <svg viewBox="0 0 24 24">
                <path
                  d="m12 3.8 2.1 4.4 4.8.5-3.6 3.3 1 4.7L12 14.7 7.7 16.7l1-4.7-3.6-3.3 4.8-.5L12 3.8Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <div>
              <p>Reports sent</p>
              <h3>{reports.length}</h3>
            </div>
          </article>
        </section>

        <section className="dr-body">
          <article className="dr-card dr-form-card">
            <label className="dr-field">
              <span>What did you work on today? *</span>
              <textarea
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your work, tasks completed, and progress..."
              />
            </label>

            <div className="dr-field-row">
              <label className="dr-field">
                <span>Task Status</span>
                <select
                  value={workStatus}
                  onChange={(e) => setWorkStatus(e.target.value as DailyReportStatus)}
                >
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>Blocked</option>
                </select>
              </label>
              <label className="dr-field">
                <span>Time Spent</span>
                <select value={hours} onChange={(e) => setHours(e.target.value)}>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="6">6 Hours</option>
                  <option value="8">8 Hours</option>
                </select>
              </label>
            </div>

            <label className="dr-upload">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.zip"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              />
              <span className="dr-upload-ico" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path
                    d="M7.5 16.5h9c2 0 3.5-1.5 3.5-3.4 0-1.7-1.2-3.1-2.9-3.4C16.8 7.2 14.6 5.5 12 5.5S7.2 7.2 6.9 9.7C5.2 10 4 11.4 4 13.1c0 1.9 1.5 3.4 3.5 3.4Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 14.8V9.5M9.8 11.4 12 9.2l2.2 2.2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <strong>{fileName || "Click to upload or drag and drop"}</strong>
              <small>Supports: PDF, PNG, JPG, ZIP</small>
            </label>

            <button type="button" className="dr-submit" onClick={onSubmit}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M4.5 11.2 19.2 4.8 12.4 19.4l-1.8-6.2-6.1-2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              Submit to {manager?.name?.split(" ")[0] ?? "manager"}
            </button>
          </article>

          <div className="dr-side">
            <article className="dr-card">
              <header className="dr-card-head">
                <h3>My Recent Reports</h3>
                <Link to="/dev/daily-report">View all</Link>
              </header>
              <div className="dr-table-wrap">
                <table className="dr-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Tasks</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 6).map((report) => (
                      <tr key={report.id}>
                        <td>{formatDate(report.date)}</td>
                        <td>{report.tasksCompleted}</td>
                        <td>{report.hours}h</td>
                        <td>
                          <span className="dr-pill ok">{report.status}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dr-view-btn"
                            title="View report"
                            onClick={() => setViewId(report.id)}
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
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          No reports yet. Submit one to your manager.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {viewing ? (
                <div className="dr-preview">
                  <strong>
                    {formatDate(viewing.date)} · {viewing.workStatus} · sent to{" "}
                    {manager?.name ?? "manager"}
                  </strong>
                  <p>{viewing.description}</p>
                  {viewing.attachmentName ? <small>File: {viewing.attachmentName}</small> : null}
                </div>
              ) : null}
            </article>

            <article className="dr-card">
              <header className="dr-card-head">
                <h3>Your Performance</h3>
                <span className="dr-week">This Week</span>
              </header>
              <div className="dr-perf">
                <div
                  className="dr-gauge"
                  style={{
                    background: `conic-gradient(#a3a65b 0 ${perf}%, #eef0d8 ${perf}% 100%)`,
                  }}
                  aria-hidden
                >
                  <div>
                    <strong>{perf}%</strong>
                    <small>Overall</small>
                  </div>
                </div>
                <div className="dr-chart" aria-hidden>
                  <svg viewBox="0 0 240 110" preserveAspectRatio="none">
                    <path
                      d={`M8 ${100 - weekPoints[0] * 0.7} ${weekPoints
                        .map((p, i) => `L${8 + i * 38} ${100 - p * 0.7}`)
                        .join(" ")}`}
                      fill="none"
                      stroke="#a3a65b"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {weekPoints.map((p, i) => (
                      <circle
                        key={i}
                        cx={8 + i * 38}
                        cy={100 - p * 0.7}
                        r={i === weekPoints.length - 1 ? 4.5 : 3}
                        fill={i === weekPoints.length - 1 ? "#1b2a22" : "#a3a65b"}
                      />
                    ))}
                  </svg>
                  <div className="dr-chart-labels">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
