import type { CrmStore } from "../data/store";
import { formatCurrency } from "../lib/format";
import { PageHeader, Widget } from "../components/ui";
import { RequirePermission } from "../components/RequirePermission";

export function Reports({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="reports">
      <div className="page">
        <PageHeader
          eyebrow="Analytics"
          title="Reports & Analytics"
          lede="Cross-module snapshot from the centralized database."
        />
        <section className="stat-row">
          {store.allow("leads") ? (
            <Widget label="Leads" value={store.data.leads.length} meta="Sales" />
          ) : null}
          {store.allow("hr") ? (
            <Widget label="Employees" value={store.data.employees.length} meta="HR" accent="forest" />
          ) : null}
          {store.allow("projects") ? (
            <Widget
              label="Projects"
              value={store.data.projects.length}
              meta="Delivery"
              accent="gold"
            />
          ) : null}
          {store.allow("finance.reports") ? (
            <Widget
              label="Revenue"
              value={formatCurrency(
                store.data.payments
                  .filter((p) => p.status === "received")
                  .reduce((s, p) => s + p.amount, 0),
              )}
              meta="Finance"
              accent="mist"
            />
          ) : null}
          {store.allow("website") ? (
            <Widget label="Enquiries" value={store.data.enquiries.length} meta="Website" />
          ) : null}
        </section>
      </div>
    </RequirePermission>
  );
}
