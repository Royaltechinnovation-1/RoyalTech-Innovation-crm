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
    background: `conic-gradient(#118dff 0 ${targetPct}%, #d9dde3 ${targetPct}% 100%)`,
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
  const maxTeamMetric = Math.max(
    ...visibleTeam.map((t) => Math.max(t.openLeads + t.wonLeads, t.wonLeads)),
    1,
  );
  const teamPipeline = visibleTeam.reduce((s, t) => s + t.pipelineValue, 0);
  const teamWon = visibleTeam.reduce((s, t) => s + t.wonValue, 0);
  const gaugeStyle = {
    background: `conic-gradient(#118dff 0 ${targetPct}%, #d9dde3 ${targetPct}% 100%)`,
  };
  const filteredSources =
    sourceFilter === "all"
      ? sourceEntries
      : sourceEntries.filter(([source]) => source === sourceFilter);

  return (
    <RequirePermission store={store} permission="sales">
      <div className="page pbi-page">
        {canHandleTeam ? <TeamCrmBar store={store} /> : null}
        {error ? <ErrorBlock message={error} /> : null}
        {!error && !data ? <LoadingBlock /> : null}

        {data ? (
          <>
            <section className="pbi-titlebar">
              <div>
                <h2>Sales Manager Dashboard</h2>
                <p>
                  {greetingForNow()}, {firstName} · Team command · {employees.length} employees ·{" "}
                  {data.summary.totalLeads} team leads
                </p>
              </div>
              <div className="pbi-titlebar-right">
                <DbBadge mode={data.mode} />
                <Link className="btn btn-secondary btn-sm" to="/sales/employees">
                  Employees
                </Link>
                <Link className="btn btn-secondary btn-sm" to="/leads/new">
                  Add lead
                </Link>
                <Link className="btn btn-primary btn-sm" to="/sales/reports">
                  Export report
                </Link>
              </div>
            </section>

            {employees.length > 0 ? (
              <section className="mgr-emp-strip" aria-label="Your employees">
                {employees.map((emp) => (
                  <button
                    type="button"
                    className="mgr-emp-chip"
                    key={emp.id}
                    onClick={() => setTeamCrmFocus(emp.id)}
                  >
                    <span className="mgr-emp-av">
                      {emp.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>
                      <strong>{emp.name.split(" ")[0]}</strong>
                      <small>
                        {emp.openLeads} open · {formatCurrency(emp.pipelineValue)}
                      </small>
                    </span>
                  </button>
                ))}
                <Link className="mgr-emp-chip linkish" to="/sales/employees">
                  <span className="mgr-emp-av">+</span>
                  <span>
                    <strong>Manage</strong>
                    <small>All employees</small>
                  </span>
                </Link>
              </section>
            ) : null}

            <section className="pbi-slicers">
              <label>
                Period
                <select defaultValue="oct2026">
                  <option value="oct2026">Oct 1 – Oct 31, 2026</option>
                  <option value="q4">Q4 2026</option>
                  <option value="ytd">Year to date</option>
                </select>
              </label>
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

            <section className="pbi-kpi-row six">
              <article className="pbi-kpi">
                <p>Total Leads</p>
                <h3>{data.summary.totalLeads}</h3>
                <span className="delta up">Book size</span>
              </article>
              <article className="pbi-kpi">
                <p>Follow-ups Due</p>
                <h3>{visibleFollowUps.length || data.summary.followUps}</h3>
                <span className="delta warn">
                  Today {dueToday} · Overdue {overdue}
                </span>
              </article>
              <article className="pbi-kpi">
                <p>Active Pipeline</p>
                <h3>{formatCurrency(ownerFilter === "all" ? data.summary.pipelineValue : teamPipeline)}</h3>
                <span className="delta up">{data.summary.openDeals} open deals</span>
              </article>
              <article className="pbi-kpi">
                <p>Deals Won</p>
                <h3>{formatCurrency(ownerFilter === "all" ? data.summary.wonValue : teamWon)}</h3>
                <span className="delta up">{data.summary.wonDeals} closed-won</span>
              </article>
              <article className="pbi-kpi">
                <p>Conversion</p>
                <h3>{data.summary.conversion}%</h3>
                <span className="delta up">Won / total leads</span>
              </article>
              <article className="pbi-kpi">
                <p>Clients</p>
                <h3>{data.summary.clients}</h3>
                <span className="delta up">Active accounts</span>
              </article>
            </section>

            <section className="pbi-mid">
              <article className="pbi-card">
                <header>
                  <h3>Sales Funnel</h3>
                  <span>Count by stage</span>
                </header>
                <div className="pbi-funnel">
                  {funnelStages
                    .filter((status) => stageFilter === "all" || status === stageFilter)
                    .map((status) => {
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
                          <em>{width}%</em>
                        </div>
                      );
                    })}
                </div>
              </article>

              <article className="pbi-card">
                <header>
                  <h3>Team Performance</h3>
                  <span>Leads vs Won by employee</span>
                </header>
                <div className="pbi-legend">
                  <span><i className="swatch a" /> Leads</span>
                  <span><i className="swatch b" /> Won</span>
                </div>
                <div className="pbi-chart">
                  <div className="pbi-y-axis" aria-hidden="true">
                    <span>{maxTeamMetric}</span>
                    <span>{Math.round(maxTeamMetric / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="pbi-plot">
                    <div className="pbi-gridlines" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="pbi-bars">
                      {visibleTeam.slice(0, 6).map((row) => {
                        const leadsCount = row.openLeads + row.wonLeads;
                        return (
                          <div className="pbi-bar-group" key={row.id}>
                            <div className="pbi-bar-pair">
                              <div className="pbi-bar-col">
                                <em>{leadsCount}</em>
                                <span
                                  className="bar a"
                                  style={{
                                    height: `${Math.max(4, (leadsCount / maxTeamMetric) * 100)}%`,
                                  }}
                                  title={`${leadsCount} leads`}
                                />
                              </div>
                              <div className="pbi-bar-col">
                                <em>{row.wonLeads}</em>
                                <span
                                  className="bar b"
                                  style={{
                                    height: `${Math.max(2, (row.wonLeads / maxTeamMetric) * 100)}%`,
                                  }}
                                  title={`${row.wonLeads} won`}
                                />
                              </div>
                            </div>
                            <small>{row.name.split(" ")[0]}</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </article>

              <article className="pbi-card">
                <header>
                  <h3>Monthly Target</h3>
                  <span>{monthTarget?.period ?? "Current period"}</span>
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
            </section>

            <section className="pbi-bottom">
              <div className="pbi-bottom-main">
                <article className="pbi-card">
                  <header>
                    <h3>Follow-up Action Centre</h3>
                    <Link to="/leads/followups">Open queue</Link>
                  </header>
                  <div className="pbi-table-wrap">
                    <table className="pbi-table">
                      <thead>
                        <tr>
                          <th>Lead / Client</th>
                          <th>Owner</th>
                          <th>Due Date</th>
                          <th>Status</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFollowUps.length === 0 ? (
                          <tr>
                            <td colSpan={5}>No follow-ups due.</td>
                          </tr>
                        ) : (
                          visibleFollowUps.slice(0, 8).map((lead) => {
                            const status = followTone(String(lead.next_follow_up));
                            return (
                              <tr key={lead.id}>
                                <td>
                                  <strong>{lead.company}</strong>
                                  <span>{lead.name}</span>
                                </td>
                                <td>{lead.owner_name}</td>
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

                <article className="pbi-card">
                  <header>
                    <h3>Pipeline Snapshot</h3>
                    <Link to="/leads">All leads</Link>
                  </header>
                  <div className="pbi-table-wrap">
                    <table className="pbi-table compact">
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Stage</th>
                          <th>Owner</th>
                          <th>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleLeads.length === 0 ? (
                          <tr>
                            <td colSpan={4}>No leads in current filter.</td>
                          </tr>
                        ) : (
                          visibleLeads.slice(0, 7).map((lead) => (
                            <tr key={lead.id}>
                              <td>
                                <strong>{lead.company}</strong>
                                <span>{lead.name}</span>
                              </td>
                              <td>{lead.status}</td>
                              <td>{lead.owner_name}</td>
                              <td>{formatCurrency(Number(lead.value))}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </div>

              <div className="pbi-side-stack">
                <article className="pbi-card">
                  <header>
                    <h3>Lead Sources</h3>
                    <span>Share of book</span>
                  </header>
                  <div className="pbi-source-bars">
                    {filteredSources.map(([source, count], idx) => {
                      const pct = Math.round((count / sourceTotal) * 100);
                      return (
                        <div className="pbi-source-row" key={source}>
                          <span>{source}</span>
                          <div className="pbi-source-track">
                            <span className={`n${idx % 4}`} style={{ width: `${pct}%` }} />
                          </div>
                          <strong>
                            {count} · {pct}%
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </article>

                <article className="pbi-card">
                  <header>
                    <h3>Recent Activities</h3>
                    <span>Latest</span>
                  </header>
                  <table className="pbi-table compact">
                    <thead>
                      <tr>
                        <th>Activity</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentActivities.slice(0, 5).map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.title}</strong>
                            <span>
                              {item.owner_name} · {item.lead_company}
                            </span>
                          </td>
                          <td>{formatDate(String(item.activity_date))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pbi-actions">
                    <Link to="/leads/new">Add lead</Link>
                    <Link to="/proposals">Proposal</Link>
                    <Link to="/sales/reports">Reports</Link>
                    <Link to="/sales/sheets">Sheets</Link>
                  </div>
                </article>
              </div>
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
