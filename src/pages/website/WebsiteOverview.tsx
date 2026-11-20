import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  Globe2,
  Inbox,
} from "lucide-react";
import type { CrmStore } from "../../data/store";
import { formatDate } from "../../lib/format";
import { RequirePermission } from "../../components/RequirePermission";

export function WebsiteOverview({ store }: { store: CrmStore }) {
  const me = store.currentUser;
  const enquiries = store.data.enquiries;
  const fresh = enquiries.filter((e) => e.status === "new");
  const closed = enquiries.filter((e) => e.status === "closed");
  const inProgress = enquiries.filter((e) => e.status === "in_progress");

  const kpis = [
    {
      label: "Enquiries",
      value: enquiries.length,
      hint: "Website inbox",
      path: "/website/enquiries",
      icon: Inbox,
    },
    {
      label: "New",
      value: fresh.length,
      hint: "Needs reply",
      path: "/website/enquiries",
      icon: Globe2,
    },
    {
      label: "In progress",
      value: inProgress.length,
      hint: "Being handled",
      path: "/website/enquiries",
      icon: Activity,
    },
    {
      label: "Closed",
      value: closed.length,
      hint: "Resolved",
      path: "/website/enquiries",
      icon: CheckCircle2,
    },
  ];

  return (
    <RequirePermission store={store} permission="website">
      <div className="page rt-hr-overview">
        <header className="rt-hr-header">
          <div className="rt-hr-header-main">
            <div className="rt-hr-header-copy">
              <p className="rt-hr-kicker">RoyalTech Website</p>
              <h1>Website Overview</h1>
              <p className="rt-hr-sub">
                Enquiries and site ops for {me.name.split(" ")[0]} — same inbox sales can
                follow up from.
              </p>
            </div>
            <div className="rt-hr-header-aside">
              <div className="rt-hr-quick">
                <Link to="/website/enquiries" className="rt-hr-quick-btn is-primary">
                  Enquiries
                </Link>
                <Link to="/website/analytics" className="rt-hr-quick-btn">
                  Analytics
                </Link>
                <Link to="/website/content" className="rt-hr-quick-btn">
                  Content
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="rt-hr-kpi-row" aria-label="Website KPIs">
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

        <section className="rt-hr-panel">
          <header className="rt-hr-panel-head">
            <div>
              <h2>Latest enquiries</h2>
              <p>Newest website form submissions</p>
            </div>
            <Link to="/website/enquiries">View all</Link>
          </header>
          <div className="rt-hr-table-wrap">
            <table className="rt-hr-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Contact</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {[...enquiries]
                  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
                  .slice(0, 10)
                  .map((e) => (
                    <tr key={e.id}>
                      <td>
                        <strong>{e.subject}</strong>
                      </td>
                      <td>
                        {e.name}
                        <div className="muted" style={{ fontSize: "0.78rem" }}>
                          {e.email}
                        </div>
                      </td>
                      <td>{e.source}</td>
                      <td>
                        <span className={`rt-hr-status is-${e.status}`}>{e.status}</span>
                      </td>
                      <td>{formatDate(e.createdAt)}</td>
                    </tr>
                  ))}
                {enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="rt-hr-empty">
                      No website enquiries yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </RequirePermission>
  );
}
