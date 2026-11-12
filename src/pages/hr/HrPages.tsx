import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { fetchHrDashboard, type HrDashboardData } from "../../lib/moduleApi";
import { DbBadge, ModuleShell } from "../../components/DbWidgets";
import { PageHeader, Panel, Tag, Widget } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

export function HrDashboard({ store }: { store: CrmStore }) {
  const [data, setData] = useState<HrDashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHrDashboard()
      .then((rows) => {
        setData(rows);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <RequirePermission store={store} permission="hr">
      <div className="page">
        <PageHeader
          eyebrow="HR management"
          title="HR Dashboard"
          lede="People, hiring, leave, and payroll pulse from MySQL."
          actions={
            <>
              <DbBadge mode={data?.mode} />
              <Link className="btn btn-secondary" to="/hr/employees">
                Employees
              </Link>
              <Link className="btn btn-primary" to="/hr/recruitment">
                Recruitment
              </Link>
            </>
          }
        />

        <ModuleShell error={error} loading={!error && !data}>
          {data ? (
            <>
              <section className="stat-row sales-stat-row">
                <Widget label="Employees" value={data.summary.employees} meta={`${data.summary.active} active`} accent="forest" />
                <Widget label="Onboarding" value={data.summary.onboarding} meta="New joiners" accent="gold" />
                <Widget label="Candidates" value={data.summary.candidates} meta="Recruitment pipeline" accent="sage" />
                <Widget
                  label="Payroll / mo"
                  value={formatCurrency(data.summary.payrollMonthly)}
                  meta={`${data.summary.pendingLeave} leave pending`}
                  accent="mist"
                />
              </section>

              <section className="sales-grid">
                <Panel title="Headcount by department">
                  <div className="sales-bars">
                    {Object.entries(data.byDepartment).map(([dept, count]) => {
                      const max = Math.max(...Object.values(data.byDepartment), 1);
                      return (
                        <div className="sales-bar-row" key={dept}>
                          <div className="sales-bar-meta">
                            <span>{dept}</span>
                            <strong>{count}</strong>
                          </div>
                          <div className="progress">
                            <span style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Panel>
                <Panel title="Recruitment stages" dark>
                  <div className="list">
                    {data.recruitment.map((row) => (
                      <div className="list-row" key={row.stage}>
                        <p className="list-title">{row.stage}</p>
                        <strong>{row.count}</strong>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>

              <section className="sales-grid three">
                <Panel title="Recent employees" action={<Link to="/hr/employees">Directory</Link>}>
                  <div className="list">
                    {data.recentEmployees.map((emp) => (
                      <div className="list-row" key={emp.id}>
                        <div>
                          <p className="list-title">{emp.name}</p>
                          <p className="list-sub">
                            {emp.role_title} · {emp.department}
                          </p>
                        </div>
                        <Tag tone={emp.status === "active" ? "sage" : "gold"}>{emp.status}</Tag>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Leave queue" action={<Link to="/hr/leave">Leave</Link>}>
                  <div className="list">
                    {data.leaveQueue.map((leave) => (
                      <div className="list-row" key={leave.id}>
                        <div>
                          <p className="list-title">{leave.employee_name}</p>
                          <p className="list-sub">
                            {leave.leave_type} · {formatDate(String(leave.date_from))}
                          </p>
                        </div>
                        <Tag tone={leave.status === "pending" ? "gold" : "sage"}>{leave.status}</Tag>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel title="Candidates" dark action={<Link to="/hr/recruitment">All</Link>}>
                  <div className="list">
                    {data.candidates.map((cand) => (
                      <div className="list-row" key={cand.id}>
                        <div>
                          <p className="list-title">{cand.name}</p>
                          <p className="list-sub">{cand.role_title}</p>
                        </div>
                        <Tag tone="gold">{cand.stage}</Tag>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>
            </>
          ) : null}
        </ModuleShell>
      </div>
    </RequirePermission>
  );
}

export function Employees({ store }: { store: CrmStore }) {
  const showSalary = store.allow("salary.view");

  return (
    <RequirePermission store={store} permission="hr.employees">
      <div className="page">
        <PageHeader
          eyebrow="HR management"
          title="Employee Directory"
          lede={
            showSalary
              ? "Salary visible for authorized roles only."
              : "Salary columns are hidden for your role."
          }
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Joined</th>
                {showSalary ? <th>Salary</th> : null}
              </tr>
            </thead>
            <tbody>
              {store.data.employees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <strong>{emp.name}</strong>
                    <div className="muted">{emp.email}</div>
                  </td>
                  <td>{emp.roleTitle}</td>
                  <td>{emp.department}</td>
                  <td>
                    <Tag tone={emp.status === "active" ? "sage" : "gold"}>{emp.status}</Tag>
                  </td>
                  <td>{formatDate(emp.joinDate)}</td>
                  {showSalary ? <td>{emp.salary ? formatCurrency(emp.salary) : "—"}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function Recruitment({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="hr.recruitment">
      <div className="page">
        <PageHeader eyebrow="HR management" title="Recruitment & Candidates" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Stage</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {store.data.candidates.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="muted">{c.email}</div>
                  </td>
                  <td>{c.role}</td>
                  <td>
                    <Tag tone="gold">{c.stage}</Tag>
                  </td>
                  <td>{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function LeaveManagement({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="hr.leave">
      <div className="page">
        <PageHeader eyebrow="HR management" title="Leave Management" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {store.data.leaveRequests.map((leave) => {
                const emp = store.data.employees.find((e) => e.id === leave.employeeId);
                return (
                  <tr key={leave.id}>
                    <td>{emp?.name}</td>
                    <td>{leave.type}</td>
                    <td>{formatDate(leave.from)}</td>
                    <td>{formatDate(leave.to)}</td>
                    <td>
                      <Tag tone={leave.status === "approved" ? "sage" : leave.status === "pending" ? "gold" : "cold"}>
                        {leave.status}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function Payroll({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="hr.payroll">
      <div className="page">
        <PageHeader
          eyebrow="HR management"
          title="Payroll & Salary"
          lede="Confidential compensation — founder/HR/finance only."
        />
        {!store.allow("salary.view") ? (
          <Panel title="Restricted">
            <p className="lede">Your role cannot view salary information.</p>
          </Panel>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Monthly equivalent</th>
                  <th>Annual</th>
                </tr>
              </thead>
              <tbody>
                {store.data.employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.name}</td>
                    <td>{emp.department}</td>
                    <td>{emp.salary ? formatCurrency(Math.round(emp.salary / 12)) : "—"}</td>
                    <td>{emp.salary ? formatCurrency(emp.salary) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

export function HrPlaceholder({
  store,
  permission,
  title,
  body,
}: {
  store: CrmStore;
  permission: Parameters<CrmStore["allow"]>[0];
  title: string;
  body: string;
}) {
  return (
    <RequirePermission store={store} permission={permission}>
      <div className="page">
        <PageHeader eyebrow="HR management" title={title} lede={body} />
        <Panel title="Connected to central HR data">
          <p className="lede">
            This module reads from the shared employee, candidate, and leave records — ready for deeper workflows.
          </p>
        </Panel>
      </div>
    </RequirePermission>
  );
}
