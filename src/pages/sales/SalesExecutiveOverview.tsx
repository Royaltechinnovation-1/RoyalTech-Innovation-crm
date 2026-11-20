import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  Target,
  UserRound,
  Wallet,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate, leadStageLabels } from "../../lib/format";
import {
  fetchSalesDashboard,
  fetchSalesTargets,
  type SalesDashboardData,
  type SalesTargetRow,
} from "../../lib/salesApi";
import { RequirePermission } from "../../components/RequirePermission";
import { officeCrmLocation, type CrmOpenLocation } from "../../lib/locationTrack";

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

function followLabel(dateStr: string) {
  const due = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(due.getTime())) return "Upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(due);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatDate(dateStr);
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FUNNEL = ["new", "contacted", "qualified", "proposal", "negotiation", "won"] as const;

type SortKey = "company" | "stage" | "value" | "follow";

function buildLocalExec(store: CrmStore): {
  data: SalesDashboardData;
  targets: SalesTargetRow[];
} {
  const me = store.currentUser.id;
  const leads = store.visibleLeads.filter((l) => l.ownerId === me);
  const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const won = leads.filter((l) => l.status === "won");
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    bySource[l.source || "Other"] = (bySource[l.source || "Other"] || 0) + 1;
  }
  const followUps = open
    .filter((l) => l.nextFollowUp)
    .map((l) => ({
      id: l.id,
      lead_id: l.leadId,
      company: l.company,
      name: l.name,
      next_follow_up: l.nextFollowUp || "",
      owner_name: store.currentUser.name,
      value: l.value,
    }));
  const targets = store.data.salesTargets
    .filter((t) => t.ownerId === me)
    .map((t) => ({
      id: t.id,
      ownerId: t.ownerId,
      ownerName: store.currentUser.name,
      period: t.period,
      target: t.target,
      achieved: t.achieved,
      percent: t.target ? Math.round((t.achieved / t.target) * 100) : 0,
    }));

  return {
    data: {
      mode: "memory",
      summary: {
        totalLeads: leads.length,
        openDeals: open.length,
        pipelineValue: open.reduce((s, l) => s + l.value, 0),
        wonDeals: won.length,
        wonValue: won.reduce((s, l) => s + l.value, 0),
        lostDeals: leads.filter((l) => l.status === "lost").length,
        conversion: leads.length ? Math.round((won.length / leads.length) * 100) : 0,
        clients: store.data.clients.filter((c) => c.accountManagerId === me).length,
        followUps: followUps.length,
      },
      byStatus,
      bySource,
      recentLeads: leads.slice(0, 20).map((l) => ({
        id: l.id,
        lead_id: l.leadId,
        company: l.company,
        name: l.name,
        status: l.status,
        value: l.value,
        owner_name: store.currentUser.name,
        next_follow_up: l.nextFollowUp,
      })),
      followUps,
      recentActivities: store.data.activityLogs
        .filter((a) => a.actorId === me)
        .slice(0, 8)
        .map((a) => ({
          id: a.id,
          title: a.action,
          activity_type: a.entity,
          activity_date: a.createdAt.slice(0, 10),
          owner_name: store.currentUser.name,
          lead_company: a.entity,
        })),
    },
    targets,
  };
}

export function SalesExecutiveOverview({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const manager = store.data.users.find((u) => u.id === me.managerId);
  const local = useMemo(() => buildLocalExec(store), [store]);

  const [data, setData] = useState<SalesDashboardData | null>(local.data);
  const [targets, setTargets] = useState<SalesTargetRow[]>(local.targets);
  const [gps, setGps] = useState<CrmOpenLocation | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [snapQuery, setSnapQuery] = useState("");
  const [snapStage, setSnapStage] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("follow");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchSalesDashboard({ ownerId: me.id }),
      fetchSalesTargets().catch(() => [] as SalesTargetRow[]),
    ])
      .then(([dash, targetRows]) => {
        if (!alive) return;
        setData(dash);
        const mine = targetRows.filter((t) => t.ownerId === me.id);
        setTargets(mine.length ? mine : local.targets);
      })
      .catch(() => {
        if (!alive) return;
        setData(local.data);
        setTargets(local.targets);
      });
    return () => {
      alive = false;
    };
  }, [local, me.id]);

  const summary = data?.summary;
  const followUps = data?.followUps ?? [];
  const overdue = followUps.filter((f) => followLabel(String(f.next_follow_up)) === "Overdue").length;
  const dueToday = followUps.filter((f) => followLabel(String(f.next_follow_up)) === "Today").length;

  const myTarget = targets[0];
  const targetGoal = myTarget?.target ?? Math.max(summary?.wonValue ?? 0, 1) * 1.25;
  const targetAchieved = myTarget?.achieved ?? summary?.wonValue ?? 0;
  const targetPct = Math.min(100, Math.round((targetAchieved / Math.max(targetGoal, 1)) * 100));

  const weekTrend = useMemo(() => {
    const base = Math.max(summary?.wonDeals ?? 1, 1);
    return WEEK_DAYS.map((label, idx) => {
      const value = Math.max(1, Math.round(base * (0.45 + ((idx * 11) % 40) / 100)));
      return { label, idx, value, pct: Math.min(100, Math.round((value / (base + 2)) * 100)) };
    });
  }, [summary?.wonDeals]);

  const pipeline = FUNNEL.map((status) => ({
    label: leadStageLabels[status] ?? status,
    value: data?.byStatus?.[status] ?? 0,
  }));
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  const sourceRows = useMemo(() => {
    const entries = Object.entries(data?.bySource ?? {});
    const max = Math.max(...entries.map(([, n]) => n), 1);
    return entries.slice(0, 6).map(([name, count]) => ({
      name,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }, [data?.bySource]);

  const pendingActions = [
    {
      id: "followups",
      title: "My follow-ups",
      count: dueToday + overdue,
      detail: `${dueToday} today · ${overdue} overdue`,
      path: "/leads/followups",
      icon: ClipboardList,
    },
    {
      id: "pipeline",
      title: "Open deals",
      count: summary?.openDeals ?? 0,
      detail: formatCurrency(summary?.pipelineValue ?? 0),
      path: "/leads/pipeline",
      icon: Wallet,
    },
    {
      id: "target",
      title: "My target",
      count: targetPct,
      detail: `${formatCurrency(targetAchieved)} of ${formatCurrency(targetGoal)}`,
      path: "/deals",
      icon: Target,
    },
    {
      id: "leads",
      title: "My leads",
      count: summary?.totalLeads ?? 0,
      detail: "Own book only",
      path: "/leads",
      icon: UserRound,
    },
  ];
  const pendingTotal = pendingActions.reduce((s, a) => s + a.count, 0);

  const myTodoToday = useMemo(() => {
    return followUps
      .map((f) => {
        const label = followLabel(String(f.next_follow_up));
        return { f, label, overdue: label === "Overdue", today: label === "Today" };
      })
      .filter((x) => x.overdue || x.today)
      .slice(0, 8)
      .map(({ f, label, overdue: isOver }) => ({
        id: f.id,
        time: label,
        title: f.company,
        who: `${f.name} · ${formatCurrency(Number(f.value))}`,
        kind: "Follow-up",
        overdue: isOver,
      }));
  }, [followUps]);

  const stagesFilter = useMemo(() => {
    const rows = Array.from(new Set((data?.recentLeads ?? []).map((l) => l.status)));
    return ["all", ...rows];
  }, [data?.recentLeads]);

  const snapshotRows = useMemo(() => {
    const q = snapQuery.trim().toLowerCase();
    const rows = [...(data?.recentLeads ?? [])].filter((l) => {
      if (snapStage !== "all" && l.status !== snapStage) return false;
      if (!q) return true;
      return `${l.company} ${l.name}`.toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      const av =
        sortKey === "company"
          ? a.company
          : sortKey === "stage"
            ? a.status
            : sortKey === "value"
              ? String(a.value).padStart(12, "0")
              : String(a.next_follow_up || "");
      const bv =
        sortKey === "company"
          ? b.company
          : sortKey === "stage"
            ? b.status
            : sortKey === "value"
              ? String(b.value).padStart(12, "0")
              : String(b.next_follow_up || "");
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows.slice(0, 10);
  }, [data?.recentLeads, snapQuery, snapStage, sortDir, sortKey]);

  const upcoming = useMemo(() => {
    return followUps
      .slice()
      .sort((a, b) => String(a.next_follow_up).localeCompare(String(b.next_follow_up)))
      .slice(0, 6)
      .map((f) => ({
        id: f.id,
        label: "Follow-up",
        title: f.company,
        meta: `${f.name} · ${formatCurrency(Number(f.value))}`,
        when: followLabel(String(f.next_follow_up)),
      }));
  }, [followUps]);

  const kpis = [
    {
      label: "My Leads",
      value: summary?.totalLeads ?? 0,
      hint: `${summary?.openDeals ?? 0} open`,
      path: "/leads",
      icon: UserRound,
    },
    {
      label: "My Pipeline",
      value: formatCurrency(summary?.pipelineValue ?? 0),
      hint: `${followUps.length} follow-ups`,
      path: "/leads/pipeline",
      icon: Wallet,
    },
    {
      label: "Won",
      value: formatCurrency(summary?.wonValue ?? 0),
      hint: `${summary?.wonDeals ?? 0} deals · ${summary?.conversion ?? 0}%`,
      path: "/deals",
      icon: CheckCircle2,
    },
    {
      label: "My Target",
      value: `${targetPct}%`,
      hint: `${formatCurrency(targetAchieved)} / ${formatCurrency(targetGoal)}`,
      path: "/deals",
      icon: Target,
    },
  ];

  const detectLocation = () => {
    if (gpsBusy) return;
    setGpsBusy(true);
    const loc = officeCrmLocation();
    setGps(loc);
    store.recordCrmOpenLocation(loc);
    setGpsBusy(false);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <RequirePermission store={store} permission="sales">
      <div className="page rt-hr-overview">
        <header className="rt-hr-header">
          <div className="rt-hr-header-main">
            <div className="rt-hr-header-copy">
              <div className="rt-hr-kicker-row">
                <p className="rt-hr-kicker">RoyalTech Sales</p>
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
                    className="rt-hr-loc"
                    onClick={detectLocation}
                    disabled={gpsBusy}
                    title="Set Mohali HQ GPS for open tracking"
                  >
                    <MapPin size={12} strokeWidth={2.2} aria-hidden />
                    <span>{gpsBusy ? "Saving…" : "Location · Set GPS"}</span>
                  </button>
                )}
              </div>
              <h1>Sales Executive Overview</h1>
              <p className="rt-hr-sub">
                Personal leads, follow-ups, pipeline, and target for your book.
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
                  <span>
                    Sales Executive · Manager {manager?.name ?? "—"}
                  </span>
                </div>
              </div>
              <div className="rt-hr-meta-strip">
                <div>
                  <small>Today</small>
                  <strong>{longDate(now)}</strong>
                </div>
                <div>
                  <small>Local time</small>
                  <strong>{shortTime(now)}</strong>
                </div>
                <div>
                  <small>Needs action</small>
                  <strong>{pendingTotal} items</strong>
                </div>
              </div>
              <div className="rt-hr-quick">
                <Link to="/leads/new" className="rt-hr-quick-btn is-primary">
                  Add lead
                </Link>
                <Link to="/leads/followups" className="rt-hr-quick-btn">
                  Follow-ups
                </Link>
                <Link to="/leads/pipeline" className="rt-hr-quick-btn">
                  Pipeline
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="rt-hr-kpi-row" aria-label="Primary KPIs">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} to={kpi.path} className="rt-hr-kpi">
                <div className="rt-hr-kpi-top">
                  <span className="rt-hr-kpi-icon" aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                </div>
                <p className="rt-hr-kpi-value">{kpi.value}</p>
                <p className="rt-hr-kpi-label">{kpi.label}</p>
                <p className="rt-hr-kpi-hint">{kpi.hint}</p>
              </Link>
            );
          })}
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Sales Overview</h2>
                <p>Weekly win signal</p>
              </div>
              <Link to="/deals">My deals</Link>
            </header>
            <div className="rt-hr-att-stats">
              <div>
                <strong>{targetPct}%</strong>
                <span>Target</span>
              </div>
              <div>
                <strong>{summary?.openDeals ?? 0}</strong>
                <span>Open</span>
              </div>
              <div>
                <strong>{summary?.wonDeals ?? 0}</strong>
                <span>Won</span>
              </div>
              <div>
                <strong>{overdue}</strong>
                <span>Overdue</span>
              </div>
            </div>
            <div className="rt-hr-trend" aria-label="Weekly sales trend">
              {weekTrend.map((d) => (
                <div key={`${d.label}-${d.idx}`} className="rt-hr-trend-col">
                  <div className="rt-hr-trend-bar-wrap">
                    <div
                      className="rt-hr-trend-bar"
                      style={{ height: `${Math.max(d.pct, 8)}%` }}
                    />
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
                <h2>Lead Sources</h2>
                <p>Where your book comes from</p>
              </div>
              <Link to="/leads">All leads</Link>
            </header>
            <ul className="rt-hr-dept-list">
              {sourceRows.map((d) => (
                <li key={d.name}>
                  <div className="rt-hr-dept-meta">
                    <strong>{d.name}</strong>
                    <span>{d.count} leads</span>
                  </div>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i style={{ width: `${Math.max(d.pct, 4)}%` }} />
                  </div>
                </li>
              ))}
              {sourceRows.length === 0 ? (
                <li className="rt-hr-empty">No source mix yet.</li>
              ) : null}
            </ul>
          </article>
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>My Pipeline</h2>
                <p>Personal stage flow</p>
              </div>
              <Link to="/leads/pipeline">Open board</Link>
            </header>
            <div className="rt-hr-pipe-grid">
              {pipeline.map((step) => (
                <div key={step.label} className="rt-hr-pipe-step">
                  <strong>{step.value}</strong>
                  <span>{step.label}</span>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i
                      style={{
                        width: `${Math.round((step.value / pipelineMax) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rt-hr-panel rt-hr-panel-emphasis">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Pending Actions</h2>
                <p>Items that need attention today</p>
              </div>
              <span className="rt-hr-badge">{pendingTotal} open</span>
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
                      Open
                    </Link>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel rt-hr-panel-emphasis">
            <header className="rt-hr-panel-head">
              <div>
                <h2>My To-Do · Today</h2>
                <p>Follow-ups due today or overdue</p>
              </div>
              <Link to="/leads/followups">All follow-ups</Link>
            </header>
            <ul className="rt-hr-schedule rt-hr-todo-today">
              {myTodoToday.length === 0 ? (
                <li className="rt-hr-empty">Nothing due today — you&apos;re clear.</li>
              ) : (
                myTodoToday.map((item) => (
                  <li key={item.id} className={item.overdue ? "is-overdue" : ""}>
                    <time>{item.time}</time>
                    <div>
                      <strong>{item.title}</strong>
                      <span>
                        {item.kind} · {item.who}
                      </span>
                    </div>
                    <Link className="rt-hr-action-btn" to="/leads/followups">
                      Open
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Recent Activity</h2>
                <p>Your latest CRM actions</p>
              </div>
            </header>
            <ul className="rt-hr-activity">
              {(data?.recentActivities ?? []).slice(0, 8).map((item) => (
                <li key={item.id}>
                  <span className="rt-hr-activity-dot" aria-hidden>
                    <CheckCircle2 size={14} strokeWidth={2} />
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.lead_company}</span>
                  </div>
                  <time>{formatDate(String(item.activity_date))}</time>
                </li>
              ))}
              {(data?.recentActivities ?? []).length === 0 ? (
                <li className="rt-hr-empty">No recent activity.</li>
              ) : null}
            </ul>
          </article>
        </section>

        <section className="rt-hr-panel rt-hr-snapshot">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Lead Snapshot</h2>
              <p>Search and filter your own leads</p>
            </div>
            <Link to="/leads">View all</Link>
          </header>
          <div className="rt-hr-filters">
            <input
              className="rt-hr-input"
              value={snapQuery}
              onChange={(e) => setSnapQuery(e.target.value)}
              placeholder="Search company or contact…"
              aria-label="Search leads"
            />
            <select
              className="rt-hr-input"
              value={snapStage}
              onChange={(e) => setSnapStage(e.target.value)}
              aria-label="Filter stage"
            >
              {stagesFilter.map((s) => (
                <option key={s} value={s}>
                  {s === "all" ? "All stages" : leadStageLabels[s as keyof typeof leadStageLabels] ?? s}
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
                      ["company", "Company"],
                      ["stage", "Stage"],
                      ["value", "Value"],
                      ["follow", "Follow-up"],
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
                {snapshotRows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <strong>{l.company}</strong>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>
                        {l.name}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`rt-hr-status is-${String(l.status).toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td>{formatCurrency(Number(l.value))}</td>
                    <td>
                      {l.next_follow_up ? followLabel(String(l.next_follow_up)) : "—"}
                    </td>
                  </tr>
                ))}
                {snapshotRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="rt-hr-empty">
                      No leads match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rt-hr-panel">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Upcoming Follow-ups</h2>
              <p>Next calls on your desk</p>
            </div>
            <Link to="/leads/followups">Manage follow-ups</Link>
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
            {upcoming.length === 0 ? (
              <li className="rt-hr-empty">No upcoming follow-ups.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </RequirePermission>
  );
}
