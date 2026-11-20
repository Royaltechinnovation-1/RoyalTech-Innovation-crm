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
import { SalesManagerOverview } from "./SalesManagerOverview";
import { SalesExecutiveOverview } from "./SalesExecutiveOverview";

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
    return <SalesExecutiveOverview store={store} />;
  }
  return <SalesManagerDashboard store={store} />;
}

/** Team command center — same overview style as Manager / HR. */
function SalesManagerDashboard({ store }: { store: CrmStore }) {
  return <SalesManagerOverview store={store} />;
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
