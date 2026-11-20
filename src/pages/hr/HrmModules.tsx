import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";
import {
  useHrmStore,
  type HrmCandidate,
  type HrmEmployee,
  type HrmInterview,
  type HrmJob,
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

function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let down = false;
    let startX = 0;
    let scrollLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, a, input, select, textarea, label, [data-no-drag]")) return;
      down = true;
      startX = e.pageX;
      scrollLeft = el.scrollLeft;
      el.setPointerCapture(e.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - startX);
    };
    const onUp = (e: PointerEvent) => {
      down = false;
      el.style.cursor = "grab";
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);
  return ref;
}

export function HrmEmployees({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const scrollRef = useHorizontalDragScroll<HTMLDivElement>();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [edit, setEdit] = useState<Partial<HrmEmployee> | null>(null);
  const [tab, setTab] = useState<"list" | "cards">("list");
  const showSalary = store.allow("salary.view");
  const depts = [...new Set(hrm.employees.map((e) => e.department))];
  const rows = useMemo(
    () =>
      hrm.employees.filter((e) => {
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          `${e.name} ${e.email} ${e.companyEmail ?? ""} ${e.cardNumber ?? ""} ${e.uid ?? ""} ${e.designation} ${e.department}`.toLowerCase().includes(q);
        return matchQ && (dept === "all" || e.department === dept);
      }),
    [dept, hrm.employees, query],
  );

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!edit?.name?.trim()) {
      window.alert("Name is required.");
      return;
    }
    hrm.actions.upsertEmployee({
      ...edit,
      id: edit.id,
      name: edit.name.trim(),
      email: (edit.email ?? "").trim(),
      companyEmail: (edit.companyEmail ?? "").trim(),
      cardNumber: (edit.cardNumber ?? "").trim(),
      phone: (edit.phone ?? "").trim(),
      salary: Number(edit.salary) || 0,
    } as HrmEmployee);
    setEdit(null);
  };

  const onEdit = (emp: HrmEmployee) => {
    setEdit({ ...emp });
  };

  const onDelete = (emp: HrmEmployee) => {
    if (!emp.id) return;
    if (!window.confirm(`Remove ${emp.name} (${emp.id})?\nThis cannot be undone.`)) return;
    hrm.actions.removeEmployee(emp.id);
    if (edit?.id === emp.id) setEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.employees"
      crumb="Employees"
      title="Employee directory"
      lede="Every employee has an office card. Use side tabs like Attendance — list or card register."
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
                companyEmail: "",
                cardNumber: `RT${String(9801000 + hrm.employees.length + 1).padStart(7, "0")}`,
                department: "Developer Team",
                designation: "Employee",
                status: "Active",
                employmentType: "Full-time",
                location: "Mohali",
                manager: "CEO (Shreya)",
                joiningDate: new Date().toISOString().slice(0, 10),
                salary: 0,
                phone: "",
                salaryNotes: "IN Hand no deduction",
                probationPeriod: "3 Months",
              })
            }
          >
            + Add employee
          </button>
        </>
      }
    >
      <div className="hrm-tabs" role="tablist" aria-label="Employee views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "list"}
          className={`hrm-tab${tab === "list" ? " is-active" : ""}`}
          onClick={() => setTab("list")}
        >
          Employee list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cards"}
          className={`hrm-tab${tab === "cards" ? " is-active" : ""}`}
          onClick={() => setTab("cards")}
        >
          Card register
        </button>
      </div>

      <div className="ai-toolbar">
        <div className="ai-toolbar-left">
          <input
            className="ai-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or card…"
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
        <span className="muted">{rows.length} people · each has a card</span>
      </div>

      {tab === "list" ? (
      <section className="rd-table-card hrm-dir-card">
        <header>
          <h3>Employee list</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            ← scroll horizontally →
          </span>
        </header>
        <div
          ref={scrollRef}
          className="ai-table-wrap hrm-dir-scroll"
          role="region"
          aria-label="Employee directory horizontal scroll"
          tabIndex={0}
        >
          <table className="ai-table hrm-dir-table">
            <thead>
              <tr>
                <th>Card number</th>
                <th>Name</th>
                <th>Role</th>
                <th>Personal email</th>
                <th>Company email</th>
                <th>Phone</th>
                <th>Department</th>
                <th>Type</th>
                <th>Location</th>
                <th>Joined</th>
                <th>Status</th>
                {showSalary ? <th>Salary</th> : null}
                <th>Docs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <button
                      type="button"
                      className="hrm-card-no"
                      onClick={() => onEdit(emp)}
                      title="Edit card / employee"
                    >
                      {emp.cardNumber || "—"}
                    </button>
                  </td>
                  <td>
                    <div className="ai-cell-user">
                      <span className="ai-av">{initials(emp.name)}</span>
                      <div>
                        <strong>{emp.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{emp.designation || "—"}</td>
                  <td>{emp.email || "—"}</td>
                  <td>{emp.companyEmail || "—"}</td>
                  <td>{emp.phone || "—"}</td>
                  <td>{emp.department}</td>
                  <td>{emp.employmentType || "—"}</td>
                  <td>{emp.location || "—"}</td>
                  <td>{emp.joiningDate ? formatDate(emp.joiningDate) : "—"}</td>
                  <td>
                    <select
                      className="field hrm-status-select"
                      value={emp.status}
                      style={tone(emp.status)}
                      aria-label={`Status for ${emp.name}`}
                      onChange={(e) =>
                        hrm.actions.upsertEmployee({
                          ...emp,
                          name: emp.name,
                          email: emp.email ?? "",
                          status: e.target.value,
                        })
                      }
                    >
                      {!hrm.employmentStatuses.includes(emp.status) && emp.status ? (
                        <option value={emp.status}>{emp.status}</option>
                      ) : null}
                      {hrm.employmentStatuses.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  {showSalary ? (
                    <td>
                      {emp.salary ? formatCurrency(emp.salary) : "—"}
                      {emp.salaryNotes ? (
                        <div className="muted" style={{ fontSize: 11 }}>
                          {emp.salaryNotes}
                        </div>
                      ) : null}
                    </td>
                  ) : null}
                  <td>
                    <span
                      className="ai-status on"
                      style={tone(emp.documents?.complete === "Yes" ? "Verified" : "Pending")}
                    >
                      {emp.documents?.complete === "Yes" ? "Complete" : "Pending"}
                    </span>
                  </td>
                  <td className="hrm-actions-cell" data-no-drag="true">
                    <div className="rd-row-actions">
                      <button
                        type="button"
                        className="rd-soft ok"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEdit(emp);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rd-soft bad"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDelete(emp);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      ) : (
      <section className="rd-table-card hrm-dir-card">
        <header>
          <h3>Card register</h3>
          <span className="muted">{rows.length} office cards</span>
        </header>
        <div className="ai-table-wrap">
          <table className="ai-table">
            <thead>
              <tr>
                <th>Card number</th>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <button
                      type="button"
                      className="hrm-card-no"
                      onClick={() => onEdit(emp)}
                      title="Edit card"
                    >
                      {emp.cardNumber || "—"}
                    </button>
                  </td>
                  <td>
                    <div className="ai-cell-user">
                      <span className="ai-av">{initials(emp.name)}</span>
                      <div>
                        <strong>{emp.name}</strong>
                      </div>
                    </div>
                  </td>
                  <td>{emp.designation || "—"}</td>
                  <td>{emp.department}</td>
                  <td>
                    <span className="ai-status on" style={tone(emp.status)}>
                      {emp.status}
                    </span>
                  </td>
                  <td>
                    <div className="rd-row-actions">
                      <button type="button" className="rd-soft ok" onClick={() => onEdit(emp)}>
                        Edit card
                      </button>
                      <button type="button" className="rd-soft bad" onClick={() => onDelete(emp)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

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
          <HrmField label="Office card number">
            <input
              className="field"
              value={edit.cardNumber ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, cardNumber: e.target.value }))}
              placeholder="RT9801234"
            />
          </HrmField>
          <HrmField label="Personal email">
            <input
              className="field"
              type="text"
              inputMode="email"
              autoComplete="off"
              value={edit.email ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, email: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Company email (assigned)">
            <input
              className="field"
              type="text"
              inputMode="email"
              autoComplete="off"
              value={edit.companyEmail ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, companyEmail: e.target.value }))}
              placeholder="name@ryaltehinno.in"
            />
          </HrmField>
          <HrmField label="Phone">
            <input
              className="field"
              value={edit.phone ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, phone: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Designation / Role">
            <input
              className="field"
              value={edit.designation ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, designation: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Department">
            <select
              className="field"
              value={edit.department ?? "Developer Team"}
              onChange={(e) => setEdit((f) => ({ ...f!, department: e.target.value }))}
            >
              {hrm.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Employment type">
            <select
              className="field"
              value={edit.employmentType ?? "Full-time"}
              onChange={(e) => setEdit((f) => ({ ...f!, employmentType: e.target.value }))}
            >
              {["Full-time", "Internship", "Training", "Contract"].map((s) => (
                <option key={s} value={s}>
                  {s}
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
          <HrmField label="Reporting manager">
            <input
              className="field"
              value={edit.manager ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, manager: e.target.value }))}
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
          <HrmField label="Previous company">
            <input
              className="field"
              value={edit.previousCompany ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, previousCompany: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Total experience">
            <input
              className="field"
              value={edit.totalExperience ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, totalExperience: e.target.value }))}
            />
          </HrmField>
          {showSalary ? (
            <>
              <HrmField label="Monthly salary (INR)">
                <input
                  className="field"
                  type="number"
                  value={edit.salary ?? 0}
                  onChange={(e) => setEdit((f) => ({ ...f!, salary: Number(e.target.value) }))}
                />
              </HrmField>
              <HrmField label="Salary notes">
                <input
                  className="field"
                  value={edit.salaryNotes ?? ""}
                  onChange={(e) => setEdit((f) => ({ ...f!, salaryNotes: e.target.value }))}
                />
              </HrmField>
            </>
          ) : null}
          <HrmField label="Probation">
            <input
              className="field"
              value={edit.probationPeriod ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, probationPeriod: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Notes">
            <input
              className="field"
              value={edit.notes ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, notes: e.target.value }))}
            />
          </HrmField>
        </HrmEditModal>
      ) : null}
    </PageShell>
  );
}

export function HrmRecruitment({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const [tab, setTab] = useState<"pipeline" | "candidates" | "jobs">("pipeline");
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [edit, setEdit] = useState<Partial<HrmCandidate> | null>(null);
  const [jobEdit, setJobEdit] = useState<Partial<HrmJob> | null>(null);

  const stages = hrm.candidateStages;
  const openJobs = hrm.jobs.filter((j) => j.status === "Open").length;
  const activePipeline = hrm.candidates.filter((c) => !["Hired", "Rejected"].includes(c.stage)).length;
  const interviewCount = hrm.candidates.filter((c) => c.stage === "Interview").length;
  const offerCount = hrm.candidates.filter((c) => c.stage === "Offer").length;

  const rows = useMemo(
    () =>
      hrm.candidates.filter((c) => {
        const job = hrm.jobs.find((j) => j.id === c.jobId);
        const q = query.trim().toLowerCase();
        const matchQ =
          !q ||
          `${c.name} ${c.email} ${c.phone ?? ""} ${job?.title ?? ""} ${c.stage} ${c.source}`.toLowerCase().includes(q);
        const matchStage = stageFilter === "all" || c.stage === stageFilter;
        const matchJob = jobFilter === "all" || c.jobId === jobFilter;
        return matchQ && matchStage && matchJob;
      }),
    [hrm.candidates, hrm.jobs, jobFilter, query, stageFilter],
  );

  const onSaveCandidate = (e: FormEvent) => {
    e.preventDefault();
    if (!edit?.name?.trim()) {
      window.alert("Candidate name is required.");
      return;
    }
    hrm.actions.upsertCandidate({
      ...edit,
      name: edit.name.trim(),
      email: (edit.email ?? "").trim(),
      phone: (edit.phone ?? "").trim(),
      rating: Number(edit.rating) || 0,
      skills: Array.isArray(edit.skills)
        ? edit.skills
        : String(edit.skills ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    } as HrmCandidate);
    setEdit(null);
  };

  const onSaveJob = (e: FormEvent) => {
    e.preventDefault();
    if (!jobEdit?.title?.trim()) {
      window.alert("Job title is required.");
      return;
    }
    hrm.actions.upsertJob({
      ...jobEdit,
      title: jobEdit.title.trim(),
      openings: Number(jobEdit.openings) || 1,
      requirements: Array.isArray(jobEdit.requirements)
        ? jobEdit.requirements
        : String(jobEdit.requirements ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    } as HrmJob);
    setJobEdit(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.recruitment"
      crumb="Recruitment"
      title="Recruitment pipeline"
      lede="Track openings, move candidates by stage, and hire for RoyalTech roles."
      actions={
        <>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() =>
              setJobEdit({
                title: "",
                department: "Developer Team",
                location: "Mohali",
                type: "Full-time",
                openings: 1,
                status: "Open",
                hiringManager: "CEO (Shreya)",
                salaryRange: "",
                postedDate: new Date().toISOString().slice(0, 10),
                description: "",
                requirements: [],
              })
            }
          >
            + Job opening
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() =>
              setEdit({
                name: "",
                email: "",
                phone: "",
                jobId: hrm.jobs.find((j) => j.status === "Open")?.id ?? hrm.jobs[0]?.id ?? "",
                stage: "Applied",
                source: "Direct",
                appliedDate: new Date().toISOString().slice(0, 10),
                experience: "",
                location: "Mohali",
                rating: 0,
                skills: [],
                notes: "",
              })
            }
          >
            + Add candidate
          </button>
        </>
      }
    >
      <section className="rd-kpi-row">
        <article className="rd-kpi">
          <p>Open jobs</p>
          <h3>{openJobs}</h3>
          <small>{hrm.jobs.length} total postings</small>
        </article>
        <article className="rd-kpi">
          <p>Active pipeline</p>
          <h3>{activePipeline}</h3>
          <small>{hrm.candidates.length} total candidates</small>
        </article>
        <article className="rd-kpi">
          <p>In interview</p>
          <h3>{interviewCount}</h3>
          <small>Active loops</small>
        </article>
        <article className="rd-kpi">
          <p>Offers out</p>
          <h3>{offerCount}</h3>
          <small>Awaiting decision</small>
        </article>
      </section>

      <div className="hrm-tabs" role="tablist" aria-label="Recruitment views">
        {(
          [
            ["pipeline", "Pipeline"],
            ["candidates", "Candidates"],
            ["jobs", "Job openings"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`hrm-tab${tab === id ? " is-active" : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pipeline" ? (
        <section className="hrm-pipe-wrap">
          <div className="hrm-pipe-board">
            {stages.map((stage) => {
              const list = hrm.candidates.filter((c) => c.stage === stage);
              return (
                <article className="hrm-pipe-col" key={stage}>
                  <header>
                    <strong>{stage}</strong>
                    <span>{list.length}</span>
                  </header>
                  <div className="hrm-pipe-list">
                    {list.length === 0 ? (
                      <p className="muted hrm-pipe-empty">No candidates</p>
                    ) : (
                      list.map((c) => {
                        const job = hrm.jobs.find((j) => j.id === c.jobId);
                        return (
                          <button
                            type="button"
                            className="hrm-pipe-card"
                            key={c.id}
                            onClick={() => setEdit({ ...c })}
                          >
                            <div className="ai-cell-user">
                              <span className="ai-av">{initials(c.name)}</span>
                              <div>
                                <strong>{c.name}</strong>
                                <small className="muted">{job?.title ?? "Open role"}</small>
                              </div>
                            </div>
                            <div className="hrm-pipe-meta">
                              <span>{c.source}</span>
                              <span>{formatDate(c.appliedDate)}</span>
                            </div>
                            <select
                              className="field hrm-status-select"
                              value={c.stage}
                              aria-label={`Move ${c.name}`}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation();
                                hrm.actions.upsertCandidate({
                                  ...c,
                                  name: c.name,
                                  email: c.email,
                                  stage: e.target.value,
                                });
                              }}
                            >
                              {stages.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </button>
                        );
                      })
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "candidates" ? (
        <>
          <div className="ai-toolbar">
            <div className="ai-toolbar-left">
              <input
                className="ai-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, role…"
              />
              <select className="ai-sort" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                <option value="all">All stages</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select className="ai-sort" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
                <option value="all">All jobs</option>
                {hrm.jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
            <span className="muted">{rows.length} shown</span>
          </div>

          <section className="rd-table-card hrm-dir-card">
            <header>
              <h3>Candidate list</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                ← scroll horizontally →
              </span>
            </header>
            <div className="ai-table-wrap hrm-dir-scroll">
              <table className="ai-table hrm-dir-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Stage</th>
                    <th>Source</th>
                    <th>Experience</th>
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
                            </div>
                          </div>
                        </td>
                        <td>{c.email || "—"}</td>
                        <td>{c.phone || "—"}</td>
                        <td>{job?.title ?? "—"}</td>
                        <td>
                          <select
                            className="field hrm-status-select"
                            value={c.stage}
                            onChange={(e) =>
                              hrm.actions.upsertCandidate({
                                ...c,
                                name: c.name,
                                email: c.email,
                                stage: e.target.value,
                              })
                            }
                          >
                            {stages.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{c.source}</td>
                        <td>{c.experience || "—"}</td>
                        <td>{formatDate(c.appliedDate)}</td>
                        <td className="hrm-actions-cell" data-no-drag="true">
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
                              Delete
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
        </>
      ) : null}

      {tab === "jobs" ? (
        <section className="rd-table-card hrm-dir-card">
          <header>
            <h3>Job openings</h3>
            <span className="muted">{hrm.jobs.length} roles</span>
          </header>
          <div className="ai-table-wrap hrm-dir-scroll">
            <table className="ai-table hrm-dir-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Openings</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Posted</th>
                  <th>Candidates</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hrm.jobs.map((j) => {
                  const count = hrm.candidates.filter((c) => c.jobId === j.id).length;
                  return (
                    <tr key={j.id}>
                      <td>
                        <strong>{j.title}</strong>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {j.hiringManager}
                        </div>
                      </td>
                      <td>{j.department}</td>
                      <td>{j.type}</td>
                      <td>{j.location}</td>
                      <td>{j.openings}</td>
                      <td>{j.salaryRange || "—"}</td>
                      <td>
                        <select
                          className="field hrm-status-select"
                          value={j.status}
                          onChange={(e) =>
                            hrm.actions.upsertJob({
                              ...j,
                              title: j.title,
                              status: e.target.value,
                            })
                          }
                        >
                          {hrm.jobStatuses.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>{formatDate(j.postedDate)}</td>
                      <td>{count}</td>
                      <td className="hrm-actions-cell">
                        <div className="rd-row-actions">
                          <button type="button" className="rd-soft ok" onClick={() => setJobEdit({ ...j })}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rd-soft bad"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Remove job “${j.title}” and its ${count} candidate(s)?`,
                                )
                              ) {
                                hrm.actions.removeJob(j.id);
                              }
                            }}
                          >
                            Delete
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
      ) : null}

      {edit ? (
        <HrmEditModal
          title={edit.id ? "Edit candidate" : "Add candidate"}
          onClose={() => setEdit(null)}
          onSubmit={onSaveCandidate}
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
              type="text"
              inputMode="email"
              value={edit.email ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, email: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Phone">
            <input
              className="field"
              value={edit.phone ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, phone: e.target.value }))}
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
                  {j.title} ({j.status})
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
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Source">
            <select
              className="field"
              value={edit.source ?? "Direct"}
              onChange={(e) => setEdit((f) => ({ ...f!, source: e.target.value }))}
            >
              {hrm.candidateSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Experience">
            <input
              className="field"
              value={edit.experience ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, experience: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Location">
            <input
              className="field"
              value={edit.location ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, location: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Skills (comma separated)">
            <input
              className="field"
              value={Array.isArray(edit.skills) ? edit.skills.join(", ") : (edit.skills as string) ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, skills: e.target.value as unknown as string[] }))}
            />
          </HrmField>
          <HrmField label="Notes">
            <input
              className="field"
              value={edit.notes ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, notes: e.target.value }))}
            />
          </HrmField>
        </HrmEditModal>
      ) : null}

      {jobEdit ? (
        <HrmEditModal
          title={jobEdit.id ? "Edit job opening" : "Add job opening"}
          onClose={() => setJobEdit(null)}
          onSubmit={onSaveJob}
        >
          <HrmField label="Title">
            <input
              className="field"
              value={jobEdit.title ?? ""}
              onChange={(e) => setJobEdit((f) => ({ ...f!, title: e.target.value }))}
              required
            />
          </HrmField>
          <HrmField label="Department">
            <select
              className="field"
              value={jobEdit.department ?? "Developer Team"}
              onChange={(e) => setJobEdit((f) => ({ ...f!, department: e.target.value }))}
            >
              {hrm.departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Type">
            <select
              className="field"
              value={jobEdit.type ?? "Full-time"}
              onChange={(e) => setJobEdit((f) => ({ ...f!, type: e.target.value }))}
            >
              {["Full-time", "Internship", "Training", "Contract"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Location">
            <input
              className="field"
              value={jobEdit.location ?? ""}
              onChange={(e) => setJobEdit((f) => ({ ...f!, location: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Openings">
            <input
              className="field"
              type="number"
              min={1}
              value={jobEdit.openings ?? 1}
              onChange={(e) => setJobEdit((f) => ({ ...f!, openings: Number(e.target.value) }))}
            />
          </HrmField>
          <HrmField label="Salary range">
            <input
              className="field"
              value={jobEdit.salaryRange ?? ""}
              onChange={(e) => setJobEdit((f) => ({ ...f!, salaryRange: e.target.value }))}
              placeholder="₹20,000 – ₹30,000 / month"
            />
          </HrmField>
          <HrmField label="Status">
            <select
              className="field"
              value={jobEdit.status ?? "Open"}
              onChange={(e) => setJobEdit((f) => ({ ...f!, status: e.target.value }))}
            >
              {hrm.jobStatuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </HrmField>
          <HrmField label="Hiring manager">
            <input
              className="field"
              value={jobEdit.hiringManager ?? ""}
              onChange={(e) => setJobEdit((f) => ({ ...f!, hiringManager: e.target.value }))}
            />
          </HrmField>
          <HrmField label="Requirements (comma separated)">
            <input
              className="field"
              value={
                Array.isArray(jobEdit.requirements)
                  ? jobEdit.requirements.join(", ")
                  : (jobEdit.requirements as string) ?? ""
              }
              onChange={(e) =>
                setJobEdit((f) => ({ ...f!, requirements: e.target.value as unknown as string[] }))
              }
            />
          </HrmField>
          <HrmField label="Description">
            <input
              className="field"
              value={jobEdit.description ?? ""}
              onChange={(e) => setJobEdit((f) => ({ ...f!, description: e.target.value }))}
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

const ATT_STATUSES = [
  "Present",
  "Absent",
  "Late",
  "Halfday",
  "Short Leave",
  "On Leave",
  "Holiday",
] as const;

const ATT_YEARS = [2024, 2025, 2026, 2027];
const ATT_MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function daysInMonthNum(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function ymKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function attDate(year: number, month: number, day: number) {
  return `${ymKey(year, month)}-${String(day).padStart(2, "0")}`;
}

function attTone(status: string) {
  const s = status.toLowerCase();
  if (s === "present") return "present";
  if (s === "absent") return "absent";
  if (s === "on leave") return "onleave";
  if (s === "short leave") return "shortleave";
  if (s === "late") return "late";
  if (s === "halfday") return "halfday";
  if (s === "holiday") return "holiday";
  return "empty";
}

function AttPill({
  status,
  onSingle,
  onDouble,
  label,
}: {
  status: string;
  onSingle: () => void;
  onDouble: () => void;
  label: string;
}) {
  const timer = useRef<number | null>(null);
  const toneClass = attTone(status || "");

  return (
    <button
      type="button"
      className={`hrm-att-pill is-${toneClass}`}
      title={`${label}: ${status || "Empty"} · 1 tap Present · 2 taps Absent`}
      aria-label={`${label}, ${status || "empty"}. Single tap present, double tap absent.`}
      onClick={() => {
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          timer.current = null;
          onSingle();
        }, 220);
      }}
      onDoubleClick={(e) => {
        e.preventDefault();
        if (timer.current) {
          window.clearTimeout(timer.current);
          timer.current = null;
        }
        onDouble();
      }}
    >
      <span aria-hidden="true" />
    </button>
  );
}

export function HrmAttendance({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const today = new Date();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(11);
  const [day, setDay] = useState(Math.min(today.getDate(), daysInMonthNum(2026, 11)));
  const [query, setQuery] = useState("");
  const [bulkStatus, setBulkStatus] = useState<string>("Present");
  const [tab, setTab] = useState<"day" | "report" | "cards">("day");
  const [cardScan, setCardScan] = useState("");
  const [editEmp, setEditEmp] = useState<Partial<HrmEmployee> | null>(null);

  const days = useMemo(() => {
    const n = daysInMonthNum(year, month);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [year, month]);

  useEffect(() => {
    const max = daysInMonthNum(year, month);
    if (day > max) setDay(max);
  }, [year, month, day]);

  const selectedDate = attDate(year, month, day);
  const monthKey = ymKey(year, month);

  const byKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of hrm.attendanceRecords) {
      map.set(`${r.employeeId}|${r.date}`, r.status);
    }
    return map;
  }, [hrm.attendanceRecords]);

  const people = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hrm.employees.filter(
      (e) =>
        !q ||
        `${e.name} ${e.department} ${e.cardNumber ?? ""} ${e.designation ?? ""} ${e.uid ?? ""}`
          .toLowerCase()
          .includes(q),
    );
  }, [hrm.employees, query]);

  const dayRows = people.map((emp) => {
    const status = byKey.get(`${emp.id}|${selectedDate}`) ?? "";
    return { emp, status };
  });

  const daySummary = {
    Present: dayRows.filter((r) => r.status === "Present").length,
    Absent: dayRows.filter((r) => r.status === "Absent").length,
    Late: dayRows.filter((r) => r.status === "Late").length,
    "Short Leave": dayRows.filter((r) => r.status === "Short Leave").length,
    "On Leave": dayRows.filter((r) => r.status === "On Leave").length,
    Halfday: dayRows.filter((r) => r.status === "Halfday").length,
    Holiday: dayRows.filter((r) => r.status === "Holiday").length,
    Empty: dayRows.filter((r) => !r.status).length,
  };

  const monthRows = people.map((emp) => {
    const dayStatuses = days.map((d) => byKey.get(`${emp.id}|${attDate(year, month, d)}`) ?? "");
    const counts = {
      P: dayStatuses.filter((s) => s === "Present").length,
      L: dayStatuses.filter((s) => s === "Late").length,
      A: dayStatuses.filter((s) => s === "Absent" || s === "On Leave").length,
      H: dayStatuses.filter((s) => s === "Halfday" || s === "Short Leave").length,
      F: dayStatuses.filter((s) => s === "Holiday").length,
    };
    const marked = dayStatuses.filter(Boolean).length || 1;
    const pct = Math.round((counts.P / marked) * 100);
    return { emp, dayStatuses, counts, pct };
  });

  const setEmpStatus = (emp: HrmEmployee, status: string) => {
    hrm.actions.setAttendanceDay(emp.id, selectedDate, status, {
      name: emp.name,
      department: emp.department,
    });
  };

  const markAll = (status: string) => {
    people.forEach((emp) => setEmpStatus(emp, status));
  };

  const markByCard = () => {
    const code = cardScan.trim().toLowerCase();
    if (!code) return;
    const emp = hrm.employees.find(
      (e) => String(e.cardNumber || "").toLowerCase() === code || String(e.uid) === code,
    );
    if (!emp) {
      window.alert(`No employee found for card “${cardScan.trim()}”.`);
      return;
    }
    setEmpStatus(emp, bulkStatus || "Present");
    setCardScan("");
  };

  const saveCardEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editEmp?.name?.trim()) return;
    hrm.actions.upsertEmployee({
      ...editEmp,
      name: editEmp.name.trim(),
      cardNumber: (editEmp.cardNumber ?? "").trim(),
      email: editEmp.email ?? "",
    } as HrmEmployee);
    setEditEmp(null);
  };

  return (
    <PageShell
      store={store}
      permission="hr.attendance"
      crumb="Attendance"
      title="Attendance report"
      lede="Use office card number to mark entry. Year → month → date, then Present / Short Leave / all statuses."
      actions={
        <button className="btn btn-secondary" type="button" onClick={() => hrm.actions.reset()}>
          Reset data
        </button>
      }
    >
      <div className="hrm-tabs" role="tablist" aria-label="Attendance views">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "day"}
          className={`hrm-tab${tab === "day" ? " is-active" : ""}`}
          onClick={() => setTab("day")}
        >
          Day mark
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "report"}
          className={`hrm-tab${tab === "report" ? " is-active" : ""}`}
          onClick={() => setTab("report")}
        >
          Attendance report list
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "cards"}
          className={`hrm-tab${tab === "cards" ? " is-active" : ""}`}
          onClick={() => setTab("cards")}
        >
          Office cards
        </button>
      </div>

      {tab !== "cards" ? (
        <>
          <section className="hrm-att-filters">
            <label className="hrm-att-field">
              <span>1. Year</span>
              <select
                className="field"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {ATT_YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="hrm-att-field">
              <span>2. Month</span>
              <select
                className="field"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {ATT_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="hrm-att-field">
              <span>3. Date</span>
              <select className="field" value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {days.map((d) => {
                  const iso = attDate(year, month, d);
                  const weekday = new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
                    weekday: "short",
                  });
                  return (
                    <option key={d} value={d}>
                      {String(d).padStart(2, "0")} ({weekday})
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="hrm-att-field grow">
              <span>Search</span>
              <input
                className="field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or card number…"
              />
            </label>
          </section>

          <div className="hrm-att-status-bar">
            <span className="hrm-att-status-label">Mark status</span>
            <div className="hrm-att-status-chips">
              {ATT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`hrm-att-chip is-${attTone(s)}${bulkStatus === s ? " is-active" : ""}`}
                  onClick={() => setBulkStatus(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button className="btn btn-primary" type="button" onClick={() => markAll(bulkStatus)}>
              Apply “{bulkStatus}” to all
            </button>
          </div>
        </>
      ) : null}

      {tab === "day" ? (
        <>
          <div className="hrm-att-legend">
            <span>
              <i className="hrm-att-pill is-present" /> Present
            </span>
            <span>
              <i className="hrm-att-pill is-absent" /> Absent
            </span>
            <span>
              <i className="hrm-att-pill is-late" /> Late
            </span>
            <span>
              <i className="hrm-att-pill is-shortleave" /> Short Leave
            </span>
            <span>
              <i className="hrm-att-pill is-onleave" /> On Leave
            </span>
            <span>
              <i className="hrm-att-pill is-holiday" /> Holiday
            </span>
          </div>

          <section className="rd-kpi-row hrm-att-day-kpis">
            {(
              [
                ["Present", daySummary.Present],
                ["Absent", daySummary.Absent],
                ["Late", daySummary.Late],
                ["Short Leave", daySummary["Short Leave"]],
                ["On Leave", daySummary["On Leave"]],
                ["Empty", daySummary.Empty],
              ] as const
            ).map(([label, value]) => (
              <article className="rd-kpi" key={label}>
                <p>{label}</p>
                <h3>{value}</h3>
                <small>{selectedDate}</small>
              </article>
            ))}
          </section>

          <section className="rd-table-card hrm-dir-card">
            <header>
              <h3>Day mark · {formatDate(selectedDate)}</h3>
              <span className="muted">{dayRows.length} employees</span>
            </header>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Card number</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Quick mark</th>
                  </tr>
                </thead>
                <tbody>
                  {dayRows.map(({ emp, status }) => (
                    <tr key={emp.id}>
                      <td>
                        <button
                          type="button"
                          className="hrm-card-no"
                          onClick={() => setEditEmp({ ...emp })}
                          title="Edit card number"
                        >
                          {emp.cardNumber || "—"}
                        </button>
                      </td>
                      <td>
                        <div className="ai-cell-user">
                          <span className="ai-av">{initials(emp.name)}</span>
                          <div>
                            <strong>{emp.name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{emp.designation || "—"}</td>
                      <td>{emp.department}</td>
                      <td>
                        {String(day).padStart(2, "0")} {ATT_MONTHS[month - 1]?.label}
                      </td>
                      <td>
                        <select
                          className={`field hrm-status-select is-${attTone(status || "")}`}
                          value={status || ""}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            setEmpStatus(emp, e.target.value);
                          }}
                        >
                          <option value="">— Select —</option>
                          {ATT_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="rd-row-actions">
                          <button
                            type="button"
                            className="rd-soft ok"
                            onClick={() => setEmpStatus(emp, "Present")}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            className="rd-soft"
                            onClick={() => setEmpStatus(emp, "Short Leave")}
                          >
                            Short leave
                          </button>
                          <button
                            type="button"
                            className="rd-soft bad"
                            onClick={() => setEmpStatus(emp, "Absent")}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : tab === "report" ? (
        <>
          <div className="hrm-att-legend">
            <span>
              <i className="hrm-att-pill is-present" /> Present
            </span>
            <span>
              <i className="hrm-att-pill is-absent" /> Absent
            </span>
            <span>
              <i className="hrm-att-pill is-late" /> Late
            </span>
            <span>
              <i className="hrm-att-pill is-halfday" /> Halfday
            </span>
            <span>
              <i className="hrm-att-pill is-holiday" /> Holiday
            </span>
            <em className="muted">1 tap Present · 2 taps Absent</em>
          </div>

          <section className="rd-table-card hrm-dir-card hrm-att-card">
            <header>
              <h3>Attendance report list</h3>
              <span className="muted" style={{ fontSize: 12 }}>
                Overall record · {ATT_MONTHS[month - 1]?.label} {year} · scroll days →
              </span>
            </header>
            <div className="ai-table-wrap hrm-dir-scroll hrm-att-scroll">
              <table className="ai-table hrm-att-table">
                <thead>
                  <tr>
                    <th className="hrm-att-sticky">Card number</th>
                    <th className="hrm-att-sticky-2">Name</th>
                    <th>Role</th>
                    <th>%</th>
                    <th className="is-p">P</th>
                    <th className="is-l">L</th>
                    <th className="is-a">A</th>
                    <th className="is-h">H</th>
                    <th className="is-f">F</th>
                    {days.map((d) => (
                      <th key={d}>{String(d).padStart(2, "0")}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthRows.map(({ emp, dayStatuses, counts, pct }) => (
                    <tr key={emp.id}>
                      <td className="hrm-att-sticky">
                        <button
                          type="button"
                          className="hrm-card-no"
                          onClick={() => setEditEmp({ ...emp })}
                          title="Edit card number"
                        >
                          {emp.cardNumber || "—"}
                        </button>
                      </td>
                      <td className="hrm-att-sticky-2">
                        <div className="ai-cell-user">
                          <span className="ai-av">{initials(emp.name)}</span>
                          <div>
                            <strong>{emp.name}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{emp.designation || "—"}</td>
                      <td>
                        <span
                          className={`hrm-att-pct ${pct >= 90 ? "ok" : pct >= 70 ? "mid" : "low"}`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="is-p">{counts.P}</td>
                      <td className="is-l">{counts.L}</td>
                      <td className="is-a">{counts.A}</td>
                      <td className="is-h">{counts.H}</td>
                      <td className="is-f">{counts.F}</td>
                      {days.map((d, i) => (
                        <td key={d}>
                          <AttPill
                            status={dayStatuses[i] || ""}
                            label={`${emp.name} ${attDate(year, month, d)}`}
                            onSingle={() =>
                              hrm.actions.setAttendanceDay(
                                emp.id,
                                attDate(year, month, d),
                                "Present",
                                { name: emp.name, department: emp.department },
                              )
                            }
                            onDouble={() =>
                              hrm.actions.setAttendanceDay(
                                emp.id,
                                attDate(year, month, d),
                                "Absent",
                                { name: emp.name, department: emp.department },
                              )
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="ai-toolbar">
            <input
              className="ai-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or card…"
            />
            <span className="muted">{people.length} employees with office cards</span>
          </div>

          <div className="hrm-att-card-scan">
            <label className="hrm-att-field grow">
              <span>Scan card to mark today ({selectedDate})</span>
              <input
                className="field"
                value={cardScan}
                onChange={(e) => setCardScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    markByCard();
                  }
                }}
                placeholder="Scan / type card number then Enter"
              />
            </label>
            <select
              className="ai-sort"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
            >
              {ATT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="button" onClick={markByCard}>
              Mark with card
            </button>
          </div>

          <section className="rd-table-card hrm-dir-card">
            <header>
              <h3>Office cards</h3>
              <span className="muted">Every employee · click card to edit</span>
            </header>
            <div className="ai-table-wrap">
              <table className="ai-table">
                <thead>
                  <tr>
                    <th>Card number</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Today status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((emp) => {
                    const status = byKey.get(`${emp.id}|${selectedDate}`) ?? "";
                    return (
                      <tr key={emp.id}>
                        <td>
                          <button
                            type="button"
                            className="hrm-card-no"
                            onClick={() => setEditEmp({ ...emp })}
                            title="Edit card number"
                          >
                            {emp.cardNumber || "—"}
                          </button>
                        </td>
                        <td>
                          <div className="ai-cell-user">
                            <span className="ai-av">{initials(emp.name)}</span>
                            <div>
                              <strong>{emp.name}</strong>
                            </div>
                          </div>
                        </td>
                        <td>{emp.designation || "—"}</td>
                        <td>{emp.department}</td>
                        <td>
                          <span
                            className="ai-status on"
                            style={tone(status || "Pending")}
                          >
                            {status || "Not marked"}
                          </span>
                        </td>
                        <td>
                          <div className="rd-row-actions">
                            <button
                              type="button"
                              className="rd-soft ok"
                              onClick={() => setEditEmp({ ...emp })}
                            >
                              Edit card
                            </button>
                            <button
                              type="button"
                              className="rd-soft ok"
                              onClick={() => setEmpStatus(emp, "Present")}
                            >
                              Present
                            </button>
                            <button
                              type="button"
                              className="rd-soft bad"
                              onClick={() => setEmpStatus(emp, "Absent")}
                            >
                              Absent
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
        </>
      )}

      {editEmp ? (
        <HrmEditModal
          title="Edit office card"
          onClose={() => setEditEmp(null)}
          onSubmit={saveCardEdit}
          submitLabel="Save card"
        >
          <HrmField label="Name">
            <input className="field" value={editEmp.name ?? ""} readOnly />
          </HrmField>
          <HrmField label="Role">
            <input className="field" value={editEmp.designation ?? ""} readOnly />
          </HrmField>
          <HrmField label="Office card number">
            <input
              className="field"
              value={editEmp.cardNumber ?? ""}
              onChange={(e) => setEditEmp((f) => ({ ...f!, cardNumber: e.target.value }))}
              placeholder="RT9801234"
              autoFocus
            />
          </HrmField>
        </HrmEditModal>
      ) : null}
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
    const metrics = {
      quality: Number(edit.metrics?.quality) || 0,
      delivery: Number(edit.metrics?.delivery) || 0,
      collaboration: Number(edit.metrics?.collaboration) || 0,
      ownership: Number(edit.metrics?.ownership) || 0,
    };
    hrm.actions.upsertPerformance({
      ...edit,
      name: edit.name.trim(),
      employeeId: edit.employeeId,
      score: Number(edit.score) || 0,
      goalsCompleted: Number(edit.goalsCompleted) || 0,
      goalsTotal: Number(edit.goalsTotal) || 0,
      metrics,
      feedback: edit.feedback ?? "",
    } as HrmPerformance);
    setEdit(null);
  };

  const setScore = (row: HrmPerformance, score: number) => {
    const next = Math.min(5, Math.max(0, Number.isFinite(score) ? score : 0));
    hrm.actions.upsertPerformance({ ...row, score: Number(next.toFixed(1)) });
  };

  return (
    <PageShell
      store={store}
      permission="hr.performance"
      crumb="Performance"
      title="Performance management"
      lede="Edit scores, goals, and reviews — or remove a row."
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
              goalsTotal: 5,
              lastReview: new Date().toISOString().slice(0, 10),
              reviewer: store.currentUser.name,
              potential: "Medium",
              metrics: { quality: 0, delivery: 0, collaboration: 0, ownership: 0 },
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
                <th>Score (0–5)</th>
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
                    <div className="hrm-score-edit">
                      <input
                        className="field hrm-score-input"
                        type="number"
                        min={0}
                        max={5}
                        step={0.1}
                        value={Number(r.score)}
                        aria-label={`Score for ${r.name}`}
                        onChange={(e) => setScore(r, Number(e.target.value))}
                      />
                      <span className="rd-badge ok">{Number(r.score).toFixed(1)}</span>
                    </div>
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
          <HrmField label="Performance score (0–5)">
            <input
              className="field"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={edit.score ?? 0}
              onChange={(e) => setEdit((f) => ({ ...f!, score: Number(e.target.value) }))}
              required
            />
          </HrmField>
          <HrmField label="Goals completed">
            <input
              className="field"
              type="number"
              min={0}
              value={edit.goalsCompleted ?? 0}
              onChange={(e) => setEdit((f) => ({ ...f!, goalsCompleted: Number(e.target.value) }))}
            />
          </HrmField>
          <HrmField label="Goals total">
            <input
              className="field"
              type="number"
              min={0}
              value={edit.goalsTotal ?? 0}
              onChange={(e) => setEdit((f) => ({ ...f!, goalsTotal: Number(e.target.value) }))}
            />
          </HrmField>
          <HrmField label="Quality">
            <input
              className="field"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={edit.metrics?.quality ?? 0}
              onChange={(e) =>
                setEdit((f) => ({
                  ...f!,
                  metrics: { ...(f!.metrics ?? {}), quality: Number(e.target.value) },
                }))
              }
            />
          </HrmField>
          <HrmField label="Delivery">
            <input
              className="field"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={edit.metrics?.delivery ?? 0}
              onChange={(e) =>
                setEdit((f) => ({
                  ...f!,
                  metrics: { ...(f!.metrics ?? {}), delivery: Number(e.target.value) },
                }))
              }
            />
          </HrmField>
          <HrmField label="Collaboration">
            <input
              className="field"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={edit.metrics?.collaboration ?? 0}
              onChange={(e) =>
                setEdit((f) => ({
                  ...f!,
                  metrics: { ...(f!.metrics ?? {}), collaboration: Number(e.target.value) },
                }))
              }
            />
          </HrmField>
          <HrmField label="Ownership">
            <input
              className="field"
              type="number"
              min={0}
              max={5}
              step={0.1}
              value={edit.metrics?.ownership ?? 0}
              onChange={(e) =>
                setEdit((f) => ({
                  ...f!,
                  metrics: { ...(f!.metrics ?? {}), ownership: Number(e.target.value) },
                }))
              }
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
          <HrmField label="Feedback">
            <textarea
              className="field"
              rows={3}
              value={edit.feedback ?? ""}
              onChange={(e) => setEdit((f) => ({ ...f!, feedback: e.target.value }))}
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
