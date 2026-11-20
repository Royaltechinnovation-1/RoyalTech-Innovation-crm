import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  MapPin,
  Target,
  Users,
  Wallet,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate, leadStageLabels } from "../../lib/format";
import {
  fetchSalesDashboard,
  fetchSalesTargets,
  fetchSalesTeam,
  type SalesDashboardData,
  type SalesTargetRow,
  type SalesTeamRow,
} from "../../lib/salesApi";
import { RequirePermission } from "../../components/RequirePermission";
import { officeCrmLocation, type CrmOpenLocation } from "../../lib/locationTrack";
import { useRecordScope } from "../../lib/teamScope";

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

type SortKey = "company" | "owner" | "stage" | "value" | "follow";

function buildLocalSales(store: CrmStore): {
  data: SalesDashboardData;
  team: SalesTeamRow[];
  targets: SalesTargetRow[];
} {
  const me = store.currentUser.id;
  const teamUsers = store.data.users.filter(
    (u) =>
      u.role === "sales_executive" &&
      (u.managerId === me || store.role === "founder"),
  );
  const teamIds = new Set([me, ...teamUsers.map((u) => u.id)]);
  const leads = store.visibleLeads.filter((l) => teamIds.has(l.ownerId) || store.role === "founder");
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
      owner_name: store.data.users.find((u) => u.id === l.ownerId)?.name || "—",
      value: l.value,
    }));

  const targets = store.data.salesTargets
    .filter((t) => teamIds.has(t.ownerId))
    .map((t) => ({
      id: t.id,
      ownerId: t.ownerId,
      ownerName: store.data.users.find((u) => u.id === t.ownerId)?.name || "—",
      period: t.period,
      target: t.target,
      achieved: t.achieved,
      percent: t.target ? Math.round((t.achieved / t.target) * 100) : 0,
    }));

  const team: SalesTeamRow[] = teamUsers.map((u) => {
    const mine = leads.filter((l) => l.ownerId === u.id);
    const t = targets.find((x) => x.ownerId === u.id);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      managerId: u.managerId,
      openLeads: mine.filter((l) => l.status !== "won" && l.status !== "lost").length,
      wonLeads: mine.filter((l) => l.status === "won").length,
      pipelineValue: mine
        .filter((l) => l.status !== "won" && l.status !== "lost")
        .reduce((s, l) => s + l.value, 0),
      wonValue: mine.filter((l) => l.status === "won").reduce((s, l) => s + l.value, 0),
      target: t?.target ?? 0,
      achieved: t?.achieved ?? 0,
      period: t?.period ?? "Q4 2026",
    };
  });

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
        clients: store.data.clients.length,
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
        owner_name: store.data.users.find((u) => u.id === l.ownerId)?.name || "—",
        next_follow_up: l.nextFollowUp,
      })),
      followUps,
      recentActivities: store.data.activityLogs.slice(0, 8).map((a) => ({
        id: a.id,
        title: a.action,
        activity_type: a.entity,
        activity_date: a.createdAt.slice(0, 10),
        owner_name: store.data.users.find((u) => u.id === a.actorId)?.name || "—",
        lead_company: a.entity,
      })),
    },
    team,
    targets,
  };
}

export function SalesManagerOverview({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const scope = useRecordScope(store);
  const salesScope =
    store.role === "sales_manager" || store.role === "founder"
      ? { ownerId: scope.ownerId, teamManagerId: scope.teamManagerId }
      : { ownerId: undefined as string | undefined, teamManagerId: undefined as string | undefined };

  const local = useMemo(() => buildLocalSales(store), [store]);
  const [data, setData] = useState<SalesDashboardData | null>(local.data);
  const [targets, setTargets] = useState<SalesTargetRow[]>(local.targets);
  const [team, setTeam] = useState<SalesTeamRow[]>(local.team);
  const [gps, setGps] = useState<CrmOpenLocation | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [snapQuery, setSnapQuery] = useState("");
  const [snapOwner, setSnapOwner] = useState("all");
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
      fetchSalesDashboard(salesScope),
      fetchSalesTargets().catch(() => [] as SalesTargetRow[]),
      fetchSalesTeam({
        teamManagerId:
          store.role === "sales_manager" ? store.currentUser.id : salesScope.teamManagerId,
      }).catch(() => [] as SalesTeamRow[]),
    ])
      .then(([dash, targetRows, teamRows]) => {
        if (!alive) return;
        setData(dash);
        const filteredTargets =
          store.role === "sales_manager"
            ? targetRows.filter((t) => teamRows.some((m) => m.id === t.ownerId) || t.ownerId === me.id)
            : targetRows;
        setTargets(filteredTargets.length ? filteredTargets : local.targets);
        setTeam(teamRows.length ? teamRows : local.team);
      })
      .catch(() => {
        if (!alive) return;
        setData(local.data);
        setTargets(local.targets);
        setTeam(local.team);
      });
    return () => {
      alive = false;
    };
  }, [local, me.id, salesScope.ownerId, salesScope.teamManagerId, store.currentUser.id, store.role]);

  const employees = team.filter((t) => t.role === "sales_executive");
  const summary = data?.summary;
  const followUps = data?.followUps ?? [];
  const overdue = followUps.filter((f) => followLabel(String(f.next_follow_up)) === "Overdue").length;
  const dueToday = followUps.filter((f) => followLabel(String(f.next_follow_up)) === "Today").length;

  const monthTarget =
    targets.find((t) => t.ownerId === me.id) ??
    targets.reduce<SalesTargetRow | null>((best, row) => {
      if (!best) return row;
      return row.target > best.target ? row : best;
    }, null);
  const targetGoal = monthTarget?.target ?? Math.max(summary?.wonValue ?? 0, 1) * 1.25;
  const targetAchieved = monthTarget?.achieved ?? summary?.wonValue ?? 0;
  const targetPct = Math.min(100, Math.round((targetAchieved / Math.max(targetGoal, 1)) * 100));

  const weekTrend = useMemo(() => {
    const base = Math.max(summary?.wonDeals ?? 1, 1);
    return WEEK_DAYS.map((label, idx) => {
      const value = Math.max(1, Math.round(base * (0.5 + ((idx * 13) % 35) / 100)));
      return { label, idx, value, pct: Math.min(100, Math.round((value / (base + 2)) * 100)) };
    });
  }, [summary?.wonDeals]);

  const teamRows = useMemo(() => {
    const max = Math.max(...employees.map((e) => e.pipelineValue || 0), 1);
    return employees.slice(0, 6).map((e) => ({
      name: e.name,
      count: e.openLeads,
      pct: Math.round((e.pipelineValue / max) * 100),
      meta: `${formatCurrency(e.pipelineValue)} pipeline`,
    }));
  }, [employees]);

  const pipeline = FUNNEL.map((status) => ({
    label: leadStageLabels[status] ?? status,
    value: data?.byStatus?.[status] ?? 0,
  }));
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  const pendingActions = [
    {
      id: "followups",
      title: "Follow-ups due",
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
      title: "Target progress",
      count: targetPct,
      detail: `${formatCurrency(targetAchieved)} of ${formatCurrency(targetGoal)}`,
      path: "/sales/targets",
      icon: Target,
    },
    {
      id: "team",
      title: "Team reps",
      count: employees.length,
      detail: "Review employee performance",
      path: "/sales/team",
      icon: Users,
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
        who: `${f.owner_name} · ${formatCurrency(Number(f.value))}`,
        kind: f.name,
        overdue: isOver,
      }));
  }, [followUps]);

  const ownersFilter = useMemo(() => {
    const names = Array.from(
      new Set((data?.recentLeads ?? []).map((l) => l.owner_name).filter(Boolean)),
    );
    return ["all", ...names];
  }, [data?.recentLeads]);

  const stagesFilter = useMemo(() => {
    const rows = Array.from(new Set((data?.recentLeads ?? []).map((l) => l.status)));
    return ["all", ...rows];
  }, [data?.recentLeads]);

  const snapshotRows = useMemo(() => {
    const q = snapQuery.trim().toLowerCase();
    const rows = [...(data?.recentLeads ?? [])].filter((l) => {
      if (snapOwner !== "all" && l.owner_name !== snapOwner) return false;
      if (snapStage !== "all" && l.status !== snapStage) return false;
      if (!q) return true;
      return `${l.company} ${l.name} ${l.owner_name}`.toLowerCase().includes(q);
    });
    rows.sort((a, b) => {
      const av =
        sortKey === "company"
          ? a.company
          : sortKey === "owner"
            ? a.owner_name
            : sortKey === "stage"
              ? a.status
              : sortKey === "value"
                ? String(a.value).padStart(12, "0")
                : String(a.next_follow_up || "");
      const bv =
        sortKey === "company"
          ? b.company
          : sortKey === "owner"
            ? b.owner_name
            : sortKey === "stage"
              ? b.status
              : sortKey === "value"
                ? String(b.value).padStart(12, "0")
                : String(b.next_follow_up || "");
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows.slice(0, 10);
  }, [data?.recentLeads, snapOwner, snapQuery, snapStage, sortDir, sortKey]);

  const upcoming = useMemo(() => {
    return followUps
      .slice()
      .sort((a, b) => String(a.next_follow_up).localeCompare(String(b.next_follow_up)))
      .slice(0, 6)
      .map((f) => ({
        id: f.id,
        label: "Follow-up",
        title: f.company,
        meta: `${f.owner_name} · ${formatCurrency(Number(f.value))}`,
        when: followLabel(String(f.next_follow_up)),
      }));
  }, [followUps]);

  const kpis = [
    {
      label: "Team Size",
      value: employees.length || team.length,
      hint: `${summary?.followUps ?? 0} follow-ups queued`,
      path: "/sales/employees",
      icon: Users,
    },
    {
      label: "Pipeline",
      value: formatCurrency(summary?.pipelineValue ?? 0),
      hint: `${summary?.openDeals ?? 0} open deals`,
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
      label: "Target",
      value: `${targetPct}%`,
      hint: `${formatCurrency(targetAchieved)} / ${formatCurrency(targetGoal)}`,
      path: "/sales/targets",
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
              <h1>Sales Manager Overview</h1>
              <p className="rt-hr-sub">
                Team pipeline, follow-ups, targets, and sales actions for today.
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
                  <span>Sales Manager · {me.email}</span>
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
                <Link to="/sales/team" className="rt-hr-quick-btn">
                  Team
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
              <Link to="/sales/reports">Open reports</Link>
            </header>
            <div className="rt-hr-att-stats">
              <div>
                <strong>{summary?.conversion ?? 0}%</strong>
                <span>Conversion</span>
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
                <h2>Team Overview</h2>
                <p>Rep-wise open pipeline</p>
              </div>
              <Link to="/sales/employees">Directory</Link>
            </header>
            <ul className="rt-hr-dept-list">
              {teamRows.map((d) => (
                <li key={d.name}>
                  <div className="rt-hr-dept-meta">
                    <strong>{d.name}</strong>
                    <span>
                      {d.count} open · {d.meta}
                    </span>
                  </div>
                  <div className="rt-hr-dept-track" aria-hidden>
                    <i style={{ width: `${Math.max(d.pct, 4)}%` }} />
                  </div>
                </li>
              ))}
              {teamRows.length === 0 ? (
                <li className="rt-hr-empty">No sales executives assigned yet.</li>
              ) : null}
            </ul>
          </article>
        </section>

        <section className="rt-hr-row-2">
          <article className="rt-hr-panel">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Sales Pipeline</h2>
                <p>Lead stage flow</p>
              </div>
              <Link to="/leads/pipeline">Pipeline</Link>
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
                <h2>Pending Sales Actions</h2>
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
                      Review
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
                <h2>Recent Sales Activity</h2>
                <p>Latest team CRM actions</p>
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
                    <span>
                      {item.owner_name} · {item.lead_company}
                    </span>
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
              <p>Search, filter, and review live leads</p>
            </div>
            <Link to="/leads">View all</Link>
          </header>
          <div className="rt-hr-filters">
            <input
              className="rt-hr-input"
              value={snapQuery}
              onChange={(e) => setSnapQuery(e.target.value)}
              placeholder="Search company, contact, owner…"
              aria-label="Search leads"
            />
            <select
              className="rt-hr-input"
              value={snapOwner}
              onChange={(e) => setSnapOwner(e.target.value)}
              aria-label="Filter owner"
            >
              {ownersFilter.map((p) => (
                <option key={p} value={p}>
                  {p === "all" ? "All owners" : p}
                </option>
              ))}
            </select>
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
                      ["owner", "Owner"],
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
                    <td>{l.owner_name}</td>
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
                    <td colSpan={5} className="rt-hr-empty">
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
              <p>Next calls and deal checkpoints</p>
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
