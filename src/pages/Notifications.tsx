import type { CrmStore } from "../data/store";
import { formatDateTime } from "../lib/format";
import { Button, PageHeader, Panel, Tag } from "../components/ui";
import { RequirePermission } from "../components/RequirePermission";

export function Notifications({ store }: { store: CrmStore }) {
  const notes = store.data.notifications.filter((n) =>
    n.audienceRoles.includes(store.role),
  );

  return (
    <RequirePermission store={store} permission="notifications">
      <div className="page">
        <PageHeader
          eyebrow="Operations"
          title="Notifications & Approvals"
          lede="Role-filtered alerts and pending decisions."
        />
        <div className="split">
          <Panel title="Notifications">
            <div className="list">
              {notes.map((note) => (
                <div className="list-row" key={note.id}>
                  <div>
                    <p className="list-title">{note.title}</p>
                    <p className="list-sub">
                      {note.body} · {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                  <div className="list-end">
                    {!note.read ? <Tag tone="gold">New</Tag> : <Tag>Read</Tag>}
                    {!note.read ? (
                      <Button variant="ghost" onClick={() => store.markNotificationRead(note.id)}>
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Approvals" dark>
            <div className="list">
              {store.data.approvals.map((approval) => {
                const requester = store.data.users.find((u) => u.id === approval.requestedBy);
                return (
                  <div className="list-row" key={approval.id}>
                    <div>
                      <p className="list-title">{approval.title}</p>
                      <p className="list-sub">
                        {approval.type} · {requester?.name}
                      </p>
                    </div>
                    {approval.status === "pending" &&
                    (store.role === "founder" || store.role === "hr_admin" || store.role === "sales_manager") ? (
                      <div className="list-end">
                        <Button variant="ghost" onClick={() => store.decideApproval(approval.id, "approved")}>
                          Approve
                        </Button>
                        <Button variant="danger" onClick={() => store.decideApproval(approval.id, "rejected")}>
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Tag tone={approval.status === "approved" ? "sage" : approval.status === "rejected" ? "cold" : "gold"}>
                        {approval.status}
                      </Tag>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </RequirePermission>
  );
}
