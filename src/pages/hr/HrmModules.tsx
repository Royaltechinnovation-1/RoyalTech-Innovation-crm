import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";
import {
  useHrmStore,
  type HrmCandidate,
  type HrmEmployee,
  type HrmInterview,
  type HrmLeave,
  type HrmOnboarding,
  type HrmPerformance,
  type HrmResignation,
} from "../../data/hrmStore";
import { HrmEditModal, HrmField } from "./HrmEditModal";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function tone(status: string): CSSProperties {
  const s = status.toLowerCase();
  if (["active", "approved", "paid", "present", "cleared", "hired", "completed", "verified"].some((k) => s.includes(k))) {
    return { background: "#e8f8ef", color: "#16a34a" };
  }
  if (["pending", "late", "on leave", "probation", "new hire", "scheduled", "in progress"].some((k) => s.includes(k))) {
    return { background: "#fff7e8", color: "#b45309" };
  }
  if (["rejected", "absent", "notice", "danger"].some((k) => s.includes(k))) {
    return { background: "#fef2f2", color: "#ef4444" };
  }
  return { background: "#eef3ff", color: "#4b7bf5" };
}

function PageShell({
  store,
  permission,
  title,
  crumb,
  lede,
  actions,
  children,
}: {
  store: CrmStore;
  permission: Parameters<CrmStore["allow"]>[0];
  title: string;
  crumb: string;
  lede: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <RequirePermission store={store} permission={permission}>
      <div className="page rd-dash hrm-suite">
        <header className="rd-head">
          <div>
            <nav className="rd-crumbs">
              <span>HR</span>
              <span>/</span>
              <strong>{crumb}</strong>
            </nav>
            <h2>{title}</h2>
            <p>{lede}</p>
          </div>
          <div className="rd-head-actions">{actions}</div>
        </header>
        {children}
      </div>
    </RequirePermission>
  );
}

function confirmRemove(label: string) {
  return window.confirm(`Remove ${label}? This cannot be undone.`);
}

export function HrmEmployees({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [edit, setEdit] = useState<Partial<HrmEmployee> | null>(null);
  const showSalary = store.allow("salary.view");
  const depts = [...new Set(hrm.employees.map((e) => e.department))];
  const rows = useMemo(
    () =>
      hrm.employees.filter((e) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          `${e.name} ${e.email} ${e.designation} ${e.department}`.toLowerCase().includes(q);
        return matchQ && (dept === "all" || e.department === dept);
      }),
    [dept, hrm.employees, query],
  );

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.name?.trim() || !edit?.email?.trim()) return;
    hrm.actions.upsertEmployee({
      ...edit,
      name: edit.name.trim(),
      email: edit.email.trim(),
      salary: Number(edit.salary) || 0,
    } as HrmEmployee);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.employees"
      crumb="Employees"
      title="Employee directory"
      lede="Add, edit, or remove people in the organization."
      actions={
        <>
          <button className="btn btn-secondary" type="button" onClick={() => hrm.actions.reset()}>
            Reset data
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() =>
              setEdit({
                name: "",
                email: "",
                department: "People",
                designation: "Employee",
                status: "Active",
                location: "Bengaluru",
                joiningDate: new Date().toISOString().slice(0, 10),
                salary: 0,
                phone: "",
              })
            }
          >
            + Add employee
          </button>
        </>
      }
    >
      <div className="ai-toolbar">
        <div className="ai-toolbar-left">
          <input
            className="ai-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employees…"
          />
          <select className="ai-sort" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {depts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <span className="muted">{rows.length} people</span>
      </div>

      <section className="rd-table-card">
        <header>
          <h3>Directory</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Role</th>
                <th>Department</th>
                <th>Location</th>
                <th>Joined</th>
                <th>Status</th>
                {showSalary ? <th>Salary</th> : null}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div className="ai-cell-user">
                      <span className="ai-av">{initials(emp.name)}</span>
                      <div>
                        <strong>{emp.name}</strong>
                        <small className="muted">{emp.email}</small>
                      </div>
                    </div>
                  </td>
                  <td>{emp.designation}</td>
                  <td>{emp.department}</td>
                  <td>{emp.location}</td>
                  <td>{formatDate(emp.joiningDate)}</td>
                  <td>
                    <span className="ai-status on" style={tone(emp.status)}>
                      {emp.status}
                    </span>
                  </td>
                  {showSalary ? <td>{formatCurrency(emp.salary)}</td> : null}
                  <td>
                    <div className="rd-row-actions">
                      <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...emp })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onClick={() => {
                          if (confirmRemove(emp.name)) hrm.actions.removeEmployee(emp.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit employee" : "Add employee"}
          onClose={() => setEdit(null)}
          onSubmit={onSave}
        >
          <HrmField label="Full name">
            <input
              className="field"
              value={edit.name ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, name: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Email">
            <input
              className="field"
              type="email"
              value={edit.email ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, email: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Designation">
            <input
              className="field"
              value={edit.designation ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, designation: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Department">
            <select
              className="field"
              value={edit.department ?? "People"}
              onChange={(e) => setEdit((f) => ({ ...f!, department: e.target.value }))}
            >
              {hrm.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Status">
            <select
              className="field"
              value={edit.status ?? "Active"}
              onChange={(e) => setEdit((f) => ({ ...f!, status: e.target.value }))}
            >
              {hrm.employmentStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Location">
            <input
              className="field"
              value={edit.location ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, location: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Join date">
            <input
              className="field"
              type="date"
              value={edit.joiningDate ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, joiningDate: e.target.value }))}
            />
          </HrmField>
          {showSalary ? (
            <HrmField label="Monthly salary">
              <input
                className="field"
                type="number"
                value={edit.salary ?? 0}
                onChange={(e) => setEdit((f) => ({ ...f!, salary: Number(e.target.value) }))}
              />
            </HrmField>
          ) : null}
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmRecruitment({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState<Partial<HrmCandidate> | null>(null);
  const rows = hrm.candidates.filter((c) => {
    const job = hrm.jobs.find((j) => j.id === c.jobId);
    const q = query.trim().toLowerCase();
    return !q || `${c.name} ${job?.title ?? ""} ${c.stage} ${c.email}`.toLowerCase().includes(q);
  });

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.name?.trim() || !edit?.email?.trim()) return;
    hrm.actions.upsertCandidate({
      ...edit,
      name: edit.name.trim(),
      email: edit.email.trim(),
    } as HrmCandidate);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.recruitment"
      crumb="Recruitment"
      title="Recruitment & candidates"
      lede="Edit pipeline stages or remove candidates."
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            setEdit({
              name: "",
              email: "",
              jobId: hrm.jobs[0]?.id ?? "",
              stage: "Applied",
              source: "Direct",
              appliedDate: new Date().toISOString().slice(0, 10),
            })
          }
        >
          + Add candidate
        </button>
      }
    >
      <section className="rd-kpi-row">
        <article className="rd-kpi">
          <p>Open jobs</p>
          <h3>{hrm.jobs.filter((j) => j.status === "Open").length}</h3>
          <small>{hrm.jobs.length} total postings</small>
        </article>
        <article className="rd-kpi">
          <p>Candidates</p>
          <h3>{hrm.candidates.length}</h3>
          <small>In pipeline</small>
        </article>
        <article className="rd-kpi">
          <p>Interview stage</p>
          <h3>{hrm.candidates.filter((c) => c.stage === "Interview").length}</h3>
          <small>Active loops</small>
        </article>
        <article className="rd-kpi">
          <p>Offers</p>
          <h3>{hrm.candidates.filter((c) => c.stage === "Offer").length}</h3>
          <small>Pending decisions</small>
        </article>
      </section>

      <section className="rd-table-card">
        <header>
          <h3>Candidates</h3>
          <input
            className="ai-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
          />
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Stage</th>
                <th>Source</th>
                <th>Applied</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const job = hrm.jobs.find((j) => j.id === c.jobId);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="ai-cell-user">
                        <span className="ai-av">{initials(c.name)}</span>
                        <div>
                          <strong>{c.name}</strong>
                          <small className="muted">{c.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>{job?.title ?? "—"}</td>
                    <td>
                      <span className="ai-status on" style={tone(c.stage)}>
                        {c.stage}
                      </span>
                    </td>
                    <td>{c.source}</td>
                    <td>{formatDate(c.appliedDate)}</td>
                    <td>
                      <div className="rd-row-actions">
                        <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...c })}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rd-soft bad"
                          onClick={() => {
                            if (confirmRemove(c.name)) hrm.actions.removeCandidate(c.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit candidate" : "Add candidate"}
          onClose={() => setEdit(null)}
          onSubmit={onSave}
        >
          <HrmField label="Name">
            <input
              className="field"
              value={edit.name ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, name: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Email">
            <input
              className="field"
              type="email"
              value={edit.email ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, email: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Job">
            <select
              className="field"
              value={edit.jobId ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, jobId: e.target.value }))}
            >
              {hrm.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Stage">
            <select
              className="field"
              value={edit.stage ?? "Applied"}
              onChange={(e) => setEdit((f) => ({ ...f!, stage: e.target.value }))}
            >
              {["Applied", "Screening", "Shortlisted", "Interview", "Offer", "Hired", "Rejected"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </HrmField>
          <HrmField label="Source">
            <input
              className="field"
              value={edit.source ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, source: e.target.value }))}
            />
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmInterviews({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [edit, setEdit] = useState<Partial<HrmInterview> | null>(null);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.candidateName?.trim()) return;
    hrm.actions.upsertInterview({
      ...edit,
      candidateName: edit.candidateName.trim(),
      score: Number(edit.score) || 0,
    } as HrmInterview);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.interviews"
      crumb="Interviews"
      title="Interviews & evaluations"
      lede="Update interview status or remove scheduled rounds."
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            setEdit({
              candidateName: "",
              jobTitle: "",
              interviewer: "",
              date: new Date().toISOString().slice(0, 10),
              time: "10:00",
              type: "Video",
              status: "Scheduled",
              score: 0,
            })
          }
        >
          + Schedule
        </button>
      }
    >
      <section className="rd-table-card">
        <header>
          <h3>Interview list</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Role</th>
                <th>Interviewer</th>
                <th>When</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrm.interviews.map((i) => (
                <tr key={i.id}>
                  <td>
                    <strong>{i.candidateName}</strong>
                  </td>
                  <td>{i.jobTitle}</td>
                  <td>{i.interviewer}</td>
                  <td>
                    {formatDate(i.date)} · {i.time}
                  </td>
                  <td>
                    <span className="ai-status on" style={tone(i.status)}>
                      {i.status}
                    </span>
                  </td>
                  <td>
                    <div className="rd-row-actions">
                      <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...i })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onClick={() => {
                          if (confirmRemove(i.candidateName)) hrm.actions.removeInterview(i.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit interview" : "Schedule interview"}
          onClose={() => setEdit(null)}
          onSubmit={onSave}
        >
          <HrmField label="Candidate">
            <input
              className="field"
              value={edit.candidateName ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, candidateName: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Job title">
            <input
              className="field"
              value={edit.jobTitle ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, jobTitle: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Interviewer">
            <input
              className="field"
              value={edit.interviewer ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, interviewer: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Date">
            <input
              className="field"
              type="date"
              value={edit.date ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, date: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Time">
            <input
              className="field"
              value={edit.time ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, time: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Status">
            <select
              className="field"
              value={edit.status ?? "Scheduled"}
              onChange={(e) => setEdit((f) => ({ ...f!, status: e.target.value }))}
            >
              {["Scheduled", "Completed", "Cancelled", "No-show"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Score">
            <input
              className="field"
              type="number"
              step="0.1"
              value={edit.score ?? 0}
              onChange={(e) => setEdit((f) => ({ ...f!, score: Number(e.target.value) }))}
            />
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmOnboarding({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [edit, setEdit] = useState<Partial<HrmOnboarding> | null>(null);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.name?.trim() || !edit?.role?.trim()) return;
    hrm.actions.upsertOnboarding({
      ...edit,
      name: edit.name.trim(),
      role: edit.role.trim(),
    } as HrmOnboarding);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.onboarding"
      crumb="Onboarding"
      title="Onboarding & documents"
      lede="Edit programs or remove joiners and documents."
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            setEdit({
              name: "",
              role: "",
              department: "People",
              startDate: new Date().toISOString().slice(0, 10),
              buddy: "",
              manager: "",
              status: "In progress",
            })
          }
        >
          + Add program
        </button>
      }
    >
      <section className="rd-table-card">
        <header>
          <h3>Onboarding programs</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>New hire</th>
                <th>Role</th>
                <th>Department</th>
                <th>Start</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrm.onboardingPrograms.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>{p.role}</td>
                  <td>{p.department}</td>
                  <td>{formatDate(p.startDate)}</td>
                  <td>
                    <span className="ai-status on" style={tone(p.status)}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div className="rd-row-actions">
                      <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...p })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onClick={() => {
                          if (confirmRemove(p.name)) hrm.actions.removeOnboarding(p.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rd-table-card" style={{ marginTop: 12 }}>
        <header>
          <h3>Documents</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Document</th>
                <th>Category</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrm.documents.map((d) => (
                <tr key={d.id}>
                  <td>{d.employeeName}</td>
                  <td>{d.name}</td>
                  <td>{d.category}</td>
                  <td>
                    <span className="ai-status on" style={tone(d.status)}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rd-soft bad"
                      onClick={() => {
                        if (confirmRemove(d.name)) hrm.actions.removeDocument(d.id);
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit onboarding" : "Add onboarding"}
          onClose={() => setEdit(null)}
          onSubmit={onSave}
        >
          <HrmField label="Name">
            <input
              className="field"
              value={edit.name ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, name: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Role">
            <input
              className="field"
              value={edit.role ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, role: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Department">
            <input
              className="field"
              value={edit.department ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, department: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Start date">
            <input
              className="field"
              type="date"
              value={edit.startDate ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, startDate: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Status">
            <select
              className="field"
              value={edit.status ?? "In progress"}
              onChange={(e) => setEdit((f) => ({ ...f!, status: e.target.value }))}
            >
              {["In progress", "Completed", "Blocked"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmAttendance({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [date, setDate] = useState("2026-11-11");
  const rows = hrm.attendanceRecords.filter((r) => r.date === date);
  const maxPresent = Math.max(...hrm.attendanceTrend.map((d) => d.present), 1);
  const dates = [...new Set(hrm.attendanceRecords.map((r) => r.date))].sort().reverse();

  return (
    <PageShell
      store={store}
      permission="hr.attendance"
      crumb="Attendance"
      title="Attendance & working hours"
      lede="Update status or remove daily records."
    >
      <div className="ai-toolbar">
        <select className="ai-sort" value={date} onChange={(e) => setDate(e.target.value)}>
          {dates.map((d) => (
            <option key={d} value={d}>
              {formatDate(d)}
            </option>
          ))}
        </select>
        <span className="muted">{rows.length} records</span>
      </div>

      <section className="rd-split">
        <article className="rd-card">
          <header>
            <h3>Weekly presence</h3>
          </header>
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
            <h3>Day summary</h3>
          </header>
          <div className="hrm-mini-stats">
            <div>
              <span>Present</span>
              <strong>{rows.filter((r) => r.status === "Present").length}</strong>
            </div>
            <div>
              <span>Late</span>
              <strong>{rows.filter((r) => r.status === "Late").length}</strong>
            </div>
            <div>
              <span>Absent</span>
              <strong>{rows.filter((r) => r.status === "Absent").length}</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="rd-table-card">
        <header>
          <h3>Daily records</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Check in</th>
                <th>Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.department}</td>
                  <td>{r.checkIn}</td>
                  <td>{r.hours || "—"}</td>
                  <td>
                    <select
                      className="field"
                      value={r.status}
                      onChange={(e) => hrm.actions.updateAttendance(r.id, { status: e.target.value })}
                    >
                      {["Present", "Late", "Absent", "On Leave"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="rd-soft bad"
                      onClick={() => {
                        if (confirmRemove(r.name)) hrm.actions.removeAttendance(r.id);
                      }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </PageShell>
  );
}

export function HrmLeave({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [edit, setEdit] = useState<Partial<HrmLeave> | null>(null);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.employeeName?.trim() || !edit?.type) return;
    hrm.actions.upsertLeave({
      ...edit,
      employeeName: edit.employeeName.trim(),
      type: edit.type,
      days: Number(edit.days) || 1,
    } as HrmLeave);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.leave"
      crumb="Leave"
      title="Leave management"
      lede="Approve, edit, or remove leave requests."
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            setEdit({
              employeeName: "",
              type: "Casual Leave",
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date().toISOString().slice(0, 10),
              days: 1,
              status: "Pending",
              reason: "",
              department: "",
            })
          }
        >
          + Add request
        </button>
      }
    >
      <section className="rd-table-card">
        <header>
          <h3>Leave requests</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrm.leaveRequests.map((leave) => (
                <tr key={leave.id}>
                  <td>
                    <strong>{leave.employeeName}</strong>
                  </td>
                  <td>{leave.type}</td>
                  <td>{formatDate(leave.startDate)}</td>
                  <td>{formatDate(leave.endDate)}</td>
                  <td>{leave.days}</td>
                  <td>
                    <span className="ai-status on" style={tone(leave.status)}>
                      {leave.status}
                    </span>
                  </td>
                  <td>
                    <div className="rd-row-actions">
                      {leave.status === "Pending" ? (
                        <>
                          <button
                            type="button"
                            className="rd-soft ok"
                            onClick={() =>
                              hrm.actions.upsertLeave({ ...leave, status: "Approved" })
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="rd-soft bad"
                            onClick={() =>
                              hrm.actions.upsertLeave({ ...leave, status: "Rejected" })
                            }
                          >
                            Reject
                          </button>
                        </>
                      ) : null}
                      <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...leave })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onClick={() => {
                          if (confirmRemove(leave.employeeName)) hrm.actions.removeLeave(leave.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit leave" : "Add leave"}
          onClose={() => setEdit(null)}
          onSubmit={onSave}
        >
          <HrmField label="Employee">
            <input
              className="field"
              value={edit.employeeName ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, employeeName: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Type">
            <select
              className="field"
              value={edit.type ?? "Casual Leave"}
              onChange={(e) => setEdit((f) => ({ ...f!, type: e.target.value }))}
            >
              {hrm.leaveTypes.map((t) => (
                <option key={t.code} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="From">
            <input
              className="field"
              type="date"
              value={edit.startDate ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, startDate: e.target.value }))}
            />
          </HrmField>
          <HrmField label="To">
            <input
              className="field"
              type="date"
              value={edit.endDate ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, endDate: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Days">
            <input
              className="field"
              type="number"
              value={edit.days ?? 1}
              onChange={(e) => setEdit((f) => ({ ...f!, days: Number(e.target.value) }))}
            />
          </HrmField>
          <HrmField label="Status">
            <select
              className="field"
              value={edit.status ?? "Pending"}
              onChange={(e) => setEdit((f) => ({ ...f!, status: e.target.value }))}
            >
              {["Pending", "Approved", "Rejected"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmPayroll({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const canView = store.allow("salary.view");
  const maxPay = Math.max(...hrm.payrollTrend.map((p) => p.payroll), 1);

  return (
    <PageShell
      store={store}
      permission="hr.payroll"
      crumb="Payroll"
      title="Payroll & salary"
      lede="Mark paid/pending or remove payslip rows."
    >
      {!canView ? (
        <article className="rd-card">
          <p className="muted">Your role cannot view salary information.</p>
        </article>
      ) : (
        <>
          <section className="rd-card">
            <header>
              <h3>Payroll trend</h3>
            </header>
            <div className="rd-bars">
              {hrm.payrollTrend.map((p) => (
                <div className="rd-bar" key={p.month}>
                  <div className="rd-bar-track">
                    <span style={{ height: `${Math.max(10, (p.payroll / maxPay) * 100)}%` }} />
                  </div>
                  <small>{p.month}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="rd-table-card">
            <header>
              <h3>Payslips</h3>
            </header>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Gross</th>
                    <th>Net</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hrm.payrollRecords.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td>
                      <td>{formatCurrency(r.gross)}</td>
                      <td>{formatCurrency(r.net)}</td>
                      <td>
                        <select
                          className="field"
                          value={r.status}
                          onChange={(e) => hrm.actions.updatePayroll(r.id, { status: e.target.value })}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="rd-soft bad"
                          onClick={() => {
                            if (confirmRemove(r.name)) hrm.actions.removePayroll(r.id);
                          }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

export function HrmPerformance({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [edit, setEdit] = useState<Partial<HrmPerformance> | null>(null);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.name?.trim() || !edit?.employeeId) return;
    hrm.actions.upsertPerformance({
      ...edit,
      name: edit.name.trim(),
      employeeId: edit.employeeId,
      score: Number(edit.score) || 0,
    } as HrmPerformance);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.performance"
      crumb="Performance"
      title="Performance management"
      lede="Edit ratings or remove review rows."
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            setEdit({
              employeeId: `EMP-${Date.now().toString(36)}`,
              name: "",
              department: "",
              role: "",
              score: 0,
              goalsCompleted: 0,
              goalsTotal: 0,
              lastReview: new Date().toISOString().slice(0, 10),
              reviewer: store.currentUser.name,
              potential: "Medium",
              feedback: "",
            })
          }
        >
          + Add review
        </button>
      }
    >
      <section className="rd-table-card">
        <header>
          <h3>Ratings</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Score</th>
                <th>Goals</th>
                <th>Potential</th>
                <th>Reviewer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrm.performanceRatings.map((r) => (
                <tr key={r.employeeId}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted">{r.role}</div>
                  </td>
                  <td>
                    <span className="rd-badge ok">{Number(r.score).toFixed(1)}</span>
                  </td>
                  <td>
                    {r.goalsCompleted}/{r.goalsTotal}
                  </td>
                  <td>{r.potential}</td>
                  <td>{r.reviewer}</td>
                  <td>
                    <div className="rd-row-actions">
                      <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...r })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onClick={() => {
                          if (confirmRemove(r.name)) hrm.actions.removePerformance(r.employeeId);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal title="Edit performance" onClose={() => setEdit(null)} onSubmit={onSave}>
          <HrmField label="Name">
            <input
              className="field"
              value={edit.name ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, name: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Role">
            <input
              className="field"
              value={edit.role ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, role: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Score">
            <input
              className="field"
              type="number"
              step="0.1"
              value={edit.score ?? 0}
              onChange={(e) => setEdit((f) => ({ ...f!, score: Number(e.target.value) }))}
            />
          </HrmField>
          <HrmField label="Potential">
            <select
              className="field"
              value={edit.potential ?? "Medium"}
              onChange={(e) => setEdit((f) => ({ ...f!, potential: e.target.value }))}
            >
              {["High", "Medium", "Low"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Reviewer">
            <input
              className="field"
              value={edit.reviewer ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, reviewer: e.target.value }))}
            />
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmExit({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [edit, setEdit] = useState<Partial<HrmResignation> | null>(null);

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.name?.trim()) return;
    hrm.actions.upsertResignation({
      ...edit,
      name: edit.name.trim(),
      noticePeriod: Number(edit.noticePeriod) || 30,
    } as HrmResignation);
    setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.exit"
      crumb="Exit"
      title="Resignation & exit"
      lede="Edit resignation records or remove exits."
      actions={
        <button
          className="btn btn-primary"
          type="button"
          onClick={() =>
            setEdit({
              name: "",
              department: "",
              designation: "",
              resignationDate: new Date().toISOString().slice(0, 10),
              lastWorkingDay: new Date().toISOString().slice(0, 10),
              noticePeriod: 30,
              approvalStatus: "Pending",
              reason: "",
              exitInterview: "Pending",
            })
          }
        >
          + Add exit
        </button>
      }
    >
      <section className="rd-table-card">
        <header>
          <h3>Resignations</h3>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Last day</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hrm.resignations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.name}</strong>
                    <div className="muted">{r.designation}</div>
                  </td>
                  <td>{r.department}</td>
                  <td>{formatDate(r.lastWorkingDay)}</td>
                  <td>
                    <span className="ai-status on" style={tone(r.approvalStatus)}>
                      {r.approvalStatus}
                    </span>
                  </td>
                  <td>
                    <div className="rd-row-actions">
                      <button type="button" className="rd-soft ok" onClick={() => setEdit({ ...r })}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onClick={() => {
                          if (confirmRemove(r.name)) hrm.actions.removeResignation(r.id);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit exit" : "Add exit"}
          onClose={() => setEdit(null)}
          onSubmit={onSave}
        >
          <HrmField label="Name">
            <input
              className="field"
              value={edit.name ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, name: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Department">
            <input
              className="field"
              value={edit.department ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, department: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Designation">
            <input
              className="field"
              value={edit.designation ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, designation: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Last working day">
            <input
              className="field"
              type="date"
              value={edit.lastWorkingDay ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, lastWorkingDay: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Approval">
            <select
              className="field"
              value={edit.approvalStatus ?? "Pending"}
              onChange={(e) => setEdit((f) => ({ ...f!, approvalStatus: e.target.value }))}
            >
              {["Pending", "Approved", "Rejected"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Reason">
            <input
              className="field"
              value={edit.reason ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, reason: e.target.value }))}
            />
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

/** Kept for App imports that still expect Link usage */
export function HrmReportsLink() {
  return <Link to="/hr">HR Dashboard</Link>;
}
