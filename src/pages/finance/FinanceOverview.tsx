import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  FileWarning,
  Wallet,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

export function FinanceOverview({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const received = store.data.payments
    .filter((p) => p.status === "received")
    .reduce((s, p) => s + p.amount, 0);
  const pending = store.data.payments
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount, 0);
  const expenses = store.data.expenses.reduce((s, e) => s + e.amount, 0);
  const overdueInvoices = store.data.invoices.filter((i) => i.status === "overdue");
  const openInvoices = store.data.invoices.filter((i) =>
    ["sent", "overdue", "draft"].includes(i.status),
  );

  const kpis = [
    {
      label: "Received",
      value: formatCurrency(received),
      hint: "Cleared payments",
      path: "/finance/revenue",
      icon: Wallet,
    },
    {
      label: "Pending",
      value: formatCurrency(pending),
      hint: `${store.data.payments.filter((p) => p.status === "pending").length} payments`,
      path: "/finance/pending",
      icon: ClipboardList,
    },
    {
      label: "Expenses",
      value: formatCurrency(expenses),
      hint: `${store.data.expenses.length} entries`,
      path: "/finance/expenses",
      icon: FileWarning,
    },
    {
      label: "Invoices",
      value: store.data.invoices.length,
      hint: `${overdueInvoices.length} overdue`,
      path: "/finance/invoices",
      icon: CheckCircle2,
    },
  ];

  const recentPayments = useMemo(
    () =>
      [...store.data.payments]
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 8),
    [store.data.payments],
  );

  return (
    <RequirePermission store={store} permission="finance">
      <div className="page rt-hr-overview">
        <header className="rt-hr-header">
          <div className="rt-hr-header-main">
            <div className="rt-hr-header-copy">
              <p className="rt-hr-kicker">RoyalTech Finance</p>
              <h1>Finance Overview</h1>
              <p className="rt-hr-sub">
                Revenue, expenses, invoices, and pending collections for{" "}
                {me.name.split(" ")[0]}.
              </p>
            </div>
            <div className="rt-hr-header-aside">
              <div className="rt-hr-quick">
                <Link to="/finance/invoices" className="rt-hr-quick-btn is-primary">
                  Invoices
                </Link>
                <Link to="/finance/pending" className="rt-hr-quick-btn">
                  Pending
                </Link>
                <Link to="/finance/reports" className="rt-hr-quick-btn">
                  Reports
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="rt-hr-kpi-row" aria-label="Finance KPIs">
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
                <h2>Recent payments</h2>
                <p>Latest money movement</p>
              </div>
              <Link to="/finance/payments">All payments</Link>
            </header>
            <ul className="rt-hr-activity">
              {recentPayments.map((p) => {
                const client = store.data.clients.find((c) => c.id === p.clientId);
                return (
                  <li key={p.id}>
                    <span className="rt-hr-activity-dot" aria-hidden>
                      <Wallet size={14} strokeWidth={2} />
                    </span>
                    <div>
                      <strong>{client?.company || "Client"}</strong>
                      <span>
                        {p.status} · {formatDate(p.date)}
                      </span>
                    </div>
                    <time>{formatCurrency(p.amount)}</time>
                  </li>
                );
              })}
              {recentPayments.length === 0 ? (
                <li className="rt-hr-empty">No payments yet.</li>
              ) : null}
            </ul>
          </article>

          <article className="rt-hr-panel rt-hr-panel-emphasis">
            <header className="rt-hr-panel-head">
              <div>
                <h2>Open invoices</h2>
                <p>Need collection follow-up</p>
              </div>
              <span className="rt-hr-badge">{openInvoices.length}</span>
            </header>
            <ul className="rt-hr-actions">
              {openInvoices.slice(0, 6).map((inv) => {
                const client = store.data.clients.find((c) => c.id === inv.clientId);
                return (
                  <li key={inv.id}>
                    <div className="rt-hr-action-ico" aria-hidden>
                      <FileWarning size={16} strokeWidth={2} />
                    </div>
                    <div className="rt-hr-action-body">
                      <div className="rt-hr-action-top">
                        <strong>{inv.number}</strong>
                        <em>{inv.status}</em>
                      </div>
                      <span>
                        {client?.company || "Client"} · {formatCurrency(inv.amount)}
                      </span>
                    </div>
                    <Link className="rt-hr-action-btn" to="/finance/invoices">
                      Open
                    </Link>
                  </li>
                );
              })}
              {openInvoices.length === 0 ? (
                <li className="rt-hr-empty">No open invoices.</li>
              ) : null}
            </ul>
          </article>
        </section>
      </div>
    </RequirePermission>
  );
}
