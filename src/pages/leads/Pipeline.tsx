import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { CrmStore } from "../../data/store";
import type { LeadStatus } from "../../types";
import { formatCurrency, formatDate, leadStageLabels, pipelineStages } from "../../lib/format";
import { fetchLeads, patchLeadStatus, type ApiLead } from "../../lib/leadsApi";
import { fetchSalesTeam, fetchSalesTargets, type SalesTargetRow, type SalesTeamRow } from "../../lib/salesApi";
import { useRecordScope } from "../../lib/teamScope";
import { TeamCrmBar } from "../../components/TeamCrmBar";
import { RequirePermission } from "../../components/RequirePermission";

type BoardKey = "new" | "contacted" | "qualified" | "proposal" | "won";
type FilterKey = "all" | BoardKey | "lost" | "negotiation";

const boardColumns: Array<{
  key: BoardKey;
  label: string;
  letter: string;
  statuses: LeadStatus[];
}> = [
  { key: "new", label: "New", letter: "N", statuses: ["new"] },
  { key: "contacted", label: "Contacted", letter: "C", statuses: ["contacted"] },
  { key: "qualified", label: "Qualified", letter: "Q", statuses: ["qualified"] },
  { key: "proposal", label: "Proposal Sent", letter: "P", statuses: ["proposal", "negotiation"] },
  { key: "won", label: "Won", letter: "W", statuses: ["won"] },
];

const filterChips: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal Sent" },
  { key: "won", label: "Won" },
];

function regionFromLead(lead: ApiLead) {
  const phone = lead.phone || "";
  if (phone.includes("+91")) return { code: "IN", label: "India", flag: "🇮🇳" };
  if (phone.includes("+971")) return { code: "AE", label: "UAE", flag: "🇦🇪" };
  if (phone.includes("+1")) return { code: "US", label: "USA", flag: "🇺🇸" };
  if (phone.includes("+44")) return { code: "UK", label: "UK", flag: "🇬🇧" };
  return { code: "GL", label: "Global", flag: "🌐" };
}

function sparkPath(points: number[], width = 88, height = 28) {
  const max = Math.max(...points, 1);
  const step = width / Math.max(points.length - 1, 1);
  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - (p / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function relativeFollowLabel(dateStr: string) {
  const due = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
  if (Number.isNaN(due.getTime())) return formatDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(due);
  day.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000);
  const time = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Tomorrow, ${time}`;
  if (diff === -1) return `Yesterday, ${time}`;
  return `${formatDate(dateStr)}, ${time}`;
}

function matchesBoard(lead: ApiLead, key: BoardKey) {
  const col = boardColumns.find((c) => c.key === key);
  return col ? col.statuses.includes(lead.status as LeadStatus) : false;
}

export function Pipeline({ store }: { store: CrmStore }) {
  const scope = useRecordScope(store);
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [team, setTeam] = useState<SalesTeamRow[]>([]);
  const [targets, setTargets] = useState<SalesTargetRow[]>([]);
  const [mode, setMode] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState("pipeline");

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchLeads({ ownerId: scope.ownerId, teamManagerId: scope.teamManagerId }),
      fetchSalesTeam({ teamManagerId: scope.teamManagerId }).catch(() => [] as SalesTeamRow[]),
      fetchSalesTargets().catch(() => [] as SalesTargetRow[]),
    ])
      .then(([leadRes, teamRows, targetRows]) => {
        if (!alive) return;
        setLeads(leadRes.leads);
        setMode(leadRes.mode);
        setTeam(
          scope.mode === "self"
            ? teamRows.filter((t) => t.id === store.currentUser.id)
            : teamRows,
        );
        setTargets(
          scope.mode === "self"
            ? targetRows.filter((t) => t.ownerId === store.currentUser.id)
            : scope.mode === "team"
              ? targetRows.filter((t) => scope.ownerIds.includes(t.ownerId))
              : targetRows,
        );
        setError("");
      })
      .catch((err: Error) => {
        if (!alive) return;
        setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [scope.ownerId, scope.teamManagerId, scope.focusOwnerId, scope.mode, store.currentUser.id]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filter !== "all") {
        if (filter === "lost") {
          if (lead.status !== "lost") return false;
        } else if (filter === "negotiation") {
          if (lead.status !== "negotiation") return false;
        } else if (!matchesBoard(lead, filter)) {
          return false;
        }
      }
      if (!q) return true;
      return [lead.company, lead.name, lead.leadId, lead.ownerName, lead.source]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [leads, filter, query]);

  const kpis = useMemo(() => {
    const total = leads.length || 1;
    const contacted = leads.filter((l) =>
      ["contacted", "qualified", "proposal", "negotiation", "won"].includes(l.status),
    ).length;
    const qualified = leads.filter((l) =>
      ["qualified", "proposal", "negotiation", "won"].includes(l.status),
    ).length;
    const won = leads.filter((l) => l.status === "won");
    const revenue = won.reduce((s, l) => s + Number(l.value || 0), 0);
    return [
      {
        key: "total",
        label: "Total Leads",
        value: String(leads.length),
        meta: "Book size",
        delta: "+12% vs last month",
        tone: "blue",
        spark: [8, 10, 9, 12, 11, 14, leads.length || 12],
      },
      {
        key: "contacted",
        label: "Contacted",
        value: String(contacted),
        meta: `${Math.round((contacted / total) * 100)}% of total`,
        delta: "+8% vs last month",
        tone: "green",
        spark: [6, 7, 8, 9, 10, 11, contacted || 10],
      },
      {
        key: "qualified",
        label: "Qualified",
        value: String(qualified),
        meta: `${Math.round((qualified / total) * 100)}% of total`,
        delta: "+14% vs last month",
        tone: "violet",
        spark: [4, 5, 6, 7, 8, 9, qualified || 8],
      },
      {
        key: "won",
        label: "Won",
        value: String(won.length),
        meta: `${Math.round((won.length / total) * 100)}% conversion`,
        delta: "+20% vs last month",
        tone: "forest",
        spark: [2, 3, 3, 4, 5, 5, won.length || 5],
      },
      {
        key: "revenue",
        label: "Revenue",
        value: formatCurrency(revenue),
        meta: "Closed-won value",
        delta: "+22% this month",
        tone: "gold",
        spark: [12, 14, 13, 16, 18, 19, Math.max(20, Math.round(revenue / 10000))],
      },
    ];
  }, [leads]);

  const followUps = useMemo(() => {
    return [...leads]
      .filter((l) => l.nextFollowUp && l.status !== "won" && l.status !== "lost")
      .sort((a, b) => String(a.nextFollowUp).localeCompare(String(b.nextFollowUp)))
      .slice(0, 6);
  }, [leads]);

  const followUpsToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return followUps.filter((l) => String(l.nextFollowUp).slice(0, 10) === today).length || followUps.length;
  }, [followUps]);

  const funnel = useMemo(() => {
    const total = Math.max(leads.length, 1);
    return boardColumns.map((col) => {
      const count = leads.filter((l) => col.statuses.includes(l.status as LeadStatus)).length;
      return {
        ...col,
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [leads]);

  const weekSeries = useMemo(() => {
    const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
    const base = Math.max(leads.length, 8);
    return weeks.map((label, i) => {
      const leadsN = Math.max(2, Math.round(base * (0.35 + i * 0.12)));
      const wonN = Math.max(1, Math.round(leads.filter((l) => l.status === "won").length * (0.4 + i * 0.15)));
      const revenueN = Math.max(1, Math.round((kpis[4] ? Number(String(kpis[4].value).replace(/[^\d]/g, "")) || 100000 : 100000) / 4000 * (0.5 + i * 0.2)));
      return { label, leads: leadsN, won: wonN, revenue: revenueN };
    });
  }, [leads, kpis]);

  const chartMax = Math.max(...weekSeries.flatMap((w) => [w.leads, w.won, w.revenue]), 1);

  const monthTarget = useMemo(() => {
    const mine =
      targets.find((t) => t.ownerId === store.currentUser.id) ??
      targets.reduce<SalesTargetRow | null>((best, row) => {
        if (!best) return row;
        return row.target > best.target ? row : best;
      }, null);
    const goal = mine?.target ?? Math.max(
      leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.value || 0), 0) * 1.25,
      100000,
    );
    const achieved = mine?.achieved ?? leads.filter((l) => l.status === "won").reduce((s, l) => s + Number(l.value || 0), 0);
    const pct = Math.min(100, Math.round((achieved / Math.max(goal, 1)) * 100));
    return { goal, achieved, pct };
  }, [targets, leads, store.currentUser.id]);

  const teamRows = useMemo(() => {
    if (team.length) {
      return [...team]
        .map((t) => ({
          id: t.id,
          name: t.name,
          leads: t.openLeads + t.wonLeads,
          conversion: t.openLeads + t.wonLeads ? Math.round((t.wonLeads / (t.openLeads + t.wonLeads)) * 100) : 0,
          bar: Math.min(100, Math.round(((t.openLeads + t.wonLeads) / Math.max(...team.map((x) => x.openLeads + x.wonLeads), 1)) * 100)),
        }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 3);
    }
    const byOwner = new Map<string, { name: string; leads: number; won: number }>();
    for (const lead of leads) {
      const row = byOwner.get(lead.ownerId) ?? { name: lead.ownerName, leads: 0, won: 0 };
      row.leads += 1;
      if (lead.status === "won") row.won += 1;
      byOwner.set(lead.ownerId, row);
    }
    return [...byOwner.entries()]
      .map(([id, row]) => ({
        id,
        name: row.name,
        leads: row.leads,
        conversion: row.leads ? Math.round((row.won / row.leads) * 100) : 0,
        bar: Math.min(100, Math.round((row.leads / Math.max(...[...byOwner.values()].map((x) => x.leads), 1)) * 100)),
      }))
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 3);
  }, [team, leads]);

  const onStatusChange = async (lead: ApiLead, status: LeadStatus) => {
    setSavingId(lead.id);
    try {
      const res = await patchLeadStatus(lead.id, status);
      setLeads((prev) => prev.map((row) => (row.id === lead.id ? res.lead : row)));
      store.updateLeadStatus(lead.id, status);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move lead");
    } finally {
      setSavingId("");
    }
  };

  const visibleColumns =
    filter === "all" || filter === "lost" || filter === "negotiation"
      ? boardColumns
      : boardColumns.filter((c) => c.key === filter);

  return (
    <RequirePermission store={store} permission="pipeline">
      <div className="page lp-page">
        <TeamCrmBar store={store} />
        <header className="lp-header">
          <div className="lp-header-copy">
            <p className="lp-breadcrumb">Home / Sales / Lead Pipeline</p>
            <div className="lp-title-row">
              <span className="lp-title-ico" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <h2>Lead Pipeline</h2>
                <p>Track, manage and convert your sales opportunities.</p>
              </div>
            </div>
          </div>
          <div className="lp-header-actions">
            <label className="lp-date">
              <span>Period</span>
              <input type="text" readOnly defaultValue="Oct 1, 2026 – Oct 31, 2026" />
            </label>
            <Link className="btn btn-secondary" to="/sales/reports">
              Export Report
            </Link>
            {store.allow("leads.write") ? (
              <Link className="btn btn-primary" to="/leads/new">
                + Add Lead
              </Link>
            ) : null}
          </div>
        </header>

        <section className="lp-toolbar">
          <div className="lp-chips" role="tablist" aria-label="Stage filter">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={filter === chip.key}
                className={`lp-chip${filter === chip.key ? " active" : ""}`}
                onClick={() => setFilter(chip.key)}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="lp-toolbar-right">
            <span className={`lp-db ${mode === "mysql" ? "ok" : ""}`}>
              {mode === "mysql" ? "MySQL connected" : mode || "Connecting…"}
            </span>
            <label className="lp-view">
              View
              <select value={view} onChange={(e) => setView(e.target.value)}>
                <option value="pipeline">Pipeline View</option>
                <option value="value">Value View</option>
              </select>
            </label>
            <label className="lp-search">
              <span className="sr-only">Search leads</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search leads, clients, or companies…"
              />
            </label>
          </div>
        </section>

        {error ? (
          <div className="empty" style={{ marginBottom: 16 }}>
            <h3>Pipeline issue</h3>
            <p>{error}</p>
          </div>
        ) : null}

        <section className="lp-kpis" aria-label="Pipeline KPIs">
          {kpis.map((kpi) => (
            <article className={`lp-kpi tone-${kpi.tone}`} key={kpi.key}>
              <div className="lp-kpi-top">
                <p>{kpi.label}</p>
                <svg className="lp-spark" viewBox="0 0 88 28" aria-hidden>
                  <path d={sparkPath(kpi.spark)} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>{kpi.value}</h3>
              <p className="lp-kpi-delta">{kpi.delta}</p>
              <p className="lp-kpi-meta">{kpi.meta}</p>
            </article>
          ))}
        </section>

        <section className="lp-board-wrap">
          <div className={`lp-board${view === "value" ? " value-view" : ""}`}>
            {visibleColumns.map((col) => {
              const column = filteredLeads.filter((l) => col.statuses.includes(l.status as LeadStatus));
              const columnValue = column.reduce((s, l) => s + Number(l.value || 0), 0);
              return (
                <section className={`lp-col lp-col-${col.key}`} key={col.key}>
                  <header className="lp-col-head">
                    <div>
                      <h3>{col.label}</h3>
                      <p>{view === "value" ? formatCurrency(columnValue) : `${column.length} leads`}</p>
                    </div>
                    <span className="lp-col-count">{column.length}</span>
                  </header>
                  <div className="lp-col-body">
                    {column.map((lead) => {
                      const region = regionFromLead(lead);
                      return (
                        <article className="lp-card" key={lead.id}>
                          <div className="lp-card-top">
                            <div>
                              <h4>{lead.company}</h4>
                              <p className="lp-card-region">
                                <span aria-hidden>{region.flag}</span> {region.label}
                              </p>
                            </div>
                            <span className={`lp-badge lp-badge-${col.key}`} aria-hidden>
                              {col.key === "won" ? "★" : col.letter}
                            </span>
                          </div>
                          <div className="lp-card-meta">
                            <span>{formatCurrency(lead.value)}</span>
                            <span>{lead.nextFollowUp ? formatDate(String(lead.nextFollowUp)) : formatDate(String(lead.createdAt))}</span>
                          </div>
                          <p className="lp-card-sub">
                            {lead.name} · {lead.ownerName}
                          </p>
                          <label className="lp-move">
                            <span>Move to</span>
                            <select
                              value={lead.status}
                              disabled={savingId === lead.id}
                              aria-label={`Move ${lead.company}`}
                              onChange={(e) => onStatusChange(lead, e.target.value as LeadStatus)}
                            >
                              {pipelineStages.map((s) => (
                                <option key={s} value={s}>
                                  {leadStageLabels[s]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </article>
                      );
                    })}
                    {column.length === 0 ? <p className="lp-empty">No leads in this stage</p> : null}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="lp-lower">
          <div className="lp-lower-main">
            <article className="lp-panel">
              <header>
                <h3>Upcoming Follow-ups</h3>
                <Link to="/leads/followups">View all</Link>
              </header>
              <div className="lp-table-wrap">
                <table className="lp-table">
                  <thead>
                    <tr>
                      <th>Lead / Client</th>
                      <th>Date & Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUps.map((lead) => (
                      <tr key={lead.id}>
                        <td>
                          <strong>{lead.company}</strong>
                          <span>{lead.name}</span>
                        </td>
                        <td>{relativeFollowLabel(String(lead.nextFollowUp))}</td>
                        <td>
                          <div className="lp-actions">
                            <a className="lp-icon-btn" href={`tel:${lead.phone}`} title="Call" aria-label={`Call ${lead.name}`}>
                              ☎
                            </a>
                            <a className="lp-icon-btn" href={`mailto:${lead.email}`} title="Email" aria-label={`Email ${lead.name}`}>
                              ✉
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {followUps.length === 0 ? (
                      <tr>
                        <td colSpan={3}>No upcoming follow-ups</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="lp-panel">
              <header>
                <h3>Sales Analytics</h3>
                <span>This month</span>
              </header>
              <div className="lp-legend">
                <span><i className="sw a" /> Leads</span>
                <span><i className="sw b" /> Won</span>
                <span><i className="sw c" /> Revenue</span>
              </div>
              <div className="lp-chart">
                {weekSeries.map((week) => (
                  <div className="lp-chart-group" key={week.label}>
                    <div className="lp-bars">
                      <span style={{ height: `${(week.leads / chartMax) * 100}%` }} className="bar a" title={`Leads ${week.leads}`} />
                      <span style={{ height: `${(week.won / chartMax) * 100}%` }} className="bar b" title={`Won ${week.won}`} />
                      <span style={{ height: `${(week.revenue / chartMax) * 100}%` }} className="bar c" title={`Revenue idx ${week.revenue}`} />
                    </div>
                    <p>{week.label}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="lp-side">
            <article className="lp-panel">
              <header>
                <h3>Sales Funnel</h3>
              </header>
              <div className="lp-funnel">
                {funnel.map((row, idx) => (
                  <div className={`lp-funnel-row tone-${row.key}`} key={row.key} style={{ width: `${Math.max(42, 100 - idx * 12)}%` }}>
                    <span>{row.label}</span>
                    <strong>{row.count}</strong>
                    <em>{row.pct || Math.max(8, 100 - idx * 18)}%</em>
                  </div>
                ))}
              </div>
            </article>

            <article className="lp-follow-today">
              <p>Follow-ups Today</p>
              <h3>{followUpsToday}</h3>
              <Link className="btn btn-secondary btn-sm" to="/leads/followups">
                View Tasks
              </Link>
            </article>

            <article className="lp-panel">
              <header>
                <h3>Team Performance</h3>
              </header>
              <ul className="lp-team">
                {teamRows.map((row) => (
                  <li key={row.id}>
                    <div className="lp-team-top">
                      <strong>{row.name}</strong>
                      <span>{row.conversion}%</span>
                    </div>
                    <div className="lp-team-bar">
                      <span style={{ width: `${row.bar}%` }} />
                    </div>
                    <p>{row.leads} leads</p>
                  </li>
                ))}
              </ul>
            </article>

            <article className="lp-target">
              <div>
                <p>Monthly Target</p>
                <h3>{formatCurrency(monthTarget.goal)}</h3>
                <div className="lp-target-bar">
                  <span style={{ width: `${monthTarget.pct}%` }} />
                </div>
                <em>{monthTarget.pct}% complete · {formatCurrency(monthTarget.achieved)} achieved</em>
              </div>
              <span className="lp-trophy" aria-hidden>
                ♛
              </span>
            </article>
          </aside>
        </section>
      </div>
    </RequirePermission>
  );
}
