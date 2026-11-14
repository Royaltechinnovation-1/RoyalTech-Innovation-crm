import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate, leadStageLabels } from "../../lib/format";
import {
  fetchSalesDashboard,
  fetchSalesReports,
  fetchSalesTargets,
  fetchSalesTeam,
  type SalesDashboardData,
  type SalesReportsData,
  type SalesTargetRow,
  type SalesTeamRow,
} from "../../lib/salesApi";
import { setTeamCrmFocus } from "../../lib/teamCrmFocus";
import { useRecordScope } from "../../lib/teamScope";
import { TeamCrmBar } from "../../components/TeamCrmBar";
import { PageHeader, Panel, Tag, Widget } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

function useSalesScope(store: CrmStore) {
  const scope = useRecordScope(store);
  if (store.role === "sales_executive") {
    return { ownerId: store.currentUser.id as string | undefined, teamManagerId: undefined as string | undefined };
  }
  if (store.role === "sales_manager" || store.role === "founder") {
    return {
      ownerId: scope.ownerId,
      teamManagerId: scope.teamManagerId,
    };
  }
  return { ownerId: undefined as string | undefined, teamManagerId: undefined as string | undefined };
}

function DbBadge({ mode }: { mode?: string }) {
  if (!mode) return null;
  return (
    <Tag tone={mode === "mysql" ? "sage" : "gold"}>
      {mode === "mysql" ? "MySQL connected" : "Local DB fallback"}
    </Tag>
  );
}

function LoadingBlock() {
  return <div className="empty"><h3>Loading sales data…</h3><p>Fetching from the sales database.</p></div>;
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="empty">
      <h3>Sales API offline</h3>
      <p>{message}</p>
      <p className="muted">Run <code>npm run server</code> then refresh.</p>
    </div>
  );
}

function followTone(dateStr: string): { label: string; tone: "danger" | "mist" | "sage" | "gold" } {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDay = new Date(due);
  dueDay.setHours(0, 0, 0, 0);
  const diff = (dueDay.getTime() - today.getTime()) / 86400000;
  if (diff < 0) return { label: "Overdue", tone: "danger" };
  if (diff === 0) return { label: "Pending", tone: "mist" };
  if (diff <= 2) return { label: "Upcoming", tone: "sage" };
  return { label: "Upcoming", tone: "gold" };
}

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function SalesDashboard({ store }: { store: CrmStore }) {
  if (store.role === "sales_executive") {
    return <SalesExecutiveDashboard store={store} />;
  }
  return <SalesManagerDashboard store={store} />;
}

/** Personal desk — own leads, follow-ups, target only. */
function SalesExecutiveDashboard({ store }: { store: CrmStore }) {
  const salesScope = useSalesScope(store);
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [targets, setTargets] = useState<SalesTargetRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchSalesDashboard({ ownerId: store.currentUser.id }),
      fetchSalesTargets().catch(() => [] as SalesTargetRow[]),
    ])
      .then(([dash, targetRows]) => {
        if (!alive) return;
        setData(dash);
        setTargets(targetRows.filter((t) => t.ownerId === store.currentUser.id));
        setError("");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [salesScope.ownerId, store.currentUser.id]);

  const firstName = store.currentUser.name.split(" ")[0];
  const myTarget = targets[0];
  const targetGoal = myTarget?.target ?? Math.max(data?.summary.wonValue ?? 0, 1) * 1.25;
  const targetAchieved = myTarget?.achieved ?? data?.summary.wonValue ?? 0;
  const targetPct = Math.min(100, Math.round((targetAchieved / targetGoal) * 100));
  const followUps = data?.followUps ?? [];
  const overdue = followUps.filter((f) => followTone(String(f.next_follow_up)).label === "Overdue").length;
  const dueToday = followUps.filter((f) => followTone(String(f.next_follow_up)).label === "Pending").length;
  const funnelStages = ["new", "contacted", "qualified", "proposal", "negotiation", "won"] as const;
  const gaugeStyle = {
    background: `conic-gradient(#6f8a68 0 ${targetPct}%, #e4e7e2 ${targetPct}% 100%)`,
  };

  return (
    <RequirePermission store={store} permission="sales">
      <div className="page sx-desk">
        {error ? <ErrorBlock message={error} /> : null}
        {!error && !data ? <LoadingBlock /> : null}
        {data ? (
          <>
            <section className="sx-hero">
              <div>
                <p className="sx-kicker">Sales Executive desk</p>
                <h2>
                  {greetingForNow()}, {firstName}
                </h2>
                <p>Your personal CRM — only leads, follow-ups, and clients assigned to you.</p>
              </div>
              <div className="sx-hero-actions">
                <DbBadge mode={data.mode} />
                <Link className="btn btn-secondary" to="/leads/followups">
                  My follow-ups
                </Link>
                <Link className="btn btn-primary" to="/leads/new">
                  Add lead
                </Link>
              </div>
            </section>

            <section className="sx-kpi-row">
              <article className="sx-kpi">
                <p>My leads</p>
                <h3>{data.summary.totalLeads}</h3>
                <span>{data.summary.openDeals} open</span>
              </article>
              <article className="sx-kpi">
                <p>Follow-ups</p>
                <h3>{followUps.length}</h3>
                <span>
                  Today {dueToday} · Overdue {overdue}
                </span>
              </article>
              <article className="sx-kpi">
                <p>My pipeline</p>
                <h3>{formatCurrency(data.summary.pipelineValue)}</h3>
                <span>Active deals</span>
              </article>
              <article className="sx-kpi">
                <p>Won</p>
                <h3>{formatCurrency(data.summary.wonValue)}</h3>
                <span>
                  {data.summary.wonDeals} deals · {data.summary.conversion}%
                </span>
              </article>
            </section>

            <section className="sx-grid">
              <article className="sx-card">
                <header>
                  <h3>My target</h3>
                  <span>{myTarget?.period ?? "Current period"}</span>
                </header>
                <div className="pbi-target">
                  <div className="pbi-ring" style={gaugeStyle} aria-hidden="true">
                    <div>
                      <strong>{targetPct}%</strong>
                      <small>achieved</small>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Target</dt>
                      <dd>{formatCurrency(targetGoal)}</dd>
                    </div>
                    <div>
                      <dt>Achieved</dt>
                      <dd>{formatCurrency(targetAchieved)}</dd>
                    </div>
                    <div>
                      <dt>Remaining</dt>
                      <dd>{formatCurrency(Math.max(targetGoal - targetAchieved, 0))}</dd>
                    </div>
                  </dl>
                </div>
              </article>

              <article className="sx-card">
                <header>
                  <h3>My funnel</h3>
                  <span>Stage mix</span>
                </header>
                <div className="pbi-funnel">
                  {funnelStages.map((status) => {
                    const count = data.byStatus[status] ?? 0;
                    const width = Math.max(
                      8,
                      Math.round((count / Math.max(data.summary.totalLeads, 1)) * 100),
                    );
                    return (
                      <div className="pbi-funnel-row" key={status}>
                        <span className="pbi-funnel-label">
                          {leadStageLabels[status as keyof typeof leadStageLabels] ?? status}
                        </span>
                        <div className="pbi-funnel-track">
                          <span className={`fill tone-${status}`} style={{ width: `${width}%` }} />
                        </div>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="sx-card sx-shortcuts">
                <header>
                  <h3>Quick actions</h3>
                  <span>Your desk</span>
                </header>
                <div className="sx-shortcut-grid">
                  <Link to="/leads">My leads</Link>
                  <Link to="/leads/pipeline">My pipeline</Link>
                  <Link to="/leads/followups">Follow-ups</Link>
                  <Link to="/clients">My clients</Link>
                  <Link to="/proposals">Proposals</Link>
                  <Link to="/leads/new">Add lead</Link>
                </div>
              </article>
            </section>

            <section className="sx-bottom">
              <article className="sx-card">
                <header>
                  <h3>My follow-up queue</h3>
                  <Link to="/leads/followups">Open all</Link>
                </header>
                <div className="pbi-table-wrap">
                  <table className="pbi-table">
                    <thead>
                      <tr>
                        <th>Lead</th>
                        <th>Due</th>
                        <th>Status</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {followUps.length === 0 ? (
                        <tr>
                          <td colSpan={4}>No follow-ups due.</td>
                        </tr>
                      ) : (
                        followUps.slice(0, 8).map((lead) => {
                          const status = followTone(String(lead.next_follow_up));
                          return (
                            <tr key={lead.id}>
                              <td>
                                <strong>{lead.company}</strong>
                                <span>{lead.name}</span>
                              </td>
                              <td>{formatDate(String(lead.next_follow_up))}</td>
                              <td>
                                <Tag tone={status.tone}>{status.label}</Tag>
                              </td>
                              <td>{formatCurrency(Number(lead.value))}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="sx-card">
                <header>
                  <h3>My open pipeline</h3>
                  <Link to="/leads">All my leads</Link>
                </header>
                <div className="pbi-table-wrap">
                  <table className="pbi-table compact">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Stage</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.recentLeads ?? []).slice(0, 8).map((lead) => (
                        <tr key={lead.id}>
                          <td>
                            <strong>{lead.company}</strong>
                            <span>{lead.name}</span>
                          </td>
                          <td>{lead.status}</td>
                          <td>{formatCurrency(Number(lead.value))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}

/** Team command center — employees, team KPIs, CRM focus. */
function SalesManagerDashboard({ store }: { store: CrmStore }) {
  const salesScope = useSalesScope(store);
  const canHandleTeam = store.role === "sales_manager" || store.role === "founder";
  const [data, setData] = useState<SalesDashboardData | null>(null);
  const [targets, setTargets] = useState<SalesTargetRow[]>([]);
  const [team, setTeam] = useState<SalesTeamRow[]>([]);
  const [error, setError] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

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
        setTargets(
          store.role === "sales_manager"
            ? targetRows.filter((t) => teamRows.some((m) => m.id === t.ownerId))
            : targetRows,
        );
        setTeam(teamRows);
        setError("");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [salesScope.ownerId, salesScope.teamManagerId, store.currentUser.id, store.role]);

  const firstName = store.currentUser.name.split(" ")[0];
  const employees = team.filter((t) => t.role === "sales_executive");
  const monthTarget =
    targets.find((t) => t.ownerId === (ownerFilter !== "all" ? ownerFilter : store.currentUser.id)) ??
    targets.reduce<SalesTargetRow | null>((best, row) => {
      if (!best) return row;
      return row.target > best.target ? row : best;
    }, null);
  const targetGoal = monthTarget?.target ?? Math.max(data?.summary.wonValue ?? 0, 1) * 1.25;
  const targetAchieved = monthTarget?.achieved ?? data?.summary.wonValue ?? 0;
  const targetPct = Math.min(100, Math.round((targetAchieved / targetGoal) * 100));
  const funnelStages = ["new", "contacted", "qualified", "proposal", "negotiation", "won"] as const;
  const sourceEntries = data ? Object.entries(data.bySource) : [];
  const sourceTotal = sourceEntries.reduce((s, [, n]) => s + n, 0) || 1;
  const visibleTeam =
    ownerFilter === "all" ? team : team.filter((row) => row.id === ownerFilter);
  const visibleFollowUps = (data?.followUps ?? []).filter((lead) => {
    if (ownerFilter !== "all" && lead.owner_name !== team.find((t) => t.id === ownerFilter)?.name) {
      return false;
    }
    if (stageFilter !== "all") return true;
    if (sourceFilter !== "all") return true;
    return true;
  });
  const visibleLeads = (data?.recentLeads ?? []).filter((lead) => {
    if (ownerFilter !== "all" && lead.owner_name !== team.find((t) => t.id === ownerFilter)?.name) {
      return false;
    }
    if (stageFilter !== "all" && lead.status !== stageFilter) return false;
    return true;
  });
  const overdue = visibleFollowUps.filter(
    (f) => followTone(String(f.next_follow_up)).label === "Overdue",
  ).length;
  const dueToday = visibleFollowUps.filter(
    (f) => followTone(String(f.next_follow_up)).label === "Pending",
  ).length;
  const teamPipeline = visibleTeam.reduce((s, t) => s + t.pipelineValue, 0);
  const teamWon = visibleTeam.reduce((s, t) => s + t.wonValue, 0);
  const gaugeStyle = {
    background: `conic-gradient(#6f8a68 0 ${targetPct}%, #e4e7e2 ${targetPct}% 100%)`,
  };
  const filteredSources =
    sourceFilter === "all"
      ? sourceEntries
      : sourceEntries.filter(([source]) => source === sourceFilter);

  const openCount = data?.summary.openDeals ?? 0;
  const wonCount = data?.summary.wonDeals ?? 0;
  const lostLike = Math.max((data?.summary.totalLeads ?? 0) - openCount - wonCount, 0);
  const attendanceTotal = Math.max(openCount + wonCount + overdue + dueToday, 1);
  const presentPct = Math.round((wonCount / attendanceTotal) * 100);
  const calDays = Array.from({ length: 35 }, (_, i) => i - 2);
  const highlightDays = new Set([3, 7, 12, 18, 22, 28]);
  const topPerformer = [...visibleTeam].sort((a, b) => b.wonValue - a.wonValue)[0];
  const starLead = visibleLeads[0];
  const leaveItems = store.data.leaveRequests.filter((l) => l.status === "pending").slice(0, 4);
  const notices = store.data.notifications
    .filter((n) => n.audienceRoles.includes(store.role))
    .slice(0, 4);
  const todos = [
    { label: "Call overdue follow-ups", status: overdue > 0 ? "Inprogress" : "Completed", tone: overdue > 0 ? "warn" : "ok" },
    { label: "Review team pipeline", status: "Inprogress", tone: "warn" },
    { label: "Send weekly sales report", status: "Yet to Start", tone: "muted" },
    { label: "Update Google Sheets sync", status: "Completed", tone: "ok" },
  ] as const;

  return (
    <RequirePermission store={store} permission="sales">
      <div className="page ps-dash">
        {canHandleTeam ? <TeamCrmBar store={store} /> : null}
        {error ? <ErrorBlock message={error} /> : null}
        {!error && !data ? <LoadingBlock /> : null}

        {data ? (
          <>
            <section className="ps-welcome">
              <div>
                <p className="ps-welcome-kicker">{greetingForNow()}</p>
                <h2>
                  Welcome Back, {firstName}
                </h2>
                <p>
                  Team command · {employees.length} employees · {data.summary.totalLeads} leads
                </p>
                <div className="ps-welcome-actions">
                  <DbBadge mode={data.mode} />
                  <Link className="btn btn-secondary btn-sm" to="/sales/employees">
                    Employees
                  </Link>
                  <Link className="btn btn-primary btn-sm" to="/leads/new">
                    Add lead
                  </Link>
                </div>
              </div>
              <div className="ps-welcome-art" aria-hidden />
            </section>

            <section className="ps-filters">
              <label>
                Employee
                <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
                  <option value="all">Whole team</option>
                  {team.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stage
                <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                  <option value="all">All stages</option>
                  {funnelStages.map((status) => (
                    <option key={status} value={status}>
                      {leadStageLabels[status as keyof typeof leadStageLabels] ?? status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Source
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option value="all">All sources</option>
                  {sourceEntries.map(([source]) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <section className="ps-kpi-row">
              <article className="ps-kpi tone-red">
                <div className="ps-kpi-top">
                  <span className="ps-kpi-icon">L</span>
                  <span className="ps-kpi-delta">+1.2%</span>
                </div>
                <p>Total Leads</p>
                <h3>{data.summary.totalLeads}</h3>
                <footer>
                  <span>Active {openCount + wonCount}</span>
                  <span>Closed {lostLike}</span>
                </footer>
              </article>
              <article className="ps-kpi tone-blue">
                <div className="ps-kpi-top">
                  <span className="ps-kpi-icon">C</span>
                  <span className="ps-kpi-delta">+1.2%</span>
                </div>
                <p>Clients</p>
                <h3>{data.summary.clients}</h3>
                <footer>
                  <span>Active {data.summary.clients}</span>
                  <span>Pipeline {data.summary.openDeals}</span>
                </footer>
              </article>
              <article className="ps-kpi tone-amber">
                <div className="ps-kpi-top">
                  <span className="ps-kpi-icon">T</span>
                  <span className="ps-kpi-delta">+1.2%</span>
                </div>
                <p>Team Staff</p>
                <h3>{employees.length || team.length}</h3>
                <footer>
                  <span>Active {employees.length || team.length}</span>
                  <span>Follow-ups {visibleFollowUps.length}</span>
                </footer>
              </article>
              <article className="ps-kpi tone-green">
                <div className="ps-kpi-top">
                  <span className="ps-kpi-icon">W</span>
                  <span className="ps-kpi-delta">+{data.summary.conversion}%</span>
                </div>
                <p>Deals Won</p>
                <h3>{wonCount}</h3>
                <footer>
                  <span>{formatCurrency(ownerFilter === "all" ? data.summary.wonValue : teamWon)}</span>
                  <span>Conv {data.summary.conversion}%</span>
                </footer>
              </article>
            </section>

            <section className="ps-grid-a">
              <article className="ps-card">
                <header>
                  <h3>Revenue Collection</h3>
                  <span>Pipeline vs Won</span>
                </header>
                <div className="ps-legend">
                  <span><i className="sw a" /> Pipeline</span>
                  <span><i className="sw b" /> Won</span>
                </div>
                <div className="ps-bars">
                  {visibleTeam.slice(0, 6).map((row) => (
                    <div className="ps-bar-col" key={row.id}>
                      <div className="ps-bar-pair">
                        <span
                          className="bar a"
                          style={{
                            height: `${Math.max(8, (row.pipelineValue / Math.max(teamPipeline, 1)) * 100)}%`,
                          }}
                        />
                        <span
                          className="bar b"
                          style={{
                            height: `${Math.max(6, (row.wonValue / Math.max(teamWon || 1, 1)) * 100)}%`,
                          }}
                        />
                      </div>
                      <small>{row.name.split(" ")[0]}</small>
                    </div>
                  ))}
                  {visibleTeam.length === 0 ? (
                    <p className="muted">No team metrics yet.</p>
                  ) : null}
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Leave Requests</h3>
                  <Link to="/hr/leave">View All</Link>
                </header>
                <div className="ps-leave-list">
                  {leaveItems.length > 0
                    ? leaveItems.map((leave) => {
                        const emp = store.data.employees.find((e) => e.id === leave.employeeId);
                        return (
                          <div className="ps-leave-row" key={leave.id}>
                            <span className="ps-av">
                              {(emp?.name || "?")
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <div>
                              <strong>{emp?.name || "Team member"}</strong>
                              <small>
                                {leave.type} · {formatDate(leave.from)}
                              </small>
                            </div>
                            <div className="ps-leave-actions">
                              <button type="button" className="ps-chip ok">
                                Approve
                              </button>
                              <button type="button" className="ps-chip bad">
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })
                    : visibleFollowUps.slice(0, 4).map((lead) => (
                        <div className="ps-leave-row" key={lead.id}>
                          <span className="ps-av">
                            {String(lead.owner_name || lead.name || "?")
                              .split(" ")
                              .map((p) => p[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <div>
                            <strong>{lead.company}</strong>
                            <small>
                              {lead.owner_name} · {followTone(String(lead.next_follow_up)).label}
                            </small>
                          </div>
                          <div className="ps-leave-actions">
                            <Link className="ps-chip ok" to="/leads/followups">
                              Open
                            </Link>
                          </div>
                        </div>
                      ))}
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Schedules</h3>
                  <span>
                    {new Date().toLocaleString("en", { month: "long", year: "numeric" })}
                  </span>
                </header>
                <div className="ps-cal">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <span className="ps-cal-head" key={d}>
                      {d}
                    </span>
                  ))}
                  {calDays.map((d, idx) => {
                    const day = ((d + 30) % 30) + 1;
                    return (
                      <span
                        key={idx}
                        className={`ps-cal-day${highlightDays.has(day) ? " is-hot" : ""}${day === new Date().getDate() ? " is-today" : ""}`}
                      >
                        {day}
                      </span>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="ps-grid-b">
              <article className="ps-card">
                <header>
                  <h3>Win Rate</h3>
                  <span>Pipeline health</span>
                </header>
                <div className="ps-donut-wrap">
                  <div
                    className="ps-donut"
                    style={{
                      background: `conic-gradient(#16543f 0 ${presentPct}%, #6f8a68 ${presentPct}% ${presentPct + Math.round((openCount / attendanceTotal) * 100)}%, #d4b55d 0 ${presentPct + Math.round(((openCount + overdue) / attendanceTotal) * 100)}%, #b45a4a 0)`,
                    }}
                    aria-hidden
                  >
                    <div>
                      <strong>{presentPct}%</strong>
                      <small>won</small>
                    </div>
                  </div>
                  <ul className="ps-donut-legend">
                    <li><i className="c-green" /> Won {wonCount}</li>
                    <li><i className="c-blue" /> Open {openCount}</li>
                    <li><i className="c-amber" /> Due today {dueToday}</li>
                    <li><i className="c-red" /> Overdue {overdue}</li>
                  </ul>
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Quick Links</h3>
                </header>
                <div className="ps-quick">
                  <Link to="/leads" className="tone-blue">Leads</Link>
                  <Link to="/leads/followups" className="tone-amber">Follow-ups</Link>
                  <Link to="/clients" className="tone-green">Clients</Link>
                  <Link to="/proposals" className="tone-purple">Proposals</Link>
                  <Link to="/sales/reports" className="tone-red">Reports</Link>
                  <Link to="/sales/sheets" className="tone-teal">Sheets</Link>
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Upcoming Follow-ups</h3>
                  <Link to="/leads/followups">View All</Link>
                </header>
                <div className="ps-events">
                  {visibleFollowUps.slice(0, 3).map((lead, i) => (
                    <div className={`ps-event tone-${["blue", "amber", "green"][i % 3]}`} key={lead.id}>
                      <strong>{lead.company}</strong>
                      <small>
                        {formatDate(String(lead.next_follow_up))} · {lead.owner_name}
                      </small>
                      <span className="ps-event-av">
                        {String(lead.owner_name || "?")
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                    </div>
                  ))}
                  {visibleFollowUps.length === 0 ? (
                    <p className="muted">No upcoming follow-ups.</p>
                  ) : null}
                </div>
              </article>
            </section>

            <section className="ps-grid-c">
              <article className="ps-card ps-feature">
                <header>
                  <h3>Best Performer</h3>
                </header>
                {topPerformer ? (
                  <div className="ps-feature-body">
                    <span className="ps-feature-av">
                      {topPerformer.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <strong>{topPerformer.name}</strong>
                    <small>
                      {topPerformer.wonLeads} won · {formatCurrency(topPerformer.wonValue)}
                    </small>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setTeamCrmFocus(topPerformer.id)}
                    >
                      View desk
                    </button>
                  </div>
                ) : (
                  <p className="muted">No performer data.</p>
                )}
              </article>

              <article className="ps-card ps-feature">
                <header>
                  <h3>Star Lead</h3>
                </header>
                {starLead ? (
                  <div className="ps-feature-body">
                    <span className="ps-feature-av alt">
                      {starLead.company
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <strong>{starLead.company}</strong>
                    <small>
                      {starLead.status} · {formatCurrency(Number(starLead.value))}
                    </small>
                    <Link className="btn btn-secondary btn-sm" to="/leads">
                      Open pipeline
                    </Link>
                  </div>
                ) : (
                  <p className="muted">No leads in filter.</p>
                )}
              </article>

              <article className="ps-card">
                <header>
                  <h3>Monthly Target</h3>
                  <span>{monthTarget?.period ?? "Current"}</span>
                </header>
                <div className="ps-target">
                  <div className="ps-donut sm" style={gaugeStyle} aria-hidden>
                    <div>
                      <strong>{targetPct}%</strong>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Target</dt>
                      <dd>{formatCurrency(targetGoal)}</dd>
                    </div>
                    <div>
                      <dt>Achieved</dt>
                      <dd>{formatCurrency(targetAchieved)}</dd>
                    </div>
                    <div>
                      <dt>Left</dt>
                      <dd>{formatCurrency(Math.max(targetGoal - targetAchieved, 0))}</dd>
                    </div>
                  </dl>
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Lead Sources</h3>
                </header>
                <div className="ps-sources">
                  {filteredSources.slice(0, 5).map(([source, count], idx) => {
                    const pct = Math.round((count / sourceTotal) * 100);
                    return (
                      <div className="ps-source-row" key={source}>
                        <span>{source}</span>
                        <div className="track">
                          <i className={`n${idx % 5}`} style={{ width: `${pct}%` }} />
                        </div>
                        <strong>{pct}%</strong>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="ps-grid-d">
              <article className="ps-card">
                <header>
                  <h3>Notice Board</h3>
                  <Link to="/notifications">View All</Link>
                </header>
                <div className="ps-notices">
                  {notices.map((note) => (
                    <div className="ps-notice" key={note.id}>
                      <div>
                        <strong>{note.title}</strong>
                        <small>{note.body}</small>
                      </div>
                      <span className={`ps-tag ${note.read ? "muted" : "ok"}`}>
                        {note.read ? "Read" : "New"}
                      </span>
                    </div>
                  ))}
                  {notices.length === 0 ? <p className="muted">No notices.</p> : null}
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Recent Activity</h3>
                </header>
                <div className="ps-activity">
                  {data.recentActivities.slice(0, 5).map((item) => (
                    <div className="ps-activity-row" key={item.id}>
                      <span className="ps-av sm">
                        {String(item.owner_name || "?")
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>
                          {item.owner_name} · {item.lead_company}
                        </small>
                      </div>
                      <em>{formatDate(String(item.activity_date))}</em>
                    </div>
                  ))}
                </div>
              </article>

              <article className="ps-card">
                <header>
                  <h3>Todo List</h3>
                </header>
                <div className="ps-todos">
                  {todos.map((todo) => (
                    <label className="ps-todo" key={todo.label}>
                      <input type="checkbox" defaultChecked={todo.status === "Completed"} />
                      <span>{todo.label}</span>
                      <em className={`ps-tag ${todo.tone}`}>{todo.status}</em>
                    </label>
                  ))}
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}

export function SalesTeam({ store }: { store: CrmStore }) {
  const salesScope = useSalesScope(store);
  const [rows, setRows] = useState<SalesTeamRow[]>([]);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("");

  useEffect(() => {
    Promise.all([
      fetchSalesTeam({ teamManagerId: salesScope.teamManagerId }),
      fetchSalesDashboard(salesScope).catch(() => null),
    ])
      .then(([team, dash]) => {
        setRows(team);
        setMode(dash?.mode ?? "");
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [salesScope.ownerId, salesScope.teamManagerId]);

  return (
    <RequirePermission store={store} permission="sales.team">
      <div className="page">
        <PageHeader
          eyebrow="Sales management"
          title="Sales Team Performance"
          lede={
            store.role === "sales_manager"
              ? "Your employees under this sales manager — pipeline, wins, and targets."
              : "Rep-level pipeline, wins, and target attainment from the database."
          }
          actions={<DbBadge mode={mode} />}
        />
        {error ? <ErrorBlock message={error} /> : null}
        {!error && rows.length === 0 ? <LoadingBlock /> : null}
        {rows.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Rep</th>
                  <th>Reports to</th>
                  <th>Open leads</th>
                  <th>Won</th>
                  <th>Pipeline</th>
                  <th>Won value</th>
                  <th>Target progress</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const pct = row.target ? Math.round((row.achieved / row.target) * 100) : 0;
                  const managerName =
                    row.role === "sales_manager"
                      ? "—"
                      : rows.find((r) => r.id === row.managerId)?.name ||
                        store.data.users.find((u) => u.id === row.managerId)?.name ||
                        "Sales Manager";
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.name}</strong>
                        <div className="muted">{row.role.replaceAll("_", " ")}</div>
                      </td>
                      <td>{managerName}</td>
                      <td>{row.openLeads}</td>
                      <td>{row.wonLeads}</td>
                      <td>{formatCurrency(row.pipelineValue)}</td>
                      <td>{formatCurrency(row.wonValue)}</td>
                      <td>
                        <div className="progress inline">
                          <span style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        {pct}% · {row.period}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </RequirePermission>
  );
}

export function SalesEmployees({ store }: { store: CrmStore }) {
  const managerId =
    store.role === "sales_manager" ? store.currentUser.id : undefined;
  const [rows, setRows] = useState<SalesTeamRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSalesTeam({ teamManagerId: managerId })
      .then((team) => {
        setRows(team);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, [managerId]);

  const managers =
    store.role === "sales_manager"
      ? [
          {
            id: store.currentUser.id,
            name: store.currentUser.name,
            role: "sales_manager" as const,
            managerId: null,
            openLeads: rows.find((r) => r.id === store.currentUser.id)?.openLeads ?? 0,
            wonLeads: rows.find((r) => r.id === store.currentUser.id)?.wonLeads ?? 0,
            pipelineValue:
              rows.find((r) => r.id === store.currentUser.id)?.pipelineValue ?? 0,
            wonValue: rows.find((r) => r.id === store.currentUser.id)?.wonValue ?? 0,
            target: rows.find((r) => r.id === store.currentUser.id)?.target ?? 0,
            achieved: rows.find((r) => r.id === store.currentUser.id)?.achieved ?? 0,
            period: rows.find((r) => r.id === store.currentUser.id)?.period ?? "—",
          },
        ]
      : rows.filter((r) => r.role === "sales_manager");

  const employeesFromApi = rows.filter((r) => r.role === "sales_executive");
  const employeesFromStore = store.data.users
    .filter((u) => {
      if (u.role !== "sales_executive") return false;
      if (store.role === "sales_manager") return u.managerId === store.currentUser.id;
      return true;
    })
    .map((u) => {
      const hit = employeesFromApi.find((r) => r.id === u.id);
      return (
        hit ?? {
          id: u.id,
          name: u.name,
          role: u.role,
          managerId: u.managerId ?? null,
          openLeads: 0,
          wonLeads: 0,
          pipelineValue: 0,
          wonValue: 0,
          target: 0,
          achieved: 0,
          period: "—",
        }
      );
    });

  const employees =
    employeesFromStore.length >= employeesFromApi.length
      ? employeesFromStore
      : employeesFromApi;

  return (
    <RequirePermission store={store} permission="sales.team">
      <div className="page se-page">
        <PageHeader
          eyebrow="Sales management"
          title="Employees of Sales Manager"
          lede={
            store.role === "sales_manager"
              ? `Your team under ${store.currentUser.name}. Open any employee CRM and manage their book.`
              : "Sales managers and the executives reporting to them."
          }
        />
        <TeamCrmBar store={store} />
        {error ? <ErrorBlock message={error} /> : null}

        <section className="se-tree" aria-label="Sales manager employees">
          {(managers.length
            ? managers
            : [
                {
                  id: store.currentUser.id,
                  name: store.currentUser.name,
                  role: "sales_manager",
                } as SalesTeamRow,
              ]
          ).map((manager) => {
            const underManager = employees.filter(
              (e) => e.managerId === manager.id || (!e.managerId && store.role === "sales_manager"),
            );
            return (
              <article className="se-branch" key={manager.id}>
                <header className="se-manager">
                  <span className="se-avatar">
                    {manager.name
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <div>
                    <h3>{manager.name}</h3>
                    <p>Sales Manager · {underManager.length} employees</p>
                  </div>
                  <Tag tone="sage">{underManager.length} employees</Tag>
                </header>
                <ul className="se-emps">
                  {underManager.map((emp) => {
                    const user = store.data.users.find((u) => u.id === emp.id);
                    return (
                      <li key={emp.id}>
                        <span className="se-avatar sm">
                          {emp.name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{emp.name}</strong>
                          <p>
                            Sales Executive
                            {user?.email ? ` · ${user.email}` : ""} · under {manager.name}
                          </p>
                        </div>
                        <div className="se-emp-meta">
                          <span>{emp.openLeads} open</span>
                          <span>{emp.wonLeads} won</span>
                          <span>{formatCurrency(emp.pipelineValue)}</span>
                        </div>
                        <div className="se-emp-actions">
                          <Link
                            className="btn btn-primary btn-sm"
                            to="/leads"
                            onClick={() => setTeamCrmFocus(emp.id)}
                          >
                            Open CRM
                          </Link>
                          <Link
                            className="btn btn-secondary btn-sm"
                            to="/leads/pipeline"
                            onClick={() => setTeamCrmFocus(emp.id)}
                          >
                            Pipeline
                          </Link>
                          <Link
                            className="btn btn-secondary btn-sm"
                            to="/leads/followups"
                            onClick={() => setTeamCrmFocus(emp.id)}
                          >
                            Follow-ups
                          </Link>
                          <Link
                            className="btn btn-secondary btn-sm"
                            to="/clients"
                            onClick={() => setTeamCrmFocus(emp.id)}
                          >
                            Clients
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                  {underManager.length === 0 ? (
                    <li className="se-empty">
                      No employees assigned under this sales manager yet.
                    </li>
                  ) : null}
                </ul>
              </article>
            );
          })}
        </section>
      </div>
    </RequirePermission>
  );
}

export function SalesTargets({ store }: { store: CrmStore }) {
  const [rows, setRows] = useState<SalesTargetRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSalesTargets()
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <RequirePermission store={store} permission="sales.targets">
      <div className="page">
        <PageHeader
          eyebrow="Sales management"
          title="Sales Targets"
          lede="Quarterly targets tracked in the sales database."
        />
        {error ? <ErrorBlock message={error} /> : null}
        <div className="stat-row">
          {rows.map((target) => (
            <Panel key={target.id} title={target.ownerName}>
              <p className="stat-value">{target.percent}%</p>
              <p className="stat-meta">
                {formatCurrency(target.achieved)} of {formatCurrency(target.target)} · {target.period}
              </p>
              <div className="progress">
                <span style={{ width: `${Math.min(target.percent, 100)}%` }} />
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </RequirePermission>
  );
}

export function SalesReports({ store }: { store: CrmStore }) {
  const [data, setData] = useState<SalesReportsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSalesReports()
      .then((rows) => {
        setData(rows);
        setError("");
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <RequirePermission store={store} permission="sales.reports">
      <div className="page">
        <PageHeader
          eyebrow="Sales management"
          title="Revenue & Conversion Reports"
          lede="Closed revenue and source mix from MySQL / sales database."
        />
        {error ? <ErrorBlock message={error} /> : null}
        {data ? (
          <>
            <section className="stat-row">
              <Widget label="Won deals" value={data.won} meta="Closed-won" accent="sage" />
              <Widget label="Lost deals" value={data.lost} meta="Closed-lost" accent="gold" />
              <Widget label="Won revenue" value={formatCurrency(data.wonValue)} meta="Booked value" accent="forest" />
            </section>
            <div className="split">
              <Panel title="By source">
                <div className="list">
                  {data.bySource.map((row) => (
                    <div className="list-row" key={row.source}>
                      <p className="list-title">{row.source}</p>
                      <strong>{row.count}</strong>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Revenue by owner" dark>
                <div className="list">
                  {data.revenueByOwner.map((row) => (
                    <div className="list-row" key={row.owner}>
                      <p className="list-title">{row.owner}</p>
                      <strong>{formatCurrency(row.revenue)}</strong>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        ) : null}
      </div>
    </RequirePermission>
  );
}
