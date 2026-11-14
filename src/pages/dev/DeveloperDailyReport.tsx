import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

type ReportStatus = "In Progress" | "Completed" | "Blocked";
type SavedReport = {
  id: string;
  date: string;
  tasksCompleted: number;
  hours: number;
  status: "Submitted";
  description: string;
  workStatus: ReportStatus;
};

function todayLabel() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DeveloperDailyReport({ store }: { store: CrmStore }) {
  const doing = store.visibleTasks.filter((t) => t.status === "doing").length;
  const done = store.visibleTasks.filter((t) => t.status === "done").length;
  const total = store.visibleTasks.length;
  const completion = total ? Math.round((done / total) * 100) : 87;

  const [description, setDescription] = useState("");
  const [workStatus, setWorkStatus] = useState<ReportStatus>("In Progress");
  const [hours, setHours] = useState("4");
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState("");
  const [reports, setReports] = useState<SavedReport[]>([
    {
      id: "r1",
      date: "2026-11-10",
      tasksCompleted: 3,
      hours: 6,
      status: "Submitted",
      description: "Finished API auth endpoints and reviewed PR feedback.",
      workStatus: "Completed",
    },
    {
      id: "r2",
      date: "2026-11-09",
      tasksCompleted: 2,
      hours: 5,
      status: "Submitted",
      description: "Fixed responsive dashboard bugs and logged remaining QA.",
      workStatus: "In Progress",
    },
    {
      id: "r3",
      date: "2026-11-08",
      tasksCompleted: 4,
      hours: 7,
      status: "Submitted",
      description: "Database optimization pass and sync contract updates.",
      workStatus: "Completed",
    },
  ]);
  const [viewId, setViewId] = useState<string | null>(null);

  const weekPoints = useMemo(() => [72, 78, 81, 86, 88, 90, 92], []);
  const perf = 92;
  const hoursLogged = reports.slice(0, 1).reduce((s, r) => s + r.hours, 0) || 6;

  const onSubmit = () => {
    if (!description.trim()) {
      setNotice("Please describe what you worked on today.");
      return;
    }
    const next: SavedReport = {
      id: `r${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      tasksCompleted: Math.max(doing + done, 1),
      hours: Number(hours) || 4,
      status: "Submitted",
      description: description.trim(),
      workStatus,
    };
    setReports((prev) => [next, ...prev]);
    setDescription("");
    setFileName("");
    setNotice("Daily report submitted to your project manager.");
    setViewId(next.id);
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
            <p>Share your daily work progress and updates.</p>
          </div>
        </section>

        {notice ? <p className="dr-notice">{notice}</p> : null}

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
              <p>Tasks Today</p>
              <h3>{Math.max(doing, 3)}</h3>
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
              <h3>{completion || 87}%</h3>
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
              <p>On Time</p>
              <h3>Yes</h3>
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
                  onChange={(e) => setWorkStatus(e.target.value as ReportStatus)}
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
              Submit Report
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
                      <th>Tasks Completed</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.slice(0, 5).map((report) => (
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
                  </tbody>
                </table>
              </div>
              {viewing ? (
                <div className="dr-preview">
                  <strong>
                    {formatDate(viewing.date)} · {viewing.workStatus}
                  </strong>
                  <p>{viewing.description}</p>
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
                    background: `conic-gradient(#00aeef 0 ${perf}%, #d9e2de ${perf}% 100%)`,
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
                      stroke="#00aeef"
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
                        fill={i === weekPoints.length - 1 ? "#0f3d2e" : "#00aeef"}
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
