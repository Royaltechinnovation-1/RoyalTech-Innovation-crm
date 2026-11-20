import { Link } from "react-router-dom";
import type { CrmStore } from "../data/store";
import { ROLE_LABELS } from "../lib/permissions";
import { roleWorkspaces } from "../lib/roleWorkspace";
import { formatCurrency, formatDate, leadStageLabels } from "../lib/format";
import { PageHeader, Panel, Tag, Widget } from "../components/ui";
import { SalesDashboard } from "./sales/SalesPages";
import { DeveloperDashboard } from "./dev/DeveloperDashboard";
import { ProjectManagerDashboard } from "./dev/ProjectManagerDashboard";
import { HrmDashboard } from "./hr/HrmDashboard";
import { SuperAdminOverview } from "./admin/SuperAdminOverview";
import { FinanceOverview } from "./finance/FinanceOverview";
import { WebsiteOverview } from "./website/WebsiteOverview";

export function Dashboard({ store }: { store: CrmStore }) {
  // Role-specific home dashboards — each works with local store + optional API.
  if (store.role === "founder") {
    return <SuperAdminOverview store={store} />;
  }
  if (store.role === "sales_manager" || store.role === "sales_executive") {
    return <SalesDashboard store={store} />;
  }
  if (store.role === "developer") {
    return <DeveloperDashboard store={store} />;
  }
  if (store.role === "project_manager") {
    return <ProjectManagerDashboard store={store} />;
  }
  if (store.role === "hr_admin") {
    return <HrmDashboard store={store} />;
  }
  if (store.role === "finance_admin") {
    return <FinanceOverview store={store} />;
  }
  if (store.role === "website_admin") {
    return <WebsiteOverview store={store} />;
  }
  return <RoleDashboard store={store} />;
}

function RoleDashboard({ store }: { store: CrmStore }) {
  const { data, role, visibleLeads, visibleTasks, currentUser } = store;
  const workspace = roleWorkspaces[role];
  const openLeads = visibleLeads.filter((l) => l.status !== "won" && l.status !== "lost");
  const pipeline = openLeads.reduce((sum, l) => sum + l.value, 0);
  const won = data.leads
    .filter((l) => l.status === "won")
    .reduce((sum, l) => sum + l.value, 0);
  const revenue = data.payments
    .filter((p) => p.status === "received")
    .reduce((sum, p) => sum + p.amount, 0);
  const activeProjects = data.projects.filter((p) => p.status === "active");
  const employees = data.employees.filter((e) => e.status !== "exited");
  const notes = data.notifications.filter(
    (n) => !n.read && n.audienceRoles.includes(role),
  );

  const widgets = (() => {
    switch (role) {
      case "hr_admin":
        return [
          <Widget key="emp" label="Employees" value={employees.length} meta="Directory" accent="forest" />,
          <Widget key="cand" label="Candidates" value={data.candidates.length} meta="Recruitment" accent="sage" />,
          <Widget key="leave" label="Leave pending" value={data.leaveRequests.filter((l) => l.status === "pending").length} meta="Approvals" accent="gold" />,
          <Widget key="onb" label="Onboarding" value={data.employees.filter((e) => e.status === "onboarding").length} meta="New joiners" accent="mist" />,
        ];
      case "sales_manager":
        return [
          <Widget key="leads" label="Total Leads" value={data.leads.length} meta="All sales leads" accent="sage" />,
          <Widget key="pipe" label="Pipeline" value={formatCurrency(pipeline)} meta="Open opportunity" accent="gold" />,
          <Widget key="won" label="Won" value={formatCurrency(won)} meta="Closed revenue" accent="forest" />,
          <Widget
            key="target"
            label="Team target"
            value={`${Math.round(
              (data.salesTargets.reduce((s, t) => s + t.achieved, 0) /
                data.salesTargets.reduce((s, t) => s + t.target, 0)) *
                100,
            )}%`}
            meta="Q4 progress"
            accent="mist"
          />,
        ];
      case "sales_executive":
        return [
          <Widget key="mine" label="My leads" value={visibleLeads.length} meta="Assigned to you" accent="sage" />,
          <Widget key="fu" label="Follow-ups" value={visibleLeads.filter((l) => l.nextFollowUp).length} meta="Reminders" accent="gold" />,
          <Widget
            key="clients"
            label="Clients"
            value={data.clients.filter((c) => c.accountManagerId === currentUser.id).length}
            meta="Your accounts"
            accent="forest"
          />,
          <Widget key="pipe" label="My pipeline" value={formatCurrency(pipeline)} meta="Open value" accent="mist" />,
        ];
      case "project_manager":
        return [
          <Widget key="proj" label="Active projects" value={activeProjects.length} meta="Delivery" accent="gold" />,
          <Widget key="tasks" label="Open tasks" value={data.tasks.filter((t) => t.status !== "done").length} meta="Across teams" accent="sage" />,
          <Widget key="due" label="Due soon" value={data.tasks.filter((t) => t.status !== "done").length} meta="Deadlines" accent="forest" />,
          <Widget
            key="load"
            label="Team size"
            value={data.employees.filter((e) => e.department === "Engineering" || e.department === "Delivery").length}
            meta="Workload"
            accent="mist"
          />,
        ];
      case "developer":
        return [
          <Widget key="tasks" label="My tasks" value={visibleTasks.length} meta="Assigned work" accent="sage" />,
          <Widget key="doing" label="In progress" value={visibleTasks.filter((t) => t.status === "doing").length} meta="Focus now" accent="gold" />,
          <Widget key="blocked" label="Blocked" value={visibleTasks.filter((t) => t.status === "blocked").length} meta="Needs help" accent="forest" />,
          <Widget key="proj" label="Projects" value={new Set(visibleTasks.map((t) => t.projectId)).size} meta="Touching" accent="mist" />,
        ];
      case "website_admin":
        return [
          <Widget key="enq" label="Enquiries" value={data.enquiries.length} meta="Website inbox" accent="sage" />,
          <Widget key="new" label="New" value={data.enquiries.filter((e) => e.status === "new").length} meta="Needs response" accent="gold" />,
          <Widget key="perf" label="Uptime" value="99.8%" meta="Performance" accent="forest" />,
          <Widget key="err" label="Open issues" value={2} meta="Maintenance" accent="mist" />,
        ];
      case "finance_admin":
        return [
          <Widget key="rev" label="Revenue" value={formatCurrency(revenue)} meta="Received" accent="sage" />,
          <Widget
            key="exp"
            label="Expenses"
            value={formatCurrency(data.expenses.reduce((s, e) => s + e.amount, 0))}
            meta="This period"
            accent="gold"
          />,
          <Widget key="inv" label="Invoices" value={data.invoices.length} meta="Issued" accent="forest" />,
          <Widget
            key="pend"
            label="Pending"
            value={formatCurrency(
              data.payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0),
            )}
            meta="Awaiting payment"
            accent="mist"
          />,
        ];
      default:
        return [];
    }
  })();

  return (
    <div className="page">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <p className="eyebrow">
            {workspace.greeting}, {currentUser.name.split(" ")[0]}
          </p>
          <h2>{workspace.title}</h2>
          <p className="lede">{workspace.summary}</p>
          <div className="welcome-meta">
            <Tag tone="sage">{ROLE_LABELS[role]}</Tag>
            <span className="muted">{currentUser.department}</span>
            {notes.length > 0 ? (
              <Link to="/notifications" className="welcome-alert">
                {notes.length} new notification{notes.length > 1 ? "s" : ""}
              </Link>
            ) : null}
          </div>
        </div>
        <div className="welcome-shortcuts">
          <p className="field-label">Your quick links</p>
          <div className="shortcut-grid">
            {workspace.shortcuts.map((item) => (
              <Link key={item.path} className="shortcut-card" to={item.path}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PageHeader
        eyebrow={`${ROLE_LABELS[role]} dashboard`}
        title="What matters now"
        lede="Only the numbers and work for your role."
        actions={
          role === "hr_admin" ? (
            <Link className="btn btn-primary" to="/hr">
              Open HR dashboard
            </Link>
          ) : role === "project_manager" || role === "developer" ? (
            <Link className="btn btn-primary" to="/projects">
              Open Development dashboard
            </Link>
          ) : role.startsWith("sales") ? (
            <Link className="btn btn-primary" to="/sales">
              Open Sales dashboard
            </Link>
          ) : null
        }
      />

      <section className="stat-row">{widgets}</section>

      <section className="split">
        <Panel
          title={
            role === "developer"
              ? "My work"
              : role.startsWith("sales")
                ? "Pipeline pulse"
                : role === "hr_admin"
                  ? "People pulse"
                  : role === "finance_admin"
                    ? "Money pulse"
                    : role === "website_admin"
                      ? "Web pulse"
                      : "Delivery pulse"
          }
        >
          <div className="list">
            {role === "hr_admin"
              ? data.employees.slice(0, 5).map((emp) => (
                  <div className="list-row" key={emp.id}>
                    <div>
                      <p className="list-title">{emp.name}</p>
                      <p className="list-sub">
                        {emp.roleTitle} · {emp.department}
                      </p>
                    </div>
                    <Tag tone={emp.status === "active" ? "sage" : "gold"}>{emp.status}</Tag>
                  </div>
                ))
              : role === "finance_admin"
                ? data.invoices.slice(0, 5).map((inv) => (
                    <div className="list-row" key={inv.id}>
                      <div>
                        <p className="list-title">{inv.number}</p>
                        <p className="list-sub">Due {formatDate(inv.dueDate)}</p>
                      </div>
                      <div className="list-end">
                        <Tag
                          tone={
                            inv.status === "paid"
                              ? "sage"
                              : inv.status === "overdue"
                                ? "danger"
                                : "gold"
                          }
                        >
                          {inv.status}
                        </Tag>
                        <strong>{formatCurrency(inv.amount)}</strong>
                      </div>
                    </div>
                  ))
                : role === "website_admin"
                  ? data.enquiries.map((enq) => (
                      <div className="list-row" key={enq.id}>
                        <div>
                          <p className="list-title">{enq.subject}</p>
                          <p className="list-sub">
                            {enq.name} · {formatDate(enq.createdAt)}
                          </p>
                        </div>
                        <Tag tone={enq.status === "new" ? "gold" : "mist"}>{enq.status}</Tag>
                      </div>
                    ))
                  : role === "developer" || role === "project_manager"
                    ? (role === "developer" ? visibleTasks : data.tasks)
                        .slice(0, 5)
                        .map((task) => {
                          const project = data.projects.find((p) => p.id === task.projectId);
                          return (
                            <div className="list-row" key={task.id}>
                              <div>
                                <p className="list-title">{task.title}</p>
                                <p className="list-sub">
                                  {project?.name} · due {formatDate(task.dueDate)}
                                </p>
                              </div>
                              <Tag
                                tone={
                                  task.status === "done"
                                    ? "sage"
                                    : task.status === "blocked"
                                      ? "danger"
                                      : "gold"
                                }
                              >
                                {task.status}
                              </Tag>
                            </div>
                          );
                        })
                    : openLeads.slice(0, 5).map((lead) => (
                        <div className="list-row" key={lead.id}>
                          <div>
                            <p className="list-title">
                              {lead.company}
                              <span className="muted"> · {lead.leadId}</span>
                            </p>
                            <p className="list-sub">
                              {lead.name} ·{" "}
                              {lead.nextFollowUp
                                ? `Follow-up ${formatDate(lead.nextFollowUp)}`
                                : "No follow-up"}
                            </p>
                          </div>
                          <div className="list-end">
                            <Tag tone="sage">{leadStageLabels[lead.status]}</Tag>
                            <strong>{formatCurrency(lead.value)}</strong>
                          </div>
                        </div>
                      ))}
          </div>
        </Panel>

        <Panel title="This login can access" dark>
          <div className="list">
            {workspace.sees.map((item) => (
              <div className="list-row" key={item}>
                <p className="list-title">{item}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
