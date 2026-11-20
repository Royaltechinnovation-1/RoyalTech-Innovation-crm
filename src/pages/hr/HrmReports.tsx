import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";
import { useHrmStore } from "../../data/hrmStore";

function pct(n: number, d: number) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function HrmReports({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const months = useMemo(() => {
    const set = new Set(hrm.attendanceRecords.map((r) => String(r.date).slice(0, 7)));
    return [...set].sort().reverse();
  }, [hrm.attendanceRecords]);
  const [month, setMonth] = useState(months[0] ?? "2026-11");

  const stats = useMemo(() => {
    const employees = hrm.employees;
    const active = employees.filter((e) => e.status === "Active").length;
    const newHires = employees.filter((e) => e.status === "New Hire").length;
    const onLeaveEmp = employees.filter((e) => e.status === "On Leave").length;

    const monthAtt = hrm.attendanceRecords.filter((r) => String(r.date).startsWith(month));
    const present = monthAtt.filter((r) =>
      ["Present", "Late", "Halfday"].includes(r.status),
    ).length;
    const absent = monthAtt.filter((r) => r.status === "Absent").length;
    const late = monthAtt.filter((r) => r.status === "Late").length;
    const halfday = monthAtt.filter((r) => r.status === "Halfday").length;
    const onLeaveDays = monthAtt.filter((r) =>
      ["On Leave", "Short Leave"].includes(r.status),
    ).length;
    const holiday = monthAtt.filter((r) => r.status === "Holiday").length;
    const workDays = monthAtt.filter((r) => r.status !== "Holiday").length;
    const attendanceRate = pct(present, workDays);

    const byDay = Object.entries(
      monthAtt.reduce<Record<string, { present: number; absent: number; total: number }>>(
        (acc, r) => {
          const d = String(r.date);
          if (!acc[d]) acc[d] = { present: 0, absent: 0, total: 0 };
          acc[d].total += 1;
          if (["Present", "Late", "Halfday"].includes(r.status)) acc[d].present += 1;
          if (r.status === "Absent") acc[d].absent += 1;
          return acc;
        },
        {},
      ),
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date,
        label: date.slice(8),
        ...v,
        rate: pct(v.present, v.total),
      }));

    const departments = Object.entries(
      employees.reduce<Record<string, number>>((acc, e) => {
        acc[e.department] = (acc[e.department] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const pipeline = ["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired"].map(
      (stage) => ({
        stage,
        count: hrm.candidates.filter((c) => c.stage === stage).length,
      }),
    );

    const leavePending = hrm.leaveRequests.filter((r) => r.status === "Pending");
    const leaveApproved = hrm.leaveRequests.filter((r) => r.status === "Approved");
    const leaveByType = Object.entries(
      hrm.leaveRequests.reduce<Record<string, number>>((acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + (Number(r.days) || 1);
        return acc;
      }, {}),
    )
      .map(([type, days]) => ({ type, days }))
      .sort((a, b) => b.days - a.days);

    const scores = hrm.performanceRatings.map((r) => Number(r.score) || 0);
    const avgScore = scores.length
      ? Number((scores.reduce((s, n) => s + n, 0) / scores.length).toFixed(1))
      : 0;
    const highPerformers = [...hrm.performanceRatings]
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 5);
    const needsAttention = [...hrm.performanceRatings]
      .sort((a, b) => Number(a.score) - Number(b.score))
      .slice(0, 5);
    const scoreBands = [
      { label: "4.5 – 5.0", min: 4.5, max: 5.1 },
      { label: "4.0 – 4.4", min: 4.0, max: 4.5 },
      { label: "3.5 – 3.9", min: 3.5, max: 4.0 },
      { label: "Below 3.5", min: 0, max: 3.5 },
    ].map((b) => ({
      ...b,
      count: scores.filter((s) => s >= b.min && s < b.max).length,
    }));

    const openJobs = hrm.jobs.filter((j) => j.status === "Open").length;
    const netPayroll = hrm.payrollRecords.reduce((s, r) => s + (Number(r.net) || 0), 0);
    const pendingPayroll = hrm.payrollRecords.filter((r) => r.status === "Pending").length;
    const exits = hrm.resignations.length;
    const onboarding = hrm.onboardingPrograms.filter((p) =>
      ["In progress", "Pending", "Active"].includes(String(p.status)),
    ).length;

    return {
      total: employees.length,
      active,
      newHires,
      onLeaveEmp,
      present,
      absent,
      late,
      halfday,
      onLeaveDays,
      holiday,
      workDays,
      attendanceRate,
      byDay,
      departments,
      pipeline,
      leavePending,
      leaveApproved,
      leaveByType,
      avgScore,
      highPerformers,
      needsAttention,
      scoreBands,
      openJobs,
      netPayroll,
      pendingPayroll,
      exits,
      onboarding,
      maxDayPresent: Math.max(...byDay.map((d) => d.present), 1),
      maxDept: Math.max(...departments.map((d) => d.value), 1),
      maxPipe: Math.max(...pipeline.map((p) => p.count), 1),
      maxLeaveType: Math.max(...leaveByType.map((l) => l.days), 1),
      maxBand: Math.max(...scoreBands.map((b) => b.count), 1),
      candidates: hrm.candidates.length,
      interviews: hrm.interviews.filter((i) => i.status === "Scheduled").length,
    };
  }, [hrm, month]);

  return (
    <RequirePermission store={store} permission="hr">
      <div className="page ps-dash hrm-ps-dash hrm-reports">
        <section className="hrm-analytics-hero">
          <div>
            <p className="hrm-profile-hello">Dashboard analytics</p>
            <h2>People overview · {monthLabel(month)}</h2>
            <p>
              Same live HR data as your dashboard — attendance, hiring, leave, payroll, and
              performance.
            </p>
          </div>
          <div className="hrm-analytics-hero-actions">
            <label className="hrm-report-month">
              <span>Period</span>
              <select
                className="field"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {monthLabel(m)}
                  </option>
                ))}
              </select>
            </label>
            <Link className="btn btn-secondary" to="/">
              Dashboard
            </Link>
            <Link className="btn btn-primary" to="/hr/attendance">
              Attendance
            </Link>
          </div>
        </section>

        <section className="ps-kpi-row hrm-analytics-kpis hrm-analytics-kpis-6">
          <article className="ps-kpi tone-green">
            <div className="ps-kpi-top">
              <span className="ps-kpi-icon">E</span>
              <span className="ps-kpi-delta">{stats.active} act</span>
            </div>
            <p>Headcount</p>
            <h3>{stats.total}</h3>
            <footer>
              <span>{stats.newHires} new</span>
              <span>{stats.onLeaveEmp} leave</span>
            </footer>
          </article>
          <article className="ps-kpi tone-blue">
            <div className="ps-kpi-top">
              <span className="ps-kpi-icon">A</span>
              <span className="ps-kpi-delta">{stats.attendanceRate}%</span>
            </div>
            <p>Attendance rate</p>
            <h3>{stats.attendanceRate}%</h3>
            <footer>
              <span>{stats.present} present</span>
              <span>{stats.absent} absent</span>
            </footer>
          </article>
          <article className="ps-kpi tone-amber">
            <div className="ps-kpi-top">
              <span className="ps-kpi-icon">L</span>
              <span className="ps-kpi-delta">{stats.leavePending.length}</span>
            </div>
            <p>Leave pending</p>
            <h3>{stats.leavePending.length}</h3>
            <footer>
              <span>{stats.leaveApproved.length} approved</span>
              <Link to="/hr/leave">Review</Link>
            </footer>
          </article>
          <article className="ps-kpi tone-red">
            <div className="ps-kpi-top">
              <span className="ps-kpi-icon">H</span>
              <span className="ps-kpi-delta">{stats.candidates}</span>
            </div>
            <p>Open roles</p>
            <h3>{stats.openJobs}</h3>
            <footer>
              <span>{stats.interviews} interviews</span>
              <Link to="/hr/recruitment">Pipeline</Link>
            </footer>
          </article>
          <article className="ps-kpi tone-green">
            <div className="ps-kpi-top">
              <span className="ps-kpi-icon">★</span>
              <span className="ps-kpi-delta">/5</span>
            </div>
            <p>Avg score</p>
            <h3>{stats.avgScore.toFixed(1)}</h3>
            <footer>
              <span>{hrm.performanceRatings.length} reviews</span>
              <Link to="/hr/performance">Edit</Link>
            </footer>
          </article>
          <article className="ps-kpi tone-blue">
            <div className="ps-kpi-top">
              <span className="ps-kpi-icon">₹</span>
              <span className="ps-kpi-delta">{stats.pendingPayroll}</span>
            </div>
            <p>Net payroll</p>
            <h3 className="hrm-kpi-money">{formatCurrency(stats.netPayroll)}</h3>
            <footer>
              <span>{stats.pendingPayroll} pending</span>
              <Link to="/hr/payroll">Payroll</Link>
            </footer>
          </article>
        </section>

        <section className="hrm-report-status">
          {[
            { label: "Present / late / half", value: stats.present, tone: "ok" },
            { label: "Absent", value: stats.absent, tone: "bad" },
            { label: "Late", value: stats.late, tone: "mid" },
            { label: "Leave days", value: stats.onLeaveDays, tone: "mid" },
            { label: "Holidays", value: stats.holiday, tone: "soft" },
            { label: "Onboarding", value: stats.onboarding, tone: "ok" },
            { label: "Exits", value: stats.exits, tone: "bad" },
            { label: "Halfday", value: stats.halfday, tone: "soft" },
          ].map((item) => (
            <div key={item.label} className={`hrm-report-chip tone-${item.tone}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        <section className="hrm-analytics-split hrm-analytics-split-wide">
          <article className="ps-card stretch">
            <header>
              <h3>Daily attendance · {monthLabel(month)}</h3>
              <Link to="/hr/attendance">Open</Link>
            </header>
            <div className="ps-legend">
              <span>
                <i className="sw a" /> Present
              </span>
              <span>
                <i className="sw b" /> Absent
              </span>
            </div>
            <div className="hrm-report-bars">
              {stats.byDay.slice(-18).map((d) => (
                <div className="hrm-report-bar" key={d.date} title={`${d.date}: ${d.rate}%`}>
                  <div className="hrm-report-bar-track">
                    <span
                      className="is-present"
                      style={{
                        height: `${Math.max(8, (d.present / stats.maxDayPresent) * 100)}%`,
                      }}
                    />
                    <i
                      className="is-absent"
                      style={{
                        height: `${Math.max(0, (d.absent / stats.maxDayPresent) * 100)}%`,
                      }}
                    />
                  </div>
                  <small>{d.label}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="ps-card">
            <header>
              <h3>Attendance mix</h3>
              <span>{stats.attendanceRate}% rate</span>
            </header>
            <div className="ps-donut-wrap">
              <div
                className="ps-donut"
                style={{
                  background: `conic-gradient(#A3A65B 0 ${stats.attendanceRate}%, #e8e4d8 ${stats.attendanceRate}% 100%)`,
                }}
                aria-hidden
              >
                <div>
                  <strong>{stats.attendanceRate}%</strong>
                  <small>present</small>
                </div>
              </div>
              <ul className="ps-donut-legend">
                <li>
                  <i className="c-green" /> Present {stats.present}
                </li>
                <li>
                  <i className="c-red" /> Absent {stats.absent}
                </li>
                <li>
                  <i className="c-amber" /> Late {stats.late}
                </li>
                <li>
                  <i className="c-blue" /> Leave days {stats.onLeaveDays}
                </li>
              </ul>
            </div>
          </article>
        </section>

        <section className="ps-grid-b">
          <article className="ps-card">
            <header>
              <h3>Headcount by department</h3>
              <Link to="/hr/employees">Directory</Link>
            </header>
            <div className="ps-sources">
              {stats.departments.map((row, i) => (
                <div className="ps-source-row" key={row.name}>
                  <span>{row.name}</span>
                  <div className="track">
                    <i
                      className={`n${i % 5}`}
                      style={{ width: `${(row.value / stats.maxDept) * 100}%` }}
                    />
                  </div>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="ps-card">
            <header>
              <h3>Hiring pipeline</h3>
              <Link to="/hr/recruitment">Recruitment</Link>
            </header>
            <div className="ps-sources">
              {stats.pipeline.map((row, i) => (
                <div className="ps-source-row" key={row.stage}>
                  <span>{row.stage}</span>
                  <div className="track">
                    <i
                      className={`n${i % 5}`}
                      style={{
                        width: `${Math.max(6, (row.count / stats.maxPipe) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>{row.count}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="ps-card">
            <header>
              <h3>Leave by type</h3>
              <Link to="/hr/leave">Leave</Link>
            </header>
            <div className="ps-sources">
              {stats.leaveByType.length ? (
                stats.leaveByType.map((row, i) => (
                  <div className="ps-source-row" key={row.type}>
                    <span>{row.type}</span>
                    <div className="track">
                      <i
                        className={`n${i % 5}`}
                        style={{
                          width: `${Math.max(6, (row.days / stats.maxLeaveType) * 100)}%`,
                        }}
                      />
                    </div>
                    <span>{row.days}d</span>
                  </div>
                ))
              ) : (
                <p className="muted">No leave requests yet.</p>
              )}
            </div>
            {stats.leavePending.length ? (
              <div className="hrm-report-pending">
                <h4>Pending</h4>
                {stats.leavePending.slice(0, 3).map((leave) => (
                  <div key={leave.id} className="hrm-report-pending-row">
                    <strong>{leave.employeeName}</strong>
                    <span>
                      {leave.type} · {leave.days}d · {formatDate(leave.startDate)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        </section>

        <section className="hrm-ps-bottom">
          <article className="ps-card">
            <header>
              <h3>Performance bands</h3>
              <Link to="/hr/performance">Scores</Link>
            </header>
            <div className="ps-sources">
              {stats.scoreBands.map((band, i) => (
                <div className="ps-source-row" key={band.label}>
                  <span>{band.label}</span>
                  <div className="track">
                    <i
                      className={`n${i % 5}`}
                      style={{
                        width: `${Math.max(6, (band.count / stats.maxBand) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>{band.count}</span>
                </div>
              ))}
            </div>
            <div className="hrm-report-two-col">
              <div>
                <h4>Top</h4>
                <ul className="hrm-report-rank">
                  {stats.highPerformers.slice(0, 3).map((r, i) => (
                    <li key={r.employeeId}>
                      <span className="rank">{i + 1}</span>
                      <div>
                        <strong>{r.name}</strong>
                        <small>{r.role}</small>
                      </div>
                      <em>{Number(r.score).toFixed(1)}</em>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4>Watch</h4>
                <ul className="hrm-report-rank warn">
                  {stats.needsAttention.slice(0, 3).map((r, i) => (
                    <li key={r.employeeId}>
                      <span className="rank">{i + 1}</span>
                      <div>
                        <strong>{r.name}</strong>
                        <small>{r.role}</small>
                      </div>
                      <em>{Number(r.score).toFixed(1)}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="ps-card">
            <header>
              <h3>Leave status</h3>
              <Link to="/hr/leave">All</Link>
            </header>
            <div className="hrm-leave-status">
              {hrm.leaveRequests.slice(0, 6).map((leave) => (
                <div className="hrm-leave-status-row" key={leave.id}>
                  <div className="hrm-table-name">
                    <span className="ps-av sm">{initials(leave.employeeName)}</span>
                    <div>
                      <strong>{leave.type}</strong>
                      <small>
                        {leave.employeeName} · {leave.days}d
                      </small>
                    </div>
                  </div>
                  <span
                    className={`hrm-status-pill ${
                      leave.status === "Approved"
                        ? "ok"
                        : leave.status === "Pending"
                          ? "info"
                          : "bad"
                    }`}
                  >
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="ps-card hrm-report-links">
          <header>
            <h3>Open modules</h3>
          </header>
          <div className="hrm-quick">
            {[
              { label: "Dashboard", path: "/" },
              { label: "Employees", path: "/hr/employees" },
              { label: "Attendance", path: "/hr/attendance" },
              { label: "Leave", path: "/hr/leave" },
              { label: "Recruitment", path: "/hr/recruitment" },
              { label: "Payroll", path: "/hr/payroll" },
              { label: "Performance", path: "/hr/performance" },
              { label: "Messages", path: "/hr/messages" },
            ].map((item) => (
              <Link key={item.path} to={item.path} className="hrm-quick-link">
                {item.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
