import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";
import { useHrmStore } from "../../data/hrmStore";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function HrmDashboard({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const firstName = store.currentUser.name.split(" ")[0];
  const totalEmployees = hrm.employees.length;
  const activeEmployees = hrm.employees.filter((e) => e.status === "Active").length;
  const newHires = hrm.employees.filter((e) => e.status === "New Hire").length;
  const onLeave = hrm.employees.filter((e) => e.status === "On Leave").length;
  const pendingLeave = hrm.leaveRequests.filter((r) => r.status === "Pending").length;
  const todayRecords = hrm.attendanceRecords.filter((r) => r.date === "2026-11-11");
  const presentToday = todayRecords.filter((r) => r.status === "Present").length;
  const lateToday = todayRecords.filter((r) => r.status === "Late").length;
  const openJobs = hrm.jobs.filter((j) => j.status === "Open").length;
  const shortlisted = hrm.candidates.filter((c) =>
    ["Shortlisted", "Interview", "Offer"].includes(c.stage),
  ).length;
  const upcomingInterviews = [...hrm.interviews]
    .filter((i) => i.status === "Scheduled")
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 5);
  const pendingPayroll = hrm.payrollRecords.filter((r) => r.status === "Pending").length;
  const netPayroll = hrm.payrollRecords.reduce((s, r) => s + r.net, 0);
  const maxPresent = Math.max(...hrm.attendanceTrend.map((d) => d.present), 1);

  const departmentData = Object.entries(
    hrm.employees.reduce<Record<string, number>>((acc, e) => {
      acc[e.department] = (acc[e.department] || 0) + 1;
      return acc;
    }, {}),
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const pipeline = ["Applied", "Screening", "Shortlisted", "Interview", "Offer"].map((stage) => ({
    stage,
    count: hrm.candidates.filter((c) => c.stage === stage).length,
  }));
  const maxPipe = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <RequirePermission store={store} permission="hr">
      <div className="page rd-dash hrm-suite">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>HR</span>
              <span>/</span>
              <strong>Dashboard</strong>
            </nav>
            <h2>
              {greeting()}, {firstName}
            </h2>
            <p>
              People ops overview · {totalEmployees} employees · {presentToday} present today ·{" "}
              {pendingLeave} leave to review
            </p>
          </div>
          <div className="rd-head-actions">
            <Link className="btn btn-secondary" to="/hr/employees">
              Directory
            </Link>
            <Link className="btn btn-primary" to="/hr/employees">
              + Add employee
            </Link>
          </div>
        </header>

        <section className="rd-kpi-row hrm-kpi-5">
          <article className="rd-kpi">
            <p>Total employees</p>
            <h3>{totalEmployees}</h3>
            <small>{activeEmployees} active</small>
          </article>
          <article className="rd-kpi">
            <p>New hires</p>
            <h3>{newHires}</h3>
            <small>This cycle</small>
          </article>
          <article className="rd-kpi">
            <p>On leave</p>
            <h3>{onLeave}</h3>
            <small>{pendingLeave} pending requests</small>
          </article>
          <article className="rd-kpi">
            <p>Open roles</p>
            <h3>{openJobs}</h3>
            <small>{shortlisted} shortlisted</small>
          </article>
          <article className="rd-kpi">
            <p>Payroll pending</p>
            <h3>{pendingPayroll}</h3>
            <small>Net {formatCurrency(netPayroll)}</small>
          </article>
        </section>

        <section className="hrm-quick">
          {[
            { label: "Employees", path: "/hr/employees" },
            { label: "Recruitment", path: "/hr/recruitment" },
            { label: "Interviews", path: "/hr/interviews" },
            { label: "Onboarding", path: "/hr/onboarding" },
            { label: "Attendance", path: "/hr/attendance" },
            { label: "Leave", path: "/hr/leave" },
            { label: "Payroll", path: "/hr/payroll" },
            { label: "Performance", path: "/hr/performance" },
            { label: "Exit", path: "/hr/exit" },
          ].map((item) => (
            <Link key={item.path} to={item.path} className="hrm-quick-link">
              {item.label}
            </Link>
          ))}
        </section>

        <section className="rd-split">
          <article className="rd-card">
            <header>
              <h3>Attendance overview</h3>
              <Link to="/hr/attendance">Open</Link>
            </header>
            <div className="hrm-mini-stats">
              <div>
                <span>Present today</span>
                <strong>{presentToday}</strong>
              </div>
              <div>
                <span>Late</span>
                <strong>{lateToday}</strong>
              </div>
              <div>
                <span>Avg hours</span>
                <strong>8.6h</strong>
              </div>
            </div>
            <div className="rd-bars">
              {hrm.attendanceTrend.map((d, i) => (
                <div className="rd-bar" key={`${d.day}-${i}`}>
                  <div className="rd-bar-track">
                    <span style={{ height: `${Math.max(10, (d.present / maxPresent) * 100)}%` }} />
                  </div>
                  <small>{d.day}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="rd-card">
            <header>
              <h3>Headcount by department</h3>
            </header>
            <div className="rd-list">
              {departmentData.map((row) => (
                <div className="rd-list-row compact" key={row.name}>
                  <div style={{ flex: 1 }}>
                    <strong>
                      {row.name} · {row.value}
                    </strong>
                    <div className="rd-mini-track tall">
                      <i
                        style={{
                          width: `${(row.value / Math.max(departmentData[0]?.value ?? 1, 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="rd-split">
          <article className="rd-table-card stretch">
            <header>
              <h3>Hiring pipeline</h3>
              <Link to="/hr/recruitment">Recruitment</Link>
            </header>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Stage</th>
                    <th>Candidates</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {pipeline.map((row) => (
                    <tr key={row.stage}>
                      <td>
                        <strong>{row.stage}</strong>
                      </td>
                      <td>{row.count}</td>
                      <td style={{ minWidth: 140 }}>
                        <div className="rd-mini-track">
                          <i style={{ width: `${Math.max(8, (row.count / maxPipe) * 100)}%` }} />
                        </div>
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
                <h3>Upcoming interviews</h3>
                <Link to="/hr/interviews">All</Link>
              </header>
              <div className="rd-list">
                {upcomingInterviews.map((item) => (
                  <div className="rd-list-row compact" key={item.id}>
                    <span className="rd-av">{initials(item.candidateName)}</span>
                    <div>
                      <strong>{item.candidateName}</strong>
                      <small>
                        {item.jobTitle} · {formatDate(item.date)} {item.time}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rd-card">
              <header>
                <h3>Leave queue</h3>
                <Link to="/hr/leave">Review</Link>
              </header>
              <div className="rd-list">
                {hrm.leaveRequests
                  .filter((r) => r.status === "Pending")
                  .slice(0, 4)
                  .map((leave) => (
                    <div className="rd-list-row compact" key={leave.id}>
                      <span className="rd-av sm">{initials(leave.employeeName)}</span>
                      <div>
                        <strong>{leave.employeeName}</strong>
                        <small>
                          {leave.type} · {leave.days}d · {formatDate(leave.startDate)}
                        </small>
                      </div>
                    </div>
                  ))}
              </div>
            </article>
          </aside>
        </section>

        <section className="rd-split">
          <article className="rd-card">
            <header>
              <h3>Recent activity</h3>
            </header>
            <div className="rd-list">
              {hrm.recentActivities.slice(0, 6).map((act) => (
                <div className="rd-list-row compact" key={act.id}>
                  <div>
                    <strong>{act.title}</strong>
                    <small>
                      {act.detail} · {act.time}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <aside className="rd-side">
            <article className="rd-card">
              <header>
                <h3>Birthdays</h3>
              </header>
              <div className="rd-list">
                {hrm.upcomingBirthdays.map((b) => (
                  <div className="rd-list-row compact" key={b.name}>
                    <span className="rd-av sm">{initials(b.name)}</span>
                    <div>
                      <strong>{b.name}</strong>
                      <small>
                        {b.department} · {formatDate(b.date)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
            <article className="rd-card">
              <header>
                <h3>Announcements</h3>
              </header>
              <div className="rd-list">
                {hrm.announcements.map((a) => (
                  <div className="rd-list-row compact" key={a.id}>
                    <div>
                      <strong>{a.title}</strong>
                      <small>
                        {a.detail} · {a.tag}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </RequirePermission>
  );
}
