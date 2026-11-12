import type { CrmStore } from "../../data/store";
import { formatCurrency, formatDate } from "../../lib/format";
import { PageHeader, Tag, Widget } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";

export function Revenue({ store }: { store: CrmStore }) {
  const received = store.data.payments
    .filter((p) => p.status === "received")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <RequirePermission store={store} permission="finance.revenue">
      <div className="page">
        <PageHeader eyebrow="Finance & accounts" title="Revenue" lede="Founder and finance confidential overview." />
        <section className="stat-row">
          <Widget label="Received" value={formatCurrency(received)} meta="Cleared payments" />
          <Widget
            label="Won pipeline"
            value={formatCurrency(store.data.leads.filter((l) => l.status === "won").reduce((s, l) => s + l.value, 0))}
            meta="From sales"
            accent="gold"
          />
        </section>
      </div>
    </RequirePermission>
  );
}

export function Expenses({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="finance.expenses">
      <div className="page">
        <PageHeader eyebrow="Finance & accounts" title="Expenses" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {store.data.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.category}</td>
                  <td>{formatCurrency(expense.amount)}</td>
                  <td>{formatDate(expense.date)}</td>
                  <td>{expense.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function Payments({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="finance.payments">
      <div className="page">
        <PageHeader eyebrow="Finance & accounts" title="Client Payments" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {store.data.payments.map((payment) => {
                const client = store.data.clients.find((c) => c.id === payment.clientId);
                const invoice = store.data.invoices.find((i) => i.id === payment.invoiceId);
                return (
                  <tr key={payment.id}>
                    <td>{client?.company}</td>
                    <td>{invoice?.number ?? "—"}</td>
                    <td>{formatCurrency(payment.amount)}</td>
                    <td>{formatDate(payment.date)}</td>
                    <td>
                      <Tag tone={payment.status === "received" ? "sage" : "gold"}>
                        {payment.status}
                      </Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function PendingPayments({ store }: { store: CrmStore }) {
  const pending = store.data.payments.filter((p) => p.status === "pending");
  return (
    <RequirePermission store={store} permission="finance.payments">
      <div className="page">
        <PageHeader eyebrow="Finance & accounts" title="Pending Payments" />
        <div className="task-list">
          {pending.map((payment) => {
            const client = store.data.clients.find((c) => c.id === payment.clientId);
            return (
              <article className="task-row" key={payment.id}>
                <div>
                  <p className="list-title">{client?.company}</p>
                  <p className="list-sub">Due {formatDate(payment.date)}</p>
                </div>
                <strong>{formatCurrency(payment.amount)}</strong>
              </article>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}

export function Invoices({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="finance.invoices">
      <div className="page">
        <PageHeader eyebrow="Finance & accounts" title="Invoices" />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {store.data.invoices.map((invoice) => {
                const client = store.data.clients.find((c) => c.id === invoice.clientId);
                return (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.number}</strong>
                    </td>
                    <td>{client?.company}</td>
                    <td>{formatCurrency(invoice.amount)}</td>
                    <td>
                      <Tag
                        tone={
                          invoice.status === "paid"
                            ? "sage"
                            : invoice.status === "overdue"
                              ? "danger"
                              : "gold"
                        }
                      >
                        {invoice.status}
                      </Tag>
                    </td>
                    <td>{formatDate(invoice.dueDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function FinancialReports({ store }: { store: CrmStore }) {
  const revenue = store.data.payments
    .filter((p) => p.status === "received")
    .reduce((s, p) => s + p.amount, 0);
  const expenses = store.data.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <RequirePermission store={store} permission="finance.reports">
      <div className="page">
        <PageHeader eyebrow="Finance & accounts" title="Financial Reports" />
        <section className="stat-row">
          <Widget label="Revenue" value={formatCurrency(revenue)} meta="Received" />
          <Widget label="Expenses" value={formatCurrency(expenses)} meta="Period" accent="gold" />
          <Widget label="Net" value={formatCurrency(revenue - expenses)} meta="Simple snapshot" accent="forest" />
          <Widget label="Overdue invoices" value={store.data.invoices.filter((i) => i.status === "overdue").length} meta="Collections" accent="mist" />
        </section>
      </div>
    </RequirePermission>
  );
}
