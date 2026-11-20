import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileWarning,
  MapPin,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";
import { useHrmStore } from "../../data/hrmStore";
import {
  officeCrmLocation,
  type CrmOpenLocation,
} from "../../lib/locationTrack";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function longDate(d = new Date()) {
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

function shortTime(d = new Date()) {
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function stageCount(
  candidates: { stage: string }[],
  stages: string[],
) {
  return candidates.filter((c) => stages.includes(c.stage)).length;
}

type SortKey = "id" | "name" | "department" | "designation" | "status";

export function HrmDashboard({ store }: { store: CrmStore }) {
  const hrm = useHrmStore();
  const me = store.currentUser;

  const [snapQuery, setSnapQuery] = useState("");
  const [snapDept, setSnapDept] = useState("all");
  const [snapStatus, setSnapStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [gps, setGps] = useState<CrmOpenLocation | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const detectLocation = () => {
    if (gpsBusy) return;
    setGpsBusy(true);
    setGpsError("");
    // Office GPS pin — avoids browser CoreLocation errors in Cursor/macOS.
    const loc = officeCrmLocation();
    setGps(loc);
    store.recordCrmOpenLocation(loc);
    setGpsBusy(false);
  };

  const totalEmployees = hrm.employees.length;
  const onLeaveEmployees = hrm.employees.filter((e) => e.status === "On Leave").length;
  const openJobs = hrm.jobs.filter((j) => j.status === "Open").length;
  const pendingLeave = hrm.leaveRequests.filter((r) => r.status === "Pending");
  const scheduledInterviews = hrm.interviews.filter((i) => i.status === "Scheduled");
  const pendingOnboarding = hrm.onboardingPrograms.filter((p) =>
    ["In progress", "Pending", "Blocked"].includes(String(p.status)),
  );
  const pendingDocs = hrm.documents.filter((d) =>
    ["Pending", "Missing", "In review", "Blocked"].includes(String(d.status || "")),
  );
  const docsFallback = hrm.onboardingPrograms.filter((p) =>
    ["Pending", "Blocked", "In progress"].includes(String(p.status)),
  );

  const attDates = useMemo(() => {
    const set = new Set(hrm.attendanceRecords.map((r) => String(r.date)));
    return [...set].sort().reverse();
  }, [hrm.attendanceRecords]);
  const todayKey = attDates[0] ?? new Date().toISOString().slice(0, 10);
  const todayRecords = hrm.attendanceRecords.filter((r) => r.date === todayKey);
  const presentToday = todayRecords.filter((r) =>
    ["Present", "Late", "Halfday"].includes(r.status),
  ).length;
  const absentToday = todayRecords.filter((r) => r.status === "Absent").length;
  const leaveToday = todayRecords.filter((r) =>
    ["Leave", "On Leave"].includes(r.status),
  ).length;
  const leaveTodayCount = leaveToday || onLeaveEmployees;
  const attBase = Math.max(todayRecords.length, totalEmployees, 1);
  const attPct = Math.round((presentToday / attBase) * 100);

  const weekTrend = useMemo(() => {
    if (hrm.attendanceTrend?.length) {
      const max = Math.max(...hrm.attendanceTrend.map((d) => Number(d.present) || 0), 1);
      return hrm.attendanceTrend.map((d) => ({
        label: String(d.day || "").slice(0, 3),
        value: Number(d.present) || 0,
        pct: Math.round(((Number(d.present) || 0) / max) * 100),
      }));
    }
    const base = new Date(`${todayKey}T12:00:00`);
    const day = (base.getDay() + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const rows = hrm.attendanceRecords.filter((r) => r.date === key);
      const present = rows.filter((r) =>
        ["Present", "Late", "Halfday"].includes(r.status),
      ).length;
      return {
        label: d.toLocaleDateString("en-IN", { weekday: "short" }),
        value: present,
        pct: 0,
      };
    }).map((row, _, arr) => {
      const max = Math.max(...arr.map((a) => a.value), 1);
      return { ...row, pct: Math.round((row.value / max) * 100) };
    });
  }, [hrm.attendanceRecords, hrm.attendanceTrend, todayKey]);

  const deptRows = useMemo(() => {
    const counts = hrm.employees.reduce<Record<string, number>>((acc, e) => {
      const key = e.department || "Unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        pct: Math.round((count / Math.max(totalEmployees, 1)) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [hrm.employees, totalEmployees]);

  const applicants = hrm.candidates.length;
  const screening = stageCount(hrm.candidates, ["Screening", "Applied"]);
  const interviewStage = stageCount(hrm.candidates, ["Interview"]);
  const shortlisted = stageCount(hrm.candidates, ["Shortlisted"]);
  const offers = stageCount(hrm.candidates, ["Offer"]);
  const pipeline = [
    { label: "Applicants", value: applicants },
    { label: "Screening", value: screening },
    { label: "Interviews", value: interviewStage || scheduledInterviews.length },
    { label: "Shortlisted", value: shortlisted },
    { label: "Offers", value: offers },
  ];
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  const pendingActions = [
    {
      id: "leave",
      title: "Pending leave approvals",
      count: pendingLeave.length,
      detail: pendingLeave[0]
        ? `${pendingLeave[0].employeeName} · ${pendingLeave[0].type}`
        : "No leave waiting",
      path: "/hr/leave",
      icon: ClipboardList,
    },
    {
      id: "interview",
      title: "Interview confirmations",
      count: scheduledInterviews.length,
      detail: scheduledInterviews[0]
        ? `${scheduledInterviews[0].candidateName} · ${scheduledInterviews[0].time}`
        : "No interviews scheduled",
      path: "/hr/interviews",
      icon: CalendarDays,
    },
    {
      id: "onboarding",
      title: "Pending onboarding tasks",
      count: pendingOnboarding.length,
      detail: pendingOnboarding[0]
        ? `${pendingOnboarding[0].name} · ${pendingOnboarding[0].status}`
        : "Onboarding up to date",
      path: "/hr/onboarding",
      icon: UserCheck,
    },
    {
      id: "docs",
      title: "Document verification",
      count: pendingDocs.length || docsFallback.length,
      detail:
        pendingDocs[0]?.employeeName ||
        docsFallback[0]?.name ||
        "No documents pending",
      path: "/hr/onboarding",
      icon: FileWarning,
    },
  ];

  const schedule = useMemo(() => {
    const interviews = scheduledInterviews.slice(0, 4).map((i) => ({
      id: i.id,
      time: i.time,
      title: `Interview · ${i.jobTitle || "Role"}`,
      who: i.candidateName,
      kind: "Interview",
    }));
    const meetings = (hrm.events || [])
      .filter((e) => e.date >= todayKey)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 3)
      .map((e) => ({
        id: e.id,
        time: e.time,
        title: e.title,
        who: e.location || e.type,
        kind: e.type || "Event",
      }));
    return [...interviews, ...meetings].slice(0, 6);
  }, [hrm.events, scheduledInterviews, todayKey]);

  const activity = useMemo(() => {
    const fromSeed = hrm.recentActivities.map((a) => ({
      id: a.id,
      title: a.title,
      detail: a.detail,
      time: a.time,
    }));
    const fromLeave = pendingLeave.slice(0, 2).map((r) => ({
      id: `leave-${r.id}`,
      title: "Leave request submitted",
      detail: `${r.employeeName} · ${r.type}`,
      time: "Today",
    }));
    const joins = hrm.employees
      .filter((e) => e.status === "New Hire")
      .slice(0, 2)
      .map((e) => ({
        id: `join-${e.id}`,
        title: "New employee joined",
        detail: `${e.name} · ${e.designation}`,
        time: e.joiningDate ? formatDate(e.joiningDate) : "Recent",
      }));
    return [...joins, ...fromLeave, ...fromSeed].slice(0, 8);
  }, [hrm.employees, hrm.recentActivities, pendingLeave]);

  const departments = useMemo(
    () => ["all", ...Array.from(new Set(hrm.employees.map((e) => e.department).filter(Boolean)))],
    [hrm.employees],
  );
  const statuses = useMemo(
    () => ["all", ...Array.from(new Set(hrm.employees.map((e) => e.status).filter(Boolean)))],
    [hrm.employees],
  );

  const snapshotRows = useMemo(() => {
    const q = snapQuery.trim().toLowerCase();
    const rows = hrm.employees.filter((e) => {
      if (snapDept !== "all" && e.department !== snapDept) return false;
      if (snapStatus !== "all" && e.status !== snapStatus) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        String(e.id).toLowerCase().includes(q) ||
        String(e.designation || "").toLowerCase().includes(q) ||
        String(e.department || "").toLowerCase().includes(q)
      );
    });
    rows.sort((a, b) => {
      const av =
        sortKey === "id"
          ? String(a.id)
          : sortKey === "name"
            ? a.name
            : sortKey === "department"
              ? a.department
              : sortKey === "designation"
                ? String(a.designation || "")
                : String(a.status || "");
      const bv =
        sortKey === "id"
          ? String(b.id)
          : sortKey === "name"
            ? b.name
            : sortKey === "department"
              ? b.department
              : sortKey === "designation"
                ? String(b.designation || "")
                : String(b.status || "");
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows.slice(0, 10);
  }, [hrm.employees, snapDept, snapQuery, snapStatus, sortDir, sortKey]);

  const upcoming = useMemo(() => {
    const birthdays = hrm.upcomingBirthdays.map((b) => ({
      id: `bd-${b.name}`,
      label: "Birthday",
      title: b.name,
      meta: `${b.role} · ${b.department}`,
      when: formatDate(b.date),
    }));
    const interviews = scheduledInterviews.slice(0, 3).map((i) => ({
      id: `iv-${i.id}`,
      label: "Interview",
      title: i.candidateName,
      meta: i.jobTitle || "Role",
      when: `${formatDate(i.date)} · ${i.time}`,
    }));
    const anniversaries = hrm.employees
      .filter((e) => e.joiningDate)
      .map((e) => {
        const join = new Date(`${e.joiningDate}T12:00:00`);
        const years = new Date().getFullYear() - join.getFullYear();
        return {
          id: `an-${e.id}`,
          label: "Anniversary",
          title: e.name,
          meta: `${Math.max(years, 1)} yr · ${e.department}`,
          when: formatDate(e.joiningDate),
          sort: e.joiningDate,
        };
      })
      .sort((a, b) => String(a.sort).localeCompare(String(b.sort)))
      .slice(0, 2);
    const company = (hrm.events || []).slice(0, 2).map((e) => ({
      id: e.id,
      label: e.type || "Event",
      title: e.title,
      meta: e.location || "HR",
      when: `${formatDate(e.date)} · ${e.time}`,
    }));
    return [...birthdays, ...interviews, ...anniversaries, ...company].slice(0, 8);
  }, [hrm.employees, hrm.events, hrm.upcomingBirthdays, scheduledInterviews]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const kpis = [
    {
      label: "Total Employees",
      value: totalEmployees,
      hint: `${hrm.employees.filter((e) => e.status === "Active" || e.status === "Employeed").length} active`,
      path: "/hr/employees",
      icon: Users,
    },
    {
      label: "Present Today",
      value: presentToday,
      hint: `${attPct}% of tracked attendance`,
      path: "/hr/attendance",
      icon: UserCheck,
    },
    {
      label: "Employees on Leave",
      value: leaveTodayCount,
      hint: `${pendingLeave.length} approvals pending`,
      path: "/hr/leave",
      icon: UserMinus,
    },
    {
      label: "Open Positions",
      value: openJobs,
      hint: `${applicants} applicants in pipeline`,
      path: "/hr/recruitment",
      icon: Briefcase,
    },
  ];

  const pendingTotal = pendingActions.reduce((s, a) => s + a.count, 0);

  return (
    <RequirePermission store={store} permission="hr">
      <div className="page rt-hr-overview">
        {/* B. Page header */}
        <header className="rt-hr-header">
          <div className="rt-hr-header-main">
            <div className="rt-hr-header-copy">
              <div className="rt-hr-kicker-row">
                <p className="rt-hr-kicker">RoyalTech People</p>
                {gps ? (
                  <a
                    className="rt-hr-loc is-live"
                    href={gps.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open location in Google Maps"
                  >
                    <MapPin size={12} strokeWidth={2.2} aria-hidden />
                    <span>
                      GPS · {gps.label || `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}`}
                    </span>
                  </a>
                ) : (
                  <button
                    type="button"
                    className={`rt-hr-loc${gpsError ? " is-error" : ""}`}
                    onClick={detectLocation}
                    disabled={gpsBusy}
                    title={gpsError || "Set Mohali HQ GPS for open tracking"}
                  >
                    <MapPin size={12} strokeWidth={2.2} aria-hidden />
                    <span>
                      {gpsBusy ? "Saving…" : gpsError ? "Retry location" : "Location · Set GPS"}
                    </span>
                  </button>
                )}
              </div>
              <h1>HR Overview</h1>
              <p className="rt-hr-sub">
                Organization health, attendance, hiring, and actions for today.
              </p>
            </div>
            <div className="rt-hr-header-aside">
              <div className="rt-hr-person">
                {me.avatarUrl ? (
                  <img className="rt-hr-avatar" src={me.avatarUrl} alt="" />
                ) : (
                  <span className="rt-hr-avatar" aria-hidden>
                    {initialsOf(me.name)}
                  </span>
                )}
                <div>
                  <strong>
                    {greeting()}, {me.name.split(" ")[0]}
                  </strong>
                  <span>HR Admin · {me.email}</span>
                </div>
              </div>
              <div className="rt-hr-meta-strip">
                <div>
                  <small>Today</small>
                  <strong>{longDate()}</strong>
                </div>
                <div>
                  <small>Local time</small>
                  <strong>{shortTime()}</strong>
                </div>
                <div>
                  <small>Needs review</small>
                  <strong>{pendingTotal} items</strong>
                </div>
              </div>
              <div className="rt-hr-quick">
                <Link to="/hr/leave" className="rt-hr-quick-btn">
                  Leave queue
                </Link>
                <Link to="/hr/events" className="rt-hr-quick-btn is-primary">
                  Events
                </Link>
                <Link to="/hr/employees" className="rt-hr-quick-btn">
                  Directory
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* C. KPI row */}
        <section className="rt-hr-kpi-row" aria-label="Primary KPIs">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} to={kpi.path} className="rt-hr-kpi">
                <div className="rt-hr-kpi-top">
                  <span className="rt-hr-kpi-icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <ArrowUpRight size={14} strokeWidth={2} className="rt-hr-kpi-go" />
                </div>
                <p className="rt-hr-kpi-value">{kpi.value}</p>
                <p className="rt-hr-kpi-label">{kpi.label}</p>
                <p className="rt-hr-kpi-hint">{kpi.hint}</p>
              </Link>
            );
          })}
        </section>

        {/* D + E */}
        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Attendance Overview</h2>
                <p>Snapshot for {formatDate(todayKey)}</p>
              </div>
              <Link to="/hr/attendance">Open attendance</Link>
            </header>
            <div className="rt-hr-att-stats">
              <div>
                <strong>{attPct}%</strong>
                <span>Attendance today</span>
              </div>
              <div>
                <strong>{presentToday}</strong>
                <span>Present</span>
              </div>
              <div>
                <strong>{absentToday}</strong>
                <span>Absent</span>
              </div>
              <div>
                <strong>{leaveTodayCount}</strong>
                <span>On leave</span>
              </div>
            </div>
            <div className="rt-hr-trend" aria-label="Weekly attendance trend">
              {weekTrend.map((d, idx) => (
                <div key={`${d.label}-${idx}`} className="rt-hr-trend-col">
                  <div className="rt-hr-trend-bar-wrap">
                    <div className="rt-hr-trend-bar" style={{ height: `${Math.max(d.pct, 8)}%` }} />
                  </div>
                  <span>{d.label}</span>
                  <small>{d.value}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Workforce Overview</h2>
                <p>Department-wise employee distribution</p>
              </div>
              <Link to="/hr/employees">Directory</Link>
            </header>
            <ul className="rt-hr-dept-list">
              {deptRows.map((d) => (
                <li key={d.name}>
                  <div className="rt-hr-dept-meta">
                    <strong>{d.name}</strong>
                    <span>
                      {d.count} · {d.pct}%
                    </span>
                  </div>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i style={{ width: `${d.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* F + G */}
        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Recruitment Overview</h2>
                <p>Pipeline across open roles</p>
              </div>
              <Link to="/hr/recruitment">Pipeline</Link>
            </header>
            <div className="rt-hr-pipe-grid">
              {pipeline.map((step) => (
                <div key={step.label} className="rt-hr-pipe-step">
                  <strong>{step.value}</strong>
                  <span>{step.label}</span>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i style={{ width: `${Math.round((step.value / pipelineMax) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rt-hr-panel rt-hr-panel-emphasis">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Pending HR Actions</h2>
                <p>Items that need attention today</p>
              </div>
              <span className="rt-hr-badge">
                {pendingActions.reduce((s, a) => s + a.count, 0)} open
              </span>
            </header>
            <ul className="rt-hr-actions">
              {pendingActions.map((action) => {
                const Icon = action.icon;
                return (
                  <li key={action.id}>
                    <div className="rt-hr-action-ico" aria-hidden>
                      <Icon size={16} strokeWidth={2} />
                    </div>
                    <div className="rt-hr-action-body">
                      <div className="rt-hr-action-top">
                        <strong>{action.title}</strong>
                        <em>{action.count}</em>
                      </div>
                      <span>{action.detail}</span>
                    </div>
                    <Link className="rt-hr-action-btn" to={action.path}>
                      Review
                    </Link>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>

        {/* H + I */}
        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Today&apos;s Schedule</h2>
                <p>Interviews, meetings, and discussions</p>
              </div>
              <Link to="/hr/events">Events</Link>
            </header>
            <ul className="rt-hr-schedule">
              {schedule.length === 0 ? (
                <li className="rt-hr-empty">No items scheduled for the current window.</li>
              ) : (
                schedule.map((item) => (
                  <li key={item.id}>
                    <time>{item.time}</time>
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind} · {item.who}
                      </span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Recent Employee Activity</h2>
                <p>Chronological people-ops feed</p>
              </div>
            </header>
            <ul className="rt-hr-activity">
              {activity.map((item) => (
                <li key={item.id}>
                  <span className="rt-hr-activity-dot" aria-hidden>
                    <CheckCircle2 size={14} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <time>{item.time}</time>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* J. Employee snapshot */}
        <section className="rt-hr-panel rt-hr-snapshot">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Employee Snapshot</h2>
              <p>Search, filter, and review the live directory</p>
            </div>
            <Link to="/hr/employees">View all</Link>
          </header>
          <div className="rt-hr-filters">
            <input
              className="rt-hr-input"
              value={snapQuery}
              onChange={(e) => setSnapQuery(e.target.value)}
              placeholder="Search ID, name, role…"
              aria-label="Search employees"
            />
            <select
              className="rt-hr-input"
              value={snapDept}
              onChange={(e) => setSnapDept(e.target.value)}
              aria-label="Filter department"
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d === "all" ? "All departments" : d}
                </option>
              ))}
            </select>
            <select
              className="rt-hr-input"
              value={snapStatus}
              onChange={(e) => setSnapStatus(e.target.value)}
              aria-label="Filter status"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All statuses" : s}
                </option>
              ))}
            </select>
          </div>
          <div className="rt-hr-table-wrap">
            <table className="rt-hr-table">
              <thead>
                <tr>
                  {(
                    [
                      ["id", "Employee ID"],
                      ["name", "Employee name"],
                      ["department", "Department"],
                      ["designation", "Designation"],
                      ["status", "Status"],
                    ] as Array<[SortKey, string]>
                  ).map(([key, label]) => (
                    <th key={key}>
                      <button type="button" onClick={() => toggleSort(key)}>
                        {label}
                        {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshotRows.map((e) => (
                  <tr key={e.id}>
                    <td>{e.id}</td>
                    <td>{e.name}</td>
                    <td>{e.department}</td>
                    <td>{e.designation}</td>
                    <td>
                      <span className={`rt-hr-status is-${String(e.status).toLowerCase().replace(/\s+/g, "-")}`}>
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {snapshotRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="rt-hr-empty">
                      No employees match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* K. Upcoming events */}
        <section className="rt-hr-panel">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Upcoming Events</h2>
              <p>Birthdays, anniversaries, interviews, and HR events</p>
            </div>
            <Link to="/hr/events">Manage events</Link>
          </header>
          <ul className="rt-hr-upcoming">
            {upcoming.map((item) => (
              <li key={item.id}>
                <span className="rt-hr-upcoming-tag">{item.label}</span>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.meta}</span>
                </div>
                <time>{item.when}</time>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </RequirePermission>
  );
}
