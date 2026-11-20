import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { PageHeader, Panel, Tag } from "../../components/ui";
import { RequirePermission } from "../../components/RequirePermission";
import { WebsiteOverview } from "./WebsiteOverview";

export function WebsiteDashboard({ store }: { store: CrmStore }) {
  return <WebsiteOverview store={store} />;
}

export function Enquiries({ store }: { store: CrmStore }) {
  return (
    <RequirePermission store={store} permission="website.enquiries">
      <div className="page">
        <PageHeader
          eyebrow="Website management"
          title="Website Enquiries"
          lede="Website leads land in the same database sales can follow up from."
        />
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Enquiry</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {store.data.enquiries.map((enq) => (
                <tr key={enq.id}>
                  <td>
                    <strong>{enq.subject}</strong>
                  </td>
                  <td>
                    {enq.name}
                    <div className="muted">{enq.email}</div>
                  </td>
                  <td>{enq.source}</td>
                  <td>
                    <Tag tone={enq.status === "new" ? "gold" : "mist"}>{enq.status}</Tag>
                  </td>
                  <td>{formatDate(enq.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </RequirePermission>
  );
}

export function WebsiteModule({
  store,
  permission,
  title,
  points,
}: {
  store: CrmStore;
  permission: Parameters<CrmStore["allow"]>[0];
  title: string;
  points: string[];
}) {
  return (
    <RequirePermission store={store} permission={permission}>
      <div className="page">
        <PageHeader eyebrow="Website management" title={title} />
        <Panel title="Operational view">
          <div className="list">
            {points.map((point) => (
              <div className="list-row" key={point}>
                <p className="list-title">{point}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </RequirePermission>
  );
}
