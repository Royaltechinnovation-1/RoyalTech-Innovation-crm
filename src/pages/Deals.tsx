import type { CrmStore } from "../data/store";
import { formatCurrency, formatDate } from "../lib/format";
import { PageHeader, Tag } from "../components/ui";
import { RequirePermission } from "../components/RequirePermission";

export function Deals({ store }: { store: CrmStore }) {
  const deals = store.visibleLeads.filter((l) => l.status === "won" || l.status === "lost");

  return (
    <RequirePermission store={store} permission="deals">
      <div className="page">
        <PageHeader
          eyebrow="Lead & client"
          title="Deals Won / Lost"
          lede="Closed outcomes for forecasting and coaching."
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Outcome</th>
                <th>Value</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal) => (
                <tr key={deal.id}>
                  <td>
                    <strong>{deal.leadId}</strong>
                    <div className="muted">{deal.name}</div>
                  </td>
                  <td>{deal.company}</td>
                  <td>
                    <Tag tone={deal.status === "won" ? "sage" : "cold"}>{deal.status}</Tag>
                  </td>
                  <td>{formatCurrency(deal.value)}</td>
                  <td>{formatDate(deal.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}
