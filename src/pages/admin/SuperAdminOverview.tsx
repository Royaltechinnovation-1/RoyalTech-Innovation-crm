import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Briefcase,
  Building2,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import { useHrmStore } from "../../data/hrmStore";
import { formatCurrency, formatDate, leadStageLabels } from "../../lib/format";
import { fetchHealth } from "../../lib/salesApi";
import { RequirePermission } from "../../components/RequirePermission";

type Scope = "company" | "sales" | "hr" | "projects" | "finance" | "website";
type Tab =
  | "overview"
  | "sales"
  | "hr"
  | "projects"
  | "finance"
  | "website"
  | "people";

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

function shortDate(d = new Date()) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

function stageCount(candidates: { stage: string }[], stages: string[]) {
  return candidates.filter((c) => stages.includes(c.stage)).length;
}

function monthBuckets(dates: string[], amounts?: number[]) {
  const map = new Map<string, number>();
  dates.forEach((raw, i) => {
    const key = String(raw || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) return;
    map.set(key, (map.get(key) || 0) + (amounts?.[i] ?? 1));
  });
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([, v]) => v);
}

function LineChart({
  values,
  stroke,
  fill,
}: {
  values: number[];
  stroke: string;
  fill: string;
}) {
  const series = values.length ? values : [0];
  const w = 520;
  const h = 168;
  const pad = 12;
  const max = Math.max(...series, 1);
  const pts = series.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(series.length - 1, 1);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const line = pts.join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <svg className="rt-sa-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-hidden>
      <defs>
        <linearGradient id={`sa-fill-${stroke.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line
          key={g}
          x1={pad}
          x2={w - pad}
          y1={pad + g * (h - pad * 2)}
          y2={pad + g * (h - pad * 2)}
          className="rt-sa-chart-grid"
        />
      ))}
      <polygon points={area} fill={`url(#sa-fill-${stroke.replace("#", "")})`} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {series.map((v, i) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(series.length - 1, 1);
        const y = h - pad - (v / max) * (h - pad * 2);
        return <circle key={i} cx={x} cy={y} r="3.2" fill={stroke} />;
      })}
    </svg>
  );
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "sales", label: "Sales" },
  { id: "hr", label: "HR" },
  { id: "projects", label: "Projects" },
  { id: "finance", label: "Finance" },
  { id: "website", label: "Website" },
  { id: "people", label: "People" },
];

export function SuperAdminOverview({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const hrm = useHrmStore();
  const [scope, setScope] = useState<Scope>("company");
  const [tab, setTab] = useState<Tab>("overview");
  const [now, setNow] = useState(() => new Date());
  const [spin, setSpin] = useState(false);
  const [apiMode, setApiMode] = useState("checking");

  const crm = store.data;

  useEffect(() => {
    fetchHealth()
      .then((h) => setApiMode(h.database || "memory"))
      .catch(() => setApiMode("offline"));
  }, []);

  const hrEmployees = hrm.employees;
  const pendingLeave = hrm.leaveRequests.filter((r) => r.status === "Pending");
  const onLeave = hrEmployees.filter((e) => e.status === "On Leave").length;
  const openJobs = hrm.jobs.filter((j) => j.status === "Open").length;
  const scheduledInterviews = hrm.interviews.filter((i) => i.status === "Scheduled");
  const pendingOnboarding = hrm.onboardingPrograms.filter((p) =>
    ["In progress", "Pending", "Blocked"].includes(String(p.status)),
  );
  const pendingDocs = hrm.documents.filter((d) =>
    ["Pending", "Missing", "In review", "Blocked"].includes(String(d.status || "")),
  );

  const openLeads = crm.leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const pipeline = openLeads.reduce((s, l) => s + l.value, 0);
  const revenue = crm.payments
    .filter((p) => p.status === "received")
    .reduce((s, p) => s + p.amount, 0);
  const pendingPayments = crm.payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);
  const activeProjects = crm.projects.filter((p) => p.status === "active");
  const openTasks = crm.tasks.filter((t) => t.status !== "done");

  const attDates = useMemo(() => {
    const set = new Set(hrm.attendanceRecords.map((r) => String(r.date)));
    return [...set].sort().reverse();
  }, [hrm.attendanceRecords]);
  const todayKey = attDates[0] ?? new Date().toISOString().slice(0, 10);
  const todayRecords = hrm.attendanceRecords.filter((r) => r.date === todayKey);
  const presentToday = todayRecords.filter((r) =>
    ["Present", "Late", "Halfday"].includes(r.status),
  ).length;

  const attendanceSeries = useMemo(() => {
    if (hrm.attendanceTrend?.length) {
      return hrm.attendanceTrend.map((d) => Number(d.present) || 0);
    }
    return monthBuckets(hrm.attendanceRecords.map((r) => String(r.date)));
  }, [hrm.attendanceRecords, hrm.attendanceTrend]);

  const payrollSeries = useMemo(() => {
    if (hrm.payrollTrend?.length) {
      return hrm.payrollTrend.map((d) => Number(d.payroll) || 0);
    }
    return hrm.payrollRecords.map((r) => Number(r.netPay || r.amount || 0));
  }, [hrm.payrollRecords, hrm.payrollTrend]);

  const pipelineSeries = useMemo(
    () =>
      monthBuckets(
        crm.leads.map((l) => l.createdAt),
        crm.leads.map((l) => l.value),
      ),
    [crm.leads],
  );

  const revenueSeries = useMemo(() => {
    const received = crm.payments.filter((p) => p.status === "received");
    return monthBuckets(
      received.map((p) => p.date || ""),
      received.map((p) => p.amount),
    );
  }, [crm.payments]);

  const hiringJourney = useMemo(() => {
    const rows = [
      { label: "Applicants", value: hrm.candidates.length, tone: "a" },
      { label: "Screening", value: stageCount(hrm.candidates, ["Screening", "Applied"]), tone: "b" },
      {
        label: "Interviews",
        value: stageCount(hrm.candidates, ["Interview"]) || scheduledInterviews.length,
        tone: "c",
      },
      { label: "Offers", value: stageCount(hrm.candidates, ["Offer"]), tone: "d" },
      { label: "Employees", value: hrEmployees.length, tone: "e" },
    ];
    const max = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }));
  }, [hrEmployees.length, hrm.candidates, scheduledInterviews.length]);

  const salesJourney = useMemo(() => {
    const rows = [
      { label: "Leads", value: crm.leads.length, tone: "a" },
      {
        label: "Contacted",
        value: crm.leads.filter((l) =>
          ["contacted", "qualified", "proposal", "negotiation", "won"].includes(l.status),
        ).length,
        tone: "b",
      },
      {
        label: "Proposal",
        value: crm.leads.filter((l) =>
          ["proposal", "negotiation", "won"].includes(l.status),
        ).length,
        tone: "c",
      },
      { label: "Won", value: crm.leads.filter((l) => l.status === "won").length, tone: "d" },
      { label: "Clients", value: crm.clients.length, tone: "e" },
    ];
    const max = Math.max(...rows.map((r) => r.value), 1);
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }));
  }, [crm.clients.length, crm.leads]);

  const journey =
    tab === "sales" || tab === "finance" ? salesJourney : hiringJourney;

  const activityRows = useMemo(() => {
    const hrActs = hrm.recentActivities.map((a) => ({
      id: `hr-${a.id}`,
      time: a.time,
      who: a.detail?.split("·")[0]?.trim() || "HR",
      company: a.detail || "People ops",
      module: "HR",
      detail: a.title,
      value: "—",
    }));
    const leaveActs = pendingLeave.slice(0, 4).map((r) => ({
      id: `leave-${r.id}`,
      time: "Pending",
      who: r.employeeName || "Employee",
      company: r.type || "Leave",
      module: "HR",
      detail:
        `${r.startDate || r.from || ""} → ${r.endDate || r.to || ""}`.trim() ||
        "Leave request",
      value: r.status,
    }));
    const interviewActs = scheduledInterviews.slice(0, 4).map((i) => ({
      id: `int-${i.id}`,
      time: i.time || formatDate(i.date || ""),
      who: i.candidateName || "Candidate",
      company: i.jobTitle || "Interview",
      module: "HR",
      detail: i.status,
      value: "—",
    }));
    const leads = crm.leads.slice(0, 4).map((l) => ({
      id: `lead-${l.id}`,
      time: formatDate(l.createdAt || l.nextFollowUp || ""),
      who: l.name,
      company: l.company,
      module: "Sales",
      detail: leadStageLabels[l.status as keyof typeof leadStageLabels] || l.status,
      value: formatCurrency(l.value),
    }));
    const tasks = openTasks.slice(0, 3).map((t) => ({
      id: `task-${t.id}`,
      time: formatDate(t.dueDate || ""),
      who: crm.users.find((u) => u.id === t.assigneeId)?.name || "Dev",
      company: crm.projects.find((p) => p.id === t.projectId)?.name || "Project",
      module: "Projects",
      detail: t.status,
      value: "—",
    }));

    if (tab === "hr" || tab === "people") {
      return [...leaveActs, ...interviewActs, ...hrActs].slice(0, 12);
    }
    if (tab === "sales") return leads;
    if (tab === "projects") return tasks;
    return [...hrActs, ...leaveActs, ...leads, ...tasks].slice(0, 12);
  }, [
    crm.leads,
    crm.projects,
    crm.users,
    hrm.recentActivities,
    openTasks,
    pendingLeave,
    scheduledInterviews,
    tab,
  ]);

  const people = useMemo(
    () =>
      hrEmployees.map((e) => ({
        id: e.id,
        name: e.name,
        role: e.designation || "—",
        dept: e.department || "—",
        email: e.email || e.companyEmail || "—",
        status: e.status || "—",
      })),
    [hrEmployees],
  );

  const alerts = useMemo(() => {
    const rows: Array<{ type: string; title: string; id: string }> = [
      ...pendingLeave.slice(0, 4).map((r) => ({
        type: "leave",
        title: `Leave · ${r.employeeName || "Employee"} · ${r.type}`,
        id: String(r.id),
      })),
      ...scheduledInterviews.slice(0, 3).map((i) => ({
        type: "interview",
        title: `Interview · ${i.candidateName || "Candidate"}`,
        id: String(i.id),
      })),
      ...pendingOnboarding.slice(0, 2).map((p) => ({
        type: "onboarding",
        title: `Onboarding · ${p.name || "Program"}`,
        id: String(p.id),
      })),
      ...pendingDocs.slice(0, 2).map((d) => ({
        type: "docs",
        title: `Document · ${d.employeeName || d.name || "Pending"}`,
        id: String(d.id),
      })),
      ...openTasks
        .filter((t) => t.status === "blocked")
        .slice(0, 2)
        .map((t) => ({ type: "task", title: `Blocked · ${t.title}`, id: t.id })),
    ];
    return rows.slice(0, 10);
  }, [
    openTasks,
    pendingDocs,
    pendingLeave,
    pendingOnboarding,
    scheduledInterviews,
  ]);

  const kpis =
    tab === "hr" || tab === "people" || scope === "hr"
      ? [
          {
            label: "Employees",
            value: hrEmployees.length,
            hint: `${onLeave} on leave · ${presentToday} present today`,
            icon: Users,
            path: "/hr/employees",
          },
          {
            label: "Leave pending",
            value: pendingLeave.length,
            hint: pendingLeave[0]
              ? `${pendingLeave[0].employeeName} · ${pendingLeave[0].type}`
              : "No approvals waiting",
            icon: ClipboardList,
            path: "/hr/leave",
          },
          {
            label: "Open roles",
            value: openJobs,
            hint: `${hrm.candidates.length} candidates · ${scheduledInterviews.length} interviews`,
            icon: Briefcase,
            path: "/hr/recruitment",
          },
          {
            label: "Onboarding",
            value: pendingOnboarding.length,
            hint: `${pendingDocs.length} docs pending verify`,
            icon: Activity,
            path: "/hr/onboarding",
          },
        ]
      : [
          {
            label: "Employees",
            value: hrEmployees.length,
            hint: `${presentToday} present · ${pendingLeave.length} leave pending`,
            icon: Users,
            path: "/hr/employees",
          },
          {
            label: "Pipeline",
            value: formatCurrency(pipeline),
            hint: `${crm.leads.length} leads total`,
            icon: TrendingUp,
            path: "/leads/pipeline",
          },
          {
            label: "Active projects",
            value: activeProjects.length,
            hint: `${openTasks.length} open tasks`,
            icon: Briefcase,
            path: "/projects",
          },
          {
            label: "Revenue",
            value: formatCurrency(revenue),
            hint: `${formatCurrency(pendingPayments)} pending`,
            icon: Wallet,
            path: "/finance/revenue",
          },
        ];

  const moduleCards = [
    {
      key: "sales",
      label: "Sales",
      meta: `${crm.leads.length} leads · ${formatCurrency(pipeline)}`,
      path: "/sales",
      icon: TrendingUp,
    },
    {
      key: "hr",
      label: "HR",
      meta: `${hrEmployees.length} people · ${pendingLeave.length} leave`,
      path: "/hr",
      icon: Users,
    },
    {
      key: "projects",
      label: "Delivery",
      meta: `${activeProjects.length} active · ${openTasks.length} tasks`,
      path: "/projects",
      icon: Briefcase,
    },
    {
      key: "finance",
      label: "Finance",
      meta: formatCurrency(revenue),
      path: "/finance/revenue",
      icon: Wallet,
    },
    {
      key: "website",
      label: "Website",
      meta: `${crm.enquiries.length} enquiries`,
      path: "/website",
      icon: Globe2,
    },
    {
      key: "org",
      label: "Organization",
      meta: crm.organization?.name || "RoyalTech",
      path: "/settings",
      icon: Building2,
    },
  ];

  const filteredModules =
    scope === "company"
      ? moduleCards
      : moduleCards.filter((m) => m.key === scope);

  const chartLeft =
    tab === "hr" || tab === "people" || scope === "hr"
      ? {
          title: "Attendance present",
          sub: `HR attendance · ${todayKey}`,
          link: "/hr/attendance",
          linkLabel: "Open attendance",
          values: attendanceSeries,
          stroke: "#1b2a22",
          fill: "#a3a65b",
        }
      : {
          title: "Pipeline by month",
          sub: "Lead value from CRM book",
          link: "/leads/pipeline",
          linkLabel: "Open pipeline",
          values: pipelineSeries.length ? pipelineSeries : [pipeline],
          stroke: "#1b2a22",
          fill: "#a3a65b",
        };

  const chartRight =
    tab === "hr" || tab === "people" || scope === "hr"
      ? {
          title: "Payroll trend",
          sub: "Monthly payroll from HR ledger",
          link: "/hr/payroll",
          linkLabel: "Open payroll",
          values: payrollSeries,
          stroke: "#8b8e48",
          fill: "#c9cdb8",
        }
      : {
          title: "Revenue by month",
          sub: "Received payments from finance",
          link: "/finance/revenue",
          linkLabel: "Open finance",
          values: revenueSeries.length ? revenueSeries : [revenue],
          stroke: "#8b8e48",
          fill: "#c9cdb8",
        };

  const refresh = () => {
    setSpin(true);
    setNow(new Date());
    window.setTimeout(() => setSpin(false), 400);
  };

  return (
    <RequirePermission store={store} permission="dashboard">
      <div className="page rt-sa-overview">
        <header className="rt-sa-header">
          <div className="rt-sa-header-copy">
            <p className="rt-sa-kicker">
              <LayoutDashboard size={14} strokeWidth={2} aria-hidden />
              Super Admin · Command Center
            </p>
            <h1>Company analytics</h1>
            <p className="rt-sa-sub">
              {greeting()}, {me.name.split(" ")[0]} — live CRM plus HR directory, leave,
              attendance, hiring, and payroll.
            </p>
          </div>
          <div className="rt-sa-header-aside">
            <div className="rt-sa-person">
              {me.avatarUrl ? (
                <img className="rt-sa-avatar" src={me.avatarUrl} alt="" />
              ) : (
                <span className="rt-sa-avatar" aria-hidden>
                  {initialsOf(me.name)}
                </span>
              )}
              <div>
                <strong>{me.name}</strong>
                <span>Super Admin · {shortDate(now)}</span>
              </div>
            </div>
            <div className="rt-sa-controls">
              <div className="rt-sa-toggle" role="group" aria-label="Scope">
                {(
                  [
                    ["company", "Company"],
                    ["sales", "Sales"],
                    ["hr", "HR"],
                    ["projects", "Projects"],
                  ] as Array<[Scope, string]>
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={scope === id ? "is-on" : ""}
                    onClick={() => {
                      setScope(id);
                      setTab(id === "company" ? "overview" : (id as Tab));
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="rt-sa-refresh"
                onClick={refresh}
                disabled={spin}
                title="Refresh"
              >
                <RefreshCw size={15} strokeWidth={2} className={spin ? "is-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
        </header>

        <nav className="rt-sa-tabs" aria-label="Superadmin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "is-active" : ""}
              onClick={() => {
                setTab(t.id);
                if (t.id === "overview") setScope("company");
                else if (["sales", "hr", "projects", "finance", "website"].includes(t.id)) {
                  setScope(t.id as Scope);
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section className="rt-sa-kpi-row" aria-label="Company KPIs">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} to={kpi.path} className="rt-sa-kpi">
                <div className="rt-sa-kpi-top">
                  <span className="rt-sa-kpi-icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="rt-sa-kpi-trend">HR live</span>
                </div>
                <p className="rt-sa-kpi-value">{kpi.value}</p>
                <p className="rt-sa-kpi-label">{kpi.label}</p>
                <p className="rt-sa-kpi-hint">{kpi.hint}</p>
              </Link>
            );
          })}
        </section>

        <section className="rt-sa-charts">
          <article className="rt-sa-panel">
            <header className="rt-sa-panel-head">
              <div>
                <h2>{chartLeft.title}</h2>
                <p>{chartLeft.sub}</p>
              </div>
              <Link to={chartLeft.link}>{chartLeft.linkLabel}</Link>
            </header>
            <LineChart
              values={chartLeft.values}
              stroke={chartLeft.stroke}
              fill={chartLeft.fill}
            />
          </article>
          <article className="rt-sa-panel">
            <header className="rt-sa-panel-head">
              <div>
                <h2>{chartRight.title}</h2>
                <p>{chartRight.sub}</p>
              </div>
              <Link to={chartRight.link}>{chartRight.linkLabel}</Link>
            </header>
            <LineChart
              values={chartRight.values}
              stroke={chartRight.stroke}
              fill={chartRight.fill}
            />
          </article>
        </section>

        {(tab === "overview" || scope === "company") && (
          <section className="rt-sa-modules" aria-label="Module access">
            {filteredModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link key={mod.key} to={mod.path} className="rt-sa-module">
                  <span className="rt-sa-module-ico" aria-hidden>
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <strong>{mod.label}</strong>
                  <span>{mod.meta}</span>
                </Link>
              );
            })}
          </section>
        )}

        <section className="rt-sa-row-2">
          <article className="rt-sa-panel rt-sa-panel-wide">
            <header className="rt-sa-panel-head">
              <div>
                <h2>
                  {tab === "hr" || tab === "people"
                    ? "HR activity"
                    : "Recent company activity"}
                </h2>
                <p>
                  {tab === "hr" || tab === "people"
                    ? "Leave, interviews, and people-ops from HR"
                    : "HR, sales, and delivery in one feed"}
                </p>
              </div>
              <span className="rt-sa-badge">
                API · {apiMode}
              </span>
            </header>
            <div className="rt-sa-table-wrap">
              <table className="rt-sa-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Person</th>
                    <th>Detail</th>
                    <th>Module</th>
                    <th>Note</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {activityRows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.time || "—"}</td>
                      <td>{row.who}</td>
                      <td>{row.company}</td>
                      <td>
                        <span className="rt-sa-chip">{row.module}</span>
                      </td>
                      <td>{row.detail}</td>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                  {activityRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="rt-sa-empty">
                        No recent activity yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rt-sa-panel">
            <header className="rt-sa-panel-head">
              <div>
                <h2>
                  {tab === "sales" || tab === "finance" ? "Sales journey" : "Hiring journey"}
                </h2>
                <p>
                  {tab === "sales" || tab === "finance"
                    ? "Lead → client conversion"
                    : "Applicant → employee from HR"}
                </p>
              </div>
              <Link to={tab === "sales" || tab === "finance" ? "/sales" : "/hr/recruitment"}>
                {tab === "sales" || tab === "finance" ? "Sales desk" : "Recruitment"}
              </Link>
            </header>
            <ul className="rt-sa-journey">
              {journey.map((step) => (
                <li key={step.label}>
                  <div className="rt-sa-journey-meta">
                    <strong>{step.label}</strong>
                    <span>{step.value}</span>
                  </div>
                  <div className="rt-sa-journey-track" aria-hidden>
                    <i
                      className={`tone-${step.tone}`}
                      style={{ width: `${Math.max(step.pct, 6)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="rt-sa-row-2">
          <article className="rt-sa-panel">
            <header className="rt-sa-panel-head">
              <div>
                <h2>
                  {tab === "hr" || tab === "people" ? "Department headcount" : "Project pulse"}
                </h2>
                <p>
                  {tab === "hr" || tab === "people"
                    ? "From HR employee directory"
                    : "Active delivery across engineering"}
                </p>
              </div>
              <Link to={tab === "hr" || tab === "people" ? "/hr/employees" : "/projects"}>
                {tab === "hr" || tab === "people" ? "Directory" : "All projects"}
              </Link>
            </header>
            {tab === "hr" || tab === "people" ? (
              <ul className="rt-sa-pulse">
                {Object.entries(
                  hrEmployees.reduce<Record<string, number>>((acc, e) => {
                    const key = e.department || "Unassigned";
                    acc[key] = (acc[key] || 0) + 1;
                    return acc;
                  }, {}),
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => (
                    <li key={name}>
                      <div>
                        <strong>{name}</strong>
                        <span>{count} people</span>
                      </div>
                      <div className="rt-sa-pulse-bar" aria-hidden>
                        <i
                          style={{
                            width: `${Math.round((count / Math.max(hrEmployees.length, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <em>{count}</em>
                    </li>
                  ))}
              </ul>
            ) : (
              <ul className="rt-sa-pulse">
                {activeProjects.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <div>
                      <strong>{p.name}</strong>
                      <span>Due {p.deadline ? formatDate(p.deadline) : "—"}</span>
                    </div>
                    <div className="rt-sa-pulse-bar" aria-hidden>
                      <i style={{ width: `${Math.min(100, Math.max(p.progress, 4))}%` }} />
                    </div>
                    <em>{p.progress}%</em>
                  </li>
                ))}
                {activeProjects.length === 0 ? (
                  <li className="rt-sa-empty">No active projects.</li>
                ) : null}
              </ul>
            )}
          </article>

          <article className="rt-sa-panel">
            <header className="rt-sa-panel-head">
              <div>
                <h2>Alerts</h2>
                <p>Leave, interviews, onboarding, and blocked work</p>
              </div>
              <span className="rt-sa-badge">{alerts.length}</span>
            </header>
            <ul className="rt-sa-alerts">
              {alerts.length === 0 ? (
                <li className="rt-sa-empty">No urgent alerts.</li>
              ) : (
                alerts.map((a) => (
                  <li key={`${a.type}-${a.id}`}>
                    <span className="rt-sa-alert-ico" aria-hidden>
                      {a.type === "leave" || a.type === "docs" ? (
                        <ClipboardList size={14} strokeWidth={2} />
                      ) : a.type === "interview" || a.type === "onboarding" ? (
                        <Users size={14} strokeWidth={2} />
                      ) : (
                        <Activity size={14} strokeWidth={2} />
                      )}
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <span>{a.type}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </article>
        </section>

        <section className="rt-sa-panel">
          <header className="rt-sa-panel-head">
            <div>
              <h2>HR directory</h2>
              <p>
                Same employee data as HR Admin · {longDate(now)} · {hrEmployees.length}{" "}
                records
              </p>
            </div>
            <Link to="/hr/employees">Open HR</Link>
          </header>
          <div className="rt-sa-table-wrap">
            <table className="rt-sa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {people.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>
                      <span className="rt-sa-chip">{u.role}</span>
                    </td>
                    <td>{u.dept}</td>
                    <td>{u.status}</td>
                    <td>{u.email}</td>
                  </tr>
                ))}
                {people.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="rt-sa-empty">
                      No HR employees found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rt-sa-quick" aria-label="Jump to module">
          <Link to="/hr/messages" className="rt-sa-quick-btn is-primary">
            Messages
          </Link>
          <Link to="/hr/employees" className="rt-sa-quick-btn">
            HR directory
          </Link>
          <Link to="/hr/leave" className="rt-sa-quick-btn">
            Leave
          </Link>
          <Link to="/hr/attendance" className="rt-sa-quick-btn">
            Attendance
          </Link>
          <Link to="/leads" className="rt-sa-quick-btn">
            All leads
          </Link>
          <Link to="/projects" className="rt-sa-quick-btn">
            Projects
          </Link>
          <Link to="/settings/users" className="rt-sa-quick-btn">
            CRM users
          </Link>
        </section>
      </div>
    </RequirePermission>
  );
}
